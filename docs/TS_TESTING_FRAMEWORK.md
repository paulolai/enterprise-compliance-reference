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

---

## 3. Canonical Patterns

### A. The "API Invariant" Pattern (Vitest)
Use this for pure business logic defined in `docs/pricing-strategy.md`.

```typescript
// implementations/typescript-vitest/test/pricing.properties.test.ts
it('Invariant: [Business Rule Description]', () => {
  const testName = expect.getState().currentTestName!;
  fc.assert(
    fc.property(arbitraries..., (inputs...) => {
      // Act
      const result = DomainLogic.execute(inputs...);
      
      // Log for Attestation Report
      tracer.log(testName, { inputs }, result);
      
      // Assert the Invariant
      return result.someValue === expected;
    })
  );

  // Register Business Metadata
  registerInvariant({
    ruleReference: 'strategy.md §X',
    rule: 'Description of the rule',
    tags: ['@tag']
  });
});
```

### B. The "GUI Invariant" Pattern (Playwright)
Use this to verify that the UI correctly projects the business state. See [**GUI Testing Guidelines**](GUI_TESTING_GUIDELINES.md) for details.

```typescript
// implementations/react-playwright/src/test/e2e/cart.ui.properties.test.ts
test('Invariant: [UI Reflection of Rule]', async ({ page }) => {
  // 1. Setup via Shared Builder
  const cart = CartBuilder.new().withItem(...).build();
  
  // 2. Teleport (API Seam)
  await seedCartSession(page, cart);
  
  // 3. Verify
  await page.goto('/cart');
  await expect(page.getByTestId('total')).toHaveText(...);
});
```

### C. The "Example" Pattern (Documentation)
Use this sparingly to illustrate specific "Happy Path" scenarios mentioned in the strategy document.

```typescript
it('Example: [Specific Scenario]', () => {
  const result = CartBuilder.new()
    .withItem('Product', 1000, 1)
    .asVipUser()
    .calculate(expect.getState().currentTestName); // Logging handled by builder

  expect(result.total).toBe(950);
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

## 5. Anti-Patterns

- **❌ Manual Rounding**: Our system uses integer `Cents`. Assertions should use exact equality (`toBe`).
- **❌ Brittle Step Definitions**: We reject Gherkin. All "specifications" are written in type-safe TypeScript.
- **❌ Hidden Logic**: Any rule mentioned in `docs/pricing-strategy.md` MUST have a corresponding "Invariant" test.
- **❌ Testing Implementation Details**: Don't test *how* the code works (e.g., internal class methods). Test *what* it achieves (invariants).

---

## 6. Deep Dive References

- **[GUI Testing Guidelines](GUI_TESTING_GUIDELINES.md)** - Specific patterns for Playwright
- **[Invariants & Property-Based Testing](reference/infinite-examples.md)** - How PBT extends the BDD "Examples" pillar
- **[Regression Safety](reference/regression-safety.md)** - How invariant tests catch bugs manual scenarios miss
