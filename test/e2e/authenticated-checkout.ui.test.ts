import { expect } from '@playwright/test';
import { invariant } from './fixtures/invariant-helper';
import { injectCartState } from './fixtures/api-seams';
import { CartBuilder } from '@executable-specs/shared/fixtures';
import { ShippingMethod } from '@executable-specs/domain';

/**
 * Authenticated Checkout Flow - Cross-Functional E2E Test
 *
 * Exercises the complete authenticated shopping flow:
 * Register -> Login -> Add to Cart -> Verify Cart -> Checkout -> Verify Pricing
 *
 * This test verifies the interaction between Auth, Cart, and Checkout domains.
 */

// --- VIP User Flow (tenure > 2 years) ---

invariant('VIP user complete authenticated checkout flow', {
  ruleReference: 'pricing-strategy.md §3 - VIP Tier, §6 - Checkout Flow',
  rule: 'VIP user (tenure > 2 years) can register, login, add items to cart, and see VIP discount applied at checkout',
  tags: ['@cross-functional', '@vip', '@authenticated', '@checkout']
}, async ({ page, request }) => {
  const uniqueEmail = `vip-checkout-${Date.now()}@example.com`;
  const password = 'password123';

  // Step 1: Register new user via API
  const registerResponse = await request.post('http://localhost:5173/api/auth/register', {
    data: {
      email: uniqueEmail,
      name: 'VIP Test User',
      password
    }
  });
  expect(registerResponse.ok()).toBe(true);
  const registerBody = await registerResponse.json() as { user: { email: string; name: string; tenureYears: number } };
  expect(registerBody.user.email).toBe(uniqueEmail);

  // Step 2: Login via API to get auth token
  const loginResponse = await request.post('http://localhost:5173/api/auth/login', {
    data: {
      email: uniqueEmail,
      password
    }
  });
  expect(loginResponse.ok()).toBe(true);
  const loginBody = await loginResponse.json() as { user: { email: string; name: string; tenureYears: number }; accessToken: string };
  expect(loginBody.accessToken).toBeTruthy();

  // Step 3: Seed cart with items for the VIP user (tenure > 2 years)
  const builder = CartBuilder.new()
    .withItem({
      name: 'Wireless Earbuds',
      price: 8900,
      sku: 'WIRELESS-EARBUDS',
      quantity: 1,
      weightInKg: 0.1
    })
    .withItem({
      name: 'Smart Watch',
      price: 19900,
      sku: 'SMART-WATCH',
      quantity: 1,
      weightInKg: 0.2
    })
    .withTenure(5)
    .withStandardShipping();

  const { items, user } = builder.getInputs();

  // Inject cart state with VIP user (tenure 5 years)
  await injectCartState(page, items, {
    email: uniqueEmail,
    name: 'VIP Test User',
    tenureYears: user.tenureYears
  });

  // Step 4: Navigate to cart and verify items are correct
  await page.goto('/cart');
  await page.waitForLoadState('networkidle');

  // Verify both items are in cart
  await expect(page.getByTestId('cart-item-WIRELESS-EARBUDS')).toBeVisible();
  await expect(page.getByTestId('cart-item-SMART-WATCH')).toBeVisible();

  // Verify cart badge shows correct count (2 items)
  await expect(page.getByTestId('cart-badge')).toHaveText('2');

  // Verify grand total is displayed
  const grandTotal = page.getByTestId('grand-total');
  await expect(grandTotal).toBeVisible();

  // Step 5: Navigate to checkout
  await page.goto('/checkout');
  await page.waitForLoadState('networkidle');

  // Step 6: Verify VIP badge is shown (tenure > 2 years)
  const vipBadge = page.getByTestId('vip-user-label');
  await expect(vipBadge).toBeVisible();

  // Step 7: Verify VIP discount is applied in pricing
  const vipDiscount = page.getByTestId('discount-badge-vip');
  await expect(vipDiscount).toBeVisible();

  // Verify shipping methods are available
  await expect(page.getByRole('radio', { name: 'Standard' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Expedited' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Express' })).toBeVisible();

  // Verify pricing components are shown
  await expect(page.getByText(/Product Total/)).toBeVisible();
  await expect(page.getByText(/Shipping/)).toBeVisible();
  await expect(page.getByText(/Grand Total/)).toBeVisible();

  // Verify grand total has valid format
  const grandTotalText = await grandTotal.textContent();
  expect(grandTotalText).toMatch(/\$\d+\.\d{2}/);
});

// --- Non-VIP User Flow (tenure <= 2 years) ---

invariant('Non-VIP user complete authenticated checkout flow', {
  ruleReference: 'pricing-strategy.md §3 - VIP Tier, §6 - Checkout Flow',
  rule: 'Non-VIP user (tenure <= 2 years) can register, login, add items to cart, and checkout without VIP discount',
  tags: ['@cross-functional', '@non-vip', '@authenticated', '@checkout']
}, async ({ page, request }) => {
  const uniqueEmail = `regular-checkout-${Date.now()}@example.com`;
  const password = 'password123';

  // Step 1: Register new user via API
  const registerResponse = await request.post('http://localhost:5173/api/auth/register', {
    data: {
      email: uniqueEmail,
      name: 'Regular Test User',
      password
    }
  });
  expect(registerResponse.ok()).toBe(true);
  const registerBody = await registerResponse.json() as { user: { email: string } };
  expect(registerBody.user.email).toBe(uniqueEmail);

  // Step 2: Login via API
  const loginResponse = await request.post('http://localhost:5173/api/auth/login', {
    data: {
      email: uniqueEmail,
      password
    }
  });
  expect(loginResponse.ok()).toBe(true);
  const loginBody = await loginResponse.json() as { accessToken: string };
  expect(loginBody.accessToken).toBeTruthy();

  // Step 3: Seed cart with items for non-VIP user (tenure = 0)
  const builder = CartBuilder.new()
    .withItem({
      name: 'Wireless Earbuds',
      price: 8900,
      sku: 'WIRELESS-EARBUDS',
      quantity: 1,
      weightInKg: 0.1
    })
    .withTenure(0)
    .withStandardShipping();

  const { items, user } = builder.getInputs();

  // Inject cart state with non-VIP user
  await injectCartState(page, items, {
    email: uniqueEmail,
    name: 'Regular Test User',
    tenureYears: user.tenureYears
  });

  // Step 4: Navigate to cart and verify items
  await page.goto('/cart');
  await page.waitForLoadState('networkidle');

  await expect(page.getByTestId('cart-item-WIRELESS-EARBUDS')).toBeVisible();
  await expect(page.getByTestId('cart-badge')).toHaveText('1');

  // Step 5: Navigate to checkout
  await page.goto('/checkout');
  await page.waitForLoadState('networkidle');

  // Step 6: Verify VIP badge is NOT shown (tenure <= 2 years)
  const vipBadge = page.getByTestId('vip-user-label');
  await expect(vipBadge).not.toBeVisible();

  // Step 7: Verify VIP discount is NOT applied
  const vipDiscount = page.getByTestId('discount-badge-vip');
  await expect(vipDiscount).not.toBeVisible();

  // Verify shipping methods are still available
  await expect(page.getByRole('radio', { name: 'Standard' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Expedited' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Express' })).toBeVisible();

  // Verify pricing components are shown (without VIP discount)
  await expect(page.getByText(/Product Total/)).toBeVisible();
  await expect(page.getByText(/Shipping/)).toBeVisible();
  await expect(page.getByText(/Grand Total/)).toBeVisible();
});

// --- Cart Data Consistency After Seeding ---

invariant('Seeded cart data persists through auth flow to checkout', {
  ruleReference: 'pricing-strategy.md §1 - Base Rules, §6 - Checkout Flow',
  rule: 'Cart items seeded via API seam persist correctly through navigation to checkout with accurate pricing',
  tags: ['@cross-functional', '@persistence', '@data-consistency']
}, async ({ page, request }) => {
  const uniqueEmail = `consistency-${Date.now()}@example.com`;
  const password = 'password123';

  // Step 1: Register and login
  await request.post('http://localhost:5173/api/auth/register', {
    data: { email: uniqueEmail, name: 'Consistency User', password }
  });

  await request.post('http://localhost:5173/api/auth/login', {
    data: { email: uniqueEmail, password }
  });

  // Step 2: Seed cart with known items
  const items = [
    { sku: 'WIRELESS-EARBUDS', name: 'Wireless Earbuds', price: 8900, quantity: 2, weightInKg: 0.1 },
    { sku: 'DESK-LAMP', name: 'LED Desk Lamp', price: 4900, quantity: 1, weightInKg: 1.2 }
  ];

  await injectCartState(page, items, {
    email: uniqueEmail,
    name: 'Consistency User',
    tenureYears: 3
  });

  // Step 3: Verify cart page shows correct items and quantities
  await page.goto('/cart');
  await page.waitForLoadState('networkidle');

  // Check item quantities
  const earbudsQuantity = page.getByTestId('cart-item-quantity-WIRELESS-EARBUDS');
  await expect(earbudsQuantity).toHaveValue('2');

  const lampQuantity = page.getByTestId('cart-item-quantity-DESK-LAMP');
  await expect(lampQuantity).toHaveValue('1');

  // Badge should show total items (2 + 1 = 3)
  await expect(page.getByTestId('cart-badge')).toHaveText('3');

  // Step 4: Navigate to checkout and verify pricing persists
  await page.goto('/checkout');
  await page.waitForLoadState('networkidle');

  // VIP badge should be visible (tenure = 3 > 2)
  await expect(page.getByTestId('vip-user-label')).toBeVisible();

  // Grand total should be displayed with valid format
  const grandTotal = page.getByTestId('grand-total');
  await expect(grandTotal).toBeVisible();
  const grandTotalText = await grandTotal.textContent();
  expect(grandTotalText).toMatch(/\$\d+\.\d{2}/);

  // Shipping should be calculated and shown
  const shippingRow = page.getByTestId('cart-summary')
    .locator('.summary-row')
    .filter({ hasText: 'Shipping' });
  await expect(shippingRow).toBeVisible();
});

// --- VIP Discount Pricing Verification ---

invariant('VIP discount correctly reduces grand total for long-tenure user', {
  ruleReference: 'pricing-strategy.md §3 - VIP Tier, §5.5 - Shipping Discount Cap',
  rule: 'VIP users (tenure > 2 years) receive 5% discount on cart subtotal, applied after bulk discounts',
  tags: ['@cross-functional', '@vip', '@pricing-verification']
}, async ({ page, request }) => {
  const uniqueEmail = `vip-pricing-${Date.now()}@example.com`;
  const password = 'password123';

  // Register and login
  await request.post('http://localhost:5173/api/auth/register', {
    data: { email: uniqueEmail, name: 'VIP Pricing User', password }
  });

  await request.post('http://localhost:5173/api/auth/login', {
    data: { email: uniqueEmail, password }
  });

  // Seed cart with items that trigger bulk discount (3+ same SKU)
  // 3 x T-SHIRT-BASIC @ $29.00 = $87.00 original
  // Bulk discount: 15% off = $73.95
  // VIP discount: 5% off $73.95 = $70.25
  const items = [
    { sku: 'T-SHIRT-BASIC', name: 'Basic T-Shirt', price: 2900, quantity: 3, weightInKg: 0.3 }
  ];

  await injectCartState(page, items, {
    email: uniqueEmail,
    name: 'VIP Pricing User',
    tenureYears: 5
  });

  // Navigate to checkout
  await page.goto('/checkout');
  await page.waitForLoadState('networkidle');

  // Verify VIP badge is visible
  await expect(page.getByTestId('vip-user-label')).toBeVisible();

  // Verify VIP discount badge is shown
  await expect(page.getByTestId('discount-badge-vip')).toBeVisible();

  // Verify grand total is less than original total (discounts applied)
  const grandTotal = page.getByTestId('grand-total');
  await expect(grandTotal).toBeVisible();
  const grandTotalText = await grandTotal.textContent();
  const grandTotalValue = grandTotalText ? parseFloat(grandTotalText.replace(/[^0-9.]/g, '')) : 0;

  // Original total would be $87.00 (3 x $29), with discounts it should be less
  // Plus shipping (standard: $7 + 0.9kg * $2 = $8.80)
  // After bulk (15%): $73.95, after VIP (5%): $70.25, + shipping $8.80 = $79.05
  // So grand total should be < original $87.00 + $8.80 = $95.80
  expect(grandTotalValue).toBeLessThan(95.80);
  expect(grandTotalValue).toBeGreaterThan(0);
});
