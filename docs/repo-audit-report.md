# Repo Audit Report

**Date:** 2026-04-01
**Auditor:** AI Agent
**Scope:** Full codebase review — packages/domain, packages/server, packages/client, packages/shared, test/
**Method:** Systematic exploration, TypeScript compilation checks, test execution, static analysis, exploratory findings review

---

## Executive Summary

The repository implements an e-commerce pricing engine with an "Executable Specifications" methodology. The domain logic is well-structured with strong property-based testing coverage. However, the audit uncovered **49 issues** across all packages, with critical gaps in TypeScript enforcement, broken checkout flows, security vulnerabilities, and architectural leaks between client/server boundaries.

**Critical finding:** The domain package fails `tsc --noEmit` with 30+ errors, meaning strict type checking is not enforced despite the project's heavy reliance on type safety as a specification mechanism.

---

## Issue Summary by Severity

| Severity | Count | Description |
|----------|-------|-------------|
| **Critical** | 8 | Broken functionality, compilation failures, disabled safety nets |
| **High** | 8 | Security vulnerabilities, validation bypasses, runtime failures |
| **Medium** | 18 | Architecture leaks, code duplication, flaky tests, dead code |
| **Low** | 15 | Dead code, stale content, accessibility, minor inconsistencies |
| **Total** | **49** | |

---

## Critical Issues

### C1: Broken Static File Serving
- **Location:** `packages/server/src/server/standalone.ts:26`
- **Category:** Bug
- **Description:** `serveStatic({ root: './dist/index.html' })` passes a file path where a directory is expected. Static file serving will not work correctly. The intent was likely to serve the SPA fallback, but the implementation is wrong.
- **Impact:** Production server cannot serve the client application.

### C2: Module Mutation Side Effect
- **Location:** `packages/server/src/server/standalone.ts:25`
- **Category:** Bug
- **Description:** The `app` imported from `./index` is mutated by adding static file middleware. Any other consumer of the default export (e.g., tests) unexpectedly gets static file middleware attached.
- **Impact:** Violates module purity; tests may behave differently than expected.

### C3: Broken Checkout Navigation
- **Location:** `packages/client/src/pages/CheckoutPage.tsx:168`
- **Category:** Bug
- **Description:** After placing an order, the user is redirected to `/products?order=success` instead of `/order-confirmation/:orderId`. The `OrderConfirmationPage` exists but is never reached from the checkout flow.
- **Impact:** Broken user journey — customers never see order confirmation.

### C4: No Actual Order Submission
- **Location:** `packages/client/src/pages/CheckoutPage.tsx:159-170`
- **Category:** Bug
- **Description:** `handlePlaceOrder` does not call any API. It clears the cart and navigates away after a 1-second `setTimeout`. No order is created, no payment is processed, and the pricing result is discarded.
- **Impact:** The entire checkout flow is a simulation — no real orders are ever placed.

### C5: Domain Package TypeScript Compilation Failure
- **Location:** `packages/domain/test/` (30+ errors)
- **Category:** TypeScript
- **Description:** `tsc --noEmit` fails completely with `verbatimModuleSyntax` violations. All type imports use `import { Type }` instead of `import type { Type }`. Affected files:
  - `test/example-level1.spec.ts` (2 errors)
  - `test/fixtures/cart-builder.ts` (5 errors)
  - `test/fixtures/invariant-helper.ts` (3 errors)
  - `test/preconditions.spec.ts` (2 errors)
  - `test/pricing.properties.test.ts` (3 errors)
  - `test/regression.golden-master.test.ts` (2 errors)
  - `test/report-generation.spec.ts` (1 error)
  - `test/reporters/attestation-reporter.ts` (1 error — missing `@vitest/utils`)
  - `test/reporters/coverage-reporter.ts` (4 errors — missing `@vitest/utils`, missing `DomainCoverageResult`, implicit `any`)
  - `test/result.spec.ts` (5 errors)
  - `test/shipping.properties.test.ts` (3 errors)
  - `test/statistics.spec.ts` (2 errors)
- **Impact:** CI will fail on strict TypeScript checks. Type safety guarantees are not enforced.

### C6: Missing Database Schema Module
- **Location:** `packages/domain/test/database/schema.spec.ts` (8 errors)
- **Category:** TypeScript
- **Description:** All tests import from `../../../shared/src/db/schema` which does not exist. The module path is invalid.
- **Impact:** Database schema tests are completely non-functional.

### C7: Missing Node Types in Shared Package
- **Location:** `packages/shared/fixtures/allure-helpers.ts:7`
- **Category:** TypeScript
- **Description:** `Buffer` is used without `@types/node` installed. `tsc --noEmit` fails with `Cannot find name 'Buffer'`.
- **Impact:** Shared package does not compile under strict TypeScript.

### C8: Disabled TypeScript Pre-Check for E2E Tests
- **Location:** `test/playwright.config.ts:29-30`
- **Category:** Config
- **Description:** `globalSetup: './playwright.global-setup.ts'` is commented out with the note "TypeScript type check temporarily disabled for restructure". The setup file exists and is well-written but is never invoked.
- **Impact:** Type errors in E2E tests will only surface at test runtime (~6s per test) instead of being caught upfront (~1s).

---

## High Severity Issues

### H1: Hardcoded Password in Auth Route
- **Location:** `packages/server/src/server/routes/auth.ts:30`
- **Category:** Security
- **Description:** Every user authenticates with the literal string `"password"`: `if (user && password === 'password')`. No environment check prevents this route from being active in production.
- **Impact:** Trivially accessible account if deployed to production.

### H2: Debug Endpoints Lack Authentication
- **Location:** `packages/server/src/server/routes/debug.ts:23`
- **Category:** Security
- **Description:** Debug endpoints only check `isProduction` flag and return 404 (not 403). No API key or authentication required. No defense-in-depth.
- **Impact:** If `NODE_ENV` is misconfigured, debug endpoints exposing state manipulation are accessible.

### H3: Debug Routes Accessible in Production (Client)
- **Location:** `packages/client/src/App.tsx:36-38`
- **Category:** Security
- **Description:** Debug routes (`/debug`, `/debug/cart-view`, `/debug/checkout`) are unconditionally rendered. The `env.ts` file has `isDebugEnabled` but the router does not conditionally render these routes.
- **Impact:** Debug pages with state manipulation capabilities accessible in production.

### H4: Zod Validation Bypassed with `z.any()`
- **Location:** `packages/server/src/lib/validation/schemas.ts:60-75`
- **Category:** Validation
- **Description:** Five instances of `z.any()` completely bypass Zod validation for critical fields: `pricingResult`, `shippingAddress`, `cartItems`. This defeats the purpose of having validation middleware.
- **Impact:** Malformed or malicious data passes through unchecked.

### H5: Spoofable Rate Limiting
- **Location:** `packages/server/src/server/middleware/rate-limit.ts:89`
- **Category:** Security
- **Description:** If no IP headers are present, the fallback uses User-Agent string: `return c.req.header('user-agent') || 'anonymous'`. This is easily spoofed.
- **Impact:** Attackers can bypass rate limits by rotating User-Agent strings.

### H6: CommonJS `require()` in ESM Project
- **Location:** `packages/server/test/module-contracts.integration.test.ts:122`
- **Category:** Bug
- **Description:** The test uses `require.resolve()` and `require()` but the project is `"type": "module"`. This will fail at runtime.
- **Impact:** Module contract tests cannot execute.

### H7: Missing Vitest Dependency in Server
- **Location:** `packages/server/test/server-startup.integration.test.ts:8`
- **Category:** Bug
- **Description:** The test imports from `vitest` but the server's `package.json` only lists `@playwright/test` as a devDependency. `vitest` is not declared.
- **Impact:** Server startup integration tests cannot run.

### H8: Payment Confirm Ignores Discounts
- **Location:** `packages/server/src/server/routes/payments.ts:189`
- **Category:** Bug
- **Description:** When confirming a payment, order items are created with `discount: 0`, ignoring any bulk or VIP discounts that may have been calculated. The orders route correctly uses `mapCartToLineItems` but the payments confirm path does not.
- **Impact:** Order records show incorrect discount amounts.

---

## Medium Severity Issues

### M1: `fromPromise()` Is a No-Op
- **Location:** `packages/domain/src/result.ts:302-304`
- **Category:** Type Safety
- **Description:** `fromPromise()` simply returns the promise as-is. It is documented as handling "both rejections and returned Results" but does not handle rejections.
- **Impact:** Misleading API — callers expect rejection handling that doesn't exist.

### M2: `any` Type Usage in Domain Tests
- **Location:** `packages/domain/test/result.spec.ts:225`, `integration.properties.test.ts:11`, `fixtures/invariant-helper.ts:12`
- **Category:** Type Safety
- **Description:** Multiple instances of `any` types and `globalThis as any` casts violate AGENTS.md "NO `any` types" rule.
- **Impact:** Type safety compromised in test code.

### M3: `any` Types in Server Domain Logic
- **Location:** `packages/server/src/server/domain/cart/fns.ts:17-20, 38`
- **Category:** Type Safety
- **Description:** `mapCartToLineItems` and `validateOrderInvariants` use `any[]` for `cartItems` and `pricingResult` parameters.
- **Impact:** No type checking on critical order validation logic.

### M4: Node.js Globals in Client Bundle
- **Location:** `packages/client/src/lib/metrics.ts:220-223`
- **Category:** Architecture
- **Description:** `process.pid` and `process.uptime()` are Node.js globals that do not exist in the browser. `exportPrometheus()` will throw if called in a browser context.
- **Impact:** Runtime error if metrics are exported from the client.

### M5: Hono Server Middleware in Client Bundle
- **Location:** `packages/client/src/lib/logger.ts:17`
- **Category:** Architecture
- **Description:** The logger imports `Context` and `Next` from `hono` and includes server-side middleware (`requestLogger`, `requestIdMiddleware`). This code will never execute in the browser but is bundled with the client.
- **Impact:** Increased bundle size; potential confusion about package boundaries.

### M6: Hono Error Handler in Client
- **Location:** `packages/client/src/lib/errors.ts:458`
- **Category:** Architecture
- **Description:** `handleErrorResponse` accepts a Hono context-like object. This is a server-side error handler in the client package.
- **Impact:** Violates package boundary; dead code in client bundle.

### M7: Server Environment Variables in Client
- **Location:** `packages/client/src/lib/env.ts:71`
- **Category:** Architecture
- **Description:** `env.ts` references `DATABASE_PATH`, `STRIPE_SECRET_KEY`, and `LOG_LEVEL` — all server-side concerns. `process.env` is undefined in the browser.
- **Impact:** Unexpected runtime behavior; potential secret leakage if bundled.

### M8: `getProductImage` Duplicated 5 Times
- **Location:** `HomePage.tsx:95`, `ProductsPage.tsx:86`, `ProductDetail.tsx:86`, `ProductCard.tsx:64`, `CartItem.tsx:118`
- **Category:** Code Quality
- **Description:** The exact same function with identical color mappings is defined in 5 separate files.
- **Impact:** DRY violation — adding a new product requires updating 5 copies.

### M9: Unused Zod Checkout Schema
- **Location:** `packages/client/src/lib/validation/checkout-schema.ts`
- **Category:** Code Quality
- **Description:** Zod schemas for checkout (shipping address, payment) are defined but never used. `CheckoutPage.tsx` uses hand-rolled manual validators instead.
- **Impact:** Maintenance burden; source of inconsistency between schema and page validators.

### M10: `waitForLoadState('networkidle')` Anti-Pattern
- **Location:** 18 occurrences across 4 E2E test files
- **Category:** Flakiness
- **Description:** `networkidle` waits for all network activity to cease. This is notoriously flaky because analytics/beacons can keep the network "busy" indefinitely.
- **Impact:** Intermittent test failures, especially in CI.

### M11: `waitForTimeout()` Anti-Pattern
- **Location:** `checkout-validation.ui.properties.test.ts:80`, `auth-validation.ui.properties.test.ts:178`
- **Category:** Flakiness
- **Description:** Hard-coded waits are non-deterministic. May be too short on slow CI machines or wastefully long on fast machines.
- **Impact:** Flaky tests; unreliable CI results.

### M12: No-Op Assertions in Debug Tests
- **Location:** `test/e2e/debug-index-page.ui.spec.ts` (5 instances)
- **Category:** Coverage
- **Description:** When the debug page returns 404, tests pass with `expect(true).toBe(true)`. These provide zero verification.
- **Impact:** False sense of coverage; tests always pass regardless of implementation.

### M13: Duplicate `PageBuilder` Implementations
- **Location:** `test/builders/page-builder.ts` + `test/e2e/fixtures/invariant-helper.ts:99-155`
- **Category:** Duplication
- **Description:** Two different `PageBuilder` classes with completely different implementations (fast state injection vs. slow UI-driven navigation).
- **Impact:** Confusion about which to use; duplicated maintenance.

### M14: Stripe Client Created on Every Health Check
- **Location:** `packages/server/src/server/routes/health.ts:79`
- **Category:** Performance
- **Description:** A new `Stripe` instance is created on every `/readyz` call instead of reusing the singleton from `payments.ts`.
- **Impact:** Wasteful; potential connection pool exhaustion under load.

### M15: Incorrect Import Paths in Domain Tests
- **Location:** `packages/domain/test/preconditions.spec.ts:2`, `example-level1.spec.ts:2`
- **Category:** Import
- **Description:** Both files import from `../../shared/src` instead of `../src`. Inconsistent with the rest of the codebase.
- **Impact:** Confusing dependency graph; fragile if shared package structure changes.

### M16: `.ts` Extension in Import Path
- **Location:** `packages/client/src/lib/validation/schemas.ts:31`
- **Category:** Import
- **Description:** Import includes `.ts` extension: `from '../../domain/cart/schema.ts'`. Non-standard and can cause issues with some tooling.
- **Impact:** Potential bundler/resolver issues.

### M17: CSP Allows `unsafe-eval`
- **Location:** `packages/client/index.html:7`
- **Category:** Security
- **Description:** Content-Security-Policy includes `'unsafe-eval'` and `'unsafe-inline'` in `script-src`, negating most CSP protection.
- **Impact:** XSS protection weakened.

### M18: Missing Input Validation Tests
- **Location:** `packages/domain/test/`
- **Category:** Missing
- **Description:** No tests for negative price inputs, non-integer cents, negative quantities, or invalid `ShippingMethod` enum values. The Zod validation exists but is untested.
- **Impact:** No verification that invalid inputs are properly rejected.

### M19: Missing Expedited Shipping Property Test
- **Location:** `packages/domain/test/shipping.properties.test.ts`
- **Category:** Missing
- **Description:** Expedited shipping (Section 5.3: 15% surcharge on original subtotal) has no dedicated property test. Covered only in integration tests and one precondition example.
- **Impact:** Weaker verification of expedited shipping invariant.

---

## Low Severity Issues

### L1: Missing `loading="lazy"` on Images
- **Location:** 6 client image files (`CartItem.tsx:37`, `ProductCard.tsx:33`, `ProductDetail.tsx:41`, `HomePage.tsx:41,74`, `ProductsPage.tsx:65`)
- **Category:** Performance
- **Description:** Images missing `loading="lazy"` attribute. Caught by static analysis validator.
- **Impact:** Unnecessary initial page load bandwidth.

### L2: Unused `VIPBadge` Component
- **Location:** `packages/client/src/components/ui/VIPBadge.tsx`
- **Category:** Dead Code
- **Description:** Component is defined but never imported or used anywhere.
- **Impact:** Dead code; maintenance overhead.

### L3: Unused `recordLatency` Function
- **Location:** `packages/server/src/server/routes/health.ts:169`
- **Category:** Dead Code
- **Description:** Exported function is never imported or called by any module.
- **Impact:** Dead code.

### L4: Unbounded `latencyBuckets` Map
- **Location:** `packages/server/src/server/routes/health.ts:17`
- **Category:** Dead Code
- **Description:** Map accumulates entries forever with no eviction strategy, no TTL. `recordLatency` is never called.
- **Impact:** Memory leak if the function were ever used.

### L5: Unreachable ZodError Catch Block
- **Location:** `packages/server/src/server/routes/pricing.ts:18`
- **Category:** Dead Code
- **Description:** The `validateBody` middleware already catches Zod validation errors and returns 400. The catch block in the route handler is dead code.
- **Impact:** Dead code; misleading error handling.

### L6: Unused Driver Page Objects
- **Location:** `test/e2e/drivers/cart.driver.ts`, `test/e2e/drivers/checkout.driver.ts`
- **Category:** Dead Code
- **Description:** Well-written page objects that are not imported by any test file. All tests use raw Playwright selectors.
- **Impact:** Unused investment; dead code.

### L7: Stale Copyright Year
- **Location:** `packages/client/src/components/layout/Layout.tsx:73`
- **Category:** Content
- **Description:** Copyright year hardcoded to 2025. Current year is 2026.
- **Impact:** Outdated branding.

### L8: Default Credentials Pre-Filled
- **Location:** `packages/client/src/pages/LoginPage.tsx:30-31`
- **Category:** Security
- **Description:** Login form pre-filled with `new@customer.com` / `password`. Intended for demo but risky if accidentally deployed.
- **Impact:** Trivially accessible demo account in production.

### L9: Dead Comment Artifacts
- **Location:** `packages/server/src/server/routes/products.ts:11-13`
- **Category:** Content
- **Description:** Comments appear to be editor/AI assistant artifacts: `"Wait, I should include enough context for replace."`
- **Impact:** Code cleanliness.

### L10: Placeholder Database Tests
- **Location:** `packages/domain/test/database/migrations.spec.ts`, `database/schema.spec.ts`
- **Category:** Test
- **Description:** All tests are `expect(true).toBe(true)` or catch "Cannot find module" errors. Document what *should* be tested but provide no verification.
- **Impact:** False sense of coverage for database layer.

### L11: Test Order Dependency in Statistics
- **Location:** `packages/domain/test/statistics.spec.ts`
- **Category:** Test
- **Description:** Depends on other property-based tests having already run and registered invariants with the tracer. May fail in isolation.
- **Impact:** Non-deterministic test results when run individually.

### L12: Duplicate Assertion
- **Location:** `test/e2e/cart.ui.properties.test.ts:54`
- **Category:** Test
- **Description:** Same assertion made twice in a row: `await expect(page.getByTestId('cart-badge')).toHaveText('2')`.
- **Impact:** Cosmetic; no functional impact.

### L13: Missing `aria-label` on Cart Badge
- **Location:** `packages/client/src/components/cart/CartBadge.tsx`
- **Category:** Accessibility
- **Description:** Cart count badge is a plain `<span>` with no `aria-label` or `role`. Screen readers read the number without context.
- **Impact:** Poor screen reader experience.

### L14: Auth Token in localStorage
- **Location:** `packages/client/src/lib/auth.ts:123-124`
- **Category:** Security
- **Description:** Tokens stored in localStorage are vulnerable to XSS attacks.
- **Impact:** Acceptable for demo but security anti-pattern for production.

### L15: Password Validation Inconsistency
- **Location:** `LoginPage.tsx:24` (6 chars) vs `RegisterPage.tsx:31` (8 chars + letter + number)
- **Category:** Consistency
- **Description:** Login validates minimum 6 characters while registration requires 8 with complexity. Login should not validate password length or should match registration requirements.
- **Impact:** Inconsistent user experience.

---

## Exploratory Testing Findings (Previously Documented)

The following issues were already captured in prior exploratory testing sessions:

| Screen | Severity | Category | Issue |
|--------|----------|----------|-------|
| Homepage | Major | UI | Default Vite title "react-playwright" not changed |
| Checkout | Major | Functional | No shipping method selection visible |
| 404 Handling | Major | UX | No proper 404 error page |
| Accessibility | Minor | A11y | Heading hierarchy violations detected |

**Location:** `exploratory-findings/report.json`, `exploratory-findings/critical-exploration-report.json`

---

## Static Analysis Results

| Validator | Status | Details |
|-----------|--------|---------|
| Server Startup | PASSED | No startup failure patterns detected |
| Imports | PASSED | No import issues found |
| TypeScript Compilation | PASSED | All critical checks passed (filtered false positives) |
| HTML | PASSED | 0 errors, 0 warnings |
| Patterns | PASSED | 0 errors, 0 warnings |
| Security | PASSED | 0 critical errors, 0 warnings |
| Performance | WARN | 6 warnings — images missing `loading="lazy"` |

---

## Test Execution Results

| Suite | Status | Details |
|-------|--------|---------|
| Domain Tests (Vitest) | PASSED | All tests pass at runtime |
| Domain TypeScript | FAILED | 30+ `verbatimModuleSyntax` errors |
| Client TypeScript | PASSED | No errors |
| Server TypeScript | PASSED | No errors |
| Shared TypeScript | FAILED | Missing `@types/node` (`Buffer` not found) |
| E2E TypeScript | PASSED | No errors |

---

## Architecture Observations

### Package Boundary Violations

The client package contains significant server-side code:

| File | Server-Side Content |
|------|-------------------|
| `src/lib/metrics.ts` | `process.pid`, `process.uptime()`, Prometheus export |
| `src/lib/logger.ts` | Hono `Context`, `Next`, request middleware |
| `src/lib/errors.ts` | Hono `handleErrorResponse` |
| `src/lib/env.ts` | `DATABASE_PATH`, `STRIPE_SECRET_KEY`, `LOG_LEVEL` |

These should be moved to the server package or gated with environment checks.

### Missing `stripe` Dependency

The `stripe` package is listed only in the root `package.json`, not in `packages/server/package.json`. While it works due to workspace hoisting, this is an implicit dependency that could break.

---

## Recommendations by Priority

### Immediate (Fix Before Next Release)

1. **Fix domain package TypeScript errors** — Convert all type imports to `import type` in `packages/domain/test/`. This is the highest-impact fix as it restores the type safety guarantees the project relies on.
2. **Fix checkout flow** — Implement actual order submission API call and correct navigation to order confirmation page.
3. **Fix static file serving** — Correct `serveStatic` root to a directory, not a file path.
4. **Re-enable E2E TypeScript pre-check** — Uncomment `globalSetup` in `playwright.config.ts`.
5. **Add `@types/node` to shared package** — Fix `Buffer` compilation error.

### Short-Term (Next Sprint)

6. **Replace `z.any()` with proper schemas** — Define Zod schemas for `pricingResult`, `shippingAddress`, `cartItems`.
7. **Move server-side code out of client** — Extract Hono middleware, Node.js globals, and server env vars from client package.
8. **Consolidate `getProductImage`** — Extract to shared utility.
9. **Wire up checkout schema** — Use existing Zod schema in `CheckoutPage.tsx` instead of hand-rolled validators.
10. **Replace flaky test patterns** — Replace `networkidle` and `waitForTimeout` with specific element waits.

### Medium-Term (Backlog)

11. **Add input validation tests** — Test negative prices, invalid ShippingMethod, etc.
12. **Add expedited shipping property test** — Dedicated invariant for Section 5.3.
13. **Implement database tests** — Replace placeholder tests with real migration and schema verification.
14. **Clean up dead code** — Remove unused `VIPBadge`, `recordLatency`, unused drivers, unreachable catch blocks.
15. **Add `aria-label` to cart badge** — Improve accessibility.
16. **Update copyright year** — Change 2025 to 2026 (or use dynamic year).

---

## Appendix: File-Level Issue Index

| File | Issues |
|------|--------|
| `packages/server/src/server/standalone.ts` | C1, C2 |
| `packages/client/src/pages/CheckoutPage.tsx` | C3, C4 |
| `packages/domain/test/` (multiple) | C5 |
| `packages/domain/test/database/schema.spec.ts` | C6 |
| `packages/shared/fixtures/allure-helpers.ts` | C7 |
| `test/playwright.config.ts` | C8 |
| `packages/server/src/server/routes/auth.ts` | H1 |
| `packages/server/src/server/routes/debug.ts` | H2 |
| `packages/client/src/App.tsx` | H3 |
| `packages/server/src/lib/validation/schemas.ts` | H4 |
| `packages/server/src/server/middleware/rate-limit.ts` | H5 |
| `packages/server/test/module-contracts.integration.test.ts` | H6 |
| `packages/server/test/server-startup.integration.test.ts` | H7 |
| `packages/server/src/server/routes/payments.ts` | H8 |
| `packages/domain/src/result.ts` | M1 |
| `packages/domain/test/` (multiple) | M2 |
| `packages/server/src/server/domain/cart/fns.ts` | M3 |
| `packages/client/src/lib/metrics.ts` | M4 |
| `packages/client/src/lib/logger.ts` | M5 |
| `packages/client/src/lib/errors.ts` | M6 |
| `packages/client/src/lib/env.ts` | M7 |
| `packages/client/src/` (5 files) | M8 |
| `packages/client/src/lib/validation/checkout-schema.ts` | M9 |
| `test/e2e/` (4 files) | M10 |
| `test/e2e/` (2 files) | M11 |
| `test/e2e/debug-index-page.ui.spec.ts` | M12 |
| `test/builders/` + `test/e2e/fixtures/` | M13 |
| `packages/server/src/server/routes/health.ts` | M14 |
| `packages/domain/test/preconditions.spec.ts`, `example-level1.spec.ts` | M15 |
| `packages/client/src/lib/validation/schemas.ts` | M16 |
| `packages/client/index.html` | M17 |
| `packages/domain/test/` | M18, M19 |
| `packages/client/src/components/` (6 files) | L1 |
| `packages/client/src/components/ui/VIPBadge.tsx` | L2 |
| `packages/server/src/server/routes/health.ts` | L3, L4 |
| `packages/server/src/server/routes/pricing.ts` | L5 |
| `test/e2e/drivers/` | L6 |
| `packages/client/src/components/layout/Layout.tsx` | L7 |
| `packages/client/src/pages/LoginPage.tsx` | L8 |
| `packages/server/src/server/routes/products.ts` | L9 |
| `packages/domain/test/database/` | L10 |
| `packages/domain/test/statistics.spec.ts` | L11 |
| `test/e2e/cart.ui.properties.test.ts` | L12 |
| `packages/client/src/components/cart/CartBadge.tsx` | L13 |
| `packages/client/src/lib/auth.ts` | L14 |
| `packages/client/src/pages/LoginPage.tsx`, `RegisterPage.tsx` | L15 |
