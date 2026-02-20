# Executable Specifications: A Practical Teaching Guide

## Introduction

**Executable specifications** are tests that serve dual purposes: they verify code correctness AND document business rules in a machine-readable format. Unlike traditional documentation that becomes stale, these specifications are executed hundreds of times per day, ensuring they remain accurate.

This matters profoundly for **business rules and compliance**. In regulated industries, auditors require proof that systems behave according to documented requirements. Executable specs bridge the gap between compliance documents (like `pricing-strategy.md`) and implementation code. Every test execution generates an **attestation report** that maps code behavior directly to business rules.

We recognize **three levels of testing rigor**:

1. **Level 1: Traceable Unit Tests** - Specific examples with full metadata linking to business rules
2. **Level 2: Data-Driven Tests** - Parameterized tests covering multiple scenarios
3. **Level 3: Property-Based Invariants** - Mathematical proofs that hold across infinite inputs

These levels form a hierarchy. Start with Level 1 for documentation, use Level 2 for boundary cases, and achieve Level 3 for mission-critical business rules.

---

## Level 1: Traceable Unit Tests

Traceable tests document specific examples while maintaining a link to business requirements. Each test includes metadata that appears in attestation reports.

### Anatomy of `verifyExample()`

```typescript
import { verifyExample, logPrecondition } from './fixtures/invariant-helper';
import { PricingEngine, CartItem, User } from '../../shared/src';

it('Exactly 3 items (boundary condition) gets bulk discount', () => {
  // 1. REGISTER METADATA - Links test to business rule
  verifyExample({
    ruleReference: 'pricing-strategy.md §2 - Bulk Discounts',
    rule: 'Critical boundary: quantity = 3 (exactly at bulk threshold)',
    tags: ["@precondition", "@pricing", "@boundary", "@bulk-discount", "@critical"]
  }, () => {
    // 2. SETUP - Create specific test data
    const cart: CartItem[] = [{
      sku: 'EXACTLY_3',
      name: 'Exactly 3 Items',
      price: 5000,      // $50.00 in cents
      quantity: 3,    // Exactly at threshold
      weightInKg: 1.0
    }];
    const user: User = { tenureYears: 0 };

    // 3. EXECUTE - Run the business logic
    const result = PricingEngine.calculate(cart, user);
    
    // 4. LOG - Capture inputs/outputs for attestation
    logPrecondition({ items: cart, user }, result);

    // 5. ASSERT - Verify expected behavior
    expect(result.originalTotal).toBe(15000);      // 5000 * 3
    expect(result.volumeDiscountTotal).toBe(2250); // 15% of 15000
    expect(result.lineItems[0].bulkDiscount).toBe(2250);
    expect(result.lineItems[0].totalAfterBulk).toBe(12750);
  });
});
```

### Metadata Fields Explained

| Field | Purpose | Example |
|-------|---------|---------|
| `ruleReference` | Exact document location | `pricing-strategy.md §2` |
| `rule` | Human-readable description | Text from business document |
| `tags` | Cross-cutting concerns | `@critical`, `@boundary` |

### Exercise: Write Your First Traceable Test

Create a test for the VIP boundary condition (tenure exactly 3 years):

```typescript
it('Exactly 3 years tenure (boundary) gets VIP discount', () => {
  verifyExample({
    ruleReference: 'pricing-strategy.md §3 - VIP Tier',
    rule: 'Critical boundary: tenure = 3 years (just over > 2 requirement)',
    tags: ["@precondition", "@pricing", "@boundary", "@vip", "@critical"]
  }, () => {
    // Your implementation here:
    // 1. Create a cart with 1 item
    // 2. Create a user with tenureYears = 3
    // 3. Calculate result
    // 4. Log the precondition
    // 5. Assert VIP discount is 5% of item price
  });
});
```

---

## Level 2: Data-Driven Tests

Data-driven tests verify multiple scenarios using the same test logic. Use this pattern when you have:
- Boundary conditions (exactly at threshold vs just over)
- Multiple valid inputs producing similar outputs
- Regression cases that must all pass

### Pattern: Parameterized Test Tables

```typescript
import { describe, it, expect } from 'vitest';
import { PricingEngine, CartItem, User, ShippingMethod } from '../../shared/src';

describe('Shipping Boundary Conditions', () => {
  const shippingScenarios = [
    {
      name: 'Exactly $100.00 does NOT qualify for free shipping',
      cart: [{ sku: 'A', name: 'Item', price: 10000, quantity: 1, weightInKg: 0 }],
      user: { tenureYears: 0 },
      expectedFreeShipping: false,
      ruleRef: 'pricing-strategy.md §5.2'
    },
    {
      name: '$100.01 DOES qualify for free shipping',
      cart: [{ sku: 'B', name: 'Item', price: 10001, quantity: 1, weightInKg: 0 }],
      user: { tenureYears: 0 },
      expectedFreeShipping: true,
      ruleRef: 'pricing-strategy.md §5.2'
    },
    {
      name: 'VIP discount pushes $105 cart under $100 threshold',
      cart: [{ sku: 'C', name: 'Item', price: 10500, quantity: 1, weightInKg: 0 }],
      user: { tenureYears: 5 }, // VIP
      expectedFreeShipping: false, // $105 - 5% = $99.75
      ruleRef: 'pricing-strategy.md §5.2'
    }
  ];

  shippingScenarios.forEach(({ name, cart, user, expectedFreeShipping, ruleRef }) => {
    it(name, () => {
      const result = PricingEngine.calculate(cart, user, ShippingMethod.STANDARD);
      expect(result.shipment.isFreeShipping).toBe(expectedFreeShipping);
    });
  });
});
```

### When to Use Each Level

| Scenario | Level | Rationale |
|----------|-------|-----------|
| Document happy path | Level 1 | Readable, specific example |
| Test 10+ boundary values | Level 2 | Avoid duplication |
| Prove mathematical invariant | Level 3 | Infinite coverage |
| Edge case discovery | Level 3 | Finds cases humans miss |

---

## Level 3: Property-Based Invariants

**Property-Based Testing (PBT)** generates hundreds of random inputs to prove business rules hold universally. Unlike example-based tests, PBT finds edge cases humans never consider (empty carts, negative values, extreme quantities).

### What Makes a Property?

A property is a **universal assertion** that must hold true for all valid inputs:

- "Final total is always ≤ original total"
- "VIP users always get exactly 5% discount"
- "Total discount never exceeds 30%"

### Annotated `verifyInvariant()` Example

```typescript
import { describe, it } from 'vitest';
import { verifyInvariant } from './fixtures/invariant-helper';
import { CartItem, User, PricingResult } from '../src';

describe('Pricing Engine: Mathematical Invariants', () => {

  it('Final Total is always <= Original Total', () => {
    // verifyInvariant handles property generation and logging automatically
    verifyInvariant({
      // Business rule traceability
      ruleReference: 'pricing-strategy.md §1 - Base Rules',
      rule: 'Final Total must never exceed Original Total (prices never increase)',
      tags: ['@pricing', '@base-rules', '@revenue-protection']
    }, 
    // The assertion receives randomly generated items and user
    (_items: CartItem[], _user: User, result: PricingResult) => {
      // This must hold for ALL possible carts and users
      expect(result.finalTotal).toBeLessThanOrEqual(result.originalTotal);
    });
  });

  it('Line items with qty >= 3 always have 15% discount', () => {
    verifyInvariant({
      ruleReference: 'pricing-strategy.md §2 - Bulk Discounts',
      rule: 'Any line item with Quantity >= 3 MUST have a 15% discount applied',
      tags: ['@pricing', '@bulk-discount', '@customer-experience']
    }, (_items: CartItem[], _user: User, result: PricingResult) => {
      result.lineItems.forEach(li => {
        const expectedDiscount = li.quantity >= 3
          ? Math.round(li.originalPrice * li.quantity * 0.15)
          : 0;
        expect(li.bulkDiscount).toBe(expectedDiscount);
      });
    });
  });

  it('VIP discount is exactly 5% of subtotal (after bulk) if eligible', () => {
    verifyInvariant({
      ruleReference: 'pricing-strategy.md §3 - VIP Tier',
      rule: 'If User Tenure > 2, a 5% discount is applied to the post-bulk subtotal',
      tags: ['@pricing', '@vip', '@loyalty']
    }, (_items: CartItem[], user: User, result: PricingResult) => {
      const expected = user.tenureYears > 2 
        ? Math.round(result.subtotalAfterBulk * 0.05) 
        : 0;
      expect(result.vipDiscount).toBe(expected);
    });
  });
});
```

### Arbitraries: The Generators

Arbitraries define how random data is generated. The test framework (`fast-check`) handles the complexity:

```typescript
// From shared/fixtures/arbitraries.ts
import * as fc from 'fast-check';
import { CartItem, User, ShippingMethod } from '@executable-specs/domain';

// Basic generators
export const userArb = fc.record<User>({
  tenureYears: fc.integer({ min: 0, max: 10 }),
});

export const cartItemArb = fc.record<CartItem>({
  sku: fc.string(),
  name: fc.string(),
  price: fc.integer({ min: 100, max: 100000 }), // $1 to $1000
  quantity: fc.integer({ min: 1, max: 20 }),
  weightInKg: fc.float({ min: 0.1, max: 10 }),
});

// Composite generators
export const cartArb = fc.array(cartItemArb, { 
  minLength: 1,  // At least 1 item
  maxLength: 10  // At most 10 items
});

export const shippingMethodArb = fc.constantFrom(
  ShippingMethod.STANDARD,
  ShippingMethod.EXPEDITED,
  ShippingMethod.EXPRESS
);
```

### Common Pitfalls and Solutions

| Pitfall | Problem | Solution |
|---------|---------|----------|
| **Over-constrained** | Test fails on valid edge cases | Loosen assertions; check invariants not specifics |
| **Under-constrained** | Property passes but bug exists | Add more specific assertions |
| **Shrinking issues** | Counterexample is hard to read | Use `verbose: true` option |
| **Non-determinism** | Flaky failures | Set explicit random seeds |

### Why PBT Catches Bugs Humans Miss

Traditional testing relies on human imagination. PBT uses **combinatorial explosion**:

- **Empty cart** (qty=0, total=0) 
- **Massive quantity** (qty=999999)
- **Negative edge cases** (if not filtered)
- **Precision issues** ($0.01 rounding errors)
- **Multiple discount interactions** (bulk + VIP + cap)

Example: The Safety Valve rule requires total discount ≤ 30%. A human might test with $100 cart. PBT will test with:
- $1 cart with 100 items (bulk discount dominates)
- $100,000 cart with VIP user (VIP discount large in absolute terms)
- Combinations that sum to exactly 30% or slightly over

---

## Test Data Builders

Fluent builders create test data with **type safety** and **readability**. They prevent "magic numbers" and make test intent explicit.

### Why Fluent Builders?

| Approach | Problem | Builder Solution |
|----------|---------|------------------|
| Raw objects | `quantity: 5` - why 5? | `withItem({ name: 'Widget', price: 10000, quantity: 5 })` |
| Magic numbers | `tenureYears: 3` - VIP? | `asVipUser()` - intent clear |
| Copy-paste setup | 50 lines per test | Chain methods fluently |
| Refactoring risk | Field renames break tests | IDE refactoring works |

### `CartBuilder` Walkthrough

```typescript
// packages/shared/fixtures/cart-builder.ts
export class CartBuilder {
  private items: CartItem[] = [];
  private user: User = { tenureYears: 0 };
  private shippingMethod: ShippingMethod = ShippingMethod.STANDARD;
  private tracer: Tracer | null = null;

  // Factory method - entry point
  static new(): CartBuilder {
    return new CartBuilder();
  }

  // Fluent method - returns `this` for chaining
  withItem(params: ItemBuilderParams): CartBuilder {
    const { name, price, quantity = 1, sku, weightInKg = 1.0 } = params;
    this.items.push({
      sku: sku || name.toUpperCase().replace(/\s+/g, '_'),
      name,
      price,
      quantity,
      weightInKg
    });
    return this;  // Enables chaining
  }

  // Semantic helper - makes intent clear
  asVipUser(): CartBuilder {
    this.user.tenureYears = 3;  // > 2 years = VIP
    return this;
  }

  // Explicit value setter
  withTenure(years: number): CartBuilder {
    this.user.tenureYears = years;
    return this;
  }

  // Shipping method helpers
  withStandardShipping(): CartBuilder {
    return this.withShipping(ShippingMethod.STANDARD);
  }

  withExpeditedShipping(): CartBuilder {
    return this.withShipping(ShippingMethod.EXPEDITED);
  }

  withExpressShipping(): CartBuilder {
    return this.withShipping(ShippingMethod.EXPRESS);
  }

  // Terminal method - executes the calculation
  calculate(testName?: string): PricingResult {
    const input = { items: this.items, user: this.user, shippingMethod: this.shippingMethod };
    const output = PricingEngine.calculate(this.items, this.user, this.shippingMethod);
    
    if (testName && this.tracer) {
      this.tracer.log(testName, input, output);
    }
    
    return output;
  }
}
```

### Usage Examples

```typescript
// Simple cart
const result = CartBuilder.new()
  .withItem({ name: 'Widget', price: 10000, quantity: 1 })
  .calculate();

// VIP user with bulk discount
const result = CartBuilder.new()
  .withItem({ name: 'Premium', price: 50000, quantity: 5 })  // Bulk eligible
  .asVipUser()                                              // VIP discount
  .withExpeditedShipping()
  .calculate('test-name');

// Complex multi-item cart
const result = CartBuilder.new()
  .withItem({ name: 'Laptop', price: 129900, quantity: 1 })
  .withItem({ name: 'Mouse', price: 2900, quantity: 3 })      // Bulk discount
  .withItem({ name: 'Cable', price: 1500, quantity: 2 })     // No bulk
  .withTenure(5)                                            // VIP
  .withStandardShipping()
  .calculate();
```

### Exercise: Extend the Builder

Add a `withBulkItem()` method that automatically sets quantity to 3:

```typescript
withBulkItem(params: Omit<ItemBuilderParams, 'quantity'>): CartBuilder {
  return this.withItem({ ...params, quantity: 3 });
}

// Usage:
CartBuilder.new()
  .withBulkItem({ name: 'BulkWidget', price: 10000 })  // quantity auto-set to 3
  .calculate();
```

---

## Integration & E2E Patterns

### Integration Test Example

Integration tests verify multiple components working together:

```typescript
// packages/domain/test/integration.properties.test.ts
describe('Integration: Multi-Rule Interactions', () => {
  
  it('Bulk + VIP discounts combine correctly and respect cap', () => {
    // Uses same verifyInvariant pattern as unit tests
    fc.assert(
      fc.property(cartArb, userArb, (items, user) => {
        const result = PricingEngine.calculate(items, user);
        
        // Verify discounts stack correctly
        const expectedBulk = result.lineItems.reduce((sum, li) => {
          return sum + (li.quantity >= 3 ? Math.round(li.originalPrice * li.quantity * 0.15) : 0);
        }, 0);
        
        const expectedSubtotalAfterBulk = result.originalTotal - expectedBulk;
        const expectedVip = user.tenureYears > 2
          ? Math.round(expectedSubtotalAfterBulk * 0.05)
          : 0;
        const expectedTotalDiscount = expectedBulk + expectedVip;
        const maxDiscount = Math.round(result.originalTotal * 0.30);
        
        // Assertions verify integration logic
        expect(result.volumeDiscountTotal).toBe(expectedBulk);
        expect(result.totalDiscount).toBeLessThanOrEqual(maxDiscount);
        
        return true;
      }),
      { verbose: true }
    );
  });
});
```

### E2E Test Example with `invariant()`

E2E tests use the same `invariant()` wrapper for traceability:

```typescript
// test/e2e/cart.ui.properties.test.ts
import { expect } from '@playwright/test';
import { invariant } from './fixtures/invariant-helper';

// The invariant() wrapper provides automatic metadata registration
invariant('VIP badge shown for VIP users', {
  ruleReference: 'pricing-strategy.md §3 - VIP Tier',
  rule: 'VIP badge is visible for eligible users (tenure > 2 years)',
  tags: ['@vip', '@pricing']
}, async ({ page }) => {
  // Test implementation using Playwright
  const vipEmail = 'vip@techhome.com';
  
  await page.goto('/login');
  await page.getByTestId('email-input').fill(vipEmail);
  await page.getByTestId('password-input').fill('password');
  await page.getByTestId('login-button').click();
  
  // Wait for navigation
  await page.waitForURL(/\/cart/, { timeout: 3000 });
  
  // Add item to cart
  await page.goto('/products/WIRELESS-EARBUDS');
  await page.getByRole('button', { name: 'Add to Cart' }).click();
  await page.getByTestId('cart-badge').waitFor({ state: 'visible' });
  
  // Verify VIP badge visible
  await page.goto('/cart');
  await page.waitForLoadState('networkidle');
  
  const vipBadge = page.getByTestId('vip-user-label');
  await expect(vipBadge).toBeVisible();
});
```

### How `invariant()` Provides Traceability

The E2E `invariant()` wrapper (in `test/e2e/fixtures/invariant-helper.ts`) automatically:

1. **Derives hierarchy** from test filename (`cart.ui.properties.test.ts` → Domain: Cart)
2. **Registers Allure metadata** for test reporting
3. **Adds Playwright annotations** for traceability
4. **Captures browser errors** automatically

```typescript
export function invariant(
  title: string,
  metadata: InvariantMetadata,
  testFunction: (args: { page: Page, request: APIRequestContext }, testInfo: TestInfo) => Promise<void>
) {
  test(title, async ({ page, request }, testInfo) => {
    // Auto-derive hierarchy
    const hierarchy = deriveHierarchyFromPath(testInfo.titlePath[0]);
    
    // Register for attestation reports
    registerAllureMetadata(allure, { ...metadata, ...hierarchy });
    
    // Add native annotations
    testInfo.annotations.push({ type: 'rule', description: metadata.rule });
    testInfo.annotations.push({ type: 'reference', description: metadata.ruleReference });
    
    // Execute test
    await testFunction({ page, request }, testInfo);
  });
}
```

---

## Quick Reference Card

### Pattern Selection Guide

| Use Case | Level | Pattern | File Convention |
|----------|-------|---------|-----------------|
| Document happy path | 1 | `verifyExample()` | `domain.spec.ts` |
| Boundary condition | 1 | `verifyExample()` | `domain.spec.ts` |
| Multiple similar cases | 2 | Parameterized array | `domain.spec.ts` |
| Mathematical proof | 3 | `verifyInvariant()` | `domain.properties.test.ts` |
| UI behavior | 3 | `invariant()` | `domain.ui.properties.test.ts` |
| Multi-component flow | 3 | Integration test | `integration.properties.test.ts` |

### Common Commands

```bash
# Run all tests (unit + e2e + attestation)
pnpm run test:all

# Run only unit tests
cd packages/domain && pnpm test

# Run only E2E tests
cd test && pnpm test

# Run specific test file
pnpm test pricing.properties.test.ts

# Generate coverage report
cd packages/domain && pnpm test:coverage

# View attestation report
open reports/run-$(date +%s)/attestation/attestation-full.html
```

### File Naming Convention

| Pattern | Filename | Purpose |
|---------|----------|---------|
| Unit tests | `pricing.spec.ts` | Example-based documentation |
| Property tests | `pricing.properties.test.ts` | Mathematical invariants |
| E2E tests | `cart.ui.properties.test.ts` | GUI verification |
| Integration | `integration.properties.test.ts` | Multi-rule interactions |
| Preconditions | `preconditions.spec.ts` | Edge cases and boundaries |

### Metadata Tags Reference

| Tag | Meaning | Usage |
|-----|---------|-------|
| `@critical` | Business-critical rule | Safety valve, payment |
| `@boundary` | Edge case testing | Threshold values |
| `@pricing` | Pricing domain | All price calculations |
| `@vip` | VIP tier rules | Loyalty discounts |
| `@shipping` | Shipping rules | Delivery calculations |
| `@integration` | Multi-rule tests | Complex interactions |
| `@compliance` | Regulatory requirement | Audit-critical |

### Rule Reference Format

Always use the format: `document-name.md §section - Rule Name`

```typescript
ruleReference: 'pricing-strategy.md §2 - Bulk Discounts'
ruleReference: 'pricing-strategy.md §4 - Safety Valve'
ruleReference: 'shipping-policy.md §1 - Base Rates'
```

---

## Summary

This repository demonstrates that tests can be both **executable specifications** and **compliance documentation**:

1. **Level 1** (`verifyExample`) - Document specific scenarios with full traceability
2. **Level 2** (Parameterized) - Cover boundary conditions efficiently  
3. **Level 3** (`verifyInvariant`) - Prove business rules mathematically

Use **Test Data Builders** for readable, refactorable test setup. Apply the **invariant wrapper** at all layers for automatic attestation report generation.

The result: Every test run produces an `attestation-full.html` that auditors can read, while developers maintain the speed and type safety of native TypeScript testing.
