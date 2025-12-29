# TypeScript Testing Framework Guide

This document defines the standards for writing tests within this project, focusing on the **Executable Specifications Pattern**.

## 1. Core Philosophy

- **Invariants over Examples**: While happy-path examples are useful for documentation, **Mathematical Invariants** (proven via Property-Based Testing) are the standard for logic verification.
- **Deep Observability**: Every test must log its inputs and outputs to the `tracer` to ensure the generated **Attestation Report** provides a complete audit trail.
- **Deterministic**: Tests must be free of side effects and produce consistent results across environments.

---

## 2. Testing Tools & Stack

- **Runner**: [Vitest](https://vitest.dev/)
- **Property-Based Testing**: [fast-check](https://fast-check.dev/)
- **Observability**: Custom `TestTracer` + `AttestationReporter`

---

## 3. Canonical Patterns

### A. The "Invariant" Pattern (Property-Based Testing)
Use this for all business logic defined in `docs/pricing-strategy.md`.

```typescript
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

### B. The "Example" Pattern (Documentation)
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

## 4. Test Data Management

### Fluent Builders
Never use "magic objects" in tests. Use the `CartBuilder` (`test/fixtures/cart-builder.ts`) to keep tests readable and refactorable.

### Arbitraries
Shared generators for property-based tests live in `test/fixtures/arbitraries.ts`. These should cover edge cases (empty carts, high quantities, extreme price values).

---

## 5. Anti-Patterns

- **❌ Manual Rounding in Tests**: Our system uses integer `Cents`. Assertions should use exact equality (`toBe`).
- **❌ Brittle Step Definitions**: We reject Gherkin. All "specifications" are written in type-safe TypeScript.
- **❌ Hidden Logic**: Any rule mentioned in `docs/pricing-strategy.md` MUST have a corresponding "Invariant" test.