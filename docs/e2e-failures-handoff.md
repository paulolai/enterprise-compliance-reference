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
| Domain tests | ✅ | 144 passed, 1 skipped |
| Client tests | ✅ | 10 passed |
| E2E + API tests | ✅ | 175 passed |
| TypeScript | ✅ | 0 errors (5 packages) |

**Full suite:** `pnpm run test:all` — all passing with attestation report generated.
