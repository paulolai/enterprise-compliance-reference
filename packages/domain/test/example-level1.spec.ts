import { describe, it, expect } from 'vitest';
import { PricingEngine, CartItem, User } from '../../shared/src';
import { verifyExample } from './fixtures/invariant-helper';

/**
 * Level 1: Traceable Unit Tests
 * 
 * This file demonstrates the "verifyExample()" pattern - the foundation of
 * executable specifications. Each test is a SPECIFIC EXAMPLE that documents
 * a business rule with full metadata for attestation reports.
 * 
 * KEY CONCEPTS:
 * - Each test = one specific scenario (not general proof)
 * - Full metadata: ruleReference, rule, tags
 * - Input/output logged to tracer for audit trails
 * 
 * PROGRESSIONS:
 * - Level 1 (this file): Specific examples with metadata
 * - Level 2: Data-driven (test.each) for multiple scenarios  
 * - Level 3: Property-based (verifyInvariant) for mathematical proofs
 * 
 * See: docs/TEACHING_GUIDE.md for full guide
 */
describe('Level 1: Traceable Unit Tests - verifyExample() Pattern', () => {

  /**
   * Example 1: Simple cart calculation
   * 
   * This test documents the base pricing rule:
   * "A cart with items should calculate totals correctly"
   * 
   * Metadata fields:
   * - ruleReference: Links to business rule document
   * - rule: What this specific test verifies
   * - tags: Cross-cutting concerns (@pricing, @boundary, etc.)
   */
  it('should calculate total for simple cart', () => {
    verifyExample({
      ruleReference: 'pricing-strategy.md §1 - Base Rules',
      rule: 'Simple cart: 1 × $10 + 1 × $20 = $30 total',
      tags: ['@pricing', '@base-rules']
    }, () => {
      const cart: CartItem[] = [
        { sku: 'ITEM_A', name: 'Item A', price: 1000, quantity: 1, weightInKg: 1 },
        { sku: 'ITEM_B', name: 'Item B', price: 2000, quantity: 1, weightInKg: 1 }
      ];
      const user: User = { tenureYears: 0 };

      const result = PricingEngine.calculate(cart, user);

      expect(result.originalTotal).toBe(3000);
      expect(result.finalTotal).toBe(3000);
      expect(result.totalDiscount).toBe(0);

      return { 
        input: { cart, user }, 
        output: result 
      };
    });
  });

  /**
   * Example 2: VIP discount (5% off for tenure > 2 years)
   * 
   * Documents the VIP tier business rule with a specific example.
   */
  it('should apply 5% VIP discount for tenure > 2 years', () => {
    verifyExample({
      ruleReference: 'pricing-strategy.md §3 - VIP Tier',
      rule: 'VIP discount: $100 item with VIP user = $95 (5% off)',
      tags: ['@pricing', '@vip', '@discount']
    }, () => {
      const cart: CartItem[] = [
        { sku: 'ITEM_A', name: 'Item A', price: 10000, quantity: 1, weightInKg: 1 }
      ];
      // VIP: tenure > 2 years
      const user: User = { tenureYears: 3 };

      const result = PricingEngine.calculate(cart, user);

      expect(result.originalTotal).toBe(10000);
      expect(result.vipDiscount).toBe(500); // 5% of 10000
      expect(result.finalTotal).toBe(9500);

      return { 
        input: { cart, user }, 
        output: result 
      };
    });
  });

  /**
   * Example 3: Bulk discount boundary (quantity = 3)
   * 
   * Documents the bulk discount threshold with exact boundary example.
   */
  it('should apply 15% bulk discount when quantity >= 3', () => {
    verifyExample({
      ruleReference: 'pricing-strategy.md §2 - Bulk Discounts',
      rule: 'Bulk threshold: quantity = 3 triggers 15% discount',
      tags: ['@pricing', '@bulk', '@boundary']
    }, () => {
      const cart: CartItem[] = [
        { sku: 'ITEM_A', name: 'Item A', price: 10000, quantity: 3, weightInKg: 1 }
      ];
      const user: User = { tenureYears: 0 };

      const result = PricingEngine.calculate(cart, user);

      expect(result.originalTotal).toBe(30000);
      expect(result.volumeDiscountTotal).toBe(4500); // 15% of 30000
      expect(result.finalTotal).toBe(25500);

      return { 
        input: { cart, user }, 
        output: result 
      };
    });
  });

  /**
   * Example 4: No bulk discount below threshold
   * 
   * Documents that quantity = 2 does NOT get bulk discount.
   */
  it('should NOT apply bulk discount when quantity < 3', () => {
    verifyExample({
      ruleReference: 'pricing-strategy.md §2 - Bulk Discounts',
      rule: 'Boundary: quantity = 2 does NOT trigger bulk discount',
      tags: ['@pricing', '@bulk', '@boundary']
    }, () => {
      const cart: CartItem[] = [
        { sku: 'ITEM_A', name: 'Item A', price: 10000, quantity: 2, weightInKg: 1 }
      ];
      const user: User = { tenureYears: 0 };

      const result = PricingEngine.calculate(cart, user);

      expect(result.originalTotal).toBe(20000);
      expect(result.volumeDiscountTotal).toBe(0); // No bulk discount
      expect(result.finalTotal).toBe(20000);

      return { 
        input: { cart, user }, 
        output: result 
      };
    });
  });

  /**
   * Example 5: Combined discounts (VIP + Bulk)
   * 
   * Documents how multiple discounts interact.
   * 
   * ORDER OF OPERATIONS:
   * 1. Apply bulk discount to original subtotal
   * 2. Apply VIP discount to subtotal AFTER bulk
   * 
   * This means discounts stack, not add independently.
   */
  it('should apply both VIP and bulk discounts', () => {
    verifyExample({
      ruleReference: 'pricing-strategy.md §2 & §3',
      rule: 'Combined: VIP (5% of post-bulk) + Bulk (15% of original)',
      tags: ['@pricing', '@vip', '@bulk', '@combined']
    }, () => {
      const cart: CartItem[] = [
        { sku: 'ITEM_A', name: 'Item A', price: 10000, quantity: 3, weightInKg: 1 }
      ];
      const user: User = { tenureYears: 5 }; // VIP

      const result = PricingEngine.calculate(cart, user);

      // Original: $100 × 3 = $300 (30000 cents)
      // Bulk (15%): 30000 × 0.15 = $45 (4500 cents) → subtotal = 25500
      // VIP (5% of post-bulk): 25500 × 0.05 = $12.75 (1275 cents, rounded)
      // Total discount: 4500 + 1275 = 5775
      // Final: 30000 - 5775 = 24225
      
      expect(result.originalTotal).toBe(30000);
      expect(result.volumeDiscountTotal).toBe(4500);
      expect(result.vipDiscount).toBe(1275); // 5% of post-bulk (25500)
      expect(result.finalTotal).toBe(24225);

      return { 
        input: { cart, user }, 
        output: result 
      };
    });
  });

  /**
   * EXERCISE: Try adding a test for the discount cap rule
   * 
   * Hint: pricing-strategy.md §2.1 states total discounts are capped at 30%
   * Try writing a test that exceeds the cap to see the cap applied.
   * 
   * Solution would look like:
   * 
   * it('should cap total discount at 30%', () => {
   *   verifyExample({
   *     ruleReference: 'pricing-strategy.md §2.1 - Discount Cap',
   *     rule: 'Total discount capped at 30% even if VIP+Bulk exceeds',
   *     tags: ['@pricing', '@cap', '@boundary']
   *   }, () => {
   *     // Large quantity VIP user that would exceed 30%
   *     // ... implementation
   *   });
   * });
   */
});
