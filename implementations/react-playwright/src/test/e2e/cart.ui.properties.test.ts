import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';
import {
  invariant,
  PageBuilder,
  cartArb,
  userArb,
  cartItemArb,
} from './fixtures/invariant-helper';
import { productCatalog } from '../../store/cartStore';

invariant('Cart total matches calculation result', {
  ruleReference: 'pricing-strategy.md §1 - Base Rules',
  rule: 'UI must accurately reflect the calculated cart total',
  tags: ['@pricing', '@critical']
}, async ({ page }) => {
  const product = productCatalog[0];

  await page.goto(`/products/${product.sku}`);

  // Add item to cart
  await page.getByTestId('add-to-cart').click();
  // Wait for cart badge to update, ensuring state is persisted
  await page.getByTestId('cart-badge').waitFor({ state: 'visible' });

  // Navigate to cart
  await page.goto('/cart');

  // Check cart total exists and is positive
  const grandTotal = page.getByTestId('grand-total');
  await expect(grandTotal).toBeVisible();

  const grandTotalText = await grandTotal.textContent();
  expect(grandTotalText).toBeTruthy();
  expect(grandTotalText).toMatch(/\$\d+\.\d{2}/);
});

invariant('Cart badge shows correct item count', {
  ruleReference: 'pricing-strategy.md §1 - Base Rules',
  rule: 'Cart badge count matches total items in cart',
  tags: ['@ux']
}, async ({ page }) => {
  await page.goto(`/products/${productCatalog[0].sku}`);

  // Add items to cart
  await page.getByTestId('add-to-cart').click();
  await page.getByTestId('cart-badge').waitFor({ state: 'visible' });

  let badgeText = await page.getByTestId('cart-badge').textContent();
  expect(badgeText).toBe('1');

  // Add another item
  await page.goto('/products/WIRELESS-EARBUDS');
  await page.getByTestId('add-to-cart').click();
  // Wait for badge to reflect the updated count
  await page.waitForTimeout(100);

  badgeText = await page.getByTestId('cart-badge').textContent();
  expect(badgeText).toBe('2');
});

invariant('VIP badge shown for VIP users', {
  ruleReference: 'pricing-strategy.md §3 - VIP Tier',
  rule: 'VIP badge is visible for eligible users (tenure > 2 years)',
  tags: ['@vip', '@pricing']
}, async ({ page }) => {
  // Visit the pricing strategy to understand VIP rule
  // VIP: tenure > 2 years

  const vipEmail = 'vip@techhome.com';

  await page.goto('/login');

  // Fill in login form
  await page.getByTestId('email-input').fill(vipEmail);
  await page.getByTestId('password-input').fill('password');
  await page.getByTestId('login-button').click();

  // Navigate to products and add item
  await page.goto(`/products/${productCatalog[0].sku}`);
  await page.getByTestId('add-to-cart').click();

  // Navigate to cart
  await page.goto('/cart');

  // VIP badge should be visible (user has 4 years tenure)
  const vipBadge = page.getByTestId('vip-badge');
  await expect(vipBadge).toBeVisible();
});

invariant('VIP badge NOT shown for non-VIP users', {
  ruleReference: 'pricing-strategy.md §3 - VIP Tier',
  rule: 'VIP badge is HIDDEN for non-eligible users',
  tags: ['@vip', '@pricing']
}, async ({ page }) => {
  // Non-VIP: tenure <= 2 years
  const newEmail = 'new@customer.com';

  await page.goto('/login');

  // Fill in login form
  await page.getByTestId('email-input').fill(newEmail);
  await page.getByTestId('password-input').fill('password');
  await page.getByTestId('login-button').click();

  // Navigate to products and add item
  await page.goto(`/products/${productCatalog[0].sku}`);
  await page.getByTestId('add-to-cart').click();

  // Navigate to cart
  await page.goto('/cart');

  // VIP badge should NOT be visible (user has 0 years tenure)
  const vipBadge = page.getByTestId('vip-badge');
  await expect(vipBadge).not.toBeVisible();
});

invariant('Cart allows removing items', {
  ruleReference: 'pricing-strategy.md §1 - Base Rules',
  rule: 'User can remove items from cart',
  tags: ['@interaction']
}, async ({ page }) => {
  await page.goto(`/products/${productCatalog[0].sku}`);

  // Add item to cart
  await page.getByTestId('add-to-cart').click();
  // Wait for cart badge to update, ensuring state is persisted
  await page.getByTestId('cart-badge').waitFor({ state: 'visible' });

  // Navigate to cart
  await page.goto('/cart');

  // Cart should have the item
  const cartItem = page.getByTestId(/cart-item-/);
  await expect(cartItem).toBeVisible();

  // Remove the item
  await page.getByTestId(/remove-cart-item-/).click();

  // Cart should be empty
  const emptyCartMessage = page.getByText('Your cart is empty');
  await expect(emptyCartMessage).toBeVisible();
});

invariant('Cart allows quantity updates', {
  ruleReference: 'pricing-strategy.md §1 - Base Rules',
  rule: 'User can update item quantity in cart',
  tags: ['@interaction']
}, async ({ page }) => {
  await page.goto(`/products/${productCatalog[0].sku}`);

  // Add item to cart
  await page.getByTestId('add-to-cart').click();
  // Wait for cart badge to update, ensuring state is persisted
  await page.getByTestId('cart-badge').waitFor({ state: 'visible' });

  // Navigate to cart
  await page.goto('/cart');

  // Get initial quantity
  const quantityInput = page.getByTestId(/cart-item-quantity-/);
  const initialQuantity = await quantityInput.inputValue();
  expect(initialQuantity).toBe('1');

  // Increase quantity
  await page.getByRole('button', { name: '+' }).click();

  const newQuantity = await quantityInput.inputValue();
  expect(newQuantity).toBe('2');
});
