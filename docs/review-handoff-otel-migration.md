# OpenTelemetry Migration — Reviewer Handoff

## What Changed

The custom `TestTracer` has been replaced with **OpenTelemetry** as the unified observability foundation. All test-time invariant tracking and future runtime tracing now flow through OTel spans.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Test Layer (Vitest)                                        │
│                                                             │
│  verifyInvariant() ──► OTel span with invariant.* attrs     │
│        │                                                     │
│        ▼                                                     │
│  InvariantSpanProcessor ──► InvariantSummary aggregation    │
│        │                                                     │
│        ▼                                                     │
│  AttestationReporter ──► HTML/Markdown reports (unchanged)  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Runtime Layer (Hono Server)                                │
│                                                             │
│  startOtel() ──► auto-instrumentation (HTTP, DB, etc.)      │
│        │                                                     │
│        ├── OTEL_EXPORTER_OTLP_ENDPOINT → SigNoz (gRPC)      │
│        ├── OTEL_FILE_EXPORTER_PATH     → JSONL file (CI)    │
│        └── neither set                 → no-op              │
└─────────────────────────────────────────────────────────────┘
```

## Files Changed (16 files)

### New Files (8)
| File | Purpose |
|------|---------|
| `packages/shared/src/modules/otel-setup.ts` | OTel SDK initialization (test + production modes) |
| `packages/shared/src/modules/invariant-span-processor.ts` | **Core** — processes OTel spans into InvariantSummary for attestation reports |
| `packages/shared/test/invariant-span-processor.spec.ts` | Tests for the span processor |
| `packages/domain/test/setup/otel-test-setup.ts` | Vitest setup — registers OTel provider + persists data for reporter |
| `packages/server/src/lib/otel.ts` | Server runtime OTel with file + remote exporters |
| `packages/server/test/otel-setup.integration.test.ts` | OTel setup verification test |
| `docker-compose.observability.yml` | SigNoz stack (otel-collector, clickhouse, query-service, frontend) |
| `docker/signoz/otel-collector-config.yaml` | OTel collector config for SigNoz |
| `docker/signoz/clickhouse-config.xml` | ClickHouse logging config |

### Modified Files (7)
| File | What Changed |
|------|-------------|
| `packages/shared/src/index.ts` | Added exports for `setupOtel`, `shutdownOtel`, `getInvariantProcessor` |
| `packages/shared/package.json` | Added vitest devDependency, OTel runtime deps |
| `packages/domain/package.json` | Added `@opentelemetry/api`, `@opentelemetry/sdk-trace-base` |
| `packages/domain/test/fixtures/invariant-helper.ts` | **Key change** — replaced `tracer.log()` with OTel span creation |
| `packages/domain/vitest.config.ts` | Added OTel setup file to `setupFiles` |
| `packages/domain/vitest.config.allure.ts` | Added OTel setup file to `setupFiles` |
| `packages/domain/test/reporters/attestation-reporter.ts` | Reads from `getInvariantProcessor()` instead of old `tracer` |
| `packages/domain/test/statistics.spec.ts` | Updated to use OTel processor instead of old tracer |
| `packages/server/package.json` | Added OTel SDK + instrumentation deps |
| `packages/server/src/server/standalone.ts` | Calls `startOtel()` on boot |
| `packages/server/src/server/shutdown.ts` | Already had `shutdownOtel()` call (pre-existing) |
| `.github/workflows/ci.yml` | Added `OTEL_FILE_EXPORTER_PATH` env + trace artifact upload |

### Unchanged (kept for type exports only)
| File | Status |
|------|--------|
| `packages/shared/src/modules/tracer.ts` | Types only (`InvariantSummary`, `InvariantMetadata`, `Interaction`) — implementation removed |
| `packages/domain/test/modules/tracer.ts` | Still exists but no longer the primary data source |

## Key Design Decisions

### 1. InvariantSpanProcessor replaces TestTracer
The old `TestTracer` aggregated test executions into `InvariantSummary` objects via direct method calls. Now the `InvariantSpanProcessor` (an OTel `SpanProcessor`) does the same aggregation by reading span attributes. Every invariant span carries `invariant.ruleReference`, `invariant.rule`, `invariant.tags`, and edge-case data as attributes.

### 2. Attestation reports unchanged
Same HTML/Markdown output, same format. Only the data source changed from `tracer.getInvariantSummaries()` to `getInvariantProcessor().getSummaries()`.

### 3. File-based exporter for CI
The third-party `opentelemetry-exporter-trace-otlp-file` package is incompatible with OTel SDK v2. Wrote a custom `JsonlFileExporter` (20 lines) instead. CI sets `OTEL_FILE_EXPORTER_PATH` to capture traces as artifacts.

### 4. Vitest worker isolation
Vitest runs tests in worker processes but the reporter runs in the main process. The setup file persists OTel data to `/tmp/vitest-otel-data/` so the reporter can read it after tests complete.

## What to Verify

### Must-pass tests
```bash
# Domain tests — 144 passing, 0 failing
cd packages/domain && pnpm test

# Shared package tests — 3 passing
cd packages/shared && pnpm test

# Server OTel test — 2 passing
cd packages/server && pnpm test
```

### Attestation report still generates
```bash
cd packages/domain && pnpm run test:allure
# Should see: [Attestation] N invariants from OTel spans
# Reports at: reports/<timestamp>/attestation-light.html
```

### Server starts without OTel (no-op mode)
```bash
cd packages/server && npx tsx src/server/standalone.ts
# Should start normally — OTel is a no-op without env vars
```

### File exporter works
```bash
OTEL_FILE_EXPORTER_PATH=/tmp/test.jsonl npx tsx -e "
  import { startOtel, shutdownOtel } from './packages/server/src/lib/otel';
  startOtel();
  // ... create spans ...
  await shutdownOtel();
"
# /tmp/test.jsonl should contain JSONL span data
```

### TypeScript compiles everywhere
```bash
cd packages/shared && npx tsc --noEmit
cd packages/domain && npx tsc --noEmit
cd packages/server && npx tsc --noEmit
```

## Known Gaps / TODOs

| Item | Status | Notes |
|------|--------|-------|
| Delete old tracer implementation files | Pending | `packages/domain/test/modules/tracer.ts` and implementation parts of `packages/shared/src/modules/tracer.ts` should be cleaned up after review |
| E2E test Playwright OTel integration | Not started | Playwright tests don't yet emit OTel spans |
| SigNoz stack tested end-to-end | Not tested | Docker compose file created but not run against the app |
| Documentation (OTEL_GUIDE.md) | Not written | Plan has the content, just needs to be created |

## Risk Areas

1. **OTel SDK v2 API changes** — The `@opentelemetry/sdk-node@0.214.0` is OTel SDK v2 which has breaking changes from v1. The `BasicTracerProvider` no longer has `addSpanProcessor()` or `register()` — we use constructor config and `trace.setGlobalTracerProvider()` instead.

2. **Vitest worker isolation** — The OTel data persistence via `/tmp/vitest-otel-data/` is a workaround for vitest's process model. If tests run in parallel workers, each worker writes its own file. The reporter reads all files. This works but could be fragile.

3. **Third-party file exporter broken** — `opentelemetry-exporter-trace-otlp-file@1.0.3` crashes with OTel SDK v2 due to a changed internal API (`createExportTraceServiceRequest`). The custom `JsonlFileExporter` avoids this but is simpler (no batching, no retry).

## How to Review

1. **Start with the core**: Read `packages/shared/src/modules/invariant-span-processor.ts` — this is the bridge between OTel spans and attestation reports.

2. **Then the helper**: Read `packages/domain/test/fixtures/invariant-helper.ts` — this is where every invariant test creates OTel spans.

3. **Then the wiring**: Read `packages/domain/test/setup/otel-test-setup.ts` — this connects OTel to vitest.

4. **Then the reporter**: Read `packages/domain/test/reporters/attestation-reporter.ts` — verify it reads from OTel correctly.

5. **Run the tests**: If all 149 tests pass and the attestation report generates, the migration is functionally complete.
