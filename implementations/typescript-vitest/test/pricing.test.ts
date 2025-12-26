import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { CartBuilder } from './fixtures/cart-builder';
import { PricingEngine } from '../src/pricing-engine';
import { cartArb, userArb } from './fixtures/arbitraries';

describe('Pricing Engine Strategy', () => {

  describe('1. Base Rules (Currency & Tax)', () => {
    it('Example: calculates total correctly for simple cart', () => {
      const result = CartBuilder.new()
        .withItem('Apple', 1.00, 1)
        .withItem('Banana', 2.00, 1)
        .calculate();
      expect(result.originalTotal).toBe(3.00);
      expect(result.finalTotal).toBe(3.00);
    });

    it('Invariant: Final Total is always <= Original Total', () => {
      fc.assert(
        fc.property(cartArb, userArb, (items, user) => {
          const result = PricingEngine.calculate(items, user);
          return result.finalTotal <= result.originalTotal;
        })
      );
    });
  });

  describe('2. Bulk Discounts', () => {
    it('Example: applies 15% discount for 3+ of same SKU', () => {
      const result = CartBuilder.new()
        .withItem('iPad', 1000.00, 3)
        .calculate();
      expect(result.bulkDiscountTotal).toBe(450); // 15% of 3000
    });

    it('Invariant: Line items with qty >= 3 always have 15% discount', () => {
      fc.assert(
        fc.property(cartArb, userArb, (items, user) => {
          const result = PricingEngine.calculate(items, user);
          result.lineItems.forEach(li => {
            if (li.quantity >= 3) {
              const expectedDiscount = Math.round((li.originalPrice * li.quantity * 0.15) * 100) / 100;
              expect(li.bulkDiscount).toBeCloseTo(expectedDiscount, 2);
            } else {
              expect(li.bulkDiscount).toBe(0);
            }
          });
        })
      );
    });
  });

  describe('3. VIP Tier', () => {
    it('Example: applies 5% discount for tenure > 2 years', () => {
      const result = CartBuilder.new()
        .withItem('Widget', 100.00, 1)
        .asVipUser()
        .calculate();
      expect(result.vipDiscount).toBe(5);
    });

    it('Invariant: VIP discount is exactly 5% of subtotal (after bulk) if eligible', () => {
      fc.assert(
        fc.property(cartArb, userArb, (items, user) => {
          const result = PricingEngine.calculate(items, user);
          if (user.tenureYears > 2) {
            const expected = Math.round((result.subtotalAfterBulk * 0.05) * 100) / 100;
            expect(result.vipDiscount).toBeCloseTo(expected, 2);
          } else {
            expect(result.vipDiscount).toBe(0);
          }
        })
      );
    });
  });

  describe('4. Safety Valve', () => {
    it('Invariant: Total Discount strictly NEVER exceeds 30% of Original Total', () => {
      fc.assert(
        fc.property(cartArb, userArb, (items, user) => {
          const result = PricingEngine.calculate(items, user);
          const maxAllowed = result.originalTotal * 0.30;
          expect(result.totalDiscount).toBeLessThanOrEqual(maxAllowed + 0.001);
          if (result.isCapped) {
            expect(result.totalDiscount).toBeCloseTo(maxAllowed, 2);
          }
        })
      );
    });
  });
});
