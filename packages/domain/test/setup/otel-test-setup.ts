import { setupOtel, getInvariantProcessor, shutdownOtel } from '@executable-specs/shared/index-server';
import { afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Initialize OTel in test mode with InvariantSpanProcessor
const { spanExporter, invariantProcessor } = setupOtel({
  mode: 'test',
  serviceName: 'executable-specs-domain-tests',
});

// Persist OTel data to shared files so the reporter (running in main process) can read it
const runDir = path.join(os.tmpdir(), 'vitest-otel-data');
if (!fs.existsSync(runDir)) {
  fs.mkdirSync(runDir, { recursive: true });
}

// Each worker writes to its own file to avoid overwriting other workers' data
const workerId = process.env.VITEST_POOL_ID || process.pid;
const workerSummariesFile = path.join(runDir, `summaries-${workerId}.json`);
const workerMetadataFile = path.join(runDir, `metadata-${workerId}.json`);

// Write metadata and summaries to worker-specific files
function persistOtelData() {
  if (!invariantProcessor) return;

  const metadata = invariantProcessor.getMetadata();
  const summaries = invariantProcessor.getSummaries();

  // Only write if we have data (don't overwrite other workers' data with empty state)
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

// Expose for test access
(globalThis as any).__otel = {
  getInvariantProcessor,
  getSpanExporter: () => spanExporter,
  persistOtelData,
  shutdown: async () => {
    persistOtelData();
    await shutdownOtel();
  },
};

// Persist data on vitest teardown
afterAll(async () => {
  persistOtelData();
});
