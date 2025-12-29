import { describe, it, expect } from 'vitest';
import { ShippingMethod } from '../src/types';
import { verifyShippingInvariant } from './fixtures/invariant-helper';

describe('Shipping: Mathematical Invariants', () => {

  it('Invariant: Standard shipping = $7 + (totalKg × $2) unless free', () => {
    verifyShippingInvariant('Invariant: Standard Shipping Calc', (items, user, method, result) => {
      // This invariant only applies to Standard shipping
      if (method !== ShippingMethod.STANDARD) return;

      if (!result.shipment.isFreeShipping) {
        const totalWeight = items.reduce((sum, item) => sum + (item.weightInKg * item.quantity), 0);
        const expectedWeightCharge = Math.round(totalWeight * 200);
        expect(result.shipment.totalShipping).toBe(700 + expectedWeightCharge);
      } else {
        expect(result.shipment.totalShipping).toBe(0);
      }
    });
  });

  it('Invariant: Free shipping triggered exactly when discounted subtotal > $100', () => {
    verifyShippingInvariant('Invariant: Free Shipping Threshold', (items, user, method, result) => {
      // Free shipping logic is primarily for Standard (others might override or behave differently, 
      // but the core rule check here focuses on Standard for simplicity or general rule if applicable)
      if (method !== ShippingMethod.STANDARD) return;

      if (result.finalTotal > 10000) {
        expect(result.shipment.isFreeShipping).toBe(true);
      } else {
        expect(result.shipment.isFreeShipping).toBe(false);
      }
    });
  });

  it('Invariant: Express delivery always costs exactly $25', () => {
    verifyShippingInvariant('Invariant: Express Delivery Fixed Cost', (items, user, method, result) => {
      if (method !== ShippingMethod.EXPRESS) return;

      expect(result.shipment.totalShipping).toBe(2500);
    });
  });

  it('Invariant: Shipping costs are NEVER included in product discount cap', () => {
    verifyShippingInvariant('Invariant: Shipping/Discount Separation', (items, user, method, result) => {
      const maxProductDiscount = Math.round(result.originalTotal * 0.30);
      expect(result.totalDiscount).toBeLessThanOrEqual(maxProductDiscount);
      expect(result.grandTotal).toBe(result.finalTotal + result.shipment.totalShipping);
    });
  });
});