import { describe, it, expect } from 'vitest';
import { verifyInvariant } from './fixtures/invariant-helper';

describe('Pricing Engine: Mathematical Invariants', () => {

  it('Invariant: Final Total is always <= Original Total', () => {
    verifyInvariant('Invariant: Final Total <= Original Total', (items, user, result) => {
      expect(result.finalTotal).toBeLessThanOrEqual(result.originalTotal);
    });
  });

  it('Invariant: Line items with qty >= 3 always have 15% discount', () => {
    verifyInvariant('Invariant: Bulk Discount Rule', (items, user, result) => {
      result.lineItems.forEach(li => {
        if (li.quantity >= 3) {
          const expectedDiscount = Math.round(li.originalPrice * li.quantity * 0.15);
          expect(li.bulkDiscount).toBe(expectedDiscount);
        } else {
          expect(li.bulkDiscount).toBe(0);
        }
      });
    });
  });

  it('Invariant: VIP discount is exactly 5% of subtotal (after bulk) if eligible', () => {
    verifyInvariant('Invariant: VIP Discount Rule', (items, user, result) => {
      if (user.tenureYears > 2) {
        const expected = Math.round(result.subtotalAfterBulk * 0.05);
        expect(result.vipDiscount).toBe(expected);
      } else {
        expect(result.vipDiscount).toBe(0);
      }
    });
  });

  it('Invariant: Total Discount strictly NEVER exceeds 30% of Original Total', () => {
    verifyInvariant('Invariant: Safety Valve Cap', (items, user, result) => {
      const maxAllowed = Math.round(result.originalTotal * 0.30);
      expect(result.totalDiscount).toBeLessThanOrEqual(maxAllowed);
      if (result.isCapped) {
        expect(result.totalDiscount).toBe(maxAllowed);
      }
    });
  });

  it('Invariant: All monetary values are integers (Cents)', () => {
    verifyInvariant('Invariant: Integer Precision', (items, user, result) => {
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