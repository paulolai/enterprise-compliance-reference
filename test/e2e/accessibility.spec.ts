import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility Tests
 * 
 * Uses axe-core to automatically detect accessibility violations including:
 * - Heading hierarchy issues (WCAG 1.3.1)
 * - Missing alt text
 * - Color contrast issues
 * - Form label associations
 * - And more...
 * 
 * These are issues that should be caught by automated scanning,
 * not by exploratory testing.
 */

test.describe('Accessibility Scanning', () => {
  
  test('homepage passes accessibility scan', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    // Log violations for debugging
    if (accessibilityScanResults.violations.length > 0) {
      console.log('Accessibility violations found:');
      for (const violation of accessibilityScanResults.violations) {
        console.log(`  - ${violation.id}: ${violation.description}`);
        console.log(`    Impact: ${violation.impact}`);
        console.log(`    Help: ${violation.help}`);
        console.log(`    Nodes: ${violation.nodes.length}`);
      }
    }
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('products page passes accessibility scan', async ({ page }) => {
    await page.goto('/products');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    if (accessibilityScanResults.violations.length > 0) {
      console.log('Products page violations:');
      for (const violation of accessibilityScanResults.violations) {
        console.log(`  - ${violation.id}: ${violation.description}`);
      }
    }
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('product detail page passes accessibility scan', async ({ page }) => {
    await page.goto('/products/WIRELESS-EARBUDS');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    if (accessibilityScanResults.violations.length > 0) {
      console.log('Product detail page violations:');
      for (const violation of accessibilityScanResults.violations) {
        console.log(`  - ${violation.id}: ${violation.description}`);
      }
    }
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('cart page passes accessibility scan', async ({ page }) => {
    // Add an item first so cart has content
    await page.goto('/products/WIRELESS-EARBUDS');
    await page.getByTestId('add-to-cart').click();
    await page.getByTestId('cart-badge').waitFor({ state: 'visible' });
    
    await page.goto('/cart');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    if (accessibilityScanResults.violations.length > 0) {
      console.log('Cart page violations:');
      for (const violation of accessibilityScanResults.violations) {
        console.log(`  - ${violation.id}: ${violation.description}`);
      }
    }
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('checkout page passes accessibility scan', async ({ page }) => {
    // Add an item first
    await page.goto('/products/WIRELESS-EARBUDS');
    await page.getByTestId('add-to-cart').click();
    await page.getByTestId('cart-badge').waitFor({ state: 'visible' });
    
    await page.goto('/checkout');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    if (accessibilityScanResults.violations.length > 0) {
      console.log('Checkout page violations:');
      for (const violation of accessibilityScanResults.violations) {
        console.log(`  - ${violation.id}: ${violation.description}`);
      }
    }
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('404 page passes accessibility scan', async ({ page }) => {
    await page.goto('/definitely-not-a-real-page-404');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    if (accessibilityScanResults.violations.length > 0) {
      console.log('404 page violations:');
      for (const violation of accessibilityScanResults.violations) {
        console.log(`  - ${violation.id}: ${violation.description}`);
      }
    }
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
