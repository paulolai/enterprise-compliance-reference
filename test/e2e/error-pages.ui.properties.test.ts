import { expect } from '@playwright/test';
import { invariant } from './fixtures/invariant-helper';

/**
 * Error Page Invariants
 * 
 * Ensures proper handling of 404 and other error states
 * - Provides helpful navigation options
 * - Maintains brand consistency
 * - Returns appropriate HTTP status
 */

invariant('Non-existent routes display 404 error page', {
  ruleReference: 'UX Standards - Error Handling',
  rule: '404 errors must show branded error page with navigation options, not homepage',
  tags: ['@ux', '@error-handling', '@critical']
}, async ({ page }) => {
  const nonExistentPaths = [
    '/page-does-not-exist',
    '/products/INVALID-SKU-12345',
    '/admin/secret',
    '/api/v999/resource'
  ];

  for (const path of nonExistentPaths) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');

    // Check that we're NOT on the homepage
    const url = page.url();
    expect(url).toContain(path); // URL should remain the invalid path

    // Check for 404 indicators
    const pageContent = await page.content();
    
    // Should contain 404-related text OR error messaging
    const has404Content = 
      pageContent.includes('404') ||
      pageContent.includes('Not Found') ||
      pageContent.includes('not found') ||
      pageContent.includes('Page Not Found') ||
      pageContent.includes('does not exist') ||
      pageContent.includes('Error');
    
    // Log what we found for debugging
    const h1Text = await page.locator('h1').textContent().catch(() => 'No h1 found');
    console.log(`Path ${path}: h1="${h1Text?.trim()}", has404Content=${has404Content}`);

    // Should show error messaging, not homepage content
    expect(has404Content || h1Text?.toLowerCase().includes('not found') || h1Text?.toLowerCase().includes('error')).toBe(true);
    
    // Should NOT show main homepage content (hero section with "Welcome")
    const hasWelcomeHero = await page.getByRole('heading', { name: /welcome to/i }).isVisible().catch(() => false);
    expect(hasWelcomeHero).toBe(false);
  }
});

invariant('404 page provides helpful navigation options', {
  ruleReference: 'UX Standards - Error Recovery',
  rule: '404 page must provide clear navigation back to main site sections',
  tags: ['@ux', '@error-handling']
}, async ({ page }) => {
  await page.goto('/non-existent-page');
  await page.waitForLoadState('networkidle');

  // Should have navigation options
  const hasHomeLink = await page.getByRole('link', { name: /home/i }).isVisible().catch(() => false);
  const hasProductsLink = await page.getByRole('link', { name: /products|shop/i }).isVisible().catch(() => false);
  const hasBackButton = await page.getByRole('button', { name: /back/i }).isVisible().catch(() => false);
  
  // At minimum, should have main navigation visible
  const hasMainNav = await page.locator('nav').isVisible().catch(() => false);
  
  console.log('404 Navigation options:', { hasHomeLink, hasProductsLink, hasBackButton, hasMainNav });
  
  // Navigation should be available
  expect(hasHomeLink || hasProductsLink || hasBackButton || hasMainNav).toBe(true);
});

invariant('404 page maintains brand consistency', {
  ruleReference: 'UX Standards - Brand Consistency',
  rule: 'Error pages must maintain brand styling and not show framework defaults',
  tags: ['@ux', '@branding']
}, async ({ page }) => {
  await page.goto('/does-not-exist');
  await page.waitForLoadState('networkidle');

  // Should have the site logo or brand name
  const hasLogo = await page.locator('header img, [data-testid="logo"]').isVisible().catch(() => false);
  const hasBrandName = await page.getByText(/TechHome|Premium Electronics/i).first().isVisible().catch(() => false);
  
  // Should NOT have generic browser error or framework default text
  const pageContent = await page.content();
  const hasGenericError = 
    pageContent.includes('Cannot GET') ||
    pageContent.includes('Cannot POST') ||
    pageContent.includes('Express') ||
    pageContent.includes('Error: ENOENT');
  
  console.log('Brand consistency:', { hasLogo, hasBrandName, hasGenericError });
  
  expect(hasGenericError).toBe(false);
  expect(hasLogo || hasBrandName).toBe(true);
});

invariant('Invalid product SKUs show appropriate error state', {
  ruleReference: 'UX Standards - Data Validation',
  rule: 'Invalid product pages should show helpful "product not found" message',
  tags: ['@ux', '@data-integrity']
}, async ({ page }) => {
  const invalidSkus = [
    '/products/INVALID',
    '/products/NONEXISTENT-123',
    '/products/<>',
    '/products/test<script>alert(1)</script>'
  ];

  for (const skuPath of invalidSkus) {
    await page.goto(skuPath);
    await page.waitForLoadState('networkidle');

    // Should show error state or redirect gracefully
    const content = await page.content();
    const url = page.url();
    
    // Either shows error on same page OR redirects to products listing
    const showsError = 
      content.toLowerCase().includes('not found') ||
      content.toLowerCase().includes('product not found') ||
      content.toLowerCase().includes('does not exist');
    
    const redirectsToProducts = url === '/products' || url.includes('/products?');
    
    console.log(`Invalid SKU ${skuPath}: showsError=${showsError}, redirectsToProducts=${redirectsToProducts}`);
    
    // Should handle gracefully one way or another
    expect(showsError || redirectsToProducts).toBe(true);
  }
});
