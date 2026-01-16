# Reference: Regression Safety (Golden Masters)

**Protecting the Known State.**

> *While PBT explores the unknown, Golden Masters lock down the critical.*

## Overview
The **Golden Master Pattern** (also known as Snapshot Testing or Characterization Testing) ensures that complex, critical scenarios produce exactly the same output over time.

In the Reference Architecture, we use Golden Masters to replace the "Regression Suite" role of Gherkin Example Tables.

## The Concept: Stability Assurance

A "Golden Master" is a saved snapshot of a known-correct output for a specific input. If the logic changes—intentionally or accidentally—the output will diverge from the master, and the test will fail.

This is critical for **Business Boundaries** (e.g., Free Shipping Thresholds, Tax Brackets).

## Implementation Details

We use standard Vitest/Jest assertions to lock down exact values.

### The Test
Located in `test/regression.golden-master.test.ts`.

```typescript
it('GM002: Bulk discount (5 items)', () => {
  // 1. Arrange: A representative input (The "Master" Input)
  const cart = [{
    sku: 'BULK_5',
    name: 'Bulk Item',
    price: 10000, 
    quantity: 5,
    weightInKg: 1.0
  }];
  const user = { tenureYears: 0 };

  // 2. Act
  const result = PricingEngine.calculate(cart, user, ShippingMethod.STANDARD);

  // 3. Assert: Lock down exact values (The "Master" Output)
  expect(result.volumeDiscountTotal).toBe(7500); // Exactly 50K * 15%
  expect(result.finalTotal).toBe(42500);
  expect(result.shipment.isFreeShipping).toBe(true); // Over $100 threshold
});
```

## Why Both PBT and Golden Masters?

| Feature | Property-Based Testing (Infinite) | Golden Master (Finite) |
| :--- | :--- | :--- |
| **Goal** | Prove invariants hold for *all* inputs | Prove critical cases remain *stable* |
| **Input** | Randomly generated (Infinite) | Hand-picked representative (Finite) |
| **Output** | Checked against logic rule | Checked against saved value |
| **Catches** | Unforeseen edge cases | Regressions in known functionality |

## Example: The Shipping Refactor Bug
Imagine a developer changes the free shipping threshold from `> 100` to `>= 100`.
*   **PBT** might miss this if the property checks "is shipping calculated according to rule?" (and the rule implementation changed).
*   **Golden Master** `GM005` (Exactly $100 cart) explicitly expects `isFreeShipping: false`. It will fail immediately.

## Strategic Value
Golden Masters replace the need for Gherkin "Scenario Outlines" that are often used just for regression. They are:
1.  **Faster to write:** Standard TypeScript.
2.  **Strictly Typed:** If the response shape changes, the test fails to compile.
3.  **Comprehensive:** Verifies the *entire* result object, not just one field.
