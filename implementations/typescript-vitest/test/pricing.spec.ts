import { describe, it, expect } from 'vitest';
import { CartBuilder } from './fixtures/cart-builder';

/**
 * Example-based tests for Pricing Engine
 * These tests document "happy path" scenarios and serve as business documentation.
 *
 * For mathematical proof of business rules, see pricing.properties.test.ts
 */
describe('Pricing Engine: Business Specifications', () => {

  describe('1. Base Rules (Currency & Tax)', () => {
    /**
     * Example: pricing-strategy.md §1 - Base Rules
     * Demonstrates basic currency and tax handling with no discounts
     */
    it('should calculate total correctly for a simple cart', () => {
      const result = CartBuilder.new()
        .withItem({ name: 'Apple', price: 100, quantity: 1 })
        .withItem({ name: 'Banana', price: 200, quantity: 1 })
        .calculate('Base Rules - Simple Cart');
      
      expect(result).toMatchSnapshot();
    });
  });

  describe('2. Bulk Discounts (15% for 3+ items)', () => {
    /**
     * Example: pricing-strategy.md §2 - Bulk Discounts
     * Demonstrates 15% discount applied when quantity >= 3
     */
    it('should apply 15% discount for 3+ of same SKU', () => {
      const result = CartBuilder.new()
        .withItem({ name: 'iPad', price: 100000, quantity: 3 })
        .calculate('Bulk Discount - iPad x3');
      
      expect(result).toMatchSnapshot();
    });

    /**
     * Example: pricing-strategy.md §2 - Bulk Discounts
     * Demonstrates selective bulk discounts (some items qualify, some don't)
     */
    it('should apply bulk discount to some items but not others', () => {
      const result = CartBuilder.new()
        .withItem({ name: 'StandardWidget', price: 10000, quantity: 5 })
        .withItem({ name: 'PremiumWidget', price: 20000, quantity: 2 })
        .withItem({ name: 'SmallWidget', price: 5000, quantity: 1 })
        .calculate('Mixed Cart - Some Bulk');

      expect(result).toMatchSnapshot();
    });
  });

  describe('3. VIP Tier (5% for tenure > 2 years)', () => {
    it('should apply 5% discount for tenure > 2 years', () => {
      const result = CartBuilder.new()
        .withItem({ name: 'Widget', price: 10000, quantity: 1 })
        .asVipUser()
        .calculate('VIP Discount - Tenure > 2y');
      
      expect(result).toMatchSnapshot();
    });

    it('should not apply VIP discount for tenure <= 2 years', () => {
      const result = CartBuilder.new()
        .withItem({ name: 'Product', price: 10000, quantity: 1 })
        .withTenure(2)
        .calculate('VIP Discount - Tenure exactly 2y');

      expect(result).toMatchSnapshot();
    });
  });

  describe('4. Safety Valve (30% Max Discount Cap)', () => {
    it('should stack discounts correctly without hitting cap', () => {
      const result = CartBuilder.new()
        .withItem({ name: 'PremiumLaptop', price: 100000, quantity: 3 })
        .asVipUser()
        .calculate('Safety Valve - Below Cap');
      
      expect(result).toMatchSnapshot();
    });

    it('should cap total discount at exactly 30% of original total', () => {
      const result = CartBuilder.new()
        .withItem({ name: 'EnterpriseServer', price: 5000000, quantity: 10 })
        .asVipUser()
        .calculate('Safety Valve - Large Order');

      expect(result).toMatchSnapshot();
    });
  });

  describe('5. Edge Cases', () => {
    it('should handle an empty cart', () => {
      const result = CartBuilder.new()
        .asVipUser()
        .calculate('Edge Case - Empty Cart');

      expect(result).toMatchSnapshot();
    });

    it('should handle large carts with many line items', () => {
      const builder = CartBuilder.new();
      for (let i = 1; i <= 10; i++) {
        builder.withItem({ 
          name: `Product ${i}`, 
          price: 1000 * i, 
          quantity: i % 5 + 1 
        });
      }
      const result = builder.calculate('Edge Case - Large Cart');

      expect(result).toMatchSnapshot();
    });
  });
});