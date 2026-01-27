/**
 * Cart Domain Functions
 *
 * Pure functions for domain logic, transformations, and invariant enforcement.
 * These functions are highly testable and independent of framework/IO.
 */

import type { Result } from '@executable-specs/shared/result';
import { success } from '@executable-specs/shared/result';
import type {
  CartItem,
  CartItemRequest,
  PricingResult,
} from './schema.ts';

/**
 * Maps incoming request cart items to canonical domain items.
 */
export function mapRequestItemsToDomain(items: CartItemRequest[]): CartItem[] {
  return items.map(item => ({
    sku: item.sku,
    name: 'Product ' + item.sku, // Name is usually looked up from catalog, this is a placeholder
    price: item.priceInCents,
    quantity: item.quantity,
    weightInKg: item.weightInKg
  }));
}

/**
 * Maps cart items to line items for a pricing result summary.
 * Used when finalizing an order.
 */
export function mapCartToLineItems(cartItems: CartItemRequest[], pricingResult?: PricingResult | null) {
  return cartItems.map(item => {
    const lineItemResult = pricingResult?.lineItems?.find(li => li.sku === item.sku);
    return {
      sku: item.sku,
      bulkDiscount: lineItemResult?.bulkDiscount || 0,
      quantity: item.quantity,
      priceInCents: item.priceInCents,
      weightInKg: item.weightInKg
    };
  });
}

/**
 * Enforces business invariants during order creation.
 * Returns a Result object.
 */
export function validateOrderInvariants(
  total: number,
  items: CartItemRequest[]
): Result<true, string> {
  if (items.length === 0) {
    return { success: false, error: 'Cart must have at least one item' };
  }

  if (total <= 0) {
    return { success: false, error: 'Order total must be positive' };
  }

  return success(true);
}
