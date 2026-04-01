import { describe, it, expect } from 'vitest';
import { mapCartToLineItems, validateOrderInvariants } from '../../src/server/domain/cart/fns';
import type { LineItem } from '../../src/server/domain/cart/fns';
import type { Result } from '@executable-specs/domain';

describe('mapCartToLineItems', () => {
  it('maps a single item with no discount', () => {
    const cartItems = [
      { sku: 'WIDGET-001', name: 'Widget', priceInCents: 1000, quantity: 1, weightInKg: 0.5 },
    ];

    const result: LineItem[] = mapCartToLineItems(cartItems, null);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      sku: 'WIDGET-001',
      bulkDiscount: 0,
      quantity: 1,
      priceInCents: 1000,
      weightInKg: 0.5,
    });
  });

  it('maps multiple items with different quantities', () => {
    const cartItems = [
      { sku: 'ITEM-A', name: 'Item A', priceInCents: 500, quantity: 1, weightInKg: 0.2 },
      { sku: 'ITEM-B', name: 'Item B', priceInCents: 1500, quantity: 2, weightInKg: 1.0 },
      { sku: 'ITEM-C', name: 'Item C', priceInCents: 300, quantity: 1, weightInKg: 0.1 },
    ];

    const pricingResult = {
      lineItems: [
        { sku: 'ITEM-A', bulkDiscount: 0 },
        { sku: 'ITEM-B', bulkDiscount: 0 },
        { sku: 'ITEM-C', bulkDiscount: 0 },
      ],
    };

    const result: LineItem[] = mapCartToLineItems(cartItems, pricingResult);

    expect(result).toHaveLength(3);
    expect(result[0].sku).toBe('ITEM-A');
    expect(result[0].quantity).toBe(1);
    expect(result[0].bulkDiscount).toBe(0);
    expect(result[1].sku).toBe('ITEM-B');
    expect(result[1].quantity).toBe(2);
    expect(result[1].bulkDiscount).toBe(0);
    expect(result[2].sku).toBe('ITEM-C');
    expect(result[2].quantity).toBe(1);
    expect(result[2].bulkDiscount).toBe(0);
  });

  it('applies bulk discount for items with quantity >= 3', () => {
    const cartItems = [
      { sku: 'BULK-ITEM', name: 'Bulk Item', priceInCents: 2000, quantity: 5, weightInKg: 2.0 },
      { sku: 'SINGLE-ITEM', name: 'Single Item', priceInCents: 800, quantity: 1, weightInKg: 0.3 },
    ];

    const pricingResult = {
      lineItems: [
        { sku: 'BULK-ITEM', bulkDiscount: 1500 },
        { sku: 'SINGLE-ITEM', bulkDiscount: 0 },
      ],
    };

    const result: LineItem[] = mapCartToLineItems(cartItems, pricingResult);

    expect(result).toHaveLength(2);
    expect(result[0].sku).toBe('BULK-ITEM');
    expect(result[0].bulkDiscount).toBe(1500);
    expect(result[0].quantity).toBe(5);
    expect(result[1].sku).toBe('SINGLE-ITEM');
    expect(result[1].bulkDiscount).toBe(0);
    expect(result[1].quantity).toBe(1);
  });

  it('returns empty array for empty cart', () => {
    const result: LineItem[] = mapCartToLineItems([], null);
    expect(result).toEqual([]);
  });

  it('handles items with zero price', () => {
    const cartItems = [
      { sku: 'FREE-ITEM', name: 'Free Item', priceInCents: 0, quantity: 1, weightInKg: 0.1 },
    ];

    const result: LineItem[] = mapCartToLineItems(cartItems, null);

    expect(result).toHaveLength(1);
    expect(result[0].priceInCents).toBe(0);
    expect(result[0].bulkDiscount).toBe(0);
  });

  it('falls back to price field when priceInCents is missing', () => {
    const cartItems = [
      { sku: 'ALT-PRICE', name: 'Alt Price', price: 750, quantity: 2, weightInKg: 0.4 },
    ];

    const result: LineItem[] = mapCartToLineItems(cartItems, null);

    expect(result[0].priceInCents).toBe(750);
  });

  it('defaults weightInKg to 0 when not provided', () => {
    const cartItems = [
      { sku: 'NO-WEIGHT', name: 'No Weight', priceInCents: 100, quantity: 1 },
    ];

    const result: LineItem[] = mapCartToLineItems(cartItems, null);

    expect(result[0].weightInKg).toBe(0);
  });
});

describe('validateOrderInvariants', () => {
  const validItem = { sku: 'TEST-001', priceInCents: 1000, quantity: 1 };

  it('succeeds for valid order with positive total and non-empty items', () => {
    const result: Result<true, string> = validateOrderInvariants(5000, [validItem]);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toBe(true);
    }
  });

  it('succeeds for zero total with non-empty items', () => {
    const result: Result<true, string> = validateOrderInvariants(0, [validItem]);

    expect(result.success).toBe(true);
  });

  it('fails for negative total', () => {
    const result: Result<true, string> = validateOrderInvariants(-100, [validItem]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Order total cannot be negative');
    }
  });

  it('fails for empty items array', () => {
    const result: Result<true, string> = validateOrderInvariants(1000, []);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Cart must have at least one item');
    }
  });

  it('fails for both negative total and empty items', () => {
    const result: Result<true, string> = validateOrderInvariants(-500, []);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Cart must have at least one item');
    }
  });

  it('fails when items is not an array', () => {
    const result: Result<true, string> = validateOrderInvariants(1000, null as unknown as unknown[]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Items must be an array');
    }
  });

  it('fails for items missing required fields', () => {
    const invalidItems = [{ sku: 'MISSING-PRICE', quantity: 1 }];

    const result: Result<true, string> = validateOrderInvariants(1000, invalidItems);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('One or more items are invalid');
    }
  });

  it('fails for items with zero quantity', () => {
    const invalidItems = [{ sku: 'ZERO-QTY', priceInCents: 500, quantity: 0 }];

    const result: Result<true, string> = validateOrderInvariants(1000, invalidItems);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('One or more items are invalid');
    }
  });
});
