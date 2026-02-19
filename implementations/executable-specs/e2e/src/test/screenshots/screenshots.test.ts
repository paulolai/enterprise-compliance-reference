import { test } from '@playwright/test';

test.describe('UI Screenshots', () => {
  test('homepage screenshot', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/homepage.png', fullPage: true });
  });

  test('products page screenshot', async ({ page }) => {
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/products.png', fullPage: true });
  });

  test('product detail screenshot', async ({ page }) => {
    await page.goto('/products/WIRELESS-EARBUDS');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/product-detail.png', fullPage: true });
  });

  test('cart page empty screenshot', async ({ page }) => {
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/cart-empty.png', fullPage: true });
  });

  test('cart page with items screenshot', async ({ page }) => {
    // Add item to cart
    await page.goto('/products/WIRELESS-EARBUDS');
    await page.getByRole('button', { name: 'Add to Cart' }).click();
    await page.waitForTimeout(500);
    
    // Add another item
    await page.goto('/products/SMART-WATCH');
    await page.getByRole('button', { name: 'Add to Cart' }).click();
    await page.waitForTimeout(500);
    
    // Go to cart
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/cart-with-items.png', fullPage: true });
  });

  test('checkout page screenshot', async ({ page }) => {
    // Add item to cart first
    await page.goto('/products/LAPTOP-PRO');
    await page.getByRole('button', { name: 'Add to Cart' }).click();
    await page.waitForTimeout(500);
    
    // Go to checkout
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/checkout.png', fullPage: true });
  });

  test('login page screenshot', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/login.png', fullPage: true });
  });
});
