import type { CartItem } from '@executable-specs/shared';
import type { Result } from '@executable-specs/domain';
import { success } from '@executable-specs/domain';

export interface LineItem {
  sku: string;
  bulkDiscount: number;
  quantity: number;
  priceInCents: number;
  weightInKg: number;
}

/**
 * Maps cart items to line items for a pricing result summary.
 * Used when finalizing an order.
 */
export function mapCartToLineItems(cartItems: any[], pricingResult?: any | null): LineItem[] {
  return cartItems.map(item => {
    // If we have a pricing result, try to find the matching line item to get discount
    const lineItemResult = pricingResult?.lineItems?.find((li: any) => li.sku === item.sku);
    
    return {
      sku: item.sku,
      bulkDiscount: lineItemResult?.bulkDiscount || 0,
      quantity: item.quantity,
      priceInCents: item.price || item.priceInCents || 0,
      weightInKg: item.weightInKg || 0
    };
  });
}

/**
 * Enforces business invariants during order creation.
 * Returns a Result object.
 */
export function validateOrderInvariants(
  total: number,
  items: any[]
): Result<true, string> {
  if (!Array.isArray(items)) {
    return { success: false, error: 'Items must be an array' };
  }

  if (items.length === 0) {
    return { success: false, error: 'Cart must have at least one item' };
  }

  if (total < 0) {
    return { success: false, error: 'Order total cannot be negative' };
  }

  // Ensure all items have required fields
  const allItemsValid = items.every(item => 
    item.sku && 
    (item.price !== undefined || item.priceInCents !== undefined) && 
    item.quantity > 0
  );

  if (!allItemsValid) {
    return { success: false, error: 'One or more items are invalid' };
  }

  return success(true);
}
