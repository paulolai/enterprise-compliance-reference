import { describe, it, expect } from 'vitest';
import { ShippingMethod, CartItem, User, PricingResult } from '../src';
import { verifyShippingInvariant } from './fixtures/invariant-helper';

/**
 * Shipping: Mathematical Invariants
 * 
 * These tests verify shipping business rules using property-based testing.
 * Each test proves the rule holds for ALL valid inputs (not just examples).
 * 
 * WHY EDGE CASES MATTER:
 * - Floating point math: 0.1 + 0.2 ≠ 0.3 in binary!
 * - Boundary conditions: exactly $100 vs $100.01 is different behavior
 * - Interaction effects: shipping method can override free shipping threshold
 * - Order of operations: discounts applied before shipping calculation
 * 
 * KEY SHIPPING RULES:
 * 1. Standard: $7 base + $2/kg (unless free shipping applies)
 * 2. Free shipping: subtotal > $100 after discounts (NOT including shipping)
 * 3. Express: fixed $25 (never free)
 * 4. Shipping is SEPARATE from product discount cap
 */
describe('Shipping: Mathematical Invariants', () => {

  /**
   * EDGE CASE: Weight calculation uses rounding!
   * 
   * Why this matters:
   * - Math.round(totalWeight * 200) handles floating point precision
   * - Example: 0.3kg × $2 = $0.60, not $0.59999999...
   * 
   * Test covers: ANY valid weight (0.01kg to 100kg in our arbitraries)
   * This PROVES the formula works for all weights, not just 1.0kg or 10kg
   */
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

  /**
   * EDGE CASE: The $100 threshold is EXCLUSIVE (> not ≥)
   * 
   * Why this matters:
   * - Exactly $100.00 does NOT get free shipping (boundary!)
   * - $100.01 DOES get free shipping
   * - This is a common source of customer complaints if wrong
   * 
   * ORDER MATTERS: Free shipping checked AFTER product discounts
   * Why? Because free shipping is a CUSTOMER LOYALTY reward based on purchase value
   * (shipping cost shouldn't count toward the threshold - that would be circular!)
   */
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

  /**
   * EDGE CASE: Express is NEVER free, even if subtotal > $100
   * 
   * Why this matters:
   * - Express shipping is a PREMIUM service with guaranteed fast delivery
   * - The $25 charge is for the SPEED, not just shipping logistics
   * - This is different from Standard shipping which CAN be free
   * 
   * INTERACTION: Express overrides Standard shipping logic entirely
   * This is why we check `method === ShippingMethod.EXPRESS` first
   */
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

  /**
   * EDGE CASE: Shipping is EXCLUDED from the 30% discount cap
   * 
   * Why this matters (BUSINESS RULE):
   * - If shipping counted toward cap, you'd get "free shipping" automatically at 30% off
   * - That would destroy the free shipping threshold incentive ($100+)
   * - The 30% cap protects REVENUE on PRODUCT sales, not shipping
   * 
   * IMPLEMENTATION DETAIL:
   * - totalDiscount = volumeDiscount + vipDiscount (product discounts only!)
   * - grandTotal = finalTotal + shipping
   * - This ensures shipping is always charged separately
   * 
   * This is a REVENUE PROTECTION rule - critical for business viability!
   */
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