import type { Page } from '@playwright/test';
import type { ShippingMethod } from '../../../../../shared/src';

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

  // ===== QUERY OPERATIONS =====

  /**
   * Get grand total from UI (in cents)
   */
  getGrandTotal: async () => {
    const text = await page.getByTestId('grand-total').textContent();
    return parseFloat(text?.replace('$', '') || '0');
  },

  /**
   * Get grand total in cents for direct comparison with pricing engine
   */
  getGrandTotalCents: async () => {
    const text = await page.getByTestId('grand-total').textContent();
    const dollars = parseFloat(text?.replace('$', '') || '0');
    return Math.round(dollars * 100);
  },

  /**
   * Get shipping cost from UI (in cents)
   */
  getShippingCostCents: async () => {
    const text = await page.getByTestId('shipping-cost').textContent();
    const dollars = parseFloat(text?.replace('$', '') || '0');
    return Math.round(dollars * 100);
  },

  /**
   * Get product total from UI (in cents)
   */
  getProductTotalCents: async () => {
    const text = await page.getByTestId('product-total').textContent();
    const dollars = parseFloat(text?.replace('$', '') || '0');
    return Math.round(dollars * 100);
  },

  /**
   * Check if free shipping badge is visible
   */
  isFreeShippingEligible: async () => {
    const badge = page.getByTestId('free-shipping-badge');
    const count = await badge.count();
    return count > 0;
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
   * Get the expedited surcharge amount (in cents)
   */
  getExpeditedSurchargeCents: async () => {
    const surchargeText = await page.getByTestId('expedited-surcharge').textContent();
    if (!surchargeText) return 0;

    const dollars = parseFloat(surchargeText.replace('$', '')) || 0;
    return Math.round(dollars * 100);
  },

  /**
   * Get the total discount amount (in cents)
   */
  getTotalDiscountCents: async () => {
    const discountText = await page.getByTestId('total-discount').textContent();
    if (!discountText) return 0;

    const dollars = parseFloat(discountText.match(/-\$([\d.]+)/)?.[1] || '0');
    return Math.round(dollars * 100);
  },

  /**
   * Check if discount cap warning is visible
   */
  isDiscountCapWarningVisible: async () => {
    const warning = page.getByTestId('discount-cap-warning');
    return await warning.count() > 0;
  },

  /**
   * Place order button is enabled?
   */
  isPlaceOrderButtonEnabled: async () => {
    const button = page.getByRole('button', { name: /place order/i });
    return await button.isEnabled();
  },

  /**
   * Get number of items in order summary
   */
  getOrderItemCount: async () => {
    const items = page.getByTestId('order-item');
    return await items.count();
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

  // Query operations
  getGrandTotal: () => Promise<number>;
  getGrandTotalCents: () => Promise<number>;
  getShippingCostCents: () => Promise<number>;
  getProductTotalCents: () => Promise<number>;
  isFreeShippingEligible: () => Promise<boolean>;
  isShippingSelected: (method: 'STANDARD' | 'EXPEDITED' | 'EXPRESS') => Promise<boolean>;
  getExpeditedSurchargeCents: () => Promise<number>;
  getTotalDiscountCents: () => Promise<number>;
  isDiscountCapWarningVisible: () => Promise<boolean>;
  isPlaceOrderButtonEnabled: () => Promise<boolean>;
  getOrderItemCount: () => Promise<number>;
}
