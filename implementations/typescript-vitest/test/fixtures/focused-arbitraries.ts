/**
 * Focused Arbitraries for Boundary Condition Testing
 *
 * These generators are designed to systematically target edge cases and
 * boundary conditions where invariants are most likely to fail.
 */

import * as fc from 'fast-check';
import { CartItem, User, Cents } from '../../src/types';
import { userArb } from './arbitraries';

/**
 * Generator for User that targets the VIP eligibility boundary (> 2 years).
 * Generates tenure values of 0, 1, 2, 3, 4 to test the exact > 2 transition.
 */
export const vipBoundaryUserArb = fc.constantFrom<User>(
  { tenureYears: 0 },
  { tenureYears: 1 },
  { tenureYears: 2 },      // Boundary: NOT eligible
  { tenureYears: 3 },      // Boundary: Eligible
  { tenureYears: 4 }
);

/**
 * Generator for CartItem that targets the bulk discount boundary (>= 3).
 * Generates quantities of 1, 2, 3, 4, 5 to test the exact 3 transition.
 */
export const bulkBoundaryItemArb = (
  name: string = 'TestItem',
  price: Cents = 1000,
  sku?: string
): fc.Arbitrary<CartItem> => {
  return fc.constantFrom(1, 2, 3, 4, 5).map(quantity => ({
    sku: sku || name.toUpperCase().replace(/\s+/g, '_'),
    name,
    price,
    quantity,
    weightInKg: 1.0
  }));
};

/**
 * Generator for carts that are guaranteed to have at least one bulk-discounted item.
 * Useful for testing bulk discount logic without waiting for random generation.
 */
export const cartWithBulkDiscountArb = fc.tuple(
  fc.record<CartItem>({
    sku: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 10 }).map(s => `BulkItem-${s}`),
    price: fc.integer({ min: 1000, max: 10000 }),
    quantity: fc.integer({ min: 3, max: 10 }), // Guaranteed bulk
    weightInKg: fc.integer({ min: 1, max: 50 }).map(i => i / 10)
  }),
  fc.array(fc.record<CartItem>({
    sku: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 10 }).map(s => `Item-${s}`),
    price: fc.integer({ min: 100, max: 50000 }),
    quantity: fc.integer({ min: 1, max: 2 }), // Non-bulk items
    weightInKg: fc.integer({ min: 1, max: 50 }).map(i => i / 10)
  }), { minLength: 0, maxLength: 5 })
).map(([bulkItem, otherItems]) => [bulkItem, ...otherItems]);

/**
 * Generator for carts around the free shipping threshold ($100).
 * Tests -200, -100, 0, +100, +200 cents around the threshold.
 */
export const cartAroundFreeShippingThresholdArb = fc.constantFrom(
  -200, -100, 0, 100, 200
).map(adjustment => [{
  sku: 'THRESHOLD_TEST',
  name: 'Threshold Item',
  price: 10000 + adjustment, // $100 + adjustment in cents
  quantity: 1,
  weightInKg: 1.0
} as CartItem]);

/**
 * Generator for carts exactly at free shipping boundaries.
 * Tests $99.99, $100.00, $100.01 to verify exact boundary behavior.
 */
export const cartExactlyFreeShippingThresholdArb = fc.constantFrom<CartItem[]>([
  [{
    sku: 'BELOW_100',
    name: 'Below Threshold',
    price: 9999,
    quantity: 1,
    weightInKg: 1.0
  }],
  [{
    sku: 'EXACTLY_100',
    name: 'Exactly Threshold',
    price: 10000,
    quantity: 1,
    weightInKg: 1.0
  }],
  [{
    sku: 'ABOVE_100',
    name: 'Above Threshold',
    price: 10001,
    quantity: 1,
    weightInKg: 1.0
  }]
]);

/**
 * Generator for carts that will hit the 30% discount cap.
 * Creates large orders that trigger the safety valve.
 */
export const cartThatHitsDiscountCapArb = fc.tuple(
  fc.record<CartItem>({
    sku: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 10 }).map(s => `CapItem-${s}`),
    price: fc.integer({ min: 5000000, max: 10000000 }), // High value ($5K-$10K each)
    quantity: fc.integer({ min: 10, max: 20 }), // High quantity
    weightInKg: fc.integer({ min: 1, max: 10 }).map(i => i / 10)
  }),
  vipBoundaryUserArb
).map(([item, user]) => ({
  cart: [item],
  user
}));

/**
 * Generator carts guaranteed to qualify for free shipping.
 */
export const cartWithFreeShippingArb = fc.record<CartItem>({
  sku: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 10 }).map(s => `FreeShip-${s}`),
  price: fc.integer({ min: 10101, max: 500000 }), // Always > $100
  quantity: fc.integer({ min: 1, max: 5 }),
  weightInKg: fc.integer({ min: 1, max: 50 }).map(i => i / 10)
).map(item => [item]);

/**
 * Generator for carts guaranteed NOT to qualify for free shipping.
 */
export const cartNoFreeShippingArb = fc.record<CartItem>({
  sku: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 10 }).map(s => `NoFreeShip-${s}`),
  price: fc.integer({ min: 100, max: 9999 }), // Always <= $99.99
  quantity: fc.integer({ min: 1, max: 5 }),
  weightInKg: fc.integer({ min: 1, max: 50 }).map(i => i / 10)
}).map(item => [item]);

/**
 * Generator specifically for Express delivery testing.
 */
export const expressShippingCartArb = fc.tuple(
  fc.array(fc.record<CartItem>({
    sku: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 10 }).map(s => `ExpressItem-${s}`),
    price: fc.integer({ min: 1000, max: 50000 }),
    quantity: fc.integer({ min: 1, max: 10 }),
    weightInKg: fc.integer({ min: 1, max: 100 }).map(i => i / 10)
  }), { minLength: 1, maxLength: 5 }),
  userArb
);

/**
 * Generator specifically for Expedited shipping testing.
 */
export const expeditedShippingCartArb = fc.tuple(
  fc.array(fc.record<CartItem>({
    sku: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 10 }).map(s => `ExpeditedItem-${s}`),
    price: fc.integer({ min: 1000, max: 50000 }),
    quantity: fc.integer({ min: 1, max: 10 }),
    weightInKg: fc.integer({ min: 1, max: 100 }).map(i => i / 10)
  }), { minLength: 1, maxLength: 5 }),
  userArb
);
