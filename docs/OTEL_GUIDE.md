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
