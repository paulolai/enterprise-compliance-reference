# API Testing Patterns

This document defines the canonical patterns for API/Unit testing using **Vitest** and **fast-check**. For framework-level concepts, see [Testing Framework Guide](TESTING_FRAMEWORK.md).

<!-- toc -->

- [When to Use Unit Tests](#when-to-use-unit-tests)
  * [What Unit Tests Are Good For](#what-unit-tests-are-good-for)
  * [What Unit Tests Are NOT For](#what-unit-tests-are-not-for)
  * [The "Side Effect" Rule](#the-side-effect-rule)
  * [Unit Tests as Documentation](#unit-tests-as-documentation)
- [The "API Invariant" Pattern](#the-api-invariant-pattern)
  * [Property-Based Test (Level 3 - High Rigor)](#property-based-test-level-3---high-rigor)
  * [The Anatomy of `verifyInvariant`](#the-anatomy-of-verifyinvariant)
  * [How It Works](#how-it-works)
- [The "Example" Pattern (Level 1 - Low Friction)](#the-example-pattern-level-1---low-friction)
  * [Manual Example](#manual-example)
  * [Traced with `verifyExample`](#traced-with-verifyexample)
- [The "Data-Driven" Pattern (Level 2 - Medium Rigor)](#the-data-driven-pattern-level-2---medium-rigor)
- [Working with Arbitraries](#working-with-arbitraries)
  * [Custom Arbitraries](#custom-arbitraries)
  * [Filtering](#filtering)
  * [Mapping (Transformation)](#mapping-transformation)
- [Integration Tests (Multi-Rule)](#integration-tests-multi-rule)
- [Testing Component Interactions](#testing-component-interactions)
  * [The Principle: Test Interfaces, Not Internals](#the-principle-test-interfaces-not-internals)
  * [What Makes an Interface Worth Testing?](#what-makes-an-interface-worth-testing)
  * [Isolation Enables Refactoring](#isolation-enables-refactoring)
  * [The Interaction is the Promise](#the-interaction-is-the-promise)
  * [Guardrails vs Golden Paths](#guardrails-vs-golden-paths)
- [Anti-Patterns to Reject](#anti-patterns-to-reject)
  * [❌ Manual Rounding](#%E2%9D%8C-manual-rounding)
  * [❌ Brittle Step Definitions](#%E2%9D%8C-brittle-step-definitions)
  * [❌ Hidden Logic](#%E2%9D%8C-hidden-logic)
  * [❌ Testing Implementation Details](#%E2%9D%8C-testing-implementation-details)
  * [❌ Magic Objects in Tests](#%E2%9D%8C-magic-objects-in-tests)
- [Common Scenarios](#common-scenarios)
  * [Testing Error Conditions](#testing-error-conditions)
  * [Testing Edge Cases with `fc.constantFrom`](#testing-edge-cases-with-fcconstantfrom)
  * [Testing State Changes](#testing-state-changes)
- [Debugging Failed Property Tests](#debugging-failed-property-tests)

<!-- tocstop -->

---

## When to Use Unit Tests

Unit tests verify **behavior that can be tested in isolation**—without external dependencies, network calls, or full system startup.

### What Unit Tests Are Good For

| Use Case | Example | Why Unit Test |
|----------|---------|---------------|
| **Pure business logic** | Pricing calculations, validation rules | Fast, deterministic, no external state |
| **Data transformations** | Cart → Order mapping, DTO conversions | Clear input → output relationship |
| **Stringent invariants** | "Final Total ≤ Original Total" | Can prove with PBT (property-based testing) |
| **Guardrail conditions** | API routes never return HTML | Focused contract verification |
| **Complex implementation details** | Custom algorithms, edge case handling | Easier to debug in isolation than in full system |

### What Unit Tests Are NOT For

| Don't Unit Test | Better Alternative |
|-----------------|-------------------|
| File I/O | Integration test with real file system |
| Database calls | Contract test with real DB (or test database) |
| HTTP requests | Contract test with real server |
| Component wiring | Integration test at the interface boundary |

### The "Side Effect" Rule

If a function has side effects or depends on external state, it's not a good candidate for isolated unit testing. Test it at the integration layer where the side effects happen.

```typescript
// Good for unit testing: pure function
function calculateDiscount(cart: Cart, user: User): number {
  if (user.tenureYears > 2) return cart.total * 0.05;
  return 0;
}

// Not good for unit testing: depends on external state
async function getOrder(orderId: string): Promise<Order> {
  // Database call, network, etc.
  return await db.select().from(orders).where(eq(orders.id, orderId));
}
```

### Unit Tests as Documentation

A well-written unit test explains the promise a function makes:

```typescript
describe('calculateDiscount', () => {
  it('returns 5% for VIP members (tenure > 2 years)', () => {
    expect(calculateDiscount(
      { total: 1000 },
      { tenureYears: 3 }
    )).toBe(50);
  });

  it('returns 0 for non-VIP members', () => {
    expect(calculateDiscount(
      { total: 1000 },
      { tenureYears: 1 }
    )).toBe(0);
  });
});
```

**Principle**: If reading the test doesn't make the promise clear, the test isn't serving its documentation purpose.

---

## The "API Invariant" Pattern

Use this for pure business logic defined in `docs/pricing-strategy.md`.

### Property-Based Test (Level 3 - High Rigor)

Proves that a rule holds for **all valid inputs**, not just a few examples.

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

### The Anatomy of `verifyInvariant`

```typescript
verifyInvariant(
  // 1. Metadata (for traceability and reporting)
  {
    ruleReference: 'pricing-strategy.md §1',  // Links to source of truth
    rule: 'Final Total must never exceed Original Total',  // Human-readable
    tags: ['@critical']  // For filtering/reporting
  },

  // 2. The Property (assertion that must hold for ALL inputs)
  (items, user, result) => {
    expect(result.finalTotal).toBeLessThanOrEqual(result.originalTotal);
  }
);
```

### How It Works

1. **fast-check** generates random but valid `items` and `user` using configured `Arbitraries`
2. Runs your Pricing Engine
3. Executes your assertion
4. If it fails, fast-check shrinks the input to the **minimal counterexample**
5. The tracer logs the failing case to the Attestation Report

---

## The "Example" Pattern (Level 1 - Low Friction)

Use for documentation and illustrating specific "Happy Path" scenarios.

### Manual Example

```typescript
it('Example: VIP User gets 5% discount', () => {
  const cart = CartBuilder.new()
    .withItem('Product A', 1000)
    .withUser({ isVip: true, tenureYears: 3 })
    .build();

  const result = PricingEngine.calculate(cart.items, cart.user);

  expect(result.appliedDiscounts).toContainEqual({
    type: 'VIP_DISCOUNT',
    amount: 50  // 5% of $1000
  });

  return { input: cart, output: result };  // For observability
});
```

### Traced with `verifyExample`

For better traceability without changing your test style:

```typescript
it('Rule §1: Basic calculation', async () => {
  return verifyExample({
    ruleReference: 'pricing-strategy.md §1',
    rule: 'Basic cart calculation',
    tags: ['@pricing']
  }, () => {
    const cart = CartBuilder.new().withItem('Apple', 100).build();
    const result = PricingEngine.calculate(cart.items, cart.user);
    expect(result.finalTotal).toBe(100);
    return { input: cart, output: result };
  });
});
```

---

## The "Data-Driven" Pattern (Level 2 - Medium Rigor)

Verify known edge cases efficiently.

```typescript
test.each([
  { qty: 1, expected: 100 },
  { qty: 5, expected: 500 },
  { qty: 0, expected: 0 },
  { qty: 999, expected: 99900 },
  { qty: 1000, expected: 100000 }
])('Quantity: $qty produces total $expected', async ({ qty, expected }) => {
  return verifyExample({
    ruleReference: 'pricing-strategy.md §1',
    rule: `Quantity calculation: ${qty}`,
    tags: ['@pricing']
  }, async () => {
    const cart = CartBuilder.new().withItem('Apple', 100, qty).build();
    const result = PricingEngine.calculate(cart.items, cart.user);
    expect(result.finalTotal).toBe(expected);
    return { input: cart, output: result };
  });
});
```

**Use when:**
- You have 3-5 similar examples
- The input space is bounded (not infinite)
- You want to document specific edge cases from the spec

---

## Working with Arbitraries

### Custom Arbitraries

When the built-in `fast-check` generators aren't enough:

```typescript
// implementations/shared/fixtures/arbitraries.ts
import * as fc from 'fast-check';

export const { itemArbitrary } = {
  itemArbitrary: () =>
    fc.record({
      id: fc.hexaString({ minLength: 8, maxLength: 8 }),
      priceCents: fc.integer({ min: 1, max: 100000 }),  // $0.01 to $1000
      quantity: fc.integer({ min: 1, max: 99 }),
      name: fc.string({ minLength: 1, maxLength: 100 })
    })
};
```

### Filtering

Generate valid subsets of a broader domain:

```typescript
export const nonEmptyCartArbitrary = () =>
  fc.array(itemArbitrary())
    .filter(items => items.length >= 1);  // Carts must have at least 1 item
```

### Mapping (Transformation)

Apply derived logic to raw generators:

```typescript
export const { userArbitrary } = {
  userArbitrary: () =>
    fc.record({
      email: fc.emailAddress(),
      tenureYears: fc.integer({ min: 0, max: 30 })
    }).map(user => ({
      ...user,
      isVip: user.tenureYears > 2  // Derived property
    }))
};
```

---

## Integration Tests (Multi-Rule)

When a feature spans multiple business rules:

```typescript
// implementations/typescript-vitest/test/integration.properties.test.ts
it('Pricing + Shipping + VIP all apply correctly', () => {
  verifyInvariant({
    ruleReference: 'pricing-strategy.md (Integration)',
    rule: 'All discounts apply in the correct order',
    tags: ['@integration', '@critical']
  }, (items, user, result) => {
    // 1. VIP discount applied
    if (user.tenureYears > 2) {
      expect(result.appliedDiscounts).toContainEqual(
        expect.objectContaining({ type: 'VIP_DISCOUNT' })
      );
    }

    // 2. Bulk discount applied (if applicable)
    const bulkItem = items.find(i => i.quantity >= 3);
    if (bulkItem) {
      expect(result.appliedDiscounts).toContainEqual(
        expect.objectContaining({
          type: 'BULK_DISCOUNT',
          itemId: bulkItem.id
        })
      );
    }

    // 3. Shipping calculated correctly
    expect(result.shippingCents).toBeGreaterThanOrEqual(0);
  });
});
```

---

## Testing Component Interactions

Focus on **interfaces** between components, not their internals. Every interface defines a **promise** to its consumers—test the promise, not how it's fulfilled.

### The Principle: Test Interfaces, Not Internals

| Interface Between | Test the Handshake | Don't Test Internals |
|-------------------|-------------------|----------------------|
| Frontend → Pricing API | POST request with items → gets back PricingResult | How PricingEngine calculates internally |
| Hono Router → Products DB | Router fetch returns Product[] | How Drizzle builds the SQL |
| Vite Middleware → Hono App | Node Request → Web Request conversion | How Hono routes internally |
| Playwright → Running Server | HTTP request → JSON response | Server startup code |

The interaction is the promise. Tests verify that the contract holds, regardless of implementation.

### What Makes an Interface Worth Testing?

An interface is worth testing when **someone relies on it**:

1. **Business Rules** → Invariants proving the rule holds for all inputs
2. **API Contracts** → Scenarios verifying the agreed-upon request/response shape
3. **Architecture Guarantees** → Format consistency, error conventions, "never HTML fallback"
4. **Value to Users** → End-to-end scenarios for critical paths

**Guideline**: Use the fastest test that meaningfully verifies the promise.
- Can test the function directly? Do it.
- Need to verify the wire format? Test the contract.
- Critical user journey? Test the full path.

### Isolation Enables Refactoring

When components are tested through their interfaces, you can change internals freely:

```typescript
// Good: Tests the contract between client and server
test('Pricing API contract: request with items returns PricingResult', async () => {
  const request = createTestRequest('/api/pricing/calculate', {
    method: 'POST',
    body: { items, user }
  });
  const response = await pricingRouter.fetch(request);

  // Verify the contract: these fields MUST exist
  const result = await response.json();
  expect(result).toHaveProperty('originalTotal');
  expect(result).toHaveProperty('finalTotal');
  expect(result).toHaveProperty('shipment');
});

// Bad: Tests internal implementation—couples to how pricing works
test('PricingEngine applies VIP discount internally', () => {
  expect(mockDb.calculateDiscount).toHaveBeenCalledWith(5);
});
```

Tests care about the interface. Rename functions, change algorithms—but keep the contract.

### The Interaction is the Promise

Every interface defines a promise:

- **Pricing API**: "Give me items and user, I'll give you prices"
- **Products Router**: "Ask for /api/products, I'll give you Product[]"
- **Orders API**: "POST with order data, I'll create and return an orderId"

**Test the promise, not how it's fulfilled.** The only things worth enforcing are the promises components make to each other.

### Guardrails vs Golden Paths

- **Golden path tests**: Verify happy paths work correctly (business logic, success cases)
- **Guardrail tests**: Verify the system prevents failure modes (format consistency, error handling)

Missing guardrails is a common gap. For example: "API routes must never return HTML fallback." This isn't a feature—it's an architectural promise that enables client-side code to work reliably.

---

## Anti-Patterns to Reject

### ❌ Manual Rounding
Our system uses integer `Cents`. Assertions should use exact equality (`toBe`).

```typescript
// ❌ BAD
expect(result.finalTotal).toBeCloseTo(100.50, 2);

// ✅ GOOD
expect(result.finalTotalCents).toBe(10050);
```

### ❌ Brittle Step Definitions
We reject Gherkin. All "specifications" are written in type-safe TypeScript.

### ❌ Hidden Logic
Any rule mentioned in `docs/pricing-strategy.md` MUST have a corresponding "Invariant" test.

### ❌ Testing Implementation Details
Don't test *how* the code works (e.g., internal class methods). Test *what* it achieves (invariants).

```typescript
// ❌ BAD - Testing implementation
expect(PricingEngine.internalGetBulkThreshold()).toBe(3);

// ✅ GOOD - Testing behavior
expect(result.appliedDiscounts).toContainEqual(
  expect.objectContaining({ type: 'BULK_DISCOUNT' })
);
```

### ❌ Magic Objects in Tests
```typescript
// ❌ BAD - Where did these numbers come from?
const cart = [{ id: 'a', price: 999, qty: 3 }, { id: 'b', price: 500, qty: 1 }];

// ✅ GOOD - Intention-revealing
const cart = CartBuilder.new()
  .withItem('Premium Widget', 999, 3)  // Qualifies for bulk
  .withItem('Standard Widget', 500, 1)
  .build();
```

---

## Common Scenarios

### Testing Error Conditions

```typescript
it('Invalid cart throws descriptive error', () => {
  verifyInvariant({
    ruleReference: 'pricing-strategy.md §0',
    rule: 'Invalid inputs are rejected',
    tags: ['@validation']
  }, (items, user, result) => {
    // If cart is somehow invalid, result should indicate the failure
    if (result.errors.length > 0) {
      expect(result.errors[0].severity).toBe('error');
    }
  });
});
```

### Testing Edge Cases with `fc.constantFrom`

```typescript
it('All valid payment methods trigger correct processing', () => {
  const paymentMethods = fc.constantFrom('CREDIT_CARD', 'PAYPAL', 'APPLE_PAY', 'BANK_TRANSFER');

  verifyInvariant({
    ruleReference: 'checkout.md §4',
    rule: 'Payment processing supports all configured methods',
  }, (_, paymentMethod, result) => {
    expect(result.supportedPaymentMethods).toContain(paymentMethod);
  });
});
```

### Testing State Changes

```typescript
it('Coupon application is idempotent', () => {
  verifyInvariant({
    ruleReference: 'pricing-strategy.md §5',
    rule: 'Applying the same coupon twice has no additional effect',
    tags: ['@critical']
  }, (items, user) => {
    const firstResult = PricingEngine.calculate(items, user, 'SAVE10');
    const secondResult = PricingEngine.calculate(items, user, 'SAVE10', 'SAVE10');

    expect(secondResult.finalTotal).toBe(firstResult.finalTotal);
  });
});
```

---

## Debugging Failed Property Tests

When a property test fails, fast-check provides the **minimal counterexample**:

```
Counterexample found after 234 shrinks

Arbitrary: itemsArbitrary
Received:
[
  { id: "abc123", priceCents: 100, quantity: 1 },
  { id: "def456", priceCents: 100, quantity: 2 }
]

Arbitrary: userArbitrary
Received:
{ email: "test@example.com", tenureYears: 3 }

Expected: result.finalTotal <= result.originalTotal
Received: 350 > 300
```

**What to do:**
1. Copy the counterexample into a manual example test
2. Debug the logic with those specific values
3. Fix the bug
4. Re-run the property test to prove it for ALL cases
