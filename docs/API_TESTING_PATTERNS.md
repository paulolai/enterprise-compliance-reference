# API Testing Patterns

This document defines the canonical patterns for API/Unit testing using **Vitest** and **fast-check**.

## When to Use Unit Tests

Unit tests verify **behavior that can be tested in isolation**—without external dependencies, network calls, or full system startup.

### What Unit Tests Are Good For
- **Pure business logic**: Pricing calculations, validation rules.
- **Data transformations**: Mapping internal models to DTOs.
- **Stringent invariants**: "Final Total ≤ Original Total".

---

## The "API Invariant" Pattern (Level 3 - High Rigor)

Use this for pure business logic. It proves that a rule holds for **all valid inputs** using Property-Based Testing (PBT).

```typescript
// packages/domain/test/pricing.properties.test.ts
import { fc } from 'fast-check';
import { PricingEngine } from '../src/pricing-engine';

it('Final Total is always <= Original Total', () => {
  fc.assert(
    fc.property(
      // Arbitraries for items and user
      fc.array(cartItemArbitrary()), 
      userArbitrary(),
      (items, user) => {
        const result = PricingEngine.calculate(items, user);
        expect(result.finalTotal).toBeLessThanOrEqual(result.originalTotal);
      }
    )
  );
});
```

---

## The "Example" Pattern (Level 1 - Low Friction)

Use for documentation and illustrating specific "Happy Path" scenarios.

```typescript
it('Example: VIP User gets 5% discount', () => {
  const items = [{ sku: 'WIDGET', name: 'Widget', price: 10000, quantity: 1, weightInKg: 0.1 }];
  const user = { tenureYears: 3 };

  const result = PricingEngine.calculate(items, user);

  expect(result.vipDiscount).toBe(500); // 5% of 10000
});
```

---

## Testing Error Conditions

Always test that your API handles invalid input correctly using `Result` or proper HTTP status codes.

```typescript
it('returns failure when quantity is negative', () => {
  const items = [{ sku: 'BAD', name: 'Bad', price: 100, quantity: -1, weightInKg: 0.1 }];
  const user = { tenureYears: 0 };

  // If using Result pattern
  const result = PricingEngine.calculate(items, user);
  expect(isFailure(result)).toBe(true);
});
```

---

## Anti-Patterns to Reject
- **❌ Manual Rounding**: Use centralized utility functions for currency.
- **❌ Mocking Internals**: If Class A calls Class B, use the real Class B.
- **❌ Magic Objects**: Use `CartBuilder` for complex setups.
