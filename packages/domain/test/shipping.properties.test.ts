import { describe, it, expect } from 'vitest';
import { ShippingMethod, CartItem, User, PricingResult } from '../src';
import { verifyShippingInvariant } from './fixtures/invariant-helper';

describe('Shipping: Mathematical Invariants', () => {

  it('Standard shipping = $7 + (totalKg × $2) unless free', () => {
    verifyShippingInvariant({
      ruleReference: 'pricing-strategy.md §5.1 - Base Shipping & Weight',
      rule: 'Standard Shipping = $7.00 + (Total Weight × $2.00). Exception: Free shipping threshold overrides this.',
      tags: ['@shipping', '@base-rules', '@customer-experience']
    }, (items: CartItem[], _user: User, method: ShippingMethod, result: PricingResult) => {
      if (method !== ShippingMethod.STANDARD) return;

      if (result.shipment.isFreeShipping) {
        expect(result.shipment.totalShipping).toBe(0);
      } else {
        const totalWeight = items.reduce((sum, item) => sum + (item.weightInKg * item.quantity), 0);
        const expectedWeightCharge = Math.round(totalWeight * 200);
        expect(result.shipment.totalShipping).toBe(700 + expectedWeightCharge);
      }
    });
  });

  it('Free shipping triggered exactly when discounted subtotal > $100', () => {
    verifyShippingInvariant({
      ruleReference: 'pricing-strategy.md §5.2 - Free Shipping Threshold',
      rule: 'If finalTotal > $100.00, then totalShipping = 0. Order: Checked AFTER all product discounts are applied. Edge Case: Exactly $100.00 does NOT qualify.',
      tags: ['@shipping', '@free-shipping', '@customer-experience', '@critical']
    }, (_items: CartItem[], _user: User, method: ShippingMethod, result: PricingResult) => {
      if (method !== ShippingMethod.STANDARD) return;

      expect(result.shipment.isFreeShipping).toBe(result.finalTotal > 10000);
    });
  });

  it('Express delivery always costs exactly $25', () => {
    verifyShippingInvariant({
      ruleReference: 'pricing-strategy.md §5.4 - Express Delivery',
      rule: 'Express Delivery always costs exactly $25.00. Interaction: NOT eligible for free shipping threshold, overrides all other shipping logic.',
      tags: ['@shipping', '@express', '@customer-experience']
    }, (_items: CartItem[], _user: User, method: ShippingMethod, result: PricingResult) => {
      if (method !== ShippingMethod.EXPRESS) return;

      expect(result.shipment.totalShipping).toBe(2500);
    });
  });

  it('Shipping costs are NEVER included in product discount cap', () => {
    verifyShippingInvariant({
      ruleReference: 'pricing-strategy.md §5.5 - Shipping Discount Cap',
      rule: 'Shipping costs do NOT count toward the 30% product discount cap. Enforcement: totalDiscount (product only) ≤ 30% of originalTotal. Formula: grandTotal = finalTotal + totalShipping.',
      tags: ['@shipping', '@revenue-protection', '@critical']
    }, (_items: CartItem[], _user: User, _method: ShippingMethod, result: PricingResult) => {
      const maxProductDiscount = Math.round(result.originalTotal * 0.30);
      expect(result.totalDiscount).toBeLessThanOrEqual(maxProductDiscount);
      expect(result.grandTotal).toBe(result.finalTotal + result.shipment.totalShipping);
    });
  });
});