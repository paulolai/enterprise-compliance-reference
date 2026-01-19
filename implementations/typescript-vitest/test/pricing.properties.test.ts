import { describe, it, expect } from 'vitest';
import { verifyInvariant } from './fixtures/invariant-helper';
import { CartItem, User, PricingResult } from '../../shared/src/types';

describe('Pricing Engine: Mathematical Invariants', () => {

  it('Invariant: Final Total is always <= Original Total', () => {
    verifyInvariant({
      ruleReference: 'pricing-strategy.md §1 - Base Rules',
      rule: 'Final Total must never exceed Original Total (prices never increase)',
      tags: ['@pricing', '@base-rules', '@revenue-protection']
    }, (_items: CartItem[], _user: User, result: PricingResult) => {
      expect(result.finalTotal).toBeLessThanOrEqual(result.originalTotal);
    });
  });

  it('Invariant: Line items with qty >= 3 always have 15% discount', () => {
    verifyInvariant({
      ruleReference: 'pricing-strategy.md §2 - Bulk Discounts',
      rule: 'Any line item with Quantity >= 3 MUST have a 15% discount applied',
      tags: ['@pricing', '@bulk-discount', '@customer-experience']
    }, (_items: CartItem[], _user: User, result: PricingResult) => {
      result.lineItems.forEach(li => {
        const expectedDiscount = li.quantity >= 3
          ? Math.round(li.originalPrice * li.quantity * 0.15)
          : 0;
        expect(li.bulkDiscount).toBe(expectedDiscount);
      });
    });
  });

  it('Invariant: VIP discount is exactly 5% of subtotal (after bulk) if eligible', () => {
    verifyInvariant({
      ruleReference: 'pricing-strategy.md §3 - VIP Tier',
      rule: 'If User Tenure > 2, a 5% discount is applied to the post-bulk subtotal. Applied AFTER bulk discounts.',
      tags: ['@pricing', '@vip', '@loyalty', '@customer-experience']
    }, (_items: CartItem[], user: User, result: PricingResult) => {
      const expected = user.tenureYears > 2 ? Math.round(result.subtotalAfterBulk * 0.05) : 0;
      expect(result.vipDiscount).toBe(expected);
    });
  });

  it('Invariant: Total Discount strictly NEVER exceeds 30% of Original Total', () => {
    verifyInvariant({
      ruleReference: 'pricing-strategy.md §4 - Safety Valve',
      rule: 'Total Discount (Bulk + VIP) strictly NEVER exceeds 30% of Original Total. Enforcement: Discount is capped at exactly 30% if it would exceed.',
      tags: ['@pricing', '@safety-valve', '@revenue-protection', '@critical']
    }, (_items: CartItem[], _user: User, result: PricingResult) => {
      const maxAllowed = Math.round(result.originalTotal * 0.30);
      expect(result.totalDiscount).toBeLessThanOrEqual(maxAllowed);
      if (result.isCapped) {
        expect(result.totalDiscount).toBe(maxAllowed);
      }
    });
  });

  it('Invariant: All monetary values are integers (Cents)', () => {
    verifyInvariant({
      ruleReference: 'pricing-strategy.md §1 - Base Rules',
      rule: 'All monetary values use integer cents to eliminate floating-point precision. Final values are exact integer cents.',
      tags: ['@pricing', '@base-rules', '@boundary']
    }, (_items: CartItem[], _user: User, result: PricingResult) => {
      const fields: (keyof typeof result)[] = [
        'originalTotal',
        'volumeDiscountTotal',
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
    });
  });
});
