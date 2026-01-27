# Technical Debt Report: TypeScript Type Safety (react-playwright)

**Date:** 2026-01-27  
**Status:** 230+ Latent Errors identified during Phase 4 implementation.  
**Scope:** `implementations/react-playwright`

## 1. Executive Summary
While the E2E and API tests are passing via `playwright test`, a strict build check (`tsc -b`) reveals significant structural type issues. These errors are currently suppressed by the test runner's transpiler but represent risks for runtime stability and future refactoring.

## 2. Priority Issues

### 2.1 Verbatim Module Syntax (Critical)
**Error:** `TS1484: 'X' is a type and must be imported using a type-only import`.  
**Context:** The project uses `verbatimModuleSyntax: true`. Types imported as values can cause runtime crashes in the browser if the bundler expects a value that doesn't exist.
**Action Needed:** Convert imports of types to `import type { ... }`.
**Key Files:**
- `implementations/react-playwright/src/domain/cart/fns.ts`
- `implementations/shared/fixtures/cart-builder.ts`
- `implementations/react-playwright/src/test/api/*.spec.ts`

### 2.2 Hono Context Type Erasure (High)
**Error:** `Property '...' does not exist on type 'unknown'`.  
**Context:** `c.get('validatedBody')` and `c.get('validatedParams')` return `unknown`. The route handlers are currently using these without casting, leading to unsafe access.
**Action Needed:** Cast these calls using the Zod-inferred types (e.g., `as CreateOrderRequest`).
**Key Files:**
- `src/server/routes/auth.ts`
- `src/server/routes/payments.ts`
- `src/server/routes/pricing.ts`
- *(Note: orders.ts and products.ts are already fixed)*

### 2.3 Allure Metadata Schema Mismatch (Medium)
**Error:** `Object literal may only specify known properties, and 'name' does not exist in type 'RuleMetadata'`.  
**Context:** The helper `registerApiMetadata` or direct calls to `registerAllureMetadata` include a `name` field not present in the shared interface.
**Action Needed:** Update the `RuleMetadata` interface in `shared` or remove the property from calls.
**Key Files:**
- All API spec files in `src/test/api/`

### 2.4 Library Export Ambiguity (Medium)
**Error:** `TS2308: Module './errors' has already exported a member named 'ErrorResponse'`.  
**Context:** `src/lib/index.ts` is re-exporting symbols that conflict.
**Action Needed:** Use explicit exports instead of `export *` or resolve naming collisions.

### 2.5 Erasable Syntax Violations (Low)
**Error:** `TS1294: This syntax is not allowed when 'erasableSyntaxOnly' is enabled`.  
**Context:** Use of `enum` and `private` fields in files intended for certain transpilation paths.
**Action Needed:** Evaluate if `const enum` or standard objects should replace these.

## 3. Recommended Remediation Plan

1.  **Step 1**: Fix all `verbatimModuleSyntax` errors across the workspace.
2.  **Step 2**: Standardize the Hono Context casting pattern.
3.  **Step 3**: Align Allure metadata interfaces with actual usage.
4.  **Step 4**: Resolve the naming collision in `src/lib/index.ts`.

## 4. Verification
Run the following command from the project root to verify success:
```bash
cd implementations/react-playwright && npx tsc -b
```
