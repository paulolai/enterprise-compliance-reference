import type { Page } from '@playwright/test';

/**
 * Intent-Based Cart Driver
 *
 * This driver provides intention-based operations on the cart page.
 * Instead of focusing on implementation details (clicking selectors),
 * it focuses on business intent:
 * - "Add product to cart" -> addToCart()
 * - "Get cart total from UI" -> getCartTotal()
 * - "Check if VIP badge is visible" -> isVipBadgeVisible()
 *
 * This aligns with the "Executable Specifications" pattern where tests describe
 * business behavior using domain language.
 */

/**
 * Create a cart driver that operates on the given page
 */
export const cartDriver = (page: Page): CartDriver => ({
  // ===== INTENT-BASED ACTIONS =====

  /**
   * Add product to cart by clicking through product detail flow
   * Note: For faster tests, prefer using seedCartSession() API seam
   */
  addToCart: async (sku: string) => {
    await page.goto(`/products/${sku}`);
    await page.getByTestId('add-to-cart-btn').click();
  },

  /**
   * Remove an item from the cart
   */
  removeItem: async (sku: string) => {
    const itemRow = page.getByTestId(`cart-item-${sku}`);
    const removeBtn = itemRow.getByTestId('remove-item-btn');
    await removeBtn.click();
  },

  /**
   * Increase quantity of an item
   */
  increaseQuantity: async (sku: string) => {
    const itemRow = page.getByTestId(`cart-item-${sku}`);
    const incrementBtn = itemRow.getByTestId('quantity-increment');
    await incrementBtn.click();
  },

  /**
   * Decrease quantity of an item
   */
  decreaseQuantity: async (sku: string) => {
    const itemRow = page.getByTestId(`cart-item-${sku}`);
    const decrementBtn = itemRow.getByTestId('quantity-decrement');
    await decrementBtn.click();
  },

  /**
   * Navigate to checkout
   */
  goToCheckout: async () => {
    await page.getByRole('button', { name: /proceed to checkout/i }).click();
  },

  /**
   * Continue shopping (go back to products)
   */
  continueShopping: async () => {
    await page.getByRole('link', { name: /continue shopping/i }).click();
  },

  // ===== QUERY OPERATIONS =====

  /**
   * Get cart total from UI (in cents)
   */
  getCartTotal: async () => {
    const text = await page.getByTestId('cart-total').textContent();
    return parseFloat(text?.replace('$', '') || '0');
  },

  /**
   * Get cart total in cents for direct comparison with pricing engine
   */
  getCartTotalCents: async () => {
    const text = await page.getByTestId('cart-total').textContent();
    const dollars = parseFloat(text?.replace('$', '') || '0');
    return Math.round(dollars * 100);
  },

  /**
   * Check if VIP badge is visible
   */
  isVipBadgeVisible: async () => {
    const badge = page.getByTestId('vip-badge');
    const count = await badge.count();
    if (count === 0) return false;

    // Also verify it's visible (not just in DOM)
    return await badge.isVisible();
  },

  /**
   * Check if bulk discount badge is visible for an item
   */
  hasBulkDiscount: async (sku: string) => {
    const badge = page.getByTestId(`bulk-badge-${sku}`);
    const count = await badge.count();
    return count > 0;
  },

  /**
   * Get line item count
   */
  getLineItemCount: async () => {
    const items = page.getByTestId('cart-item');
    return await items.count();
  },

  /**
   * Get the quantity of a specific item
   */
  getItemQuantity: async (sku: string) => {
    const itemRow = page.getByTestId(`cart-item-${sku}`);
    const qtyText = await itemRow.getByTestId('item-quantity').textContent();
    return parseInt(qtyText || '0');
  },

  /**
   * Get the displayed price for a specific item
   */
  getItemPriceCents: async (sku: string) => {
    const itemRow = page.getByTestId(`cart-item-${sku}`);
    const priceText = await itemRow.getByTestId('item-price').textContent();
    const dollars = parseFloat(priceText?.replace('$', '') || '0');
    return Math.round(dollars * 100);
  },

  /**
   * Get the bulk discount amount for a specific item
   */
  getItemBulkDiscountCents: async (sku: string) => {
    const itemRow = page.getByTestId(`cart-item-${sku}`);
    const badge = itemRow.getByTestId(`bulk-badge-${sku}`);

    const count = await badge.count();
    if (count === 0) return 0;

    const discountText = await badge.textContent();
    const dollars = parseFloat(discountText?.match(/-\$([\d.]+)/)?.[1] || '0');
    return Math.round(dollars * 100);
  },

  /**
   * Get subtotal displayed on cart page
   */
  getSubtotalCents: async () => {
    const text = await page.getByTestId('cart-subtotal').textContent();
    const dollars = parseFloat(text?.replace('$', '') || '0');
    return Math.round(dollars * 100);
  },

  /**
   * Get total discount displayed on cart page
   */
  getTotalDiscountCents: async () => {
    const text = await page.getByTestId('cart-discount').textContent();
    const dollars = parseFloat(text?.match(/-\$([\d.]+)/)?.[1] || '0');
    return Math.round(dollars * 100);
  },

  /**
   * Check if cart is empty
   */
  isEmpty: async () => {
    const items = page.getByTestId('cart-item');
    const count = await items.count();
    return count === 0;
  },

  /**
   * Get all item SKUs in the cart
   */
  getItemSkus: async () => {
    const items = page.getByTestId('cart-item');
    const count = await items.count();
    const skus: string[] = [];

    for (let i = 0; i < count; i++) {
      const skuText = await items.nth(i).getByTestId('item-sku').textContent();
      if (skuText) skus.push(skuText);
    }

    return skus;
  }
});

/**
 * Type definition for the cart driver
 */
export interface CartDriver {
  // Intent-based actions
  addToCart: (sku: string) => Promise<void>;
  removeItem: (sku: string) => Promise<void>;
  increaseQuantity: (sku: string) => Promise<void>;
  decreaseQuantity: (sku: string) => Promise<void>;
  goToCheckout: () => Promise<void>;
  continueShopping: () => Promise<void>;

  // Query operations
  getCartTotal: () => Promise<number>;
  getCartTotalCents: () => Promise<number>;
  isVipBadgeVisible: () => Promise<boolean>;
  hasBulkDiscount: (sku: string) => Promise<boolean>;
  getLineItemCount: () => Promise<number>;
  getItemQuantity: (sku: string) => Promise<number>;
  getItemPriceCents: (sku: string) => Promise<number>;
  getItemBulkDiscountCents: (sku: string) => Promise<number>;
  getSubtotalCents: () => Promise<number>;
  getTotalDiscountCents: () => Promise<number>;
  isEmpty: () => Promise<boolean>;
  getItemSkus: () => Promise<string[]>;
}
