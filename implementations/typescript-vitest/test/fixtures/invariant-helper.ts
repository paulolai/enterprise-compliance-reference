import * as fc from 'fast-check';
import { PricingEngine } from '../../src/pricing-engine';
import { cartArb, userArb, shippingMethodArb } from './arbitraries';
import { tracer } from '../modules/tracer';
import { CartItem, User, ShippingMethod, PricingResult } from '../../src/types';

type AssertionCallback = (items: CartItem[], user: User, result: PricingResult) => void;
type ShippingAssertionCallback = (items: CartItem[], user: User, method: ShippingMethod, result: PricingResult) => void;

/**
 * Helper to verify a pricing invariant.
 * Automatically handles:
 * - Property generation (Cart + User)
 * - PricingEngine execution
 * - Tracer logging
 * - Fast-check assertion
 */
export function verifyInvariant(
  invariantName: string, 
  assertion: AssertionCallback
) {
  fc.assert(
    fc.property(cartArb, userArb, (items, user) => {
      const result = PricingEngine.calculate(items, user);
      // Log every execution to tracer (sampling happens in tracer if configured, or it logs all)
      tracer.log(invariantName, { items, user }, result);
      
      assertion(items, user, result);
      return true; // Property passed if assertion didn't throw
    })
  );
}

/**
 * Helper to verify a shipping invariant.
 * Automatically handles:
 * - Property generation (Cart + User + ShippingMethod)
 * - PricingEngine execution
 * - Tracer logging
 * - Fast-check assertion
 */
export function verifyShippingInvariant(
  invariantName: string,
  assertion: ShippingAssertionCallback
) {
  fc.assert(
    fc.property(cartArb, userArb, shippingMethodArb, (items, user, method) => {
      const result = PricingEngine.calculate(items, user, method);
      tracer.log(invariantName, { items, user, method }, result);
      
      assertion(items, user, method, result);
      return true;
    })
  );
}
