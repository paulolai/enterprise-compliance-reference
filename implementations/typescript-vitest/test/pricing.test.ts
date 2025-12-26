import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { CartBuilder } from './fixtures/cart-builder';
import { PricingEngine } from '../src/pricing-engine';
import { cartArb, userArb } from './fixtures/arbitraries';
import { tracer } from './modules/tracer';

describe('Pricing Engine Strategy', () => {

  describe('1. Base Rules (Currency & Tax)', () => {
    it('Example: calculates total correctly for simple cart', () => {
      const result = CartBuilder.new()
        .withItem('Apple', 100, 1)
        .withItem('Banana', 200, 1)
        .calculate(expect.getState().currentTestName);
      expect(result.originalTotal).toBe(300);
      expect(result.finalTotal).toBe(300);
    });

    it('Invariant: Final Total is always <= Original Total', () => {
      const testName = expect.getState().currentTestName!;
      fc.assert(
        fc.property(cartArb, userArb, (items, user) => {
          const result = PricingEngine.calculate(items, user);
          tracer.log(testName, { items, user }, result);
          return result.finalTotal <= result.originalTotal;
        })
      );
    });
  });

  describe('2. Bulk Discounts', () => {
    it('Example: applies 15% discount for 3+ of same SKU', () => {
      const result = CartBuilder.new()
        .withItem('iPad', 100000, 3)
        .calculate(expect.getState().currentTestName);
      expect(result.bulkDiscountTotal).toBe(45000); // 15% of 300000
    });

    it('Invariant: Line items with qty >= 3 always have 15% discount', () => {
      const testName = expect.getState().currentTestName!;
      fc.assert(
        fc.property(cartArb, userArb, (items, user) => {
          const result = PricingEngine.calculate(items, user);
          tracer.log(testName, { items, user }, result);
          result.lineItems.forEach(li => {
            if (li.quantity >= 3) {
              const expectedDiscount = Math.round(li.originalPrice * li.quantity * 0.15);
              expect(li.bulkDiscount).toBe(expectedDiscount);
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
        .withItem('Widget', 10000, 1)
        .asVipUser()
        .calculate(expect.getState().currentTestName);
      expect(result.vipDiscount).toBe(500);
    });

    it('Invariant: VIP discount is exactly 5% of subtotal (after bulk) if eligible', () => {
      const testName = expect.getState().currentTestName!;
      fc.assert(
        fc.property(cartArb, userArb, (items, user) => {
          const result = PricingEngine.calculate(items, user);
          tracer.log(testName, { items, user }, result);
          if (user.tenureYears > 2) {
            const expected = Math.round(result.subtotalAfterBulk * 0.05);
            expect(result.vipDiscount).toBe(expected);
          } else {
            expect(result.vipDiscount).toBe(0);
          }
        })
      );
    });
  });

  describe('4. Safety Valve', () => {
    it('Example: demonstrates discount stacking without hitting cap', () => {
      const result = CartBuilder.new()
        .withItem('PremiumLaptop', 100000, 3)
        .asVipUser()
        .calculate(expect.getState().currentTestName);
      // Original: 300000
      // Bulk discount: 15% of 300000 = 45000
      // VIP discount: 5% of (300000 - 45000) = 12750
      // Total discount: 57750
      // Max allowed (30%): 90000
      // Should NOT cap (57750 < 90000)
      expect(result.originalTotal).toBe(300000);
      expect(result.bulkDiscountTotal).toBe(45000);
      expect(result.vipDiscount).toBe(12750);
      expect(result.totalDiscount).toBe(57750);
      expect(result.isCapped).toBe(false);
    });

    it('Example: demonstrates discount calculation respects upper limit', () => {
      // With bulk + VIP, the natural discount calculation
      // always stays below 30% due to the sequential nature
      const result = CartBuilder.new()
        .withItem('EnterpriseServer', 5000000, 10)
        .asVipUser()
        .calculate(expect.getState().currentTestName);
      // Original: 50,000,000 cents ($500,000)
      // Bulk: 15% = 7,500,000
      // VIP: 5% of (50M - 7.5M) = 2,125,000
      // Total: 9,625,000 (19.25% of original)
      // Always below 30% cap due to calculation order
      expect(result.originalTotal).toBe(50000000);
      expect(result.totalDiscount).toBe(9625000);
      expect(result.totalDiscount).toBeLessThan(result.originalTotal * 0.30);
    });

    it('Invariant: Total Discount strictly NEVER exceeds 30% of Original Total', () => {
      const testName = expect.getState().currentTestName!;
      fc.assert(
        fc.property(cartArb, userArb, (items, user) => {
          const result = PricingEngine.calculate(items, user);
          tracer.log(testName, { items, user }, result);
          const maxAllowed = Math.round(result.originalTotal * 0.30);
          expect(result.totalDiscount).toBeLessThanOrEqual(maxAllowed);
          if (result.isCapped) {
            expect(result.totalDiscount).toBe(maxAllowed);
          }
        })
      );
    });

    it('Invariant: When capped, discount equals exactly 30% of original total', () => {
      const testName = expect.getState().currentTestName!;
      fc.assert(
        fc.property(cartArb, userArb, (items, user) => {
          const result = PricingEngine.calculate(items, user);
          if (result.isCapped) {
            tracer.log(testName, { items, user }, result);
            const maxAllowed = Math.round(result.originalTotal * 0.30);
            expect(result.totalDiscount).toBe(maxAllowed);
          }
          return true;
        })
      );
    });
  });

  describe('5. Mixed Cart Scenarios', () => {
    it('Example: applies bulk discount to some items but not others', () => {
      const result = CartBuilder.new()
        .withItem('StandardWidget', 10000, 5)   // Gets discount
        .withItem('PremiumWidget', 20000, 2)   // No discount
        .withItem('SmallWidget', 5000, 1)      // No discount
        .calculate(expect.getState().currentTestName);

      // Verify bulk discount applied only to 5 qty items
      const bulkLineItem = result.lineItems.find(li => li.name === 'StandardWidget');
      const premiumLineItem = result.lineItems.find(li => li.name === 'PremiumWidget');
      const smallLineItem = result.lineItems.find(li => li.name === 'SmallWidget');

      expect(bulkLineItem?.bulkDiscount).toBe(7500);   // 15% of 50000
      expect(premiumLineItem?.bulkDiscount).toBe(0);
      expect(smallLineItem?.bulkDiscount).toBe(0);
    });

    it('Example: applies bulk discount to multiple different bulk items', () => {
      const result = CartBuilder.new()
        .withItem('Product A', 10000, 3)
        .withItem('Product B', 20000, 5)
        .withItem('Product C', 5000, 4)
        .withItem('Product D', 7500, 1)
        .calculate(expect.getState().currentTestName);

      // All three bulk items get 15% discount
      expect(result.bulkDiscountTotal).toBe(
        (10000 * 3 * 0.15) + (20000 * 5 * 0.15) + (5000 * 4 * 0.15)
      ); // 4500 + 15000 + 3000 = 22500
    });

    it('invariant: Bulk discount exactly equals sum of individual line item bulk discounts', () => {
      const testName = expect.getState().currentTestName!;
      fc.assert(
        fc.property(cartArb, userArb, (items, user) => {
          const result = PricingEngine.calculate(items, user);
          tracer.log(testName, { items, user }, result);

          const sumOfBulkDiscounts = result.lineItems.reduce(
            (sum, li) => sum + li.bulkDiscount,
            0
          );

          expect(result.bulkDiscountTotal).toBe(sumOfBulkDiscounts);
          return true;
        })
      );
    });
  });

  describe('6. VIP Tier Edge Cases', () => {
    it('Example: non-VIP user receives zero VIP discount', () => {
      const result = CartBuilder.new()
        .withItem('Product', 10000, 5)
        .withTenure(1)
        .calculate(expect.getState().currentTestName);

      expect(result.vipDiscount).toBe(0);
    });

    it('Example: exact 2-year tenure is NOT VIP', () => {
      const result = CartBuilder.new()
        .withItem('Product', 10000, 5)
        .withTenure(2)
        .calculate(expect.getState().currentTestName);

      expect(result.vipDiscount).toBe(0);
    });

    it('Example: tenure just above threshold (2.1 years) receives VIP', () => {
      const result = CartBuilder.new()
        .withItem('Product', 10000, 5)
        .withTenure(2.1)
        .calculate(expect.getState().currentTestName);

      const expectedVip = Math.round((result.originalTotal - result.bulkDiscountTotal) * 0.05);
      expect(result.vipDiscount).toBe(expectedVip);
    });

    it('Invariant: Tenure exactly 2 years yields same result as 0 years', () => {
      const testName = expect.getState().currentTestName!;
      fc.assert(
        fc.property(cartArb, (items) => {
          const zeroYearResult = PricingEngine.calculate(items, { tenureYears: 0 });
          const twoYearResult = PricingEngine.calculate(items, { tenureYears: 2 });

          tracer.log(testName, { items }, { zeroYearResult, twoYearResult });

          expect(zeroYearResult.vipDiscount).toBe(twoYearResult.vipDiscount);
          expect(zeroYearResult.finalTotal).toBe(twoYearResult.finalTotal);
          return true;
        })
      );
    });
  });

  describe('7. Combined Scenarios', () => {
    it('Example: bulk and VIP discounts stack correctly', () => {
      const result = CartBuilder.new()
        .withItem('PremiumItem', 100000, 5)
        .asVipUser()
        .calculate(expect.getState().currentTestName);

      // Original: 500000
      // Bulk discount: 15% of 500000 = 75000
      // Subtotal after bulk: 425000
      // VIP discount: 5% of 425000 = 21250
      // Total discount: 96250
      // Final total: 403750

      expect(result.originalTotal).toBe(500000);
      expect(result.bulkDiscountTotal).toBe(75000);
      expect(result.vipDiscount).toBe(21250);
      expect(result.totalDiscount).toBe(96250);
      expect(result.finalTotal).toBe(403750);
    });

    it('Invariant: VIP discount is calculated on post-bulk subtotal', () => {
      const testName = expect.getState().currentTestName!;
      fc.assert(
        fc.property(cartArb, userArb, (items, user) => {
          const result = PricingEngine.calculate(items, user);
          if (user.tenureYears > 2) {
            tracer.log(testName, { items, user }, result);

            // Verify VIP discount is based on subtotalAfterBulk
            const expectedVip = Math.round(result.subtotalAfterBulk * 0.05);
            expect(result.vipDiscount).toBe(expectedVip);
          }
          return true;
        })
      );
    });
  });

  describe('8. Precision and Rounding', () => {
    it('Example: precision across complex calculations', () => {
      const result = CartBuilder.new()
        .withItem('Item A', 999, 3)
        .withItem('Item B', 1999, 4)
        .withItem('Item C', 1549, 2)
        .calculate(expect.getState().currentTestName);

      // With integers, all values are already "rounded" (whole cents)
      expect(Number.isInteger(result.originalTotal)).toBe(true);
      expect(Number.isInteger(result.bulkDiscountTotal)).toBe(true);
      expect(Number.isInteger(result.subtotalAfterBulk)).toBe(true);
      expect(Number.isInteger(result.finalTotal)).toBe(true);

      result.lineItems.forEach(li => {
        expect(Number.isInteger(li.totalAfterBulk)).toBe(true);
      });
    });

    it('Invariant: All monetary values are integers (Cents)', () => {
      const testName = expect.getState().currentTestName!;
      fc.assert(
        fc.property(cartArb, userArb, (items, user) => {
          const result = PricingEngine.calculate(items, user);
          tracer.log(testName, { items, user }, result);

          const fields: (keyof typeof result)[] = [
            'originalTotal',
            'bulkDiscountTotal',
            'vipDiscount',
            'totalDiscount',
            'subtotalAfterBulk',
            'finalTotal',
            'grandTotal'
          ];

          for (const field of fields) {
            const value = result[field] as number;
            expect(Number.isInteger(value)).toBe(true);
          }

          // Check line items
          result.lineItems.forEach(li => {
            expect(Number.isInteger(li.totalAfterBulk)).toBe(true);
          });

          return true;
        })
      );
    });
  });

  describe('9. Large and Edge Cases', () => {
    it('Example: handles large cart with many line items', () => {
      const builder = CartBuilder.new();

      // Add 20 distinct items with varying quantities
      for (let i = 1; i <= 20; i++) {
        const price = 1000 + (i * 500); // $15 to $110
        const qty = i % 4 + 1; // 1 to 4 items
        builder.withItem(`Product ${i}`, price, qty);
      }

      const result = builder.calculate(expect.getState().currentTestName);

      expect(result.lineItems.length).toBe(20);
      expect(result.originalTotal).toBeGreaterThan(0);
      expect(result.finalTotal).toBeGreaterThan(0);
    });

    it('Example: single item at bulk threshold', () => {
      const result = CartBuilder.new()
        .withItem('Threshold Item', 10000, 3)
        .calculate(expect.getState().currentTestName);

      // Exactly 3 items should get bulk discount
      expect(result.bulkDiscountTotal).toBe(4500); // 15% of 30000
      expect(result.finalTotal).toBe(25500);
    });

    it('Example: single item below bulk threshold', () => {
      const result = CartBuilder.new()
        .withItem('Below Threshold Item', 10000, 2)
        .calculate(expect.getState().currentTestName);

      // No bulk discount
      expect(result.bulkDiscountTotal).toBe(0);
      expect(result.finalTotal).toBe(20000);
    });

    it('Example: empty cart (no items)', () => {
      const result = CartBuilder.new()
        .asVipUser()
        .calculate(expect.getState().currentTestName);

      expect(result.originalTotal).toBe(0);
      expect(result.bulkDiscountTotal).toBe(0);
      expect(result.vipDiscount).toBe(0);
      expect(result.totalDiscount).toBe(0);
      expect(result.finalTotal).toBe(0);
        });
      });
    });
    