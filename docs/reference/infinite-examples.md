# Reference: Infinite Examples (Property-Based Testing)

**Extending the "Examples" Pillar of BDD.**

> *From 5 manual examples to 5,000 generated proofs.*

## Overview
**Property-Based Testing (PBT)** is the engine that allows Executable Specifications to verify behavior across an infinite input space. Instead of writing individual examples ("Given 3 items..."), we define **Invariants** ("For ALL items where quantity >= 3...").

This page details the implementation using `fast-check` within the Reference Architecture.

## The Concept: Invariants vs. Examples

*   **Example (Legacy Gherkin):** A single data point. Valuable for illustration, but statistically insignificant. Often hides edge cases.
*   **Invariant (Reference Arch):** A universal truth about the system. Valuable for proof and edge-case discovery.

## Implementation Details

We use `fast-check` to generate random data based on our domain schemas.

### 1. Arbitraries (The Generators)
Located in `test/fixtures/arbitraries.ts`. These define the "shape" of valid data.

```typescript
// Example: Generating a valid Cart Item
export const cartItemArb = fc.record({
  sku: fc.string({ minLength: 1 }),
  name: fc.string(),
  price: fc.integer({ min: 100, max: 1000000 }), // $1.00 to $10,000.00
  quantity: fc.integer({ min: 1, max: 100 }),
  weightInKg: fc.float({ min: 0, max: 100, noNaN: true })
});
```

### 2. The Invariant Test
Located in `test/pricing.properties.test.ts`. This is where the business rule is codified.

```typescript
it('Invariant: Line items with qty >= 3 always have 15% discount', () => {
  fc.assert(
    fc.property(cartArb, userArb, (items, user) => {
      // Act
      const result = PricingEngine.calculate(items, user);
      
      // Trace (for reports)
      tracer.log(expect.getState().currentTestName!, { items, user }, result);

      // Assert: Check the RULE, not just a value
      result.lineItems.forEach(li => {
        if (li.quantity >= 3) {
          const expectedDiscount = Math.round(li.originalPrice * li.quantity * 0.15);
          expect(li.bulkDiscount).toBe(expectedDiscount);
        } else {
          expect(li.bulkDiscount).toBe(0);
        }
      });
      return true;
    })
  );
});
```

## Discovery: What PBT Found
In our Reference Implementation, PBT automatically discovered edge cases that were missed by manual Gherkin scenarios:
*   **Negative Tenure:** Users created with -1 years of tenure.
*   **Zero Items:** Empty carts causing division-by-zero errors.
*   **Boundary Conditions:** Exactly $100.00 vs $100.01 for shipping thresholds.
*   **Combinatorial Explosions:** VIP discounts applying to Bulk items in unexpected orders.

## Strategic Value
PBT shifts testing from **Confirmation** ("Does it work for the happy path?") to **Exploration** ("Does it work for *any* valid path?"). 

This aligns perfectly with Dan North's pillar of "Using examples to clarify," extending it from a human scale to a machine scale.
