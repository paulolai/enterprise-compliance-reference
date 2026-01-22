# TypeScript Testing Framework Guide

This document defines the standards for writing tests within this project, focusing on the **Executable Specifications Pattern** across both API and GUI layers.

## Quick Start

### API Tests (Logic & Rules)
```bash
cd implementations/typescript-vitest
npm install
npm test
open reports/latest/attestation-full.html
```

### GUI Tests (End-to-End)
```bash
cd implementations/react-playwright
npm install
npx playwright test
npx playwright show-report
```

## Test Types & When to Use Each

| Situation | Test Type | Tool | File Location |
|-----------|-----------|------|---------------|
| **Business Rules** (Pricing, Logic) | Property-Based Test | **Vitest** | `test/*.properties.test.ts` |
| **User Experience** (Flows, Visuals) | GUI Invariant Test | **Playwright** | `src/test/e2e/*.ui.properties.test.ts` |
| **Multi-Rule Interactions** | Integration Test | **Vitest** | `test/integration.properties.test.ts` |
| **Specific Scenarios** | Example Test | **Vitest/PW** | `*.spec.ts` |

---

## 1. Core Philosophy

- **Invariants over Examples**: While happy-path examples are useful for documentation, **Mathematical Invariants** (proven via Property-Based Testing) are the standard for logic verification.
- **Deep Observability**: Every test must log its inputs and outputs to the `tracer` (or Allure) to ensure the generated **Attestation Report** provides a complete audit trail.
- **Shared Truth**: We use a **Shared Core** (`implementations/shared`) for builders, types, and arbitraries. Logic and Tests share the same language.

---

## 2. Testing Tools & Stack

- **Runners**: 
  - **Vitest** (Node.js API Logic - Fast)
  - **Playwright** (Browser GUI - Realistic)
- **Property-Based Testing**: [fast-check](https://fast-check.dev/)
- **Observability**: Custom `TestTracer` + `Allure` (Unified Reporting)
- **Coverage**: Custom `DomainCoverage` (Business Rules) + `v8` (Code Lines)

---

## 3. Canonical Patterns

### A. The "API Invariant" Pattern (Vitest)
Use this for pure business logic defined in `docs/pricing-strategy.md`.

```typescript
// implementations/typescript-vitest/test/pricing.properties.test.ts
it('Final Total is always <= Original Total', () => {
  verifyInvariant({
    ruleReference: 'pricing-strategy.md §1',
    rule: 'Final Total must never exceed Original Total (prices never increase)',
    tags: ['@critical']
  }, (_items, _user, result) => {
    // Assert the Invariant
    expect(result.finalTotal).toBeLessThanOrEqual(result.originalTotal);
  });
});
```

### B. The "GUI Invariant" Pattern (Playwright)
Use this to verify that the UI correctly projects the business state. See [**GUI Testing Guidelines**](GUI_TESTING_GUIDELINES.md) for details.

```typescript
// implementations/react-playwright/src/test/e2e/cart.ui.properties.test.ts
invariant('UI reflects Cart Total correctly', {
  ruleReference: 'pricing-strategy.md §1',
  rule: 'Cart Page must display the calculated total from the Pricing Engine',
  tags: ['@critical']
}, async ({ page }) => {
  // 1. Setup via Shared Builder
  const cart = CartBuilder.new().withItem('Item A', 1000).build();
  
  // 2. Teleport (API Seam)
  await seedCartSession(page, cart);
  
  // 3. Verify
  await page.goto('/cart');
  await expect(page.getByTestId('total')).toHaveText('$10.00');
});
```

### C. The "Example" Pattern (Documentation)
Use this sparingly to illustrate specific "Happy Path" scenarios mentioned in the strategy document.

```typescript
it('Example: VIP User gets 5% discount', () => {
  // ... example setup ...
});
```

---

## 4. Shared Test Data Management

We strictly separate "Test Data Generation" from "Test Execution". All generators live in the **Shared Core**.

| Component | Location | Purpose |
|-----------|----------|---------|
| **CartBuilder** | `implementations/shared/fixtures/cart-builder.ts` | Fluent API for creating valid cart states. |
| **Arbitraries** | `implementations/shared/fixtures/arbitraries.ts` | `fast-check` generators for PBT (covers edge cases). |
| **Types** | `implementations/shared/src/types.ts` | Zod schemas shared by API, UI, and Tests. |

**Rule:** Never use "magic objects" in tests. Always use the `CartBuilder`.

---

## 5. Coverage & Quality Gates

We enforce quality through a dual-coverage strategy (See [**ADR 12: Dual-Coverage**](ARCHITECTURE_DECISIONS.md#12-dual-coverage-strategy-business-vs-code)).

### A. Code Coverage (Technical)
- **Tool:** `@vitest/coverage-v8`
- **Metric:** Lines, Functions, Branches executed.
- **Gate:** Enforced via `vitest.config.ts`.
- **Goal:** Ensure no "dead code" exists.

### B. Domain Coverage (Business)
- **Tool:** Custom `DomainCoverageParser`
- **Metric:** Percentage of Rules in `pricing-strategy.md` verified by at least one test.
- **Gate:** Visible in the Attestation Report.
- **Goal:** Ensure no "dead requirements" exist (features specified but not tested).

**Verification:**
Run `npm run test:coverage` to generate both reports. The Attestation Report (`attestation-full.html`) displays a consolidated view.

---

## 6. Definition of Done (PR Checklist)

Before submitting a PR, verify:

1.  **Traceability:** Every test has a valid `ruleReference` linking to `pricing-strategy.md`.
2.  **Observability:** The test appears in the **Attestation Report** (`npm run reports:attestation`) with captured Input/Output traces.
3.  **Hierarchy:** The test file follows the `domain.layer.type.test.ts` convention (e.g., `cart.api.properties.test.ts`) so it appears in the correct Report Section.
4.  **No Flakiness:** API tests run instantly; GUI tests use **Seams** (not UI clicks) for setup.
5.  **Visuals:** If a GUI test, does it verify the *Business State* (e.g., "Badge Visible") or just the *DOM*? (Prefer Business State).
6.  **Coverage:** Ensure your new code is covered by both Unit Tests (for logic) and reflected in Domain Coverage.

---

## 7. How to Debug

**If a test fails:**

1.  **Check the Dual Report:** Run `npm run reports:attestation` and open `reports/{latest}/attestation-full.html`.
    *   **Technical View:** Is it an API logic bug or a GUI rendering bug?
    *   **Business View:** Which Rule is broken?
2.  **Inspect the Trace:** Click "View Execution Trace" in the report.
    *   Look at the JSON `Input` vs `Output`.
    *   If it's a Property Test, look at the **Counterexample** provided by fast-check (the simplest case that fails).
3.  **Visual Evidence:** For GUI tests, check the attached Screenshot in the report trace.

---

## 8. Anti-Patterns

- **❌ Manual Rounding**: Our system uses integer `Cents`. Assertions should use exact equality (`toBe`).
- **❌ Brittle Step Definitions**: We reject Gherkin. All "specifications" are written in type-safe TypeScript.
- **❌ Hidden Logic**: Any rule mentioned in `docs/pricing-strategy.md` MUST have a corresponding "Invariant" test.
- **❌ Testing Implementation Details**: Don't test *how* the code works (e.g., internal class methods). Test *what* it achieves (invariants).

---

## 9. Deep Dive References

- **[GUI Testing Guidelines](GUI_TESTING_GUIDELINES.md)** - Specific patterns for Playwright
- **[Invariants & Property-Based Testing](reference/infinite-examples.md)** - How PBT extends the BDD "Examples" pillar
- **[Regression Safety](reference/regression-safety.md)** - How invariant tests catch bugs manual scenarios miss

---

## 10. Progressive Adoption Strategy (Maturity Model)

We recognize that "Property-Based Invariants" (Level 3) is a significant shift.
Teams can adopt this framework progressively while still gaining the benefits of the **Attestation Report**.

### Level 1: Traceable Unit Tests (Low Friction)
**Goal:** Get your tests on the "Radar" (Coverage Report) without changing how you write logic.
**Method:** Use `verifyExample` to wrap your standard manual test.

```typescript
it('Rule §1: Basic calculation', async () => {
  await verifyExample({
    ruleReference: 'pricing-strategy.md §1',
    scenario: 'Basic cart calculation',
    tags: ['@pricing']
  }, () => {
    // 1. Standard Setup
    const cart = CartBuilder.new().withItem('Apple', 100).build();
    
    // 2. Standard Execution
    const result = PricingEngine.calculate(cart.items, cart.user);
    
    // 3. Standard Assertion
    expect(result.finalTotal).toBe(100);

    // 4. (Optional) Return for automatic logging to the report
    return { input: cart, output: result };
  });
});
```

### Level 2: Data-Driven Tests (Medium Rigor)
**Goal:** Verify known edge cases efficiently.
**Method:** Use `test.each` combined with `verifyExample`.

```typescript
test.each([
  { qty: 1, expected: 100 },
  { qty: 5, expected: 500 },
  { qty: 0, expected: 0 }
])('Rule §1: Quantity Logic', async ({ qty, expected }) => {
  await verifyExample({
    ruleReference: 'pricing-strategy.md §1',
    scenario: `Quantity: ${qty}`,
    tags: ['@pricing']
  }, () => {
    // ... test logic ...
  });
});
```

### Level 3: Property-Based Invariants (High Rigor)
**Goal:** Mathematical proof of correctness across infinite inputs.
**Method:** Use `verifyInvariant` with `fast-check`.

```typescript
it('Rule §1: Total is consistent', () => {
  verifyInvariant({
    ruleReference: 'pricing-strategy.md §1',
    rule: 'Total equals sum of items',
    tags: ['@critical']
  }, (items, user, result) => {
    // Logic that holds true for ANY valid cart
    expect(result.finalTotal).toBeLessThanOrEqual(result.originalTotal);
  });
});
```