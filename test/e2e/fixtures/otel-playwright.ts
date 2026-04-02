/**
 * Playwright OTel Setup
 *
 * This module integrates Playwright E2E tests with the shared OTel infrastructure.
 * Uses the same InvariantSpanProcessor as domain tests for consistent data persistence.
 */

import { setupOtel, shutdownOtel, InvariantSpanProcessor } from '@executable-specs/shared/index-server';
import { trace, SpanStatusCode, type Tracer } from '@opentelemetry/api';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface PlaywrightOtelConfig {
  serviceName: string;
  mode: 'test';
}

interface InvariantSpanMetadata {
  ruleReference: string;
  rule: string;
  tags: string[];
  input?: unknown;
  output?: unknown;
}

// OTel state
let tracer: Tracer | null = null;
let invariantProcessor: InvariantSpanProcessor | null = null;

// Persistence paths
const runDir = path.join(os.tmpdir(), 'vitest-otel-data');
const workerId = `playwright-${process.pid}`;
const workerSummariesFile = path.join(runDir, `summaries-${workerId}.json`);
const workerMetadataFile = path.join(runDir, `metadata-${workerId}.json`);

export function setupPlaywrightOtel(config: PlaywrightOtelConfig): { tracer: Tracer; invariantProcessor: InvariantSpanProcessor | null } {
  if (tracer !== null && invariantProcessor !== null) {
    return { tracer, invariantProcessor };
  }

  // Ensure run directory exists
  if (!fs.existsSync(runDir)) {
    fs.mkdirSync(runDir, { recursive: true });
  }

  // Use shared OTel setup which includes InvariantSpanProcessor
  const result = setupOtel({
    mode: 'test',
    serviceName: config.serviceName,
  });

  tracer = trace.getTracer('executable-specs-e2e');
  invariantProcessor = result.invariantProcessor ?? null;

  return { tracer, invariantProcessor };
}

/**
 * Persist OTel data to disk so the attestation reporter can read it.
 * This follows the same pattern as the domain test setup.
 */
export function persistPlaywrightOtelData(): void {
  if (!invariantProcessor) return;

  const metadata = invariantProcessor.getMetadata();
  const summaries = invariantProcessor.getSummaries();

  // Only write if we have data
  if (summaries.length === 0 && metadata.size === 0) return;

  // Write metadata
  const metadataEntries = Array.from(metadata.entries()).map(([name, data]: [string, { ruleReference: string; rule: string; tags: string[] }]) => ({
    name,
    ...data
  }));
  fs.writeFileSync(workerMetadataFile, JSON.stringify(metadataEntries, null, 2));

  // Write summaries
  fs.writeFileSync(workerSummariesFile, JSON.stringify(summaries, null, 2));
}

export async function shutdownPlaywrightOtel(): Promise<void> {
  // Persist data before shutdown
  persistPlaywrightOtelData();

  await shutdownOtel();
  tracer = null;
  invariantProcessor = null;
}

export function getPlaywrightTracer(): Tracer {
  if (tracer === null) {
    throw new Error('Playwright OTel not initialized. Call setupPlaywrightOtel() first.');
  }
  return tracer;
}

export function getPlaywrightInvariantProcessor(): InvariantSpanProcessor | null {
  return invariantProcessor;
}

export function emitInvariantSpan(
  name: string,
  metadata: InvariantSpanMetadata,
  status: 'passed' | 'failed',
  error?: Error
): void {
  const currentTracer = getPlaywrightTracer();

  const span = currentTracer.startSpan(name, {
    attributes: {
      'invariant.ruleReference': metadata.ruleReference,
      'invariant.rule': metadata.rule,
      'invariant.tags': metadata.tags,
      ...(metadata.input !== undefined && {
        'invariant.input': JSON.stringify(metadata.input),
      }),
      ...(metadata.output !== undefined && {
        'invariant.output': JSON.stringify(metadata.output),
      }),
    },
  });

  if (status === 'passed') {
    span.setStatus({ code: SpanStatusCode.OK });
  } else {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error?.message ?? 'Invariant failed',
    });
    if (error !== undefined) {
      span.recordException(error);
    }
  }

  span.end();
}

export { invariantProcessor, tracer };
export type { InvariantSpanMetadata };
