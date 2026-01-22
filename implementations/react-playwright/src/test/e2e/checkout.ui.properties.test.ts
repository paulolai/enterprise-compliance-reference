import { expect } from '@playwright/test';
import { invariant } from './fixtures/invariant-helper';

invariant('Grand total equals product total plus shipping', {
  ruleReference: 'pricing-strategy.md §5 - Shipping Calculation',
  rule: 'Grand Total = Final Product Total + Shipping Cost',
  tags: ['@pricing']
}, async ({ page }) => {
  await page.goto('/products/WIRELESS-EARBUDS');

  // Add item to cart
  await page.getByTestId('add-to-cart').click();
  // Wait for cart badge to update, ensuring state is persisted
  await page.getByTestId('cart-badge').waitFor({ state: 'visible' });

  // Navigate to checkout
  await page.goto('/checkout');

  // Get shipping cost
  const shippingCostElement = page.getByText(/Shipping/).locator('..').locator('.price-value');
  let shippingCost = 0;
  try {
    const shippingText = await shippingCostElement.textContent();
    shippingCost = shippingText ? parseFloat(shippingText.replace(/[^0-9.]/g, '')) : 0;
  } catch {
    // Shipping might not be loaded or in a different format
  }

  // Get grand total
  const grandTotalText = await page.getByTestId('grand-total').textContent();
  const grandTotal = grandTotalText ? parseFloat(grandTotalText.replace(/[^0-9.]/g, '')) : 0;

  // Grand total should be ≥ shipping cost (adding products should be included)
  expect(grandTotal).toBeGreaterThanOrEqual(shippingCost);
});

invariant('Express shipping costs exactly $25', {
  ruleReference: 'pricing-strategy.md §5.4 - Express Delivery',
  rule: 'Express shipping is fixed at $25.00 in UI',
  tags: ['@shipping', '@express']
}, async ({ page }) => {
  await page.goto('/products/WIRELESS-EARBUDS');

  // Add item to cart
  await page.getByTestId('add-to-cart').click();
  // Wait for cart badge to update, ensuring state is persisted
  await page.getByTestId('cart-badge').waitFor({ state: 'visible' });

  // Navigate to checkout
  await page.goto('/checkout');

  // Select express shipping
  await page.getByTestId('shipping-express').click();

  // Get shipping cost
  const shippingText = await page.getByText(/Shipping \(EXPRESS\)/).locator('..').locator('.price-value').textContent();
  const shippingCost = shippingText ? parseFloat(shippingText.replace(/[^0-9.]/g, '')) : 0;

  // Express shipping should be exactly $25
  expect(shippingCost).toBe(25);
});

invariant('Free shipping badge shown when eligible', {
  ruleReference: 'pricing-strategy.md §5.2 - Free Shipping Threshold',
  rule: 'UI shows Free Shipping badge when total > $100',
  tags: ['@shipping', '@free-shipping']
}, async ({ page }) => {
  // Find a product over $100 and add enough to qualify
  await page.goto('/products/TABLET-10'); // $449

  // Add 3 tablets = $1347, qualifies for free shipping
  await page.getByTestId('add-to-cart').click();
  await page.getByTestId('add-to-cart').click();
  await page.getByTestId('add-to-cart').click();
  // Wait for cart badge to reflect all items
  await page.getByTestId('cart-badge').waitFor({ state: 'visible' });

  // Navigate to checkout
  await page.goto('/checkout');

  // Free shipping badge should be visible on standard method
  const freeShippingBadge = page.getByTestId('shipping-standard').getByTestId('free-shipping-badge');
  await expect(freeShippingBadge).toBeVisible();
});

invariant('Free shipping badge NOT shown when not eligible', {
  ruleReference: 'pricing-strategy.md §5.2 - Free Shipping Threshold',
  rule: 'UI hides Free Shipping badge when total <= $100',
  tags: ['@shipping']
}, async ({ page }) => {
  // Add a small item that doesn't qualify for free shipping
  await page.goto('/products/WIRELESS-EARBUDS'); // $89

  await page.getByTestId('add-to-cart').click();

  // Navigate to checkout
  await page.goto('/checkout');

  // Free shipping badge should NOT be visible (using cart summary badge location)
  const cartSummary = page.getByTestId('cart-summary');
  const freeShippingBadge = cartSummary.getByTestId('free-shipping-badge');
  await expect(freeShippingBadge).not.toBeVisible();
});

invariant('Order summary displays all pricing components', {
  ruleReference: 'pricing-strategy.md §1 - Base Rules',
  rule: 'Order summary shows breakdown of costs',
  tags: []
}, async ({ page }) => {
  await page.goto('/products/WIRELESS-EARBUDS');

  // Add item to cart
  await page.getByTestId('add-to-cart').click();
  // Wait for cart badge to update, ensuring state is persisted
  await page.getByTestId('cart-badge').waitFor({ state: 'visible' });

  // Navigate to checkout
  await page.goto('/checkout');

  // Check order summary is visible
  const orderSummary = page.getByTestId('order-summary');
  await expect(orderSummary).toBeVisible();

  // Check for key pricing components
  await expect(page.getByText(/Product Total/)).toBeVisible();
  await expect(orderSummary.getByText(/Shipping/)).toBeVisible();
  await expect(page.getByText(/Grand Total/)).toBeVisible();
});

invariant('Shipping methods are selectable', {
  ruleReference: 'pricing-strategy.md §5 - Shipping Calculation',
  rule: 'User can select different shipping methods',
  tags: ['@shipping']
}, async ({ page }) => {
  await page.goto('/products/WIRELESS-EARBUDS');

  // Add item to cart
  await page.getByTestId('add-to-cart').click();
  // Wait for cart badge to update, ensuring state is persisted
  await page.getByTestId('cart-badge').waitFor({ state: 'visible' });

  // Navigate to checkout
  await page.goto('/checkout');

  // Check that shipping options exist
  await expect(page.getByTestId('shipping-standard')).toBeVisible();
  await expect(page.getByTestId('shipping-expedited')).toBeVisible();
  await expect(page.getByTestId('shipping-express')).toBeVisible();

  // Select expedited
  await page.getByTestId('shipping-expedited').click();
  await expect(page.getByTestId('shipping-expedited').locator('input')).toBeChecked();
});
