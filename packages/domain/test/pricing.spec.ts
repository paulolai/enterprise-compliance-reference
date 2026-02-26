import { describe, it, expect } from 'vitest';
import { PricingEngine } from '../src/pricing-engine';
import { ShippingMethod } from '../src/types';

/**
 * Example-based tests for Pricing Engine
 * These tests document "happy path" scenarios and serve as business documentation.
 */
describe('Pricing Engine: Business Specifications', () => {

  describe('1. Base Rules (Currency & Tax)', () => {
    it('should calculate total correctly for a simple cart', () => {
      const items = [
        { sku: 'APPLE', name: 'Apple', price: 100, quantity: 1, weightInKg: 0.1 },
        { sku: 'BANANA', name: 'Banana', price: 200, quantity: 1, weightInKg: 0.2 }
      ];
      const user = { tenureYears: 0 };
      
      const result = PricingEngine.calculate(items, user);
      
      expect(result.originalTotal).toBe(300);
      expect(result.finalTotal).toBe(300);
    });
  });

  describe('2. Bulk Discounts (15% for 3+ items)', () => {
    it('should apply 15% discount for 3+ of same SKU', () => {
      const items = [{ sku: 'IPAD', name: 'iPad', price: 100000, quantity: 3, weightInKg: 0.5 }];
      const user = { tenureYears: 0 };

      const result = PricingEngine.calculate(items, user);
      
      // 300,000 * 0.15 = 45,000 discount
      expect(result.totalDiscount).toBe(45000);
      expect(result.finalTotal).toBe(255000);
    });
  });

  describe('3. VIP Tier (5% for tenure > 2 years)', () => {
    it('should apply 5% discount for tenure > 2 years', () => {
      const items = [{ sku: 'WIDGET', name: 'Widget', price: 10000, quantity: 1, weightInKg: 0.1 }];
      const user = { tenureYears: 3 };

      const result = PricingEngine.calculate(items, user);
      
      // 10,000 * 0.05 = 500 discount
      expect(result.totalDiscount).toBe(500);
      expect(result.finalTotal).toBe(9500);
    });
  });

  describe('4. Safety Valve (30% Max Discount Cap)', () => {
    it('should cap total discount at exactly 30% of original total', () => {
      const items = [{ sku: 'SERVER', name: 'Enterprise Server', price: 1000000, quantity: 10, weightInKg: 10 }];
      const user = { tenureYears: 10 }; // VIP

      const result = PricingEngine.calculate(items, user);
      
      // Original: 10,000,000
      // Bulk: 15% = 1,500,000
      // VIP: 5% of (10M - 1.5M) = 425,000
      // Total potential: 1,925,000
      // Max (30%): 3,000,000 (Not reached)
      expect(result.isCapped).toBe(false);
      expect(result.totalDiscount).toBe(1500000 + 425000);
    });
  });

  describe('5. Shipping', () => {
    it('should calculate standard shipping correctly', () => {
      const items = [{ sku: 'HEAVY', name: 'Heavy Item', price: 1000, quantity: 1, weightInKg: 10 }];
      const user = { tenureYears: 0 };
      
      const result = PricingEngine.calculate(items, user, ShippingMethod.STANDARD);
      
      // $7.00 base + (10kg * $2.00) = $27.00 = 2700 cents
      expect(result.shipment.totalShipping).toBe(2700);
    });

    it('should provide free shipping for orders > $100', () => {
      const items = [{ sku: 'LAPTOP', name: 'Laptop', price: 150000, quantity: 1, weightInKg: 2 }];
      const user = { tenureYears: 0 };
      
      const result = PricingEngine.calculate(items, user, ShippingMethod.STANDARD);
      
      expect(result.shipment.isFreeShipping).toBe(true);
      expect(result.shipment.totalShipping).toBe(0);
    });
  });
});
