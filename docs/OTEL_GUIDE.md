# OpenTelemetry Observability Guide

## Architecture

OpenTelemetry is the unified observability foundation for this repository:

- **Tests:** Spans capture invariant executions → `InvariantSpanProcessor` aggregates → attestation reports
- **Runtime:** Spans/metrics exported to SigNoz via OTLP/gRPC

### Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `otel-setup.ts` | `packages/shared/src/modules/` | SDK initialization, mode switching (test/production) |
| `invariant-span-processor.ts` | `packages/shared/src/modules/` | Aggregates invariant spans, persists summaries to disk |
| `invariant-helper.ts` | `packages/domain/test/fixtures/` | Creates OTel spans for each invariant execution |
| `tracer-types.ts` | `packages/shared/src/modules/` | Shared type definitions (`InvariantSummary`, etc.) |

### Data Flow

```
Test executes verifyInvariant()
  → OTel span created with attributes (tenure, quantities, totals, etc.)
  → InvariantSpanProcessor.onEnd() extracts edge case data
  → Summaries persisted to /tmp/vitest-otel-data/summaries.json
  → Reporter reads summaries for attestation report
```

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

Test mode uses `InMemorySpanExporter` + `InvariantSpanProcessor` — no external services required.

## Span Attributes

Invariant spans carry these attributes:

| Attribute | Type | Description |
|-----------|------|-------------|
| `invariant.ruleReference` | string | Business rule location (e.g. "pricing-strategy.md §3") |
| `invariant.rule` | string | Human-readable rule description |
| `invariant.tags` | string[] | Serenity-style tags |
| `invariant.user.tenureYears` | number | User tenure for edge case tracking |
| `invariant.item.quantities` | number[] | Item quantities for bulk detection |
| `invariant.item.count` | number | Number of line items in cart |
| `invariant.originalTotal` | number | Cart original total (cents) |
| `invariant.finalTotal` | number | Final total after discounts (cents) |
| `invariant.totalDiscount` | number | Total discount amount (cents) |
| `invariant.isCapped` | boolean | Safety valve triggered (30% cap) |
| `invariant.shipment.isFreeShipping` | boolean | Free shipping qualified |
| `invariant.shipment.totalShipping` | number | Shipping cost (cents) |
| `invariant.shippingMethod` | string | STANDARD / EXPEDITED / EXPRESS |

### Edge Case Detection

The `InvariantSpanProcessor` derives these edge cases from span attributes:

| Edge Case | Condition | Counter |
|-----------|-----------|---------|
| VIP users | `tenureYears > 2` | `edgeCasesCovered.vipUsers` |
| Non-VIP users | `tenureYears <= 2` | `edgeCasesCovered.nonVipUsers` |
| Exactly 2-year tenure | `tenureYears === 2` | `edgeCasesCovered.exactlyTwoYearTenure` |
| Bulk items | `quantity >= 3` | `edgeCasesCovered.bulkItems` |
| Free shipping qualifying | `isFreeShipping === true` | `edgeCasesCovered.freeShippingQualifying` |
| Discount cap hit | `isCapped === true` | `edgeCasesCovered.discountCapHit` |
| Express shipping | `shippingMethod === 'EXPRESS'` | `edgeCasesCovered.expressShipping` |
| Expedited shipping | `shippingMethod === 'EXPEDITED'` | `edgeCasesCovered.expeditedShipping` |

## SigNoz Queries

Find all invariant violations:
```
invariant.ruleReference EXISTS AND status = ERROR
```

Find VIP edge cases:
```
invariant.user.tenureYears > 2
```

Find capped discounts:
```
invariant.isCapped = true
```

Find bulk purchase scenarios:
```
invariant.item.quantities[*] >= 3
```

## Migration from TestTracer

The old `TestTracer` has been replaced. All observability now flows through OTel:

| Old Pattern | New Pattern |
|-------------|-------------|
| `tracer.log(testName, input, output)` | OTel span with `invariant.input` / `invariant.output` attributes |
| `InvariantSummary` (in-memory) | Aggregated from span data by `InvariantSpanProcessor` |
| Manual trace collection | Automatic via `InvariantSpanProcessor` → `/tmp/vitest-otel-data/` |
| Attestation reports | Unchanged output, OTel data source |

### What Changed

- **No more manual tracer calls** — `verifyInvariant()` and `verifyShippingInvariant()` create spans automatically
- **No more `any` types** — strict TypeScript throughout the OTel stack
- **Real-time persistence** — summaries written to disk on every span end, not just at test completion
- **Mode switching** — `setupOtel()` handles test (in-memory) vs production (OTLP/gRPC) modes

## SigNoz Stack

The observability stack (`docker-compose.observability.yml`) includes:

| Service | Port | Purpose |
|---------|------|---------|
| `otel-collector` | 4317 (gRPC), 4318 (HTTP) | Receives OTLP data |
| `clickhouse` | 9000 (native), 8123 (HTTP) | Time-series storage |
| `query-service` | 8080 | Query API |
| `frontend` | 3301 | SigNoz UI |

```bash
# Start
docker compose -f docker-compose.observability.yml up -d

# Stop
docker compose -f docker-compose.observability.yml down

# View logs
docker compose -f docker-compose.observability.yml logs -f otel-collector
```

## Worker Isolation Contract

### The Problem

Vitest runs tests in parallel workers (controlled by `VITEST_POOL_ID`). Each worker process has its own in-memory `InvariantSpanProcessor` instance. The `AttestationReporter` runs in the main process and cannot directly access worker-local memory. Without a cross-process data sharing mechanism, OTel telemetry data collected by workers would be lost before the reporter generates attestation reports.

### The Solution

File-based persistence with worker-specific files. Each worker writes its OTel data to a uniquely named file in a shared temporary directory. The reporter reads and merges all worker files after all tests complete.

This eliminates race conditions (no shared mutable state) and ensures complete data capture regardless of worker count or scheduling.

### File Naming Convention

| File Type | Pattern | Example |
|-----------|---------|---------|
| Directory | `/tmp/vitest-otel-data/` | — |
| Summaries | `summaries-{workerId}.json` | `summaries-1.json`, `summaries-42.json` |
| Metadata | `metadata-{workerId}.json` | `metadata-1.json`, `metadata-42.json` |

The `workerId` is resolved as `process.env.VITEST_POOL_ID` (set by Vitest) or falls back to `process.pid` for non-Vitest contexts.

### Write Path

**File:** `packages/domain/test/setup/otel-test-setup.ts`

1. On initialization: creates `/tmp/vitest-otel-data/` if it doesn't exist
2. On `afterAll` hook: calls `persistOtelData()` which:
   - Retrieves metadata and summaries from the worker's `InvariantSpanProcessor`
   - Skips writing if both are empty (prevents empty workers from overwriting valid data)
   - Writes `metadata-{workerId}.json` as an array of `{ name, ruleReference, rule, tags }` entries
   - Writes `summaries-{workerId}.json` as an array of `InvariantSummary` objects
3. The `afterAll` hook also triggers `shutdownOtel()` to clean up the OTel SDK

```
Worker Process                          File System
┌─────────────────────┐                 ┌──────────────────────────────┐
│ InvariantSpanProcessor│  afterAll()    │ /tmp/vitest-otel-data/       │
│  ├─ getMetadata()     ├──────────────►│   summaries-1.json           │
│  └─ getSummaries()    │               │   metadata-1.json            │
└─────────────────────┘                 │   summaries-2.json           │
                                        │   metadata-2.json            │
                                        │   ...                        │
                                        └──────────────────────────────┘
```

### Read Path

**File:** `packages/domain/test/reporters/attestation-reporter.ts`

The `readPersistedOtelData()` function (lines 39-95) executes in the main process when the reporter's `onTestRunEnd` fires:

1. Reads all `metadata-*.json` files from `/tmp/vitest-otel-data/`
2. Reads all `summaries-*.json` files from the same directory
3. If the directory doesn't exist, returns empty collections (graceful degradation)
4. Returns merged `{ metadata, summaries }` for report generation

### Merge Logic

**Metadata:** First-write-wins. If multiple workers record metadata for the same invariant name, the first encountered entry is kept. This is safe because metadata (rule reference, rule text, tags) is identical across workers for the same invariant.

**Summaries:** Aggregated by `name` field:

| Field | Merge Strategy |
|-------|---------------|
| `totalRuns` | Summed across workers |
| `passed` | `false` if **any** worker reported failure |
| `failureReason` | Taken from the failing worker |
| `edgeCasesCovered.*` | Summed across workers (each counter type) |

This ensures the attestation report reflects the complete picture: total executions across all workers, with failures surfacing correctly.

```
Reporter (Main Process)
┌─────────────────────────────────────────────────────┐
│ readPersistedOtelData()                             │
│                                                     │
│  Read summaries-1.json ─┐                           │
│  Read summaries-2.json ─┤  Merge by name:            │
│  Read summaries-3.json ─┤   ├─ sum totalRuns         │
│                         └──►├─ fail if any failed    │
│                              └─ sum edge cases       │
│                                                     │
│  Read metadata-1.json  ─┐                           │
│  Read metadata-2.json  ─┤  First-write-wins          │
│  Read metadata-3.json  ─┘  (deduplicate by name)     │
│                                                     │
│  → Return merged { metadata, summaries }             │
└─────────────────────────────────────────────────────┘
```

### Edge Cases

| Scenario | Behavior |
|----------|----------|
| Empty worker (no invariants executed) | `persistOtelData()` returns early — no file written, no overwrite of other workers' data |
| Missing `/tmp/vitest-otel-data/` directory | `readPersistedOtelData()` returns empty collections; reporter logs a warning but continues |
| Read errors on individual files | Caught and ignored per-file; other files still processed |
| Same invariant name across workers | Summaries aggregated (totalRuns summed, edgeCasesCovered summed); metadata deduplicated |

### Verification

The isolation contract is verified by `packages/domain/test/otel-worker-isolation.test.ts`, which:

1. Creates OTel spans in the current worker
2. Asserts worker-specific files are written (`summaries-{workerId}.json`, `metadata-{workerId}.json`)
3. Simulates a second worker by writing `summaries-999.json`
4. Runs the merge logic and asserts both workers' data is present in the merged result
5. Cleans up simulated files after verification

---

## Span Attribute Contract

This section formalizes the contract for all span attributes used by invariant helpers, the `InvariantSpanProcessor`, and reporters. This is the single source of truth for span attribute naming, types, and usage.

### Naming Convention

All invariant-related span attributes use the `invariant.` prefix namespace. This namespace gate is used by `InvariantSpanProcessor.onEnd()` — any span without `invariant.ruleReference` is ignored.

### Complete Attribute Table

| Attribute | Type | Set By | Read By | Description |
|-----------|------|--------|---------|-------------|
| `invariant.ruleReference` | string | All invariant helpers | InvariantSpanProcessor, Reporter | Business rule location (e.g. "pricing-strategy.md §3") |
| `invariant.rule` | string | All invariant helpers | InvariantSpanProcessor, Reporter | Human-readable rule text |
| `invariant.tags` | string[] | All invariant helpers | InvariantSpanProcessor, Reporter | Serenity-style tags |
| `invariant.user.tenureYears` | number | verifyInvariant, verifyShippingInvariant | InvariantSpanProcessor | User tenure for VIP edge case tracking |
| `invariant.item.quantities` | number[] | verifyInvariant, verifyShippingInvariant | InvariantSpanProcessor | Per-item quantities for bulk detection |
| `invariant.item.count` | number | verifyInvariant, verifyShippingInvariant | — | Total item count in cart |
| `invariant.originalTotal` | number | verifyInvariant, verifyShippingInvariant | — | Cart original total in cents |
| `invariant.finalTotal` | number | verifyInvariant, verifyShippingInvariant | — | Final total after discounts in cents |
| `invariant.totalDiscount` | number | verifyInvariant, verifyShippingInvariant | — | Total discount amount in cents |
| `invariant.isCapped` | boolean | verifyInvariant, verifyShippingInvariant | InvariantSpanProcessor | Safety valve triggered |
| `invariant.shipment.isFreeShipping` | boolean | verifyInvariant, verifyShippingInvariant | InvariantSpanProcessor | Free shipping qualified |
| `invariant.shipment.totalShipping` | number | verifyInvariant, verifyShippingInvariant | — | Total shipping cost in cents |
| `invariant.shippingMethod` | string | verifyInvariant, verifyShippingInvariant | InvariantSpanProcessor | STANDARD / EXPEDITED / EXPRESS |
| `invariant.input` | string (JSON) | verifyExample, logPrecondition | — | Serialized test input |
| `invariant.output` | string (JSON) | verifyExample, logPrecondition | — | Serialized test output |

### Span Naming Convention

| Span Pattern | Example | Set By |
|--------------|---------|--------|
| Invariant execution | `"VIP discount applied"` | verifyInvariant, verifyShippingInvariant, verifyExample |
| Registration | `invariant.register:{name}` | registerInvariant (called by verifyInvariant, verifyShippingInvariant) |
| Precondition | `precondition:{name}` | registerPrecondition |
| Precondition log | `precondition.log:{name}` | logPrecondition |

### Required vs Optional

**Required for InvariantSpanProcessor:**
- `invariant.ruleReference` — Gate attribute. Without it, the span is ignored entirely (`InvariantSpanProcessor.onEnd()` returns early).

**Required for Reporter:**
- `invariant.ruleReference` — Links report entry to business rule
- `invariant.rule` — Human-readable description in report
- `invariant.tags` — Categorization and filtering

**Optional (edge case tracking):**
- All other attributes — Used by `InvariantSpanProcessor.updateEdgeCases()` for coverage metrics. Absence does not break processing; missing values default to safe fallbacks (0, false, undefined).

### Source Locations

| Component | File |
|-----------|------|
| Attribute setters | `packages/domain/test/fixtures/invariant-helper.ts` |
| Attribute readers | `packages/shared/src/modules/invariant-span-processor.ts` |
| OTel setup | `packages/domain/test/setup/otel-test-setup.ts` |
