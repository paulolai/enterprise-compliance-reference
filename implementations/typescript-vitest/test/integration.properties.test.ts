import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { PricingEngine } from '../src/pricing-engine';
import { cartArb, userArb } from './fixtures/arbitraries';
import { ShippingMethod } from '../src/types';
import { tracer } from './modules/tracer';

describe('Integration: Multi-Rule Interactions', () => {

  it('Integration: Bulk + VIP discounts combine correctly and respect cap', () => {
    fc.assert(
      fc.property(
        cartArb,
        userArb,
        (items, user) => {
          const result = PricingEngine.calculate(items, user);
          tracer.log(expect.getState().currentTestName!, { items, user }, result);

          const expectedBulkDiscount = result.lineItems.reduce((sum, li) => {
            return sum + (li.quantity >= 3 ? Math.round(li.originalPrice * li.quantity * 0.15) : 0);
          }, 0);

          const expectedSubtotalAfterBulk = result.originalTotal - expectedBulkDiscount;
          const expectedVipDiscount = user.tenureYears > 2
            ? Math.round(expectedSubtotalAfterBulk * 0.05)
            : 0;
          const expectedTotalDiscount = expectedBulkDiscount + expectedVipDiscount;
          const maxDiscount = Math.round(result.originalTotal * 0.30);
          const expectedCappedDiscount = Math.min(expectedTotalDiscount, maxDiscount);

          expect(result.volumeDiscountTotal).toBe(expectedBulkDiscount);
          expect(result.subtotalAfterBulk).toBe(expectedSubtotalAfterBulk);
          expect(result.vipDiscount).toBe(expectedVipDiscount);
          expect(result.totalDiscount).toBe(expectedCappedDiscount);
          expect(result.finalTotal).toBe(result.originalTotal - expectedCappedDiscount);

          if (expectedTotalDiscount > maxDiscount) {
            expect(result.isCapped).toBe(true);
            expect(result.totalDiscount).toBe(maxDiscount);
          } else {
            expect(result.isCapped).toBe(false);
          }

          return true;
        }
      ),
      { verbose: true }
    );
  });

  it('Integration: Free shipping eligibility depends on POST-DISCOUNT total', () => {
    fc.assert(
      fc.property(
        cartArb,
        userArb,
        (items, user) => {
          const result = PricingEngine.calculate(items, user, ShippingMethod.STANDARD);
          tracer.log(expect.getState().currentTestName!, { items, user, method: ShippingMethod.STANDARD }, result);

          expect(result.shipment.isFreeShipping).toBe(result.finalTotal > 10000);

          const expectedGrandTotal = result.finalTotal + result.shipment.totalShipping;
          expect(result.grandTotal).toBe(expectedGrandTotal);

          return true;
        }
      ),
      { verbose: true }
    );
  });

  it('Integration: Express/Expedited shipping calculations are correct', () => {
    fc.assert(
      fc.property(
        cartArb,
        userArb,
        fc.constantFrom(ShippingMethod.EXPRESS, ShippingMethod.EXPEDITED),
        (items, user, method) => {
          const originalSubtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          const totalWeight = items.reduce((sum, item) => sum + (item.weightInKg * item.quantity), 0);
          const result = PricingEngine.calculate(items, user, method);
          tracer.log(expect.getState().currentTestName!, { items, user, method }, result);

          if (method === ShippingMethod.EXPRESS) {
            expect(result.shipment.isFreeShipping).toBe(false);
            expect(result.shipment.totalShipping).toBe(2500);
            expect(result.shipment.expeditedSurcharge).toBe(0);
          } else if (method === ShippingMethod.EXPEDITED) {
            if (result.finalTotal > 10000) {
              expect(result.shipment.isFreeShipping).toBe(true);
              expect(result.shipment.totalShipping).toBe(0);
              expect(result.shipment.expeditedSurcharge).toBe(0);
            } else {
              expect(result.shipment.isFreeShipping).toBe(false);
              const expectedBase = 700;
              const expectedWeightSurcharge = Math.round(totalWeight * 200);
              const expectedExpeditedSurcharge = Math.round(originalSubtotal * 0.15);
              const expectedTotal = expectedBase + expectedWeightSurcharge + expectedExpeditedSurcharge;

              expect(result.shipment.baseShipping).toBe(expectedBase);
              expect(result.shipment.weightSurcharge).toBe(expectedWeightSurcharge);
              expect(result.shipment.expeditedSurcharge).toBe(expectedExpeditedSurcharge);
              expect(result.shipment.totalShipping).toBe(expectedTotal);
            }
          }

          return true;
        }
      ),
      { verbose: true }
    );
  });

  it('Integration: Complex carts with bulk, VIP, and free shipping', () => {
    fc.assert(
      fc.property(
        cartArb,
        userArb,
        (items, user) => {
          const result = PricingEngine.calculate(items, user);
          tracer.log(expect.getState().currentTestName!, { items, user }, result);

          expect(result.finalTotal).toBeLessThanOrEqual(result.originalTotal);
          const calculatedTotalDiscount = result.volumeDiscountTotal + result.vipDiscount;
          expect(result.totalDiscount).toBeLessThanOrEqual(calculatedTotalDiscount);
          const maxProductDiscount = Math.round(result.originalTotal * 0.30);
          expect(result.totalDiscount).toBeLessThanOrEqual(maxProductDiscount);
          expect(result.grandTotal).toBe(result.finalTotal + result.shipment.totalShipping);

          const hasBulkItems = items.some(item => item.quantity >= 3);
          const isVIP = user.tenureYears > 2;

          if (hasBulkItems && isVIP) {
            expect(result.volumeDiscountTotal).toBeGreaterThan(0);
            expect(result.vipDiscount).toBeGreaterThan(0);
          }

          return true;
        }
      ),
      { verbose: true }
    );
  });

  it('Integration: Boundary conditions are handled consistently', () => {
    const boundaryTests = [
      {
        name: 'Exactly 3 bulk items, exactly 2 years tenure (non-VIP), exactly $100',
        items: [{
          sku: 'BULK_3',
          name: 'Bulk Item',
          price: 3334,
          quantity: 3,
          weightInKg: 1.0
        }],
        user: { tenureYears: 2 },
        method: ShippingMethod.STANDARD,
        expectedBulk: 1500,
        expectedVip: 0,
        expectedFinal: 8502
      },
      {
        name: '4 bulk items, 3 years tenure (VIP), just over $100 free shipping',
        items: [{
          sku: 'VIP_BULK_4',
          name: 'VIP Bulk Item',
          price: 2501,
          quantity: 4,
          weightInKg: 1.0
        }],
        user: { tenureYears: 3 },
        method: ShippingMethod.STANDARD,
        expectedBulk: 1501,
        expectedVip: Math.round((10004 - 1501) * 0.05),
        expectedFinal: 'should get free shipping'
      }
    ];

    for (const test of boundaryTests) {
      const result = PricingEngine.calculate(test.items, test.user, test.method);
      
      // Log boundary cases
      tracer.log(expect.getState().currentTestName!, { 
        scenario: test.name,
        items: test.items, 
        user: test.user, 
        method: test.method 
      }, result);

      console.log(`\nBoundary Test: ${test.name}`);
      console.log(`  Original Total: $${(result.originalTotal / 100).toFixed(2)}`);
      console.log(`  Final Total: $${(result.finalTotal / 100).toFixed(2)}`);
      console.log(`  Bulk Discount: $${(result.volumeDiscountTotal / 100).toFixed(2)}`);
      console.log(`  VIP Discount: $${(result.vipDiscount / 100).toFixed(2)}`);
      console.log(`  Free Shipping: ${result.shipment.isFreeShipping}`);

      if (typeof test.expectedFinal === 'number') {
        expect(result.finalTotal).toBe(test.expectedFinal);
      }
    }
  });

  it('Integration: Line item math matches cart total math', () => {
    fc.assert(
      fc.property(
        cartArb,
        userArb,
        (items, user) => {
          const result = PricingEngine.calculate(items, user);
          tracer.log(expect.getState().currentTestName!, { items, user }, result);

          const calculatedOriginalTotal = result.lineItems.reduce(
            (sum, li) => sum + li.originalPrice * li.quantity,
            0
          );
          expect(result.originalTotal).toBe(calculatedOriginalTotal);

          const calculatedBulkDiscount = result.lineItems.reduce(
            (sum, li) => sum + li.bulkDiscount,
            0
          );
          expect(result.volumeDiscountTotal).toBe(calculatedBulkDiscount);

          for (const li of result.lineItems) {
            const expectedTotalAfterBulk = li.originalPrice * li.quantity - li.bulkDiscount;
            expect(li.totalAfterBulk).toBe(expectedTotalAfterBulk);
          }

          return true;
        }
      ),
      { verbose: true }
    );
  });
});
