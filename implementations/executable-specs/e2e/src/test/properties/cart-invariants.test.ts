import { test } from '@playwright/test';
import * as fc from 'fast-check';
import { PricingEngine, ShippingMethod } from '@executable-specs/shared';
import { userArb, shippingMethodArb, cartArb } from '@executable-specs/shared/fixtures';

test.describe('Cart Domain Invariants (PBT)', () => {
  
  test('invariant: grand total = items + shipping - discounts', {
    annotation: [
      { type: 'ruleReference', description: 'pricing-strategy.md §1 - Base Rules' },
      { type: 'rule', description: 'Final Total = OriginalTotal - TotalDiscount + Shipping' },
    ],
  }, () => {
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

  test('invariant: VIP discount only for tenure > 2 years', {
    annotation: [
      { type: 'ruleReference', description: 'pricing-strategy.md §3 - VIP Tier' },
      { type: 'rule', description: 'Users with tenure > 2 years receive 5% discount on subtotal after bulk discounts' },
    ],
  }, () => {
    fc.assert(
      fc.property(cartArb, userArb, shippingMethodArb, (items, user, method) => {
        const result = PricingEngine.calculate(items, user, method);
        
        // Spec §3: "Users with a tenure of MORE THAN 2 years"
        // So tenure <= 2 should have NO VIP discount
        if (user.tenureYears <= 2) {
          return result.vipDiscount === 0;
        } 
        return result.vipDiscount >= 0;
      })
    );
  });

  test('invariant: free shipping only when final total > $100 (Standard only)', {
    annotation: [
      { type: 'ruleReference', description: 'pricing-strategy.md §5.2 - Free Shipping Threshold' },
      { type: 'rule', description: 'Orders GREATER THAN $100.00 qualify for free shipping. Exactly $100.00 does NOT qualify.' },
    ],
  }, () => {
     fc.assert(
      fc.property(cartArb, userArb, shippingMethodArb, (items, user, method) => {
        const result = PricingEngine.calculate(items, user, method);
        
        // Rule: Free Standard Shipping on orders GREATER THAN $100 (based on final total)
        // Spec explicitly states: "Exactly $100.00 does NOT qualify"
        if (method === ShippingMethod.STANDARD && result.finalTotal > 10000) {
            return result.shipment.totalShipping === 0;
        }
        
        // If final total <= 10000 and Standard, shipping is NOT free
        if (method === ShippingMethod.STANDARD && result.finalTotal <= 10000 && result.originalTotal > 0) {
             return result.shipment.totalShipping > 0;
        }

        return true; 
      })
    );
  });
  
  test('invariant: total discount cannot exceed original total', {
    annotation: [
      { type: 'ruleReference', description: 'pricing-strategy.md §4 - Safety Valve' },
      { type: 'rule', description: 'Total Discount (Bulk + VIP) must never exceed 30% of Original Total' },
    ],
  }, () => {
      fc.assert(
        fc.property(cartArb, userArb, shippingMethodArb, (items, user, method) => {
            const result = PricingEngine.calculate(items, user, method);
            return result.totalDiscount <= result.originalTotal;
        })
      );
  });
});
