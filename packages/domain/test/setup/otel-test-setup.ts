import { setupOtel, getInvariantProcessor, shutdownOtel } from '@executable-specs/shared';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { BasicTracerProvider, InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Initialize OTel in test mode with InvariantSpanProcessor
const { sdk, spanExporter, invariantProcessor } = setupOtel({
  mode: 'test',
  serviceName: 'executable-specs-domain-tests',
});

// Also register a BasicTracerProvider for the @opentelemetry/api global tracer
// This ensures that trace.getTracer() returns our test provider
const provider = new BasicTracerProvider();
provider.addSpanProcessor(invariantProcessor!);
if (spanExporter) {
  provider.addSpanProcessor(new SimpleSpanProcessor(spanExporter));
}
provider.register();

// Persist OTel data to shared files so the reporter (running in main process) can read it
const runDir = path.join(os.tmpdir(), 'vitest-otel-data');
if (!fs.existsSync(runDir)) {
  fs.mkdirSync(runDir, { recursive: true });
}

// Write metadata and summaries to shared files
function persistOtelData() {
  if (!invariantProcessor) return;
  
  const metadata = invariantProcessor.getMetadata();
  const summaries = invariantProcessor.getSummaries();
  
  // Write metadata
  const metadataEntries = Array.from(metadata.entries()).map(([name, data]) => ({
    name,
    ...data
  }));
  fs.writeFileSync(path.join(runDir, 'metadata.json'), JSON.stringify(metadataEntries, null, 2));
  
  // Write summaries
  fs.writeFileSync(path.join(runDir, 'summaries.json'), JSON.stringify(summaries, null, 2));
}

// Expose for test access
(globalThis as any).__otel = {
  getInvariantProcessor,
  getSpanExporter: () => spanExporter,
  persistOtelData,
  shutdown: async () => {
    persistOtelData();
    await shutdownOtel();
    await provider.shutdown();
  },
};

// Persist data on vitest teardown
if (typeof afterAll === 'function') {
  afterAll(async () => {
    persistOtelData();
  });
}
