/**
 * OTel Pipeline Integration Test
 *
 * GENERAL PURPOSE: Verify the entire OTel data pipeline works end-to-end.
 * Catches: Broken span creation, processor not receiving spans, file persistence failures,
 * reporter unable to read data, worker isolation issues.
 *
 * This is the single test that proves the pipeline works. If this fails,
 * the attestation report will have no invariant data.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { getInvariantProcessor } from '@executable-specs/shared/modules/otel-setup';
import type { InvariantSpanProcessor } from '@executable-specs/shared/modules/invariant-span-processor';

describe('OTel Pipeline', () => {
  let processor: InvariantSpanProcessor | null = null;
  const runDir = path.join(os.tmpdir(), 'vitest-otel-data');

  beforeAll(() => {
    // The OTel SDK is already initialized by otel-test-setup.ts
    // Just get the processor and clear its state
    processor = getInvariantProcessor();
    processor?.clear();

    // Ensure runDir exists
    if (!fs.existsSync(runDir)) {
      fs.mkdirSync(runDir, { recursive: true });
    }
  });

  afterAll(() => {
    processor?.clear();
  });

  it('should capture invariant spans and persist them to disk', () => {
    // Act: create a span with invariant attributes
    const tracer = trace.getTracer('pipeline-test');
    const span = tracer.startSpan('Pipeline Test Invariant', {
      attributes: {
        'invariant.ruleReference': 'pricing-strategy.md §1 - Base Rules',
        'invariant.rule': 'Final Total must never exceed Original Total',
        'invariant.tags': ['@pricing', '@base-rules'],
        'invariant.user.tenureYears': 3,
        'invariant.item.quantities': [2, 5],
        'invariant.item.count': 2,
        'invariant.originalTotal': 10000,
        'invariant.finalTotal': 8500,
        'invariant.totalDiscount': 1500,
        'invariant.isCapped': false,
        'invariant.shipment.isFreeShipping': true,
        'invariant.shipment.totalShipping': 0,
        'invariant.shippingMethod': 'STANDARD',
      },
    });
    span.setStatus({ code: SpanStatusCode.OK });
    span.end();

    // Assert: processor received the span
    expect(processor).not.toBeNull();
    const summaries = processor!.getSummaries();
    expect(summaries.length).toBeGreaterThan(0);

    const summary = summaries.find(s => s.name === 'Pipeline Test Invariant');
    expect(summary).toBeDefined();
    expect(summary!.totalRuns).toBe(1);
    expect(summary!.passed).toBe(true);
    expect(summary!.ruleReference).toBe('pricing-strategy.md §1 - Base Rules');
    expect(summary!.tags).toContain('@pricing');

    // Assert: edge cases were extracted
    expect(summary!.edgeCasesCovered.vipUsers).toBe(1);
    expect(summary!.edgeCasesCovered.bulkItems).toBe(1);
    expect(summary!.edgeCasesCovered.freeShippingQualifying).toBe(1);

    // Assert: data was persisted to disk (InvariantSpanProcessor.persistToDisk writes on every onEnd)
    const summariesPath = path.join(runDir, 'summaries.json');
    expect(fs.existsSync(summariesPath)).toBe(true);
    const persisted = JSON.parse(fs.readFileSync(summariesPath, 'utf-8'));
    expect(persisted.length).toBeGreaterThan(0);
    expect(persisted[0].name).toBe('Pipeline Test Invariant');

    // Assert: metadata was also persisted
    const metadataPath = path.join(runDir, 'metadata.json');
    expect(fs.existsSync(metadataPath)).toBe(true);
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    expect(metadata.length).toBeGreaterThan(0);
    expect(metadata[0].ruleReference).toBe('pricing-strategy.md §1 - Base Rules');
  });

  it('should mark invariant as failed when span has ERROR status', () => {
    const tracer = trace.getTracer('pipeline-test');
    const span = tracer.startSpan('Failing Pipeline Test', {
      attributes: {
        'invariant.ruleReference': 'test-rule',
        'invariant.rule': 'test rule',
        'invariant.tags': ['@test'],
        'invariant.user.tenureYears': 1,
        'invariant.item.quantities': [1],
        'invariant.item.count': 1,
        'invariant.originalTotal': 1000,
        'invariant.finalTotal': 1000,
        'invariant.totalDiscount': 0,
        'invariant.isCapped': false,
        'invariant.shipment.isFreeShipping': false,
        'invariant.shipment.totalShipping': 500,
        'invariant.shippingMethod': 'STANDARD',
      },
    });
    span.setStatus({ code: SpanStatusCode.ERROR, message: 'Test failure reason' });
    span.recordException(new Error('Simulated failure'));
    span.end();

    const summaries = processor!.getSummaries();
    const summary = summaries.find(s => s.name === 'Failing Pipeline Test');
    expect(summary).toBeDefined();
    expect(summary!.passed).toBe(false);
    expect(summary!.failureReason).toBe('Test failure reason');
  });

  it('should ignore spans without invariant.ruleReference', () => {
    const tracer = trace.getTracer('pipeline-test');
    const span = tracer.startSpan('Non-Invariant Span', {
      attributes: {
        'some.other.attribute': 'value',
      },
    });
    span.setStatus({ code: SpanStatusCode.OK });
    span.end();

    const summaries = processor!.getSummaries();
    const nonInvariant = summaries.find(s => s.name === 'Non-Invariant Span');
    expect(nonInvariant).toBeUndefined();
  });

  it('should be readable by the attestation reporter', () => {
    // Simulate what the reporter does
    const summaries: any[] = [];
    const metadata = new Map<string, { ruleReference: string; rule: string; tags: string[] }>();

    // Read worker files (what reporter does)
    const files = fs.readdirSync(runDir);
    const summariesFiles = files.filter(f => f.startsWith('summaries') && f.endsWith('.json'));
    for (const file of summariesFiles) {
      const workerSummaries = JSON.parse(fs.readFileSync(path.join(runDir, file), 'utf-8'));
      summaries.push(...workerSummaries);
    }

    const metadataFiles = files.filter(f => f.startsWith('metadata') && f.endsWith('.json'));
    for (const file of metadataFiles) {
      const entries = JSON.parse(fs.readFileSync(path.join(runDir, file), 'utf-8'));
      for (const entry of entries) {
        if (!metadata.has(entry.name)) {
          metadata.set(entry.name, {
            ruleReference: entry.ruleReference,
            rule: entry.rule,
            tags: entry.tags,
          });
        }
      }
    }

    expect(summaries.length).toBeGreaterThan(0);
    expect(metadata.size).toBeGreaterThan(0);

    // Verify the reporter can find invariant data
    const invariantNames = summaries.map(s => s.name);
    expect(invariantNames).toContain('Pipeline Test Invariant');
  });
});
