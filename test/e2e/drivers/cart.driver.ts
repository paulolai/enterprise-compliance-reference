import type { Page, Locator } from '@playwright/test';

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

  // ===== QUERY OPERATIONS (Return Locators for Web-First Assertions) =====

  /**
   * Get cart total locator
   */
  getCartTotal: () => {
    return page.getByTestId('cart-total');
  },

  /**
   * Get VIP badge locator
   */
  getVipBadge: () => {
    return page.getByTestId('vip-badge');
  },

  /**
   * Get bulk discount badge locator for an item
   */
  getBulkDiscountBadge: (sku: string) => {
    return page.getByTestId(`bulk-badge-${sku}`);
  },

  /**
   * Get cart items locator
   */
  getCartItems: () => {
    return page.getByTestId('cart-item');
  },

  /**
   * Get specific cart item by SKU
   */
  getCartItem: (sku: string) => {
    return page.getByTestId(`cart-item-${sku}`);
  },

  /**
   * Get cart subtotal locator
   */
  getSubtotal: () => {
    return page.getByTestId('cart-subtotal');
  },

  /**
   * Get cart discount locator
   */
  getTotalDiscount: () => {
    return page.getByTestId('cart-discount');
  },

  /**
   * Get item quantity locator
   */
  getItemQuantity: (sku: string) => {
    return page.getByTestId(`cart-item-${sku}`).getByTestId('item-quantity');
  },

  /**
   * Get item price locator
   */
  getItemPrice: (sku: string) => {
    return page.getByTestId(`cart-item-${sku}`).getByTestId('item-price');
  },

  /**
   * Get item SKU locator
   */
  getItemSku: (sku: string) => {
    return page.getByTestId(`cart-item-${sku}`).getByTestId('item-sku');
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

  // Query operations (return Locators for web-first assertions)
  getCartTotal: () => Locator;
  getVipBadge: () => Locator;
  getBulkDiscountBadge: (sku: string) => Locator;
  getCartItems: () => Locator;
  getCartItem: (sku: string) => Locator;
  getSubtotal: () => Locator;
  getTotalDiscount: () => Locator;
  getItemQuantity: (sku: string) => Locator;
  getItemPrice: (sku: string) => Locator;
  getItemSku: (sku: string) => Locator;
  isEmpty: () => Promise<boolean>;
  getItemSkus: () => Promise<string[]>;
}
