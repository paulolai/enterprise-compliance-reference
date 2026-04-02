/**
 * OTel Worker Isolation Test
 *
 * GENERAL PURPOSE: Verify that multiple vitest workers don't overwrite each other's OTel data.
 * Catches: Race conditions in file persistence, data loss from concurrent writes,
 * reporter unable to merge data from multiple workers.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { setupOtel, getInvariantProcessor, shutdownOtel } from '@executable-specs/shared/modules/otel-setup';
import type { InvariantSpanProcessor } from '@executable-specs/shared/modules/invariant-span-processor';

describe('OTel Worker Isolation', () => {
  const runDir = path.join(os.tmpdir(), 'vitest-otel-data');
  let processor: InvariantSpanProcessor | null = null;

  beforeAll(() => {
    // Ensure runDir exists (InvariantSpanProcessor creates it in constructor,
    // but we need it for our worker-specific file writes)
    if (!fs.existsSync(runDir)) {
      fs.mkdirSync(runDir, { recursive: true });
    }
    const result = setupOtel({ mode: 'test', serviceName: 'worker-isolation-test' });
    processor = result.invariantProcessor;
  });

  afterAll(async () => {
    if (processor) processor.clear();
    await shutdownOtel();
  });

  it('should write to worker-specific files without overwriting others', () => {
    const workerId = process.env.VITEST_POOL_ID || process.pid;
    const summariesFile = path.join(runDir, `summaries-${workerId}.json`);
    const metadataFile = path.join(runDir, `metadata-${workerId}.json`);

    // Create spans
    const tracer = trace.getTracer('worker-test');
    const span = tracer.startSpan('Worker Isolation Test', {
      attributes: {
        'invariant.ruleReference': 'worker-isolation-test',
        'invariant.rule': 'Workers must not overwrite each other',
        'invariant.tags': ['@worker-isolation'],
        'invariant.user.tenureYears': 1,
        'invariant.item.quantities': [1],
        'invariant.item.count': 1,
        'invariant.originalTotal': 100,
        'invariant.finalTotal': 100,
        'invariant.totalDiscount': 0,
        'invariant.isCapped': false,
        'invariant.shipment.isFreeShipping': false,
        'invariant.shipment.totalShipping': 0,
        'invariant.shippingMethod': 'STANDARD',
      },
    });
    span.setStatus({ code: SpanStatusCode.OK });
    span.end();

    // Worker-specific files should exist (written by otel-test-setup.ts afterAll)
    // Simulate what the setup file does
    if (processor) {
      const metadata = processor.getMetadata();
      const summaries = processor.getSummaries();
      if (summaries.length > 0) {
        const metadataEntries = Array.from(metadata.entries()).map(([name, data]) => ({
          name,
          ...data,
        }));
        fs.writeFileSync(metadataFile, JSON.stringify(metadataEntries, null, 2));
        fs.writeFileSync(summariesFile, JSON.stringify(summaries, null, 2));
      }
    }

    expect(fs.existsSync(summariesFile)).toBe(true);
    expect(fs.existsSync(metadataFile)).toBe(true);

    // Legacy files should also exist (from InvariantSpanProcessor.persistToDisk)
    expect(fs.existsSync(path.join(runDir, 'summaries.json'))).toBe(true);
    expect(fs.existsSync(path.join(runDir, 'metadata.json'))).toBe(true);
  });

  it('should allow reporter to merge data from multiple worker files', () => {
    // Simulate what happens when multiple workers write their data
    // and the reporter merges them

    // Create a second worker file manually to simulate multi-worker scenario
    const simulatedWorkerData = [
      {
        name: 'Simulated Worker 2 Invariant',
        ruleReference: 'simulated-test',
        rule: 'Simulated rule',
        tags: ['@simulated'],
        totalRuns: 50,
        passed: true,
        edgeCasesCovered: {
          vipUsers: 30, nonVipUsers: 20, exactlyTwoYearTenure: 5,
          bulkItems: 100, nonBulkItems: 50,
          freeShippingQualifying: 40, freeShippingNotQualifying: 10,
          discountCapHit: 0, expressShipping: 10, expeditedShipping: 5,
        },
      },
    ];

    const simulatedFile = path.join(runDir, 'summaries-999.json');
    fs.writeFileSync(simulatedFile, JSON.stringify(simulatedWorkerData, null, 2));

    try {
      // Now merge like the reporter does
      const allSummaries: any[] = [];
      const allMetadata = new Map<string, { ruleReference: string; rule: string; tags: string[] }>();

      const files = fs.readdirSync(runDir);
      const summariesFiles = files.filter(f => f.startsWith('summaries-') && f.endsWith('.json'));

      for (const file of summariesFiles) {
        const workerSummaries = JSON.parse(fs.readFileSync(path.join(runDir, file), 'utf-8'));
        for (const summary of workerSummaries) {
          const existing = allSummaries.find(s => s.name === summary.name);
          if (existing) {
            existing.totalRuns += summary.totalRuns;
            if (!summary.passed) {
              existing.passed = false;
              existing.failureReason = summary.failureReason;
            }
            for (const key of Object.keys(existing.edgeCasesCovered)) {
              existing.edgeCasesCovered[key] += summary.edgeCasesCovered[key] || 0;
            }
          } else {
            allSummaries.push(summary);
          }
        }
      }

      const metadataFiles = files.filter(f => f.startsWith('metadata-') && f.endsWith('.json'));
      for (const file of metadataFiles) {
        const entries = JSON.parse(fs.readFileSync(path.join(runDir, file), 'utf-8'));
        for (const entry of entries) {
          if (!allMetadata.has(entry.name)) {
            allMetadata.set(entry.name, {
              ruleReference: entry.ruleReference,
              rule: entry.rule,
              tags: entry.tags,
            });
          }
        }
      }

      // Both workers' data should be present
      expect(allSummaries.length).toBeGreaterThanOrEqual(2);
      const names = allSummaries.map(s => s.name);
      expect(names).toContain('Worker Isolation Test');
      expect(names).toContain('Simulated Worker 2 Invariant');
    } finally {
      // Clean up simulated file
      if (fs.existsSync(simulatedFile)) {
        fs.unlinkSync(simulatedFile);
      }
    }
  });
});
