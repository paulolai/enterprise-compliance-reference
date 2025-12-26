import * as fc from 'fast-check';
import { CartItem, User, ShippingMethod, Cents } from '../../src/types';

// Generator for a single CartItem
export const itemArb = fc.record<CartItem>({
  sku: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 20 }).map(s => `Item-${s}`),
  // Price between $1.00 (100) and $5000.00 (500000)
  price: fc.integer({ min: 100, max: 500000 }),
  // Quantity between 1 and 20
  quantity: fc.integer({ min: 1, max: 20 }),
  // Weight between 0.1kg and 50kg - use integer and divide by 10
  weightInKg: fc.integer({ min: 1, max: 500 }).map(i => i / 10)
});

// Generator for a User
export const userArb = fc.record<User>({
  // Tenure between 0 and 10 years
  tenureYears: fc.integer({ min: 0, max: 10 })
});

// Generator for Shipping Method
export const shippingMethodArb = fc.constantFrom<ShippingMethod>(
  ShippingMethod.STANDARD,
  ShippingMethod.EXPEDITED,
  ShippingMethod.EXPRESS
);

// Generator for a full Cart (List of items)
export const cartArb = fc.array(itemArb, { minLength: 1, maxLength: 10 });

// Alias for cart with shipping (same since itemArb now includes weight)
export const cartWithShippingArb = cartArb;
