import { test } from '@playwright/test';
import * as fc from 'fast-check';
import { PricingEngine, ShippingMethod } from '@executable-specs/shared';
import { userArb, shippingMethodArb, cartArb } from '@executable-specs/shared/fixtures';

test.describe('Cart Domain Invariants (PBT)', () => {
  
  test('invariant: grand total = items + shipping - discounts', () => {
    fc.assert(
      fc.property(cartArb, userArb, shippingMethodArb, (items, user, method) => {
        const result = PricingEngine.calculate(items, user, method);
        
        // Formula: GrandTotal = OriginalTotal - TotalDiscount + Shipping
        
        const calculated = 
          result.originalTotal - 
          result.totalDiscount +
          result.shipment.totalShipping;

        return result.grandTotal === calculated;
      }),
      { numRuns: 100 }
    );
  });

  test('invariant: VIP discount only for tenure >= 3', () => {
    fc.assert(
      fc.property(cartArb, userArb, shippingMethodArb, (items, user, method) => {
        const result = PricingEngine.calculate(items, user, method);
        
        if (user.tenureYears < 3) {
          return result.vipDiscount === 0;
        } 
        return result.vipDiscount >= 0;
      })
    );
  });

  test('invariant: free shipping applied if final total >= 10000 (Standard only)', () => {
     fc.assert(
      fc.property(cartArb, userArb, shippingMethodArb, (items, user, method) => {
        const result = PricingEngine.calculate(items, user, method);
        
        // Rule: Free Standard Shipping on orders over $100 (based on final total)
        if (method === ShippingMethod.STANDARD && result.finalTotal >= 10000) {
            return result.shipment.totalShipping === 0;
        }
        
        // If final total < 10000 and Standard, shipping is NOT free
        if (method === ShippingMethod.STANDARD && result.finalTotal < 10000 && result.originalTotal > 0) {
             return result.shipment.totalShipping > 0;
        }

        return true; 
      })
    );
  });
  
  test('invariant: discounts cannot exceed total', () => {
      fc.assert(
        fc.property(cartArb, userArb, shippingMethodArb, (items, user, method) => {
            const result = PricingEngine.calculate(items, user, method);
            return result.totalDiscount <= result.originalTotal;
        })
      );
  });
});
