# OpenTelemetry + SigNoz Observability Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the custom TestTracer with OpenTelemetry as the unified observability foundation, providing both test-time attestation reports and runtime observability via SigNoz.

**Architecture:** OpenTelemetry SDK becomes the single observability layer. In tests, a custom `SpanProcessor` collects spans in-memory and produces `InvariantSummary` aggregations for attestation reports. In production, the same SDK exports spans/metrics to SigNoz via OTLP/gRPC. The custom tracer files are deleted — OTel spans carry all metadata (ruleReference, rule, tags, input/output) as span attributes.

**Tech Stack:** `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`, `@opentelemetry/exporter-trace-otlp-grpc`, `@opentelemetry/exporter-metrics-otlp-grpc`, SigNoz (Docker Compose), Vitest, Playwright

---

## Design Principles

1. **OTel is the foundation** — all observability flows through it
2. **InvariantSummary survives** — it becomes a view over aggregated span data, not a custom data structure
3. **Attestation reports unchanged** — same HTML/Markdown output, different data source
4. **SigNoz for runtime** — separate compose file, doesn't interfere with dev setup
5. **TDD throughout** — test the SpanProcessor, test the aggregation, test the reporter

---

### Task 1: Add OTel Dependencies

**Files:**
- Modify: `packages/server/package.json`
- Modify: `package.json` (root)

Add to `packages/server/package.json`:
```json
{
  "dependencies": {
    "@opentelemetry/sdk-node": "^0.214.0",
    "@opentelemetry/auto-instrumentations-node": "^0.72.0",
    "@opentelemetry/exporter-trace-otlp-grpc": "^0.214.0",
    "@opentelemetry/exporter-metrics-otlp-grpc": "^0.214.0"
  }
}
```

**Step 1: Add dependencies**

Edit `packages/server/package.json` to add the OTel packages.

**Step 2: Install**

```bash
pnpm install
```

**Step 3: Verify install**

```bash
pnpm list @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
```

---

### Task 2: Create OTel SDK Setup Module (shared)

**Files:**
- Create: `packages/shared/src/modules/otel-setup.ts`

This is the core module that initializes OTel. It works in both test and production contexts:
- **Test mode:** Uses an in-memory span exporter + custom `InvariantSpanProcessor`
- **Production mode:** Exports to SigNoz via OTLP/gRPC

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { InvariantSpanProcessor } from './invariant-span-processor';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

export interface OtelConfig {
  mode: 'test' | 'production';
  serviceName: string;
  endpoint?: string; // OTLP endpoint (production only)
}

let sdk: NodeSDK | null = null;
let spanExporter: InMemorySpanExporter | null = null;
let invariantProcessor: InvariantSpanProcessor | null = null;

export function setupOtel(config: OtelConfig) {
  if (sdk) return { sdk, spanExporter, invariantProcessor };

  const traceExporter = config.mode === 'test'
    ? new InMemorySpanExporter()
    : new OTLPTraceExporter({ url: config.endpoint || 'http://localhost:4317' });

  const metricReader = config.mode === 'production'
    ? new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({ url: config.endpoint || 'http://localhost:4317' }),
      })
    : undefined;

  if (config.mode === 'test') {
    spanExporter = traceExporter as InMemorySpanExporter;
    invariantProcessor = new InvariantSpanProcessor();
  }

  sdk = new NodeSDK({
    serviceName: config.serviceName,
    spanProcessor: config.mode === 'test'
      ? [new SimpleSpanProcessor(traceExporter), invariantProcessor!]
      : traceExporter,
    instrumentations: [getNodeAutoInstrumentations()],
    metricReader,
  });

  sdk.start();
  return { sdk, spanExporter, invariantProcessor };
}

export async function shutdownOtel() {
  if (sdk) {
    await sdk.shutdown();
    sdk = null;
    spanExporter = null;
    invariantProcessor = null;
  }
}

export function getInvariantProcessor(): InvariantSpanProcessor | null {
  return invariantProcessor;
}
```

**Step 1: Create the file**

Write the above content to `packages/shared/src/modules/otel-setup.ts`.

**Step 2: Export from shared index**

Edit `packages/shared/src/index.ts` to add:
```typescript
export { setupOtel, shutdownOtel, getInvariantProcessor } from './modules/otel-setup';
```

**Step 3: Verify compilation**

```bash
cd packages/shared && npx tsc --noEmit
```

---

### Task 3: Create InvariantSpanProcessor (replaces TestTracer)

**Files:**
- Create: `packages/shared/src/modules/invariant-span-processor.ts`

This is the **bridge** between OTel spans and attestation reports. It replaces `TestTracer` entirely.

```typescript
import type { Span, SpanProcessor, ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { Context } from '@opentelemetry/api';
import type { InvariantSummary } from './tracer';

// Re-export InvariantSummary from shared tracer module (keep the type, replace the implementation)
// This type stays because it IS the attestation report structure

export class InvariantSpanProcessor implements SpanProcessor {
  private summaries: Map<string, InvariantSummary> = new Map();
  private metadata: Map<string, { ruleReference: string; rule: string; tags: string[] }> = new Map();

  forceFlush(): Promise<void> { return Promise.resolve(); }
  shutdown(): Promise<void> { return Promise.resolve(); }

  onStart(_span: Span, _parentContext: Context): void {
    // No-op — we process onEnd
  }

  onEnd(span: ReadableSpan): void {
    const attrs = span.attributes;
    const ruleRef = attrs['invariant.ruleReference'] as string | undefined;
    if (!ruleRef) return; // Not an invariant span

    const name = span.name;
    const passed = span.status.code === 1; // OK
    const rule = (attrs['invariant.rule'] as string) || '';
    const tags = (attrs['invariant.tags'] as string[]) || [];

    // Register metadata
    if (!this.metadata.has(name)) {
      this.metadata.set(name, { ruleReference: ruleRef, rule, tags });
    }

    // Get or create summary
    if (!this.summaries.has(name)) {
      this.summaries.set(name, {
        name,
        ruleReference: ruleRef,
        rule,
        tags,
        totalRuns: 0,
        passed: true,
        edgeCasesCovered: {
          vipUsers: 0, nonVipUsers: 0, exactlyTwoYearTenure: 0,
          bulkItems: 0, nonBulkItems: 0,
          freeShippingQualifying: 0, freeShippingNotQualifying: 0,
          discountCapHit: 0, expressShipping: 0, expeditedShipping: 0,
        },
      });
    }

    const summary = this.summaries.get(name)!;
    summary.totalRuns++;
    if (!passed) {
      summary.passed = false;
      summary.failureReason = span.status.message || 'Unknown failure';
    }

    // Extract edge case data from span attributes
    this.updateEdgeCases(summary, attrs);
  }

  private updateEdgeCases(summary: InvariantSummary, attrs: Record<string, unknown>) {
    const tenureYears = (attrs['invariant.user.tenureYears'] as number) ?? 0;
    const quantities = attrs['invariant.item.quantities'] as number[] | undefined;
    const isFreeShipping = attrs['invariant.shipment.isFreeShipping'] as boolean | undefined;
    const isCapped = attrs['invariant.isCapped'] as boolean | undefined;
    const shippingMethod = attrs['invariant.shippingMethod'] as string | undefined;

    if (tenureYears > 2) summary.edgeCasesCovered.vipUsers++;
    else summary.edgeCasesCovered.nonVipUsers++;

    if (tenureYears === 2) summary.edgeCasesCovered.exactlyTwoYearTenure++;

    quantities?.forEach(q => {
      if (q >= 3) summary.edgeCasesCovered.bulkItems++;
      else summary.edgeCasesCovered.nonBulkItems++;
    });

    if (isFreeShipping) summary.edgeCasesCovered.freeShippingQualifying++;
    else summary.edgeCasesCovered.freeShippingNotQualifying++;

    if (isCapped) summary.edgeCasesCovered.discountCapHit++;

    if (shippingMethod === 'EXPRESS') summary.edgeCasesCovered.expressShipping++;
    else if (shippingMethod === 'EXPEDITED') summary.edgeCasesCovered.expeditedShipping++;
  }

  getSummaries(): InvariantSummary[] {
    return Array.from(this.summaries.values());
  }

  getMetadata(): Map<string, { ruleReference: string; rule: string; tags: string[] }> {
    return this.metadata;
  }

  clear(): void {
    this.summaries.clear();
    this.metadata.clear();
  }
}
```

**Step 1: Create the file**

Write the above content.

**Step 2: Write the test**

Create `packages/shared/test/invariant-span-processor.spec.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { InvariantSpanProcessor } from '../src/modules/invariant-span-processor';
import { SpanStatusCode, trace, context } from '@opentelemetry/api';
import { BasicTracerProvider, InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';

describe('InvariantSpanProcessor', () => {
  let processor: InvariantSpanProcessor;
  let exporter: InMemorySpanExporter;
  let provider: BasicTracerProvider;

  beforeEach(() => {
    processor = new InvariantSpanProcessor();
    exporter = new InMemorySpanExporter();
    provider = new BasicTracerProvider();
    provider.addSpanProcessor(processor);
    provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
    provider.register();
    processor.clear();
    exporter.reset();
  });

  it('aggregates invariant spans into summaries', () => {
    const tracer = trace.getTracer('test');
    
    for (let i = 0; i < 3; i++) {
      const span = tracer.startSpan('VIP discount applied', {
        attributes: {
          'invariant.ruleReference': 'pricing-strategy.md §3',
          'invariant.rule': 'If tenure > 2, 5% discount',
          'invariant.tags': ['@vip', '@pricing'],
          'invariant.user.tenureYears': 5,
          'invariant.item.quantities': [1, 2],
          'invariant.shipment.isFreeShipping': false,
        },
      });
      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
    }

    const summaries = processor.getSummaries();
    expect(summaries).toHaveLength(1);
    expect(summaries[0].totalRuns).toBe(3);
    expect(summaries[0].passed).toBe(true);
    expect(summaries[0].edgeCasesCovered.vipUsers).toBe(3);
  });

  it('marks summary as failed when span fails', () => {
    const tracer = trace.getTracer('test');
    
    const span = tracer.startSpan('Safety valve', {
      attributes: {
        'invariant.ruleReference': 'pricing-strategy.md §4',
        'invariant.rule': 'Max 30% discount',
        'invariant.tags': ['@critical'],
      },
    });
    span.setStatus({ code: SpanStatusCode.ERROR, message: 'Discount exceeded 30%' });
    span.end();

    const summaries = processor.getSummaries();
    expect(summaries[0].passed).toBe(false);
    expect(summaries[0].failureReason).toBe('Discount exceeded 30%');
  });

  it('ignores non-invariant spans', () => {
    const tracer = trace.getTracer('test');
    
    const span = tracer.startSpan('HTTP GET /health');
    span.setStatus({ code: SpanStatusCode.OK });
    span.end();

    expect(processor.getSummaries()).toHaveLength(0);
  });
});
```

**Step 3: Run the test**

```bash
cd packages/shared && npx vitest run test/invariant-span-processor.spec.ts
```

**Step 4: Commit**

```bash
git add packages/shared/src/modules/invariant-span-processor.ts packages/shared/test/invariant-span-processor.spec.ts
git commit -m "feat: InvariantSpanProcessor replaces TestTracer aggregation"
```

---

### Task 4: Create OTel Invariant Helper (replaces verifyInvariant)

**Files:**
- Create: `packages/domain/test/fixtures/otel-invariant-helper.ts`

This replaces the current `verifyInvariant` in `invariant-helper.ts`. Instead of calling `tracer.log()`, it creates OTel spans with attributes.

```typescript
import * as fc from 'fast-check';
import { expect } from 'vitest';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { PricingEngine, ShippingMethod } from '../../src';
import type { CartItem, User, PricingResult } from '../../src';
import { cartArb, userArb, shippingMethodArb } from '../../../shared/fixtures';
import { registerAllureMetadata } from '../../../shared/fixtures/allure-helpers';

export interface InvariantMetadata {
  name?: string;
  ruleReference: string;
  rule: string;
  tags: string[];
}

type AssertionCallback = (items: CartItem[], user: User, result: PricingResult) => void;

export function verifyInvariant(
  metadata: InvariantMetadata,
  assertion: AssertionCallback
) {
  const name = metadata.name || expect.getState().currentTestName!;

  registerAllureMetadata((globalThis as any).allure, {
    ...metadata,
    name,
    parentSuite: 'API Verification',
    suite: 'Pricing',
    feature: 'Pricing',
  });

  const tracer = trace.getTracer('executable-specs-domain');

  fc.assert(
    fc.property(cartArb, userArb, (items, user) => {
      const span = tracer.startSpan(name, {
        attributes: {
          'invariant.ruleReference': metadata.ruleReference,
          'invariant.rule': metadata.rule,
          'invariant.tags': metadata.tags,
          'invariant.user.tenureYears': user.tenureYears,
          'invariant.item.quantities': items.map(i => i.quantity),
          'invariant.item.count': items.length,
        },
      });

      try {
        const result = PricingEngine.calculate(items, user);

        // Add output as span attributes (sampled — not every field)
        span.setAttributes({
          'invariant.originalTotal': result.originalTotal,
          'invariant.finalTotal': result.finalTotal,
          'invariant.totalDiscount': result.totalDiscount,
          'invariant.isCapped': result.isCapped,
          'invariant.shipment.isFreeShipping': result.shipment.isFreeShipping,
          'invariant.shipment.totalShipping': result.shipment.totalShipping,
          'invariant.shippingMethod': result.shipment.method,
        });

        assertion(items, user, result);
        span.setStatus({ code: SpanStatusCode.OK });
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : String(error),
        });
        span.recordException(error instanceof Error ? error : new Error(String(error)));
        throw error;
      } finally {
        span.end();
      }

      return true;
    }),
    { verbose: true }
  );
}
```

**Step 1: Create the file**

**Step 2: Update existing invariant-helper.ts to use OTel**

Edit `packages/domain/test/fixtures/invariant-helper.ts` — replace the `tracer.log()` calls with OTel span creation. The key change in `verifyInvariant`:

```typescript
// Replace this:
tracer.log(name, { items, user }, result);

// With OTel span creation (as shown in the file above)
```

Actually, the cleanest approach: **replace the imports** in existing test files to use the new OTel-based helper, keeping the same function signature so tests don't change.

**Step 3: Update test file imports**

In `packages/domain/test/pricing.properties.test.ts`, `packages/domain/test/integration.properties.test.ts`, `packages/domain/test/shipping.properties.test.ts`:

Change:
```typescript
import { verifyInvariant, verifyShippingInvariant } from './fixtures/invariant-helper';
```
To:
```typescript
import { verifyInvariant, verifyShippingInvariant } from './fixtures/otel-invariant-helper';
```

**Step 4: Run domain tests**

```bash
cd packages/domain && pnpm test
```

Expected: All tests pass, spans are created in memory.

**Step 5: Commit**

```bash
git add packages/domain/test/fixtures/otel-invariant-helper.ts packages/domain/test/fixtures/invariant-helper.ts packages/domain/test/*.test.ts packages/domain/test/*.spec.ts
git commit -m "refactor: migrate invariant helpers to OpenTelemetry spans"
```

---

### Task 5: Update Attestation Reporter to Read from OTel

**Files:**
- Modify: `packages/domain/test/reporters/attestation-reporter.ts`

The reporter currently reads from `tracer`. Now it reads from the `InvariantSpanProcessor`.

**Step 1: Update imports**

```typescript
// Replace:
import { tracer } from '../modules/tracer';

// With:
import { getInvariantProcessor } from '@executable-specs/shared';
```

**Step 2: Update all tracer references**

Everywhere the reporter calls:
- `tracer.getInvariantMetadata()` → `getInvariantProcessor()?.getMetadata()`
- `tracer.getInvariantSummaries()` → `getInvariantProcessor()?.getSummaries()`
- `tracer.get(testName)` → query spans from the InMemorySpanExporter
- `tracer.getRunDir()` → remove (no longer file-based)
- `tracer.loadMetadata()` → remove (metadata is in spans)
- `tracer.clear()` → `getInvariantProcessor()?.clear()`

**Step 3: Update onInit**

```typescript
onInit(_vitest: unknown) {
  this.startTime = Date.now();
  // No file-based setup needed — OTel handles it
}
```

**Step 4: Update onTestRunEnd**

```typescript
onTestRunEnd(_modules, _unhandledErrors, _reason) {
  const processor = getInvariantProcessor();
  if (!processor) {
    console.warn('[Attestation] No InvariantSpanProcessor found — skipping report');
    return;
  }

  const summaries = processor.getSummaries();
  const metadata = processor.getMetadata();
  
  // Generate reports using summaries/metadata
  // (rest of report generation stays the same, just data source changes)
}
```

**Step 5: Run tests + reporter**

```bash
cd packages/domain && pnpm run test:allure
```

Expected: Attestation report generates with same format, data now from OTel spans.

**Step 6: Commit**

```bash
git add packages/domain/test/reporters/attestation-reporter.ts
git commit -m "refactor: attestation reporter reads from OTel spans"
```

---

### Task 6: Set Up OTel for Server Runtime

**Files:**
- Create: `packages/server/src/lib/otel.ts`
- Modify: `packages/server/src/server/standalone.ts`

**Step 1: Create server OTel setup**

```typescript
// packages/server/src/lib/otel.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { env } from './env';

let sdk: NodeSDK | null = null;

export function startOtel() {
  if (env.NODE_ENV === 'test' || !process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    return null; // Don't start in tests or without endpoint
  }

  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317';

  sdk = new NodeSDK({
    serviceName: 'executable-specs-api',
    traceExporter: new OTLPTraceExporter({ url: `${endpoint}/v1/traces` }),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({ url: `${endpoint}/v1/metrics` }),
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-http': {
          ignoreIncomingRequestHook: (req) => {
            return req.url === '/health' || req.url === '/metrics';
          },
        },
      }),
    ],
  });

  sdk.start();
  return sdk;
}

export async function shutdownOtel() {
  if (sdk) {
    await sdk.shutdown();
    sdk = null;
  }
}
```

**Step 2: Integrate into standalone.ts**

Add at the top of `packages/server/src/server/standalone.ts`:

```typescript
import { startOtel, shutdownOtel } from '../lib/otel';

// After imports, before seedProducts:
startOtel();
```

Update the graceful shutdown to include OTel:

```typescript
// In shutdown handler:
import { shutdownOtel } from '../lib/otel';
// ...
await shutdownOtel();
```

**Step 3: Verify server starts**

```bash
cd packages/server && pnpm run dev
```

Expected: Server starts normally. If `OTEL_EXPORTER_OTLP_ENDPOINT` is not set, OTel is a no-op.

**Step 4: Commit**

```bash
git add packages/server/src/lib/otel.ts packages/server/src/server/standalone.ts
git commit -m "feat: OpenTelemetry instrumentation for server runtime"
```

---

### Task 7: Create SigNoz Docker Compose

**Files:**
- Create: `docker-compose.observability.yml`

**Step 1: Create the compose file**

```yaml
# =============================================================================
# SigNoz OpenTelemetry Observability Stack
#
# Usage:
#   docker compose -f docker-compose.observability.yml up -d
#   docker compose -f docker-compose.observability.yml down
#
# UI: http://localhost:3301
# =============================================================================

services:
  otel-collector:
    image: signoz/signoz-otel-collector:0.111.5
    container_name: signoz-otel-collector
    command:
      - --config=/etc/otel-collector-config.yaml
    volumes:
      - ./docker/signoz/otel-collector-config.yaml:/etc/otel-collector-config.yaml
    ports:
      - "4317:4317"   # OTLP gRPC
      - "4318:4318"   # OTLP HTTP
    depends_on:
      clickhouse:
        condition: service_healthy
    restart: unless-stopped

  clickhouse:
    image: clickhouse/clickhouse-server:24.1.2-alpine
    container_name: signoz-clickhouse
    volumes:
      - signoz-clickhouse-data:/var/lib/clickhouse
      - ./docker/signoz/clickhouse-config.xml:/etc/clickhouse-server/config.d/custom.xml
    ports:
      - "9000:9000"
      - "8123:8123"
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8123/ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  query-service:
    image: signoz/query-service:0.57.0
    container_name: signoz-query-service
    environment:
      ClickHouseUrl: tcp://clickhouse:9000
    ports:
      - "8080:8080"
    depends_on:
      clickhouse:
        condition: service_healthy
    restart: unless-stopped

  frontend:
    image: signoz/frontend:0.57.0
    container_name: signoz-frontend
    ports:
      - "3301:3301"
    depends_on:
      - query-service
    restart: unless-stopped

volumes:
  signoz-clickhouse-data:
    driver: local
```

**Step 2: Create OTel collector config**

Create `docker/signoz/otel-collector-config.yaml`:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 5s
    send_batch_size: 100

exporters:
  clickhouse:
    dsn: tcp://clickhouse:9000/signoz_traces
    timeout: 10s
    creating_logs_table: false
    creating_metrics_table: false

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [clickhouse]
```

**Step 3: Create ClickHouse config**

Create `docker/signoz/clickhouse-config.xml`:

```xml
<clickhouse>
  <logger>
    <level>warning</level>
    <console>true</console>
  </logger>
</clickhouse>
```

**Step 4: Verify directory structure**

```bash
ls -la docker/signoz/
```

Expected: `otel-collector-config.yaml`, `clickhouse-config.xml`

**Step 5: Commit**

```bash
git add docker-compose.observability.yml docker/signoz/
git commit -m "feat: SigNoz observability stack via Docker Compose"
```

---

### Task 8: Create OTel Setup Test (End-to-End)

**Files:**
- Create: `packages/server/test/otel-setup.integration.test.ts`

This test proves OTel is wired up correctly — spans are created, exported, and contain the right attributes.

**Step 1: Create the test**

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { InMemorySpanExporter, BasicTracerProvider, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';

describe('OpenTelemetry Setup', () => {
  let exporter: InMemorySpanExporter;
  let provider: BasicTracerProvider;

  beforeAll(() => {
    exporter = new InMemorySpanExporter();
    provider = new BasicTracerProvider();
    provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
    provider.register();
  });

  afterAll(async () => {
    await provider.shutdown();
  });

  it('creates spans with invariant attributes', () => {
    const tracer = trace.getTracer('test');
    
    const span = tracer.startSpan('test-invariant', {
      attributes: {
        'invariant.ruleReference': 'pricing-strategy.md §2',
        'invariant.rule': 'Bulk discount for 3+ items',
        'invariant.tags': ['@pricing', '@bulk'],
        'invariant.user.tenureYears': 1,
      },
    });
    span.setStatus({ code: SpanStatusCode.OK });
    span.end();

    const spans = exporter.getFinishedSpans();
    expect(spans).toHaveLength(1);
    expect(spans[0].name).toBe('test-invariant');
    expect(spans[0].attributes['invariant.ruleReference']).toBe('pricing-strategy.md §2');
    expect(spans[0].status.code).toBe(SpanStatusCode.OK);
  });

  it('records failed spans correctly', () => {
    const tracer = trace.getTracer('test');
    
    const span = tracer.startSpan('failing-invariant');
    span.setStatus({ code: SpanStatusCode.ERROR, message: 'Assertion failed' });
    span.end();

    const spans = exporter.getFinishedSpans();
    const lastSpan = spans[spans.length - 1];
    expect(lastSpan.status.code).toBe(SpanStatusCode.ERROR);
    expect(lastSpan.status.message).toBe('Assertion failed');
  });
});
```

**Step 2: Run the test**

```bash
cd packages/server && npx vitest run test/otel-setup.integration.test.ts
```

**Step 3: Commit**

```bash
git add packages/server/test/otel-setup.integration.test.ts
git commit -m "test: OpenTelemetry setup integration test"
```

---

### Task 9: Delete Old TestTracer Implementation

**Files:**
- Delete: `packages/domain/test/modules/tracer.ts`
- Delete: `packages/shared/src/modules/tracer.ts` (keep the types if used elsewhere, or move them)

**Step 1: Check what still references the old tracer**

```bash
rg "from.*tracer" packages/
rg "import.*tracer" packages/
```

**Step 2: Migrate remaining references**

Any file still importing from the old tracer should be updated to use OTel. The `Interaction` and `InvariantMetadata` types can stay in `packages/shared/src/modules/tracer.ts` as pure type exports (no implementation).

**Step 3: Delete the implementation**

Remove the `TestTracer` class and `tracer` instance from both files. Keep only type exports if needed.

**Step 4: Run full test suite**

```bash
pnpm run test:all
```

Expected: All tests pass, attestation reports generate from OTel span data.

**Step 5: Commit**

```bash
git add packages/domain/test/modules/tracer.ts packages/shared/src/modules/tracer.ts
git commit -m "refactor: remove TestTracer implementation, OTel is now the foundation"
```

---

### Task 10: Update Documentation

**Files:**
- Modify: `docs/what-is-next.md`
- Create: `docs/OTEL_GUIDE.md`

**Step 1: Create OTEL_GUIDE.md**

```markdown
# OpenTelemetry Observability Guide

## Architecture

OpenTelemetry is the unified observability foundation for this repository:

- **Tests:** Spans capture invariant executions → `InvariantSpanProcessor` aggregates → attestation reports
- **Runtime:** Spans/metrics exported to SigNoz via OTLP/gRPC

## Quick Start

### View Traces in SigNoz

```bash
# Start SigNoz stack
docker compose -f docker-compose.observability.yml up -d

# Start the app with OTel enabled
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317 pnpm run dev:backend

# Open SigNoz UI
open http://localhost:3301
```

### Run Tests with OTel

Tests automatically use in-memory OTel. No configuration needed.

```bash
pnpm run test:all
```

## Span Attributes

Invariant spans carry these attributes:

| Attribute | Type | Description |
|-----------|------|-------------|
| `invariant.ruleReference` | string | Business rule location (e.g. "pricing-strategy.md §3") |
| `invariant.rule` | string | Human-readable rule description |
| `invariant.tags` | string[] | Serenity-style tags |
| `invariant.user.tenureYears` | number | User tenure for edge case tracking |
| `invariant.item.quantities` | number[] | Item quantities for bulk detection |
| `invariant.originalTotal` | number | Cart original total (cents) |
| `invariant.finalTotal` | number | Final total after discounts (cents) |
| `invariant.isCapped` | boolean | Safety valve triggered |
| `invariant.shipment.isFreeShipping` | boolean | Free shipping qualified |
| `invariant.shippingMethod` | string | STANDARD / EXPEDITED / EXPRESS |

## SigNoz Queries

Find all invariant violations:
```
invariant.ruleReference EXISTS AND status = ERROR
```

Find VIP edge cases:
```
invariant.user.tenureYears > 2
```

## Migration from TestTracer

The old `TestTracer` has been replaced. All observability now flows through OTel:
- `tracer.log()` → OTel span with attributes
- `InvariantSummary` → aggregated from span data by `InvariantSpanProcessor`
- Attestation reports → unchanged output, OTel data source
```

**Step 2: Update what-is-next.md**

Update the status to reflect OTel completion and remove completed items.

**Step 3: Commit**

```bash
git add docs/OTEL_GUIDE.md docs/what-is-next.md
git commit -m "docs: OpenTelemetry observability guide"
```

---

### Task 11: Final Verification — Full Test Suite

**Step 1: Run everything**

```bash
pnpm run test:all
```

**Step 2: Verify attestation reports**

```bash
ls -la reports/
```

Check that reports contain the same structure (executive summary, traceability matrix, audit log) but are now powered by OTel.

**Step 3: Verify SigNoz stack starts**

```bash
docker compose -f docker-compose.observability.yml up -d
docker compose -f docker-compose.observability.yml ps
```

Expected: All 4 services (otel-collector, clickhouse, query-service, frontend) running.

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: OpenTelemetry observability complete"
```

---

## Summary of File Changes

| Action | File | Purpose |
|--------|------|---------|
| Create | `packages/shared/src/modules/otel-setup.ts` | OTel SDK initialization |
| Create | `packages/shared/src/modules/invariant-span-processor.ts` | Replaces TestTracer aggregation |
| Create | `packages/domain/test/fixtures/otel-invariant-helper.ts` | OTel-based verifyInvariant |
| Create | `packages/server/src/lib/otel.ts` | Server runtime OTel setup |
| Create | `packages/server/test/otel-setup.integration.test.ts` | OTel setup verification |
| Create | `docker-compose.observability.yml` | SigNoz stack |
| Create | `docker/signoz/otel-collector-config.yaml` | OTel collector config |
| Create | `docker/signoz/clickhouse-config.xml` | ClickHouse config |
| Create | `docs/OTEL_GUIDE.md` | Documentation |
| Modify | `packages/shared/src/index.ts` | Export OTel setup |
| Modify | `packages/domain/test/fixtures/invariant-helper.ts` | Migrate to OTel |
| Modify | `packages/domain/test/reporters/attestation-reporter.ts` | Read from OTel spans |
| Modify | `packages/server/src/server/standalone.ts` | Start OTel on boot |
| Modify | `packages/server/package.json` | Add OTel dependencies |
| Delete | `packages/domain/test/modules/tracer.ts` | Replaced by OTel |
| Modify | `packages/shared/src/modules/tracer.ts` | Keep types only, remove impl |
