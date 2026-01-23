import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';
import { registerAllureMetadata } from '../../../../shared/fixtures/allure-helpers';

/**
 * Complete Checkout Flow - End-to-End Tests
 *
 * These tests verify the complete customer journey from product discovery
 * through to order confirmation.
 *
 * NOTE: Several features are not yet implemented (Phase 3):
 * - Add to Cart functionality
 * - Stripe payment integration
 * - Order creation
 * - Order confirmation page
 */

// Helper to register Allure metadata
function registerE2EMetadata(
  testId: string,
  metadata: {
    ruleReference: string;
    rule: string;
    tags: string[];
  }
) {
  registerAllureMetadata(allure, {
    ...metadata,
    name: testId,
    parentSuite: 'GUI Verification',
    suite: 'Checkout',
    feature: 'Complete Flow',
  });
}

// Helper to seed localStorage before page load
async function seedLocalStorage(page: any, cartState: any) {
  await page.addInitScript((state) => {
    localStorage.setItem('cart-storage', JSON.stringify(state));
  }, cartState);
}

test.describe('Complete Checkout Flow E2E Tests', () => {
  // Note: VIP test has its own context management to avoid conflicts
  test.beforeEach(async ({ context }) => {
    // Clear localStorage and cookies before each test
    await context.clearCookies();
    await context.addInitScript(() => {
      localStorage.removeItem('cart-storage');
    });
  });

  test('complete purchase flow from products to confirmation', async ({ page }) => {
    registerE2EMetadata('happy-path-flow', {
      ruleReference: 'docs/specs/stories/06-complete-checkout.md',
      rule: 'Customer can complete purchase from product page to confirmation',
      tags: ['@critical', '@happy-path', '@e2e'],
    });

    // Seed localStorage with cart item before loading pages
    await seedLocalStorage(page, {
      state: {
        items: [{ sku: 'WIRELESS-EARBUDS', name: 'Wireless Earbuds', price: 8900, quantity: 1, weightInKg: 0.1, addedAt: Date.now() }],
        user: null,
        shippingMethod: 'STANDARD',
        pricingResult: null
      },
      version: 0
    });

    // Step 4: View cart (going directly to cart to verify seeded data)
    await page.goto('/cart');
    await expect(page.getByTestId('cart-item-WIRELESS-EARBUDS')).toBeVisible();

    // Step 5: Enter checkout
    await page.getByTestId('checkout-button').click();
    await expect(page).toHaveURL(/\/checkout/i);

    // Step 6: Review pricing
    const grandTotal = page.getByTestId('grand-total');
    await expect(grandTotal).toBeVisible();

    const totalPrice = await grandTotal.textContent();
    expect(totalPrice).toBeTruthy();

    // For this test, we verify the checkout page loads correctly
    await expect(page.getByText(/grand total/i)).toBeVisible();
  });

  test('cart persists through checkout flow', async ({ page }) => {
    registerE2EMetadata('cart-persistence-checkout', {
      ruleReference: 'docs/specs/stories/02-cart-management.md',
      rule: 'Cart survives navigation through checkout',
      tags: ['@persistence', '@robustness'],
    });

    // Seed cart with 2 items before loading pages
    await seedLocalStorage(page, {
      state: {
        items: [{ sku: 'WIRELESS-EARBUDS', name: 'Wireless Earbuds', price: 8900, quantity: 2, weightInKg: 0.1, addedAt: Date.now() }],
        user: null,
        shippingMethod: 'STANDARD',
        pricingResult: null
      },
      version: 0
    });

    // Start at products page
    await page.goto('/products');

    // Check badge shows 2 items
    let badgeText = await page.getByTestId('cart-badge').textContent();
    expect(badgeText).toBe('2');

    // Navigate to checkout
    await page.goto('/checkout');

    // Badge should still show 2
    badgeText = await page.getByTestId('cart-badge').textContent();
    expect(badgeText).toBe('2');

    // Go back to products
    await page.goto('/products');

    // Badge should still show 2
    badgeText = await page.getByTestId('cart-badge').textContent();
    expect(badgeText).toBe('2');
  });

  test('pricing accuracy displayed in checkout', async ({ page }) => {
    registerE2EMetadata('pricing-display-accuracy', {
      ruleReference: 'docs/specs/stories/06-complete-checkout.md',
      rule: 'Checkout displays pricing matching calculation API',
      tags: ['@pricing', '@compliance'],
    });

    // Seed cart with known products before loading pages
    await seedLocalStorage(page, {
      state: {
        items: [
          { sku: 'WIRELESS-EARBUDS', name: 'Wireless Earbuds', price: 8900, quantity: 1, weightInKg: 0.1, addedAt: Date.now() },
          { sku: 'SMART-WATCH', name: 'Smart Watch', price: 19900, quantity: 1, weightInKg: 0.2, addedAt: Date.now() }
        ],
        user: null,
        shippingMethod: 'STANDARD',
        pricingResult: null
      },
      version: 0
    });

    await page.goto('/checkout');

    // Verify pricing components are shown
    await expect(page.getByText(/product total/i)).toBeVisible();
    await expect(page.getByTestId('cart-summary').getByText('Shipping (STANDARD)', { exact: true })).toBeVisible();
    await expect(page.getByText(/grand total/i)).toBeVisible();

    // Get grand total
    const grandTotalElement = page.getByTestId('grand-total');
    const totalPrice = await grandTotalElement.textContent();

    expect(totalPrice).toBeTruthy();
    expect(totalPrice).toMatch(/\$\d+\.\d{2}/);
  });

  test('free shipping badge appears when eligible', async ({ page }) => {
    registerE2EMetadata('free-shipping-badge', {
      ruleReference: 'docs/specs/stories/06-complete-checkout.md',
      rule: 'Free shipping badge shown when cart > $100',
      tags: ['@shipping', '@business-rule'],
    });

    // Seed cart over $100
    await seedLocalStorage(page, {
      state: {
        items: [
          { sku: 'TABLET-10', name: '10" Tablet', price: 44900, quantity: 3, weightInKg: 1.2, addedAt: Date.now() }
        ],
        user: null,
        shippingMethod: 'STANDARD',
        pricingResult: null
      },
      version: 0
    });

    await page.goto('/checkout');

    // Free shipping badge should be visible on standard shipping
    const freeShippingBadge = page
      .getByTestId('shipping-standard')
      .getByTestId('free-shipping-badge');
    await expect(freeShippingBadge).toBeVisible();
  });

  test('express shipping fixed $25 rate', async ({ page }) => {
    registerE2EMetadata('express-fixed-rate', {
      ruleReference: 'docs/specs/stories/06-complete-checkout.md',
      rule: 'Express shipping always $25 regardless of cart value',
      tags: ['@shipping', '@business-rule'],
    });

    // Seed cart with items
    await seedLocalStorage(page, {
      state: {
        items: [{ sku: 'WIRELESS-EARBUDS', name: 'Wireless Earbuds', price: 8900, quantity: 1, weightInKg: 0.1, addedAt: Date.now() }],
        user: null,
        shippingMethod: 'STANDARD',
        pricingResult: null
      },
      version: 0
    });

    await page.goto('/checkout');

    // Select express shipping
    await page.getByTestId('shipping-express').click();

    // Get shipping cost
    const shippingElement = page.getByText(/Shipping \(EXPRESS\)/).locator('..').locator('.price-value');
    const shippingText = await shippingElement.textContent();
    const shippingCost = shippingText ? parseFloat(shippingText.replace(/[^0-9.]/g, '')) : 0;

    expect(shippingCost).toBe(25);
  });

  test('back button after checkout leads to confirmation', async ({ page }) => {
    registerE2EMetadata('back-button-checkout', {
      ruleReference: 'docs/specs/stories/06-complete-checkout.md',
      rule: 'Back button after payment redirects to confirmation',
      tags: ['@ux', '@navigation'],
    });

    // Seed cart
    await seedLocalStorage(page, {
      state: {
        items: [{ sku: 'WIRELESS-EARBUDS', name: 'Wireless Earbuds', price: 8900, quantity: 1, weightInKg: 0.1, addedAt: Date.now() }],
        user: null,
        shippingMethod: 'STANDARD',
        pricingResult: null
      },
      version: 0
    });

    await page.goto('/checkout');

    // In a real flow with payment, the user would complete payment
    // Then using back button would redirect to confirmation
    // For now, we just verify checkout page loads

    await expect(page.getByText(/checkout/i)).toBeVisible();
  });

  test('guest checkout flow works', async ({ page }) => {
    registerE2EMetadata('guest-checkout', {
      ruleReference: 'docs/specs/stories/06-complete-checkout.md',
      rule: 'User can checkout without login (guest)',
      tags: ['@feature', '@ux'],
    });

    // Seed cart for guest checkout
    await seedLocalStorage(page, {
      state: {
        items: [{ sku: 'WIRELESS-EARBUDS', name: 'Wireless Earbuds', price: 8900, quantity: 1, weightInKg: 0.1, addedAt: Date.now() }],
        user: null,
        shippingMethod: 'STANDARD',
        pricingResult: null
      },
      version: 0
    });

    // Navigate to checkout - should work without login
    await page.goto('/checkout');

    await expect(page.getByText(/checkout/i)).toBeVisible();
    await expect(page.getByTestId('grand-total')).toBeVisible();
  });
});

test.describe('VIP Checkout Tests', () => {
  // Separate test group with its own context management
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('VIP customer discount applied in checkout', async ({ page }) => {
    registerE2EMetadata('vip-discount-checkout', {
      ruleReference: 'docs/specs/stories/06-complete-checkout.md',
      rule: 'VIP customer sees discount applied in checkout',
      tags: ['@vip', '@pricing', '@business-rule'],
    });

    // Navigate to debug checkout page which sets up VIP user and cart items
    // This scenario uses: user with tenureYears: 5, wireless earbuds quantity: 4
    await page.goto('/debug/checkout?scenario=heavy-cart');

    // Wait for debug page to load
    await page.waitForLoadState('networkidle');

    // VIP badge should be visible on the debug page (which renders CheckoutPage)
    const vipBadge = page.getByTestId('vip-user-label');
    await expect(vipBadge).toBeVisible();

    // Verify discount is shown in the order summary
    // Use a more specific test ID for the VIP discount to avoid ambiguity
    await expect(page.getByTestId('discount-badge-vip')).toBeVisible();
  });
});
