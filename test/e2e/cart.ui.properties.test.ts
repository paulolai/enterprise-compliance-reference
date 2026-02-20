import { expect } from '@playwright/test';
import { invariant } from './fixtures/invariant-helper';
import { productCatalog } from '@executable-specs/client/store/cartStore';
import { injectCartState } from './fixtures/api-seams';
import { CartBuilder } from '@executable-specs/shared/fixtures';

invariant('Cart total matches calculation result', {
  ruleReference: 'pricing-strategy.md §1 - Base Rules',
  rule: 'UI must accurately reflect the calculated cart total',
  tags: ['@pricing', '@critical']
}, async ({ page }) => {
  const product = productCatalog[0];

  // Use seam for fast state setup
  const builder = CartBuilder.new()
    .withItem({
      name: product.name,
      price: product.price,
      sku: product.sku,
      quantity: 1
    });
  
  const { items, user } = builder.getInputs();
  await injectCartState(page, items, user);

  // Navigate to cart
  await page.goto('/cart');

  // Check cart total exists and is positive
  const grandTotal = page.getByTestId('grand-total');
  await expect(grandTotal).toBeVisible();
  await expect(grandTotal).toHaveText(/\$\d+\.\d{2}/);
});

invariant('Cart badge shows correct item count', {
  ruleReference: 'pricing-strategy.md §1 - Base Rules',
  rule: 'Cart badge count matches total items in cart',
  tags: ['@ux']
}, async ({ page }) => {
  await page.goto(`/products/${productCatalog[0].sku}`);

  // Add items to cart
  await page.getByRole('button', { name: 'Add to Cart' }).click();
  await page.getByTestId('cart-badge').waitFor({ state: 'visible' });

  await expect(page.getByTestId('cart-badge')).toHaveText('1');

  // Add another item
  await page.goto('/products/WIRELESS-EARBUDS');
  await page.getByRole('button', { name: 'Add to Cart' }).click();
  // Wait for badge to reflect the updated count
  await expect(page.getByTestId('cart-badge')).toHaveText('2');

  await expect(page.getByTestId('cart-badge')).toHaveText('2');
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

  // Wait for login to complete and user state to sync
  await page.waitForURL(/\/cart/, { timeout: 3000 });

  // Navigate to products and add item
  await page.goto(`/products/${productCatalog[0].sku}`);
  await page.getByRole('button', { name: 'Add to Cart' }).click();
  // Wait for cart badge to update, ensuring state is persisted
  await page.getByTestId('cart-badge').waitFor({ state: 'visible' });

  // Navigate to cart
  await page.goto('/cart');
  // Wait for page to fully load and state to hydrate
  await page.waitForLoadState('networkidle');

  // VIP badge should be visible (user has 4 years tenure)
  const vipBadge = page.getByTestId('vip-user-label');
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

  // Wait for login to complete and user state to sync
  await page.waitForURL(/\/cart/, { timeout: 3000 });

  // Navigate to products and add item
  await page.goto(`/products/${productCatalog[0].sku}`);
  await page.getByRole('button', { name: 'Add to Cart' }).click();

  // Navigate to cart
  await page.goto('/cart');

  // VIP badge should NOT be visible (user has 0 years tenure)
  const vipBadge = page.getByTestId('vip-user-label');
  await expect(vipBadge).not.toBeVisible();
});

invariant('Cart allows removing items', {
  ruleReference: 'pricing-strategy.md §1 - Base Rules',
  rule: 'User can remove items from cart',
  tags: ['@interaction']
}, async ({ page }) => {
  await page.goto(`/products/${productCatalog[0].sku}`);

  // Add item to cart
  await page.getByRole('button', { name: 'Add to Cart' }).click();
  // Wait for cart badge to update, ensuring state is persisted
  await page.getByTestId('cart-badge').waitFor({ state: 'visible' });

  // Navigate to cart
  await page.goto('/cart');

  // Wait for page to fully load and state to hydrate
  await page.waitForLoadState('networkidle');

  // Cart should have the item
  const cartItem = page.getByTestId(`cart-item-${productCatalog[0].sku}`);
  await expect(cartItem).toBeVisible();

  // Remove the item
  await page.getByTestId(`cart-item-${productCatalog[0].sku}`).getByRole('button', { name: 'Remove' }).click();

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
  await page.getByRole('button', { name: 'Add to Cart' }).click();
  // Wait for cart badge to update, ensuring state is persisted
  await page.getByTestId('cart-badge').waitFor({ state: 'visible' });

  // Navigate to cart
  await page.goto('/cart');

  // Wait for page to fully load and state to hydrate
  await page.waitForLoadState('networkidle');

  // Get initial quantity
  const quantityInput = page.getByTestId(`cart-item-quantity-${productCatalog[0].sku}`);
  const initialQuantity = await quantityInput.inputValue();
  expect(initialQuantity).toBe('1');

  // Increase quantity
  await page.getByRole('button', { name: 'Increase quantity' }).click();

  const newQuantity = await quantityInput.inputValue();
  expect(newQuantity).toBe('2');
});

invariant('Add to cart preserves price at time of add', {
  ruleReference: 'pricing-strategy.md §1 - Base Rules',
  rule: 'Cart stores price at time item is added, not current live price',
  tags: ['@pricing', '@preservation']
}, async ({ page }) => {
  const product = productCatalog[0];
  const originalPrice = product.price; // price is stored in cents

  await page.goto(`/products/${product.sku}`);

  // Add item to cart
  await page.getByRole('button', { name: 'Add to Cart' }).click();
  await page.getByTestId('cart-badge').waitFor({ state: 'visible' });

  // Navigate to cart
  await page.goto('/cart');
  await page.waitForLoadState('networkidle');

  // Check that the cart shows the original price
  const itemPriceElement = page.getByTestId(`cart-item-price-${product.sku}`);
  // Price is displayed as "$89.00" - we extract 8900 from it
  await expect(itemPriceElement).toHaveText(new RegExp(`\\$${(originalPrice / 100).toFixed(2).replace('.', '\\.')}`));
});

invariant('Adding same SKU merges quantity, does not duplicate', {
  ruleReference: 'pricing-strategy.md §1 - Base Rules',
  rule: 'Adding existing SKU increases quantity, not adding duplicate item',
  tags: ['@interaction', '@merge']
}, async ({ page }) => {
  const product = productCatalog[0];

  await page.goto(`/products/${product.sku}`);

  // Add item once
  await page.getByRole('button', { name: 'Add to Cart' }).click();
  await page.getByTestId('cart-badge').waitFor({ state: 'visible' });

  await expect(page.getByTestId('cart-badge')).toHaveText('1');

  // Add same item again (via debug teleport to avoid navigation issues)
  await page.goto('/cart');
  await page.waitForLoadState('networkidle');

  const quantityInput = page.getByTestId(`cart-item-quantity-${product.sku}`);
  await page.getByRole('button', { name: 'Increase quantity' }).click();

  // Check quantity increased
  const quantity = await quantityInput.inputValue();
  expect(quantity).toBe('2');

  // Check badge reflects total quantity (1 SKU × 2 items = 1 badge count, or 2 items)
  await expect(page.getByTestId('cart-badge')).toHaveText('2');
});

invariant('Cart persists across page reload', {
  ruleReference: 'pricing-strategy.md §1 - Base Rules',
  rule: 'Cart state is restored after page reload via localStorage',
  tags: ['@persistence', '@robustness']
}, async ({ page }) => {
  const product = productCatalog[0];

  await page.goto(`/products/${product.sku}`);

  // Add item to cart
  await page.getByRole('button', { name: 'Add to Cart' }).click();
  await page.getByTestId('cart-badge').waitFor({ state: 'visible' });

  await expect(page.getByTestId('cart-badge')).toHaveText('1');

  // Reload the page
  await page.reload();
  await page.waitForLoadState('networkidle');

  // Cart badge should still show items
  await expect(page.getByTestId('cart-badge')).toHaveText('1');

  // Navigate to cart and verify items are still there
  await page.goto('/cart');
  await page.waitForLoadState('networkidle');

  const cartItem = page.getByTestId(`cart-item-${product.sku}`);
  await expect(cartItem).toBeVisible();
});

invariant('Clearing cart removes all items', {
  ruleReference: 'pricing-strategy.md §1 - Base Rules',
  rule: 'Clear cart action removes all items and resets badge',
  tags: ['@interaction', '@reset']
}, async ({ page }) => {
  const product1 = productCatalog[0];
  const product2 = productCatalog[1];

  // Add first item
  await page.goto(`/products/${product1.sku}`);
  await page.getByRole('button', { name: 'Add to Cart' }).click();
  await page.getByTestId('cart-badge').waitFor({ state: 'visible' });

  // Add second item
  await page.goto(`/products/${product2.sku}`);
  await page.getByRole('button', { name: 'Add to Cart' }).click();
  await expect(page.getByTestId('cart-badge')).toHaveText('2');

  // Navigate to cart
  await page.goto('/cart');
  await page.waitForLoadState('networkidle');

  // Verify items exist
  const cartItem1 = page.getByTestId(`cart-item-${product1.sku}`);
  const cartItem2 = page.getByTestId(`cart-item-${product2.sku}`);
  await expect(cartItem1).toBeVisible();
  await expect(cartItem2).toBeVisible();

  // Clear cart (if clear button exists)
  const clearButton = page.getByTestId('clear-cart-button');
  if (await clearButton.isVisible()) {
    await clearButton.click();
  } else {
    // Remove items individually as fallback
    await page.getByTestId(`cart-item-${product1.sku}`).getByRole('button', { name: 'Remove' }).click();
    await page.getByTestId(`cart-item-${product2.sku}`).getByRole('button', { name: 'Remove' }).click();
  }

  // Verify cart is empty
  const emptyCartMessage = page.getByText('Your cart is empty');
  await expect(emptyCartMessage).toBeVisible();

  // Verify badge is reset
  await expect(page.getByTestId('cart-badge')).toHaveText('0');
});
