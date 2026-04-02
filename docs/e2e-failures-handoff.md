# E2E Test Failures — Handoff Document

**Date:** 2026-04-02
**Status:** ✅ RESOLVED — All 175 E2E/API tests passing

---

## Resolution Summary

### Root Cause (Two Issues)

**Issue 1: `util5.inherits is not a function` — Browser bundle contamination**

The `@hono/vite-dev-server` plugin in `packages/client/vite.config.ts` bundled the server entry point into the browser module graph. Even with `exclude` filtering requests, the server code (importing `better-sqlite3`, `drizzle-orm`, `crypto`, `path`, `fs`) got pulled into the client bundle. These Node-only modules can't run in the browser.

**Additionally:** `packages/shared/src/index.ts` exported OTel setup functions (`setupOtel`, `shutdownOtel`, `getInvariantProcessor`) from `./modules/otel-setup`, which imports `@opentelemetry/sdk-node` and other Node.js-only packages. Even though the client only imported `formatCurrency` and schema types from `@executable-specs/shared`, Vite resolved the entire module graph including the OTel modules.

**Issue 2: Rate limiting blocking E2E tests (429 errors)**

The rate limiting middleware skips in dev/test only when `NODE_ENV` is set. The API server ran as a separate process without `NODE_ENV`, so rate limits (3 per hour for registration, 5 per 15 min for login, etc.) kicked in during rapid E2E test execution.

### Fixes Applied

**1. Removed `@hono/vite-dev-server` plugin** (`packages/client/vite.config.ts`)
- Removed the `devServer` plugin and `@executable-specs/server` alias
- Added `server.proxy` to forward `/api`, `/health`, `/readyz`, `/livez`, `/metrics` to `http://localhost:3000`
- Removed `better-sqlite3`, `drizzle-orm`, `stripe`, `hono` from `optimizeDeps` (no longer needed)

**2. Separated browser-safe from Node-only exports** (`packages/shared/src/index.ts`)
- Removed `export { setupOtel, shutdownOtel, getInvariantProcessor } from './modules/otel-setup'` from the barrel export
- All server/test code already imports OTel via deep path (`@executable-specs/shared/modules/otel-setup`), so nothing broke

**3. Updated Playwright config** (`test/playwright.config.ts`)
- Changed `webServer` from single object to array with two entries:
  - API server: `pnpm --filter @executable-specs/server run dev` on port 3000
  - Vite dev server: `pnpm --filter @executable-specs/client run dev` on port 5173
- Added `NODE_ENV: 'test'` to API server env to disable rate limiting

**4. Cleaned up `index.html`** (`packages/client/index.html`)
- Removed `<meta http-equiv="X-Frame-Options" content="DENY">` (invalid per spec, just a browser warning)
- Added `ws://localhost:*` to CSP `connect-src` for Vite HMR websocket

### Results

| Before | After |
|--------|-------|
| 110 passed, 66 failed | **175 passed, 0 failed** |
| ~30s per timeout | ~30s total |

---

## Previous Session Context (39 commits)

### Bug Fixes (16 commits)
1. Quick wins: copyright year, dead comments, aria-label, lazy loading, duplicates, unused component
2. Domain TypeScript: 30+ verbatimModuleSyntax errors → 0
3. Standalone server: fixed static file serving + module mutation
4. Checkout flow: implemented actual order submission API call + correct navigation
5. Shared package: added @types/node
6. E2E: re-enabled TypeScript pre-check
7. Security: guarded auth/debug routes behind environment checks
8. Security: replaced z.any() with proper Zod schemas
9. Security: fixed spoofable rate limiting fallback

### New Tests Added (11 commits)
1. Consecutive orders reliability test (6 orders without state reset)
2. Fixed cart-store test imports (10 tests now working)
3. Strengthened orders API tests with real data creation
4. Payment cancel + intent status API tests (6 tests)
5. Security headers middleware test (17 tests)
6. Rate limiting middleware test (24 tests)
7. Cart domain functions unit tests (15 tests)
8. Full order lifecycle E2E test (4 tests)
9. Authenticated shopping flow E2E test (4 tests)
10. Currency utility unit tests (13 tests)
11. Schema alignment fixes for test data

---

## Architecture Notes

### Dev Server Architecture (Post-Fix)

```
┌─────────────────┐     proxy      ┌──────────────────┐
│  Vite Dev       │ ──────────────→│  Hono API        │
│  localhost:5173  │  /api/*        │  localhost:3000   │
│  (client only)  │  /health       │  (server only)    │
│                 │  /readyz       │                   │
│                 │  /livez        │                   │
└─────────────────┘  /metrics      └──────────────────┘
```

- Client bundle is pure browser code (React, Zod, Zustand)
- Server bundle is pure Node.js code (better-sqlite3, drizzle-orm, OTel)
- No cross-contamination between bundles

### Key Lessons

1. **`@hono/vite-dev-server` is dangerous with Node-heavy server code** — It pulls the entire server module graph into the browser bundle. Use `server.proxy` instead.

2. **Barrel exports (`index.ts`) must be browser-safe** — Any Node.js module in the export chain contaminates the client bundle. Use `index-server.ts` for Node-only exports.

3. **Rate limiting needs explicit opt-out** — If `NODE_ENV` isn't set, rate limits apply. CI/test environments must set `NODE_ENV=test`.

4. **`util5.inherits is not a function` = Node.js polyfill missing** — This error in a browser context means a Node.js module leaked into the browser bundle. Search the module graph for `util`, `crypto`, `fs`, `path` imports.

---

## Current Test Status

| Suite | Status | Count |
|-------|--------|-------|
| Domain tests | ✅ | 156 passed, 1 skipped |
| Client tests | ✅ | 10 passed |
| E2E + API tests | ✅ | 175 passed |
| TypeScript | ✅ | 0 errors (5 packages) |

**Full suite:** `pnpm run test:all` — all passing with attestation report generated.

---

## OTel Cleanup Session (2026-04-02)

Following the E2E fix, a review identified leftover OTel migration debt. The following was completed:

### Completed

| Item | What Was Done |
|------|--------------|
| **Delete old tracer code** | Removed `TestTracer` class from `packages/shared` (203 lines) and `packages/domain/test` (407 lines). Deleted `tracer.spec.ts` (119 lines) and `report-generation.spec.ts` (165 lines). Extracted types to `tracer-types.ts`. |
| **Create OTEL_GUIDE.md** | Full observability guide with architecture, quick start, SigNoz queries, migration notes. |
| **Document worker isolation** | Added `/tmp/vitest-otel-data/` contract: file naming (`summaries-{workerId}.json`, `metadata-{workerId}.json`), write path, read path, merge logic. |
| **Fix shared package OTel exports** | Added `setupOtel`, `shutdownOtel`, `getInvariantProcessor`, `InvariantSpanProcessor`, `OtelConfig` to barrel exports. Updated consumers to use `@executable-specs/shared` instead of deep imports. |
| **Formalize span attribute contract** | Added 15-attribute table with Set By/Read By columns, naming conventions, required vs optional classification. |
| **Decouple InvariantSpanProcessor** | Extracted pricing-specific edge case logic into `PricingEdgeCaseStrategy`. Processor now accepts pluggable `EdgeCaseStrategy` with `DefaultEdgeCaseStrategy` (no-op) default. |

### Remaining (Lower Priority)

| Item | Effort | Notes |
|------|--------|-------|
| ~~**E2E/Playwright OTel integration**~~ | ~~High~~ | ✅ **COMPLETED** — See E2E OTel Integration section below |
| **SigNoz stack verification** | Medium | `docker-compose.observability.yml` exists but hasn't been run against the app |
| **JsonlFileExporter hardening** | Low | Already adequate — proper shutdown, write stream buffering. OTel SDK handles batching at its layer |

---

## E2E/Playwright OTel Integration (2026-04-03)

### Status: ✅ COMPLETED

Playwright E2E tests now emit OTel spans that integrate with the attestation pipeline.

### Implementation

**Files Created:**
| File | Purpose |
|------|---------|
| `test/e2e/fixtures/otel-playwright.ts` | Playwright OTel setup module using shared `InvariantSpanProcessor` |
| `test/e2e/fixtures/invariant-helper.ts` | Updated to emit OTel spans via `emitInvariantSpan()` |
| `test/playwright.global-setup.ts` | Initializes OTel before tests, graceful shutdown after |

**Key Changes:**
1. **Module-level OTel initialization** — Each Playwright worker process initializes OTel via `setupPlaywrightOtel()` at module load time
2. **Span persistence** — Uses shared `InvariantSpanProcessor` which persists to `/tmp/vitest-otel-data/summaries-playwright-{pid}.json`
3. **Per-test span emission** — Each `invariant()` test call emits a span with `invariant.ruleReference`, `invariant.rule`, `invariant.tags` attributes
4. **Worker isolation** — Each worker writes to unique PID-based files, merged by attestation reporter

**Import Path Changes:**
- Server/test code must import OTel from `@executable-specs/shared/index-server` (not barrel export)
- This prevents browser bundle contamination from Node.js-only OTel modules

### Results

- **OTel spans emitted**: 60+ worker processes create OTel data during E2E runs
- **Data persistence**: Each E2E test creates spans with rule references, tags, and pass/fail status
- **Attestation integration**: Playwright data automatically merged with domain test data in reports
- **No browser contamination**: OTel modules properly excluded from client bundle

### Architecture

```
Playwright Test Worker
  ↓
invariant() wrapper calls emitInvariantSpan()
  ↓
Shared InvariantSpanProcessor aggregates
  ↓
Persists to /tmp/vitest-otel-data/summaries-playwright-{pid}.json
  ↓
Attestation Reporter merges all worker files
  ↓
Unified attestation report with E2E + domain test data
```

---

## CI Flakiness Fixes (2026-04-03)

### Issues Found in CI

**Issue 1: 401 Unauthorized Errors**
- Auth state leaked between parallel tests in CI (2 workers, fully parallel)
- JWT tokens and session data persisted across tests
- Caused intermittent authentication failures

**Issue 2: OTel `afterAll` Hook Timeouts**
- `shutdownPlaywrightOtel()` called from `test.afterAll` in `invariant-helper.ts`
- Multiple test files imported the module, causing competing shutdown calls
- Hook timeout of 10s exceeded when tests ran in parallel

### Fixes Applied

**1. Test Isolation** (`test/e2e/fixtures/invariant-helper.ts`)
```typescript
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.context().clearCookies();
});
```
- Clears all browser storage before each test
- Prevents auth/session leakage between tests

**2. Idempotent OTel Shutdown** (`test/e2e/fixtures/otel-playwright.ts`)
```typescript
let isShuttingDown = false;

export async function shutdownPlaywrightOtel(): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;
  // ... shutdown logic
}
```
- Prevents concurrent shutdown attempts
- Guard flag ensures single execution

**3. Global Teardown Only** (`test/e2e/fixtures/invariant-helper.ts`)
- Removed `test.afterAll` hook (runs per file, causes races)
- Kept shutdown only in `playwright.global-setup.ts` global teardown
- Returns teardown function from `globalSetup()`

### Results

| Before CI Fix | After CI Fix |
|---------------|--------------|
| 62 failed, 113 passed | **175 passed, 0 failed** |
| 401 errors, hook timeouts | Stable across multiple runs |
| Flaky auth tests | Consistent test isolation |
