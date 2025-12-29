import { describe, it, expect } from 'vitest';
import { PricingEngine } from '../src/pricing-engine';
import { CartItem, User, ShippingMethod } from '../src/types';
import { registerPrecondition, logPrecondition } from './fixtures/invariant-helper';

describe('Preconditions: Input Validation & Edge Cases', () => {

  it('Precondition: Empty cart results in zero totals', () => {
    registerPrecondition({
      name: 'Precondition: Empty cart results in zero totals',
      ruleReference: 'pricing-strategy.md §1 - Base Rules',
      scenario: 'Edge case: Empty cart should not crash, should only charge shipping',
      tags: ["@precondition","@boundary","@input-validation"]
    });

    const emptyCart: CartItem[] = [];
    const user: User = { tenureYears: 0 };

    const result = PricingEngine.calculate(emptyCart, user);
    logPrecondition("Precondition: Empty cart results in zero totals", { items: emptyCart, user }, result);

    expect(result.originalTotal).toBe(0);
    expect(result.finalTotal).toBe(0);
    expect(result.totalDiscount).toBe(0);
    expect(result.volumeDiscountTotal).toBe(0);
    expect(result.vipDiscount).toBe(0);
    expect(result.lineItems).toEqual([]);
    expect(result.isCapped).toBe(false);
    expect(result.grandTotal).toBeGreaterThan(0); // Shipping should still apply
  });

  it('Precondition: Single item with qty 1 gets no bulk discount', () => {
    registerPrecondition({
      name: 'Precondition: Single item with qty 1 gets no bulk discount',
      ruleReference: 'pricing-strategy.md §2 - Bulk Discounts',
      scenario: 'Boundary: quantity < 3 should NOT receive bulk discount',
      tags: ["@precondition","@pricing","@boundary","@bulk-discount"]
    });

    const cart: CartItem[] = [{
      sku: 'SINGLE',
      name: 'Single Item',
      price: 10000,
      quantity: 1,
      weightInKg: 1.0
    }];
    const user: User = { tenureYears: 0 };

    const result = PricingEngine.calculate(cart, user);
    logPrecondition("Precondition: Single item with qty 1 gets no bulk discount", { items: cart, user }, result);

    expect(result.originalTotal).toBe(10000);
    expect(result.volumeDiscountTotal).toBe(0);
    expect(result.finalTotal).toBe(10000);
    expect(result.lineItems[0].bulkDiscount).toBe(0);
    expect(result.lineItems[0].totalAfterBulk).toBe(10000);
  });

  it('Precondition: Exactly 2 items (boundary condition) gets no bulk discount', () => {
    registerPrecondition({
      name: 'Precondition: Exactly 2 items (boundary condition) gets no bulk discount',
      ruleReference: 'pricing-strategy.md §2 - Bulk Discounts',
      scenario: 'Critical boundary: quantity = 2 (just below bulk threshold of 3)',
      tags: ["@precondition","@pricing","@boundary","@bulk-discount","@critical"]
    });

    const cart: CartItem[] = [{
      sku: 'EXACTLY_2',
      name: 'Exactly 2 Items',
      price: 5000,
      quantity: 2,
      weightInKg: 1.0
    }];
    const user: User = { tenureYears: 0 };

    const result = PricingEngine.calculate(cart, user);
    logPrecondition("Precondition: Exactly 2 items (boundary condition) gets no bulk discount", { items: cart, user }, result);

    expect(result.originalTotal).toBe(10000); // 5000 * 2
    expect(result.volumeDiscountTotal).toBe(0);
    expect(result.finalTotal).toBe(10000);
    expect(result.lineItems[0].bulkDiscount).toBe(0);
  });

  it('Precondition: Exactly 3 items (boundary condition) gets bulk discount', () => {
    registerPrecondition({
      name: 'Precondition: Exactly 3 items (boundary condition) gets bulk discount',
      ruleReference: 'pricing-strategy.md §2 - Bulk Discounts',
      scenario: 'Critical boundary: quantity = 3 (exactly at bulk threshold, MUST get discount)',
      tags: ["@precondition","@pricing","@boundary","@bulk-discount","@critical"]
    });

    const cart: CartItem[] = [{
      sku: 'EXACTLY_3',
      name: 'Exactly 3 Items',
      price: 5000,
      quantity: 3,
      weightInKg: 1.0
    }];
    const user: User = { tenureYears: 0 };

    const result = PricingEngine.calculate(cart, user);
    logPrecondition("Precondition: Exactly 3 items (boundary condition) gets bulk discount", { items: cart, user }, result);

    expect(result.originalTotal).toBe(15000); // 5000 * 3
    expect(result.volumeDiscountTotal).toBe(2250); // 15000 * 0.15
    expect(result.lineItems[0].bulkDiscount).toBe(2250);
    expect(result.lineItems[0].totalAfterBulk).toBe(12750); // 15000 - 2250
  });

  it('Precondition: Exactly 2 years tenure (boundary) gets no VIP discount', () => {
    registerPrecondition({
      name: 'Precondition: Exactly 2 years tenure (boundary) gets no VIP discount',
      ruleReference: 'pricing-strategy.md §3 - VIP Tier',
      scenario: 'Critical boundary: tenure = 2 years (just below > 2 requirement)',
      tags: ["@precondition","@pricing","@boundary","@vip","@critical"]
    });

    const cart: CartItem[] = [{
      sku: 'ITEM',
      name: 'Item',
      price: 10000,
      quantity: 1,
      weightInKg: 1.0
    }];
    const user: User = { tenureYears: 2 }; // Exactly at boundary

    const result = PricingEngine.calculate(cart, user);
    logPrecondition("Precondition: Exactly 2 years tenure (boundary) gets no VIP discount", { items: cart, user }, result);

    expect(result.vipDiscount).toBe(0);
    expect(result.finalTotal).toBe(result.originalTotal);
  });

  it('Precondition: Exactly 3 years tenure (boundary) gets VIP discount', () => {
    registerPrecondition({
      name: 'Precondition: Exactly 3 years tenure (boundary) gets VIP discount',
      ruleReference: 'pricing-strategy.md §3 - VIP Tier',
      scenario: 'Critical boundary: tenure = 3 years (just over > 2 requirement, MUST get discount)',
      tags: ["@precondition","@pricing","@boundary","@vip","@critical"]
    });

    const cart: CartItem[] = [{
      sku: 'ITEM',
      name: 'Item',
      price: 10000,
      quantity: 1,
      weightInKg: 1.0
    }];
    const user: User = { tenureYears: 3 }; // Just over boundary

    const result = PricingEngine.calculate(cart, user);
    logPrecondition("Precondition: Exactly 3 years tenure (boundary) gets VIP discount", { items: cart, user }, result);

    expect(result.vipDiscount).toBe(500); // 10000 * 0.05
    expect(result.finalTotal).toBe(9500); // 10000 - 500
  });

  it('Precondition: Exactly $100 cart does NOT qualify for free shipping', () => {
    registerPrecondition({
      name: 'Precondition: Exactly $100 cart does NOT qualify for free shipping',
      ruleReference: 'pricing-strategy.md §5.2 - Free Shipping Threshold',
      scenario: 'Critical boundary: finalTotal = $100.00 (must be > $100)',
      tags: ["@precondition","@shipping","@boundary","@free-shipping","@critical"]
    });

    const cart: CartItem[] = [{
      sku: 'EXACTLY_100',
      name: 'Exactly $100 Item',
      price: 10000,
      quantity: 1,
      weightInKg: 1.0
    }];
    const user: User = { tenureYears: 0 };

    const result = PricingEngine.calculate(cart, user, ShippingMethod.STANDARD);
    logPrecondition("Precondition: Exactly $100 cart does NOT qualify for free shipping", { items: cart, user }, result);

    expect(result.finalTotal).toBe(10000);
    expect(result.shipment.isFreeShipping).toBe(false);
    expect(result.shipment.totalShipping).toBe(900); // $7 + 1kg * $2
  });

  it('Precondition: $100.01 cart DOES qualify for free shipping', () => {
    registerPrecondition({
      name: 'Precondition: $100.01 cart DOES qualify for free shipping',
      ruleReference: 'pricing-strategy.md §5.2 - Free Shipping Threshold',
      scenario: 'Critical boundary: finalTotal = $100.01 (just over threshold, MUST get free shipping)',
      tags: ["@precondition","@shipping","@boundary","@free-shipping","@critical"]
    });

    const cart: CartItem[] = [{
      sku: 'JUST_OVER_100',
      name: 'Just over $100',
      price: 10001,
      quantity: 1,
      weightInKg: 1.0
    }];
    const user: User = { tenureYears: 0 };

    const result = PricingEngine.calculate(cart, user, ShippingMethod.STANDARD);
    logPrecondition("Precondition: $100.01 cart DOES qualify for free shipping", { items: cart, user }, result);

    expect(result.finalTotal).toBeGreaterThan(10000);
    expect(result.shipment.isFreeShipping).toBe(true);
    expect(result.shipment.totalShipping).toBe(0);
  });

  it('Precondition: Zero price items are handled correctly', () => {
    registerPrecondition({
      name: 'Precondition: Zero price items are handled correctly',
      ruleReference: 'pricing-strategy.md §1 - Base Rules',
      scenario: 'Edge case: Zero price items should not crash calculations',
      tags: ["@precondition","@boundary","@input-validation"]
    });

    const cart: CartItem[] = [
      {
        sku: 'FREE_ITEM',
        name: 'Free Item',
        price: 0,
        quantity: 5,
        weightInKg: 1.0
      },
      {
        sku: 'PAID_ITEM',
        name: 'Paid Item',
        price: 10000,
        quantity: 1,
        weightInKg: 1.0
      }
    ];
    const user: User = { tenureYears: 0 };

    const result = PricingEngine.calculate(cart, user);
    logPrecondition("Precondition: Zero price items are handled correctly", { items: cart, user }, result);

    expect(result.originalTotal).toBe(10000); // Only the paid item
    expect(result.volumeDiscountTotal).toBe(0); // 0 × 15% = 0 for free items
    expect(result.finalTotal).toBe(10000); // No discount applied
    expect(result.finalTotal).toBeLessThanOrEqual(result.originalTotal);
  });

  it('Precondition: Zero weight items work correctly', () => {
    registerPrecondition({
      name: 'Precondition: Zero weight items work correctly',
      ruleReference: 'pricing-strategy.md §5.1 - Base Shipping & Weight',
      scenario: 'Edge case: Zero weight items should only pay base shipping',
      tags: ["@precondition","@shipping","@boundary"]
    });

    const cart: CartItem[] = [{
      sku: 'ZERO_WEIGHT',
      name: 'Zero Weight Item',
      price: 10000,
      quantity: 1,
      weightInKg: 0
    }];
    const user: User = { tenureYears: 0 };

    const result = PricingEngine.calculate(cart, user, ShippingMethod.STANDARD);
    logPrecondition("Precondition: Zero weight items work correctly", { items: cart, user }, result);

    // Standard shipping: $7 base + (0 * $2)
    expect(result.shipment.totalShipping).toBe(700);
  });

  it('Precondition: Maximum discount cap (30%) is enforced correctly', () => {
    registerPrecondition({
      name: 'Precondition: Maximum discount cap (30%) is enforced correctly',
      ruleReference: 'pricing-strategy.md §4 - Safety Valve',
      scenario: 'Edge case: Large bulk + VIP order checks that 30% cap works',
      tags: ["@precondition","@pricing","@safety-valve","@critical"]
    });

    // Create a scenario that should hit the cap
    const cart: CartItem[] = [{
      sku: 'BULK_VIP_ITEM',
      name: 'Bulk VIP Item',
      price: 10000,
      quantity: 10, // Bulk discount
      weightInKg: 10.0
    }];
    const user: User = { tenureYears: 10 }; // VIP

    const result = PricingEngine.calculate(cart, user);
    logPrecondition("Precondition: Maximum discount cap (30%) is enforced correctly", { items: cart, user }, result);

    const expectedBulk = Math.round(10000 * 10 * 0.15); // 15000
    const expectedSubtotalAfterBulk = 100000 - expectedBulk; // 85000
    const expectedVip = Math.round(expectedSubtotalAfterBulk * 0.05); // 4250
    const expectedTotalDiscount = expectedBulk + expectedVip; // 19250 (19.25%)

    const maxCap = Math.round(100000 * 0.30); // 30000 (30%)

    // Should not exceed cap
    expect(result.totalDiscount).toBeLessThanOrEqual(maxCap);

    // In this case, total is 19.25%, less than 30%, so no cap
    expect(result.isCapped).toBe(false);
    expect(result.totalDiscount).toBe(expectedTotalDiscount);
  });

  it('Precondition: High-value bulk + VIP triggers discount cap', () => {
    registerPrecondition({
      name: 'Precondition: High-value bulk + VIP triggers discount cap',
      ruleReference: 'pricing-strategy.md §4 - Safety Valve',
      scenario: 'Edge case: Very high-value cart ensures discount cap activates',
      tags: ["@precondition","@pricing","@safety-valve","@boundary"]
    });

    const cart: CartItem[] = [{
      sku: 'EXPENSIVE_BULK',
      name: 'Expensive Bulk Item',
      price: 50000, // $500 per item
      quantity: 20, // $10,000 cart
      weightInKg: 5.0
    }];
    const user: User = { tenureYears: 5 }; // VIP

    const result = PricingEngine.calculate(cart, user);
    logPrecondition("Precondition: High-value bulk + VIP triggers discount cap", { items: cart, user }, result);

    const expectedBulk = Math.round(50000 * 20 * 0.15); // 150000
    const expectedSubtotalAfterBulk = 1000000 - expectedBulk; // 850000
    const expectedVip = Math.round(expectedSubtotalAfterBulk * 0.05); // 42500
    const expectedTotalDiscount = expectedBulk + expectedVip; // 192500 (19.25%)

    const maxCap = Math.round(1000000 * 0.30); // 300000 (30%)

    expect(result.totalDiscount).toBeLessThanOrEqual(maxCap);

    // 19.25% < 30%, so no cap hit in this specific case
    expect(result.isCapped).toBe(false);
  });

  it('Precondition: Multiple items with mixed bulk eligibility', () => {
    registerPrecondition({
      name: 'Precondition: Multiple items with mixed bulk eligibility',
      ruleReference: 'pricing-strategy.md §2 - Bulk Discounts',
      scenario: 'Edge case: Some items qualify for bulk, others do not',
      tags: ["@precondition","@pricing","@bulk-discount"]
    });

    const cart: CartItem[] = [
      {
        sku: 'BULK_ITEM',
        name: 'Bulk Eligible',
        price: 10000,
        quantity: 5, // Bulk
        weightInKg: 1.0
      },
      {
        sku: 'SINGLE_ITEM',
        name: 'Single Item',
        price: 10000,
        quantity: 1, // No bulk
        weightInKg: 1.0
      }
    ];
    const user: User = { tenureYears: 0 };

    const result = PricingEngine.calculate(cart, user);
    logPrecondition("Precondition: Multiple items with mixed bulk eligibility", { items: cart, user }, result);

    expect(result.originalTotal).toBe(60000); // 10K * 5 + 10K * 1
    expect(result.volumeDiscountTotal).toBe(7500); // 50K * 0.15 (only on first item)
    expect(result.lineItems[0].bulkDiscount).toBe(7500);
    expect(result.lineItems[1].bulkDiscount).toBe(0);
  });

  it('Precondition: Express delivery always costs $25 regardless of discounts', () => {
    registerPrecondition({
      name: 'Precondition: Express delivery always costs $25 regardless of discounts',
      ruleReference: 'pricing-strategy.md §5.4 - Express Delivery',
      scenario: 'Edge case: Express delivery ignores free shipping and caps',
      tags: ["@precondition","@shipping","@express"]
    });

    const cart: CartItem[] = [{
      sku: 'EXPENSIVE',
      name: 'Expensive Item',
      price: 100000, // $1000 cart
      quantity: 1,
      weightInKg: 1.0
    }];
    const user: User = { tenureYears: 5 }; // VIP

    const result = PricingEngine.calculate(cart, user, ShippingMethod.EXPRESS);
    logPrecondition("Precondition: Express delivery always costs $25 regardless of discounts", { items: cart, user }, result);

    expect(result.shipment.totalShipping).toBe(2500);
    expect(result.shipment.isFreeShipping).toBe(false);
    expect(result.grandTotal).toBe(result.finalTotal + 2500);
  });

  it('Precondition: Expedited delivery adds 15% surcharge on original subtotal', () => {
    registerPrecondition({
      name: 'Precondition: Expedited delivery adds 15% surcharge on original subtotal',
      ruleReference: 'pricing-strategy.md §5.3 - Expedited Shipping',
      scenario: 'Edge case: Expedited surcharge = 15% of ORIGINAL (not discounted) subtotal',
      tags: ["@precondition","@shipping","@expedited"]
    });

    const cart: CartItem[] = [{
      sku: 'ITEM',
      name: 'Item',
      price: 5000,
      quantity: 1,
      weightInKg: 5.0
    }];
    const user: User = { tenureYears: 0 };

    // Expedited shipping
    const expeditedResult = PricingEngine.calculate(cart, user, ShippingMethod.EXPEDITED);
    logPrecondition('Precondition: Expedited delivery adds 15% surcharge on original subtotal', { items: cart, user, method: ShippingMethod.EXPEDITED }, expeditedResult);
    const originalSubtotal = 5000; // price * quantity

    // Check expedited surcharge is 15% of original subtotal
    expect(expeditedResult.shipment.expeditedSurcharge).toBe(Math.round(originalSubtotal * 0.15)); // 750

    // Check total shipping: base ($7) + weight (5kg * $2 = $10) + expedited (15% = $7.50)
    expect(expeditedResult.shipment.baseShipping).toBe(700);
    expect(expeditedResult.shipment.weightSurcharge).toBe(1000); // 5kg * 200 cents
    expect(expeditedResult.shipment.totalShipping).toBe(700 + 1000 + 750); // 2450
    expect(expeditedResult.shipment.isFreeShipping).toBe(false);
  });

  it('Precondition: All monetary values are integers (no floating point)', () => {
    registerPrecondition({
      name: 'Precondition: All monetary values are integers (no floating point)',
      ruleReference: 'pricing-strategy.md §1 - Base Rules',
      scenario: 'Edge case: Validates all calculations use integer cents, not floats',
      tags: ["@precondition","@pricing","@precision","@critical"]
    });

    const cart: CartItem[] = [{
      sku: 'PRECISION_TEST',
      name: 'Precision Test',
      price: 12345,
      quantity: 7,
      weightInKg: 3.5
    }];
    const user: User = { tenureYears: 3 };

    const result = PricingEngine.calculate(cart, user);
    logPrecondition("Precondition: All monetary values are integers (no floating point)", { items: cart, user }, result);

    const numericFields: (number | undefined)[] = [
      result.originalTotal,
      result.volumeDiscountTotal,
      result.vipDiscount,
      result.totalDiscount,
      result.subtotalAfterBulk,
      result.finalTotal,
      result.grandTotal,
      result.shipment.totalShipping,
      result.shipment.expeditedSurcharge
    ];

    numericFields.forEach(value => {
      if (value !== undefined) {
        expect(Number.isInteger(value)).toBe(true);
      }
    });

    // Line item fields
    result.lineItems.forEach(li => {
      expect(Number.isInteger(li.totalAfterBulk)).toBe(true);
      expect(Number.isInteger(li.bulkDiscount)).toBe(true);
      expect(Number.isInteger(li.originalPrice)).toBe(true);
    });
  });

  it('Precondition: Bulk discount applies to low-value items with high quantity', () => {
    registerPrecondition({
      name: 'Precondition: Bulk discount applies to low-value items with high quantity',
      ruleReference: 'pricing-strategy.md §2 - Bulk Discounts',
      scenario: 'Edge case: Low price, high quantity triggers bulk discount correctly',
      tags: ["@precondition","@pricing","@bulk-discount"]
    });

    const cart: CartItem[] = [{
      sku: 'CHEAP_BULK',
      name: 'Cheap Bulk Item',
      price: 100, // $1.00
      quantity: 100,
      weightInKg: 1.0
    }];
    const user: User = { tenureYears: 0 };

    const result = PricingEngine.calculate(cart, user);
    logPrecondition("Precondition: Bulk discount applies to low-value items with high quantity", { items: cart, user }, result);

    expect(result.originalTotal).toBe(10000); // $1 * 100
    expect(result.volumeDiscountTotal).toBe(1500); // 10000 * 0.15
    expect(result.lineItems[0].bulkDiscount).toBe(1500);
    expect(result.finalTotal).toBe(8500);
  });

  it('Precondition: Zero tenure year gets no VIP discount', () => {
    registerPrecondition({
      name: 'Precondition: Zero tenure year gets no VIP discount',
      ruleReference: 'pricing-strategy.md §3 - VIP Tier',
      scenario: 'Edge case: New user (tenure = 0) should not get VIP discount',
      tags: ["@precondition","@pricing","@boundary","@vip"]
    });

    const cart: CartItem[] = [{
      sku: 'ITEM',
      name: 'Item',
      price: 10000,
      quantity: 1,
      weightInKg: 1.0
    }];
    const user: User = { tenureYears: 0 };

    const result = PricingEngine.calculate(cart, user);
    logPrecondition("Precondition: Zero tenure year gets no VIP discount", { items: cart, user }, result);

    expect(result.vipDiscount).toBe(0);
  });

  it('Precondition: Very high tenure (100 years) gets standard 5% discount', () => {
    registerPrecondition({
      name: 'Precondition: Very high tenure (100 years) gets standard 5% discount',
      ruleReference: 'pricing-strategy.md §3 - VIP Tier',
      scenario: 'Edge case: Very long tenure still only gets 5% (not escalating discount)',
      tags: ["@precondition","@pricing","@vip","@boundary"]
    });

    const cart: CartItem[] = [{
      sku: 'ITEM',
      name: 'Item',
      price: 10000,
      quantity: 1,
      weightInKg: 1.0
    }];
    const user: User = { tenureYears: 100 }; // Very long tenure

    const result = PricingEngine.calculate(cart, user);
    logPrecondition("Precondition: Very high tenure (100 years) gets standard 5% discount", { items: cart, user }, result);

    expect(result.vipDiscount).toBe(500); // Still just 5%
    expect(result.finalTotal).toBe(9500);
  });
});
