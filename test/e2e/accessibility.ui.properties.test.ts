import { expect } from '@playwright/test';
import { invariant } from './fixtures/invariant-helper';

/**
 * Heading Hierarchy Invariants
 * 
 * WCAG 1.3.1 - Info and Relationships
 * Proper heading structure helps screen reader users navigate content
 * and understand the information architecture of the page.
 */

interface HeadingInfo {
  level: number;
  text: string;
}

/**
 * Validates that heading hierarchy doesn't skip levels
 * e.g., h1 -> h2 -> h3 is valid
 * e.g., h1 -> h3 (skips h2) is invalid
 */
function validateHeadingHierarchy(headings: HeadingInfo[]): { valid: boolean; violations: string[] } {
  const violations: string[] = [];
  let prevLevel = 0;

  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    
    // Check if heading level jumps more than 1 (e.g., h1 -> h3)
    if (heading.level > prevLevel + 1) {
      violations.push(
        `Heading "${heading.text}" (h${heading.level}) skips level from previous (h${prevLevel})`
      );
    }
    
    prevLevel = heading.level;
  }

  return {
    valid: violations.length === 0,
    violations
  };
}

invariant('Heading hierarchy has no skipped levels on homepage', {
  ruleReference: 'WCAG 2.1 - 1.3.1 Info and Relationships',
  rule: 'Headings must not skip levels (e.g., h1 directly to h3)',
  tags: ['@accessibility', '@wcag', '@critical']
}, async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Extract all headings from the page
  const headings = await page.evaluate((): HeadingInfo[] => {
    return Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
      .map(h => ({
        level: parseInt(h.tagName[1]),
        text: h.textContent?.trim().slice(0, 50) || '(no text)'
      }));
  });

  // Log headings for debugging
  console.log('Homepage headings:', headings);

  // Validate hierarchy
  const validation = validateHeadingHierarchy(headings);
  
  expect(validation.valid).toBe(true);
  if (!validation.valid) {
    console.error('Heading violations:', validation.violations);
  }
});

invariant('Heading hierarchy has no skipped levels on products page', {
  ruleReference: 'WCAG 2.1 - 1.3.1 Info and Relationships',
  rule: 'Headings must not skip levels (e.g., h1 directly to h3)',
  tags: ['@accessibility', '@wcag']
}, async ({ page }) => {
  await page.goto('/products');
  await page.waitForLoadState('networkidle');

  const headings = await page.evaluate((): HeadingInfo[] => {
    return Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
      .map(h => ({
        level: parseInt(h.tagName[1]),
        text: h.textContent?.trim().slice(0, 50) || '(no text)'
      }));
  });

  console.log('Products page headings:', headings);

  const validation = validateHeadingHierarchy(headings);
  expect(validation.valid).toBe(true);
  
  if (!validation.valid) {
    console.error('Heading violations:', validation.violations);
  }
});

invariant('Heading hierarchy has no skipped levels on cart page', {
  ruleReference: 'WCAG 2.1 - 1.3.1 Info and Relationships',
  rule: 'Headings must not skip levels (e.g., h1 directly to h3)',
  tags: ['@accessibility', '@wcag']
}, async ({ page }) => {
  await page.goto('/cart');
  await page.waitForLoadState('networkidle');

  const headings = await page.evaluate((): HeadingInfo[] => {
    return Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
      .map(h => ({
        level: parseInt(h.tagName[1]),
        text: h.textContent?.trim().slice(0, 50) || '(no text)'
      }));
  });

  console.log('Cart page headings:', headings);

  const validation = validateHeadingHierarchy(headings);
  expect(validation.valid).toBe(true);
  
  if (!validation.valid) {
    console.error('Heading violations:', validation.violations);
  }
});

invariant('Heading hierarchy has no skipped levels on checkout page', {
  ruleReference: 'WCAG 2.1 - 1.3.1 Info and Relationships',
  rule: 'Headings must not skip levels (e.g., h1 directly to h3)',
  tags: ['@accessibility', '@wcag', '@critical']
}, async ({ page }) => {
  await page.goto('/checkout');
  await page.waitForLoadState('networkidle');

  const headings = await page.evaluate((): HeadingInfo[] => {
    return Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
      .map(h => ({
        level: parseInt(h.tagName[1]),
        text: h.textContent?.trim().slice(0, 50) || '(no text)'
      }));
  });

  console.log('Checkout page headings:', headings);

  const validation = validateHeadingHierarchy(headings);
  expect(validation.valid).toBe(true);
  
  if (!validation.valid) {
    console.error('Heading violations:', validation.violations);
  }
});

invariant('Each page has exactly one h1 heading', {
  ruleReference: 'WCAG 2.1 - 1.3.1 Info and Relationships',
  rule: 'Each page must have exactly one h1 heading that describes the page content',
  tags: ['@accessibility', '@wcag', '@critical']
}, async ({ page }) => {
  const pages = ['/', '/products', '/cart', '/checkout'];
  
  for (const url of pages) {
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    
    const h1Count = await page.locator('h1').count();
    expect(h1Count, `Page ${url} should have exactly one h1, found ${h1Count}`).toBe(1);
    
    const h1Text = await page.locator('h1').textContent();
    expect(h1Text?.trim().length, `Page ${url} h1 should have content`).toBeGreaterThan(0);
  }
});
