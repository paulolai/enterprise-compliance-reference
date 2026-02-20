import type { Page, Locator } from '@playwright/test';
import { ShippingMethod } from '@executable-specs/domain';

/**
 * Intent-Based Checkout Driver
 *
 * This driver provides intention-based operations on the checkout page.
 * Instead of focusing on implementation details, it focuses on business intent:
 * - "Select shipping method" -> selectShipping()
 * - "Place the order" -> placeOrder()
 * - "Get grand total from UI" -> getGrandTotal()
 *
 * This aligns with the "Executable Specifications" pattern where tests describe
 * business behavior using domain language.
 */

/**
 * Create a checkout driver that operates on the given page
 */
export const checkoutDriver = (page: Page): CheckoutDriver => ({
  // ===== INTENT-BASED ACTIONS =====

  /**
   * Select shipping method by name
   */
  selectShipping: async (method: 'STANDARD' | 'EXPEDITED' | 'EXPRESS') => {
    const methodLabels: Record<ShippingMethod, string> = {
      [ShippingMethod.STANDARD]: 'Standard',
      [ShippingMethod.EXPEDITED]: 'Expedited',
      [ShippingMethod.EXPRESS]: 'Express'
    };

    await page.getByRole('radio', { name: methodLabels[method] }).check();
  },

  /**
   * Place the order
   */
  placeOrder: async () => {
    await page.getByRole('button', { name: /place order/i }).click();
  },

  /**
   * Fill in shipping address form
   */
  fillShippingAddress: async (address: {
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  }) => {
    await page.getByLabel(/first name/i).fill(address.firstName);
    await page.getByLabel(/last name/i).fill(address.lastName);
    await page.getByLabel(/address/i).fill(address.address);
    await page.getByLabel(/city/i).fill(address.city);
    await page.getByLabel(/state/i).fill(address.state);
    await page.getByLabel(/zip/i).fill(address.zip);
  },

  /**
   * Fill in payment form
   */
  fillPayment: async (payment: {
    cardNumber: string;
    cardholderName: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
  }) => {
    await page.getByLabel(/card number/i).fill(payment.cardNumber);
    await page.getByLabel(/cardholder name/i).fill(payment.cardholderName);
    await page.getByLabel(/expiry month/i).selectOption(payment.expiryMonth);
    await page.getByLabel(/expiry year/i).selectOption(payment.expiryYear);
    await page.getByLabel(/cvv/i).fill(payment.cvv);
  },

  /**
   * Go back to cart from checkout
   */
  backToCart: async () => {
    await page.getByRole('link', { name: /back to cart/i }).click();
  },

  // ===== QUERY OPERATIONS (Return Locators for Web-First Assertions) =====

  /**
   * Get grand total locator for web-first assertion
   */
  getGrandTotal: () => {
    return page.getByTestId('grand-total');
  },

  /**
   * Get shipping cost locator
   */
  getShippingCost: () => {
    return page.getByTestId('shipping-cost');
  },

  /**
   * Get product total locator
   */
  getProductTotal: () => {
    return page.getByTestId('product-total');
  },

  /**
   * Get expedited surcharge locator
   */
  getExpeditedSurcharge: () => {
    return page.getByTestId('expedited-surcharge');
  },

  /**
   * Get total discount locator
   */
  getTotalDiscount: () => {
    return page.getByTestId('total-discount');
  },

  /**
   * Get free shipping badge locator
   */
  getFreeShippingBadge: () => {
    return page.getByTestId('free-shipping-badge');
  },

  /**
   * Check if a specific shipping method is selected
   */
  isShippingSelected: async (method: 'STANDARD' | 'EXPEDITED' | 'EXPRESS') => {
    const methodLabels: Record<ShippingMethod, string> = {
      [ShippingMethod.STANDARD]: 'Standard',
      [ShippingMethod.EXPEDITED]: 'Expedited',
      [ShippingMethod.EXPRESS]: 'Express'
    };

    const radio = page.getByRole('radio', { name: methodLabels[method] });
    return await radio.isChecked();
  },

  /**
   * Get discount cap warning locator
   */
  getDiscountCapWarning: () => {
    return page.getByTestId('discount-cap-warning');
  },

  /**
   * Get place order button locator
   */
  getPlaceOrderButton: () => {
    return page.getByRole('button', { name: /place order/i });
  },

  /**
   * Get order items locator
   */
  getOrderItems: () => {
    return page.getByTestId('order-item');
  }
});

/**
 * Type definition for the checkout driver
 */
export interface CheckoutDriver {
  // Intent-based actions
  selectShipping: (method: 'STANDARD' | 'EXPEDITED' | 'EXPRESS') => Promise<void>;
  placeOrder: () => Promise<void>;
  fillShippingAddress: (address: {
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  }) => Promise<void>;
  fillPayment: (payment: {
    cardNumber: string;
    cardholderName: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
  }) => Promise<void>;
  backToCart: () => Promise<void>;

  // Query operations (return Locators for web-first assertions)
  getGrandTotal: () => Locator;
  getShippingCost: () => Locator;
  getProductTotal: () => Locator;
  getFreeShippingBadge: () => Locator;
  getExpeditedSurcharge: () => Locator;
  getTotalDiscount: () => Locator;
  getDiscountCapWarning: () => Locator;
  getPlaceOrderButton: () => Locator;
  getOrderItems: () => Locator;
  isShippingSelected: (method: 'STANDARD' | 'EXPEDITED' | 'EXPRESS') => Promise<boolean>;
}
