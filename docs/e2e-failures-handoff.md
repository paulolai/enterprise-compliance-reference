# E2E Test Failures — Handoff Document

**Date:** 2026-04-01
**Previous session:** Bug fixes + testing gaps (39 commits)
**Next session:** Diagnose and fix E2E browser test failures

---

## Current State

### What Passes
- **Domain tests:** 144 passed, 1 skipped (15 files) ✅
- **Client tests:** 10 passed (1 file) ✅
- **API tests:** All passing ✅
- **TypeScript:** All 5 packages compile with zero errors ✅

### What Fails
- **E2E browser tests:** 66 failures out of ~175 E2E tests
- **Total suite:** 110 passed, 66 failed (329 raw results in attestation)

---

## Failure Categories

### Category A: 10-second timeouts (~50 tests)
All fail with exactly `10.0s` or `10.1s` — hitting the Playwright `timeout: 10 * 1000` limit.

**Affected tests:**
- All auth tests (login, register, validation) — 12 tests
- All cart tests (badge, items, persistence, quantity) — 10 tests
- All checkout tests (validation, pricing, shipping methods) — 14 tests
- All accessibility tests (cart page, checkout page) — 2 tests
- Debug page tests — 4 tests
- Page Builder Demo — 2 tests
- `Non-existent routes display 404 error page` — 1 test
- `Seeded cart data persists through auth flow to checkout` — 1 test
- `VIP discount correctly reduces grand total for long-tenure user` — 1 test

**Symptom:** Tests start, browser loads, but nothing happens for 10 seconds then timeout. No assertion failure — just timeout.

**Likely cause:** The Playwright browser can't connect to the Vite dev server, or the server isn't responding, or the page never finishes loading. The `X-Frame-Options may only be set via an HTTP header` browser error appears repeatedly in logs.

### Category B: Quick failures (~10 tests)
These fail in < 2 seconds with actual assertion errors.

**Affected tests:**
- `Each page has exactly one h1 heading` — ~1-2s
- `404 page provides helpful navigation options` — ~1-2s
- `404 page maintains brand consistency` — ~1-2s
- `Invalid product SKUs show appropriate error state` — ~1-2s
- `VIP user complete authenticated checkout flow` — ~100-200ms
- `Non-VIP user complete authenticated checkout flow` — ~100-200ms
- `Registration with new email succeeds` — ~10s (timeout)
- `VIP badge shown for VIP users` — ~10s (timeout)
- `Cart allows quantity updates` — ~10s (timeout)
- `VIP customer discount applied in checkout` — ~10s (timeout)
- `Grand total equals product total plus shipping` — ~10s (timeout)
- `Free shipping badge NOT shown when not eligible` — ~10s (timeout)
- `Weight-based shipping: $2 per kilogram surcharge` — ~10s (timeout)

### Category C: Order lifecycle E2E tests (~4 tests)
Our newly added tests fail quickly (~400-700ms).

**Affected tests:**
- `full order lifecycle: create -> retrieve -> list -> delete -> verify gone`
- `order lifecycle with single item cart`
- `order lifecycle with bulk discount cart`
- `order lifecycle with multi-item cart`

These fail because they use the `invariant()` helper which navigates through the browser, but the order creation API calls may be failing.

---

## Investigation Starting Points

### 1. Check if the Vite dev server is actually starting
```bash
cd /home/paulo/executable-specs-demo/test
pnpm exec playwright test --grep "Login page renders correctly" --headed 2>&1
```
The `--headed` flag will show you if the browser actually opens and navigates.

### 2. Check the X-Frame-Options error
The browser logs show:
```
X-Frame-Options may only be set via an HTTP header sent along with a document.
It may not be set inside <meta>.
```
This is from `packages/client/index.html` which has `<meta http-equiv="X-Frame-Options" content="DENY">`. This is a browser warning, not a test failure cause, but it indicates the CSP/security headers may be interfering.

### 3. Check if the server is responding
The Playwright config starts the Vite dev server as a webServer. Check if the server actually starts and responds:
```bash
cd /home/paulo/executable-specs-demo/packages/client
pnpm run dev &
curl -s http://localhost:5173 | head -20
```

### 4. The `invariant()` helper may be the issue
The `invariant()` helper at `test/e2e/fixtures/invariant-helper.ts` wraps Playwright's `test()` with automatic Allure metadata. It also uses `PageBuilder` which seeds state via localStorage. If the PageBuilder's `navigateTo()` or state injection is broken, ALL invariant tests would timeout.

### 5. The `globalSetup` TypeScript check may be slow
The re-enabled `playwright.global-setup.ts` runs `tsc --noEmit` before tests. If this is slow, it could eat into the 10-second timeout per test.

### 6. Check the webServer config
In `test/playwright.config.ts`:
```typescript
webServer: {
  command: 'pnpm --filter @executable-specs/client run dev',
  url: 'http://localhost:5173',
  reuseExistingServer: !process.env.CI,
  timeout: 120 * 1000,
```
The `reuseExistingServer: !process.env.CI` means if a server is already running locally, it reuses it. If that server is stale/broken, all tests would fail.

---

## Key Files to Read

| File | Why |
|------|-----|
| `test/playwright.config.ts` | Playwright config, timeouts, webServer setup |
| `test/playwright.global-setup.ts` | TypeScript pre-check that runs before tests |
| `test/e2e/fixtures/invariant-helper.ts` | The `invariant()` wrapper all E2E tests use |
| `test/e2e/fixtures/api-seams.ts` | API seam helpers for seeding state |
| `test/e2e/cart.ui.properties.test.ts` | Example of a test that times out |
| `test/e2e/auth.ui.properties.test.ts` | Example of auth tests that timeout |
| `packages/client/index.html` | Has X-Frame-Options meta tag |
| `packages/client/vite.config.ts` | Vite dev server config |

---

## What Was Done This Session (39 commits)

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

### Test Data Fixes (6 commits)
1. Moved cart-domain Vitest test out of Playwright scan path
2. Aligned order test shippingAddress fields with ShippingAddressSchema
3. Added name field to payment test cartItems
4. Completed pricingResult objects in payment confirm tests
5. Fixed orders sorting test (500ms delay + total-based assertion)
6. Fixed MockStripe cancel to reject nonexistent payment intents
7. Added validation constraints to request schemas

---

## Recommended Investigation Order

1. **Run a single E2E test with `--headed`** to see if the browser actually opens and navigates
2. **Check if the Vite dev server starts correctly** — curl localhost:5173
3. **Check if the `invariant()` helper's `beforeAll` is blocking** — it clears localStorage
4. **Check if the `globalSetup` TypeScript check is taking too long**
5. **Check if there's a port conflict** — something else on 5173
6. **Check the Playwright browser installation** — `npx playwright install`
7. **Check if the tests pass with `reuseExistingServer: false`**

---

## Commands to Start With

```bash
# 1. Run a single E2E test with headed browser
cd /home/paulo/executable-specs-demo/test
pnpm exec playwright test --grep "Login page renders correctly" --headed

# 2. Check if Vite dev server starts
cd /home/paulo/executable-specs-demo/packages/client
pnpm run dev &
sleep 5
curl -s http://localhost:5173 | head -20
kill %1

# 3. Run E2E tests with more verbose output
cd /home/paulo/executable-specs-demo/test
DEBUG=pw:api pnpm exec playwright test --grep "Login page renders correctly" 2>&1 | head -50

# 4. Check Playwright browser installation
npx playwright install --dry-run

# 5. Run just the API tests (these all pass)
cd /home/paulo/executable-specs-demo/test
pnpm exec playwright test --grep "Orders API|Payments API|Pricing API" 2>&1 | tail -10
```
