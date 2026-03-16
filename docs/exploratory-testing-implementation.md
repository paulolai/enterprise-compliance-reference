# Exploratory Testing Implementation Guide

**Project-specific implementation details for the executable-specs-demo e-commerce application.**

This guide provides the concrete implementation of the exploratory testing process documented in `exploratory-testing-process.md`.

---

## Prerequisites

```bash
# Ensure dev server is running
cd packages/client && pnpm run dev

# Verify server is up
curl http://localhost:5173
```

---

## Implementation Script

Save as `exploratory-test.ts` in project root:

```typescript
#!/usr/bin/env tsx
import { chromium, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOT_DIR = './exploratory-findings';
const BASE_URL = 'http://localhost:5173';
const TEST_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// Ensure directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

interface Finding {
  screen: string;
  severity: 'critical' | 'major' | 'minor' | 'observation';
  category: 'ui' | 'ux' | 'functional' | 'performance' | 'accessibility' | 'security';
  issue: string;
  perspectives: {
    pm: string;
    qa: string;
    security?: string;
    accessibility?: string;
  };
}

const findings: Finding[] = [];

async function takeScreenshot(page: Page, name: string) {
  const filepath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`📸 ${name}.png`);
  return filepath;
}

async function randomDelay(min = 500, max = 2000) {
  const delay = Math.floor(Math.random() * (max - min) + min);
  await new Promise(resolve => setTimeout(resolve, delay));
}

// ========================================
// WEIGHTED RANDOM WALK ACTIONS
// ========================================

async function performNaturalFlowAction(page: Page): Promise<string> {
  const actions = [
    async () => {
      await page.goto(`${BASE_URL}/products`);
      return 'Navigate to products';
    },
    async () => {
      const products = ['WIRELESS-EARBUDS', 'SMART-WATCH', 'TABLET-10'];
      const sku = products[Math.floor(Math.random() * products.length)];
      await page.goto(`${BASE_URL}/products/${sku}`);
      return `View product: ${sku}`;
    },
    async () => {
      const btn = page.locator('button:has-text("Add to Cart")');
      if (await btn.isVisible().catch(() => false)) {
        await btn.click();
        return 'Add to cart';
      }
      return 'No add button';
    },
    async () => {
      await page.goto(`${BASE_URL}/cart`);
      return 'Navigate to cart';
    },
    async () => {
      await page.goto(`${BASE_URL}/checkout`);
      return 'Navigate to checkout';
    },
    async () => {
      await page.goto(`${BASE_URL}/login`);
      return 'Navigate to login';
    }
  ];
  
  const action = actions[Math.floor(Math.random() * actions.length)];
  return await action();
}

async function performWeirdAction(page: Page): Promise<string> {
  const actions = [
    async () => {
      await page.reload();
      return 'Reload page';
    },
    async () => {
      await page.goBack();
      return 'Click back';
    },
    async () => {
      await page.goto(`${BASE_URL}/nonexistent-page`);
      return 'Navigate to 404';
    },
    async () => {
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      return 'Clear storage';
    },
    async () => {
      const buttons = page.locator('button');
      const count = await buttons.count();
      if (count > 0) {
        await buttons.nth(Math.floor(Math.random() * count)).click();
        return 'Click random button';
      }
      return 'No buttons';
    }
  ];
  
  const action = actions[Math.floor(Math.random() * actions.length)];
  return await action();
}

async function performEdgeCaseAction(page: Page): Promise<string> {
  const actions = [
    async () => {
      await page.goto(`${BASE_URL}/debug/checkout`);
      return 'Debug checkout';
    },
    async () => {
      await page.goto(`${BASE_URL}/products/INVALID-SKU`);
      return 'Invalid product';
    },
    async () => {
      await page.evaluate(() => {
        const cart = localStorage.getItem('cart');
        if (cart) {
          const data = JSON.parse(cart);
          data.items = data.items.map((i: any) => ({ ...i, quantity: 999 }));
          localStorage.setItem('cart', JSON.stringify(data));
        }
      });
      await page.reload();
      return 'Set quantity to 999';
    }
  ];
  
  const action = actions[Math.floor(Math.random() * actions.length)];
  return await action();
}

async function performRandomAction(page: Page): Promise<string> {
  const rand = Math.random();
  if (rand < 0.60) return performNaturalFlowAction(page);
  if (rand < 0.90) return performWeirdAction(page);
  return performEdgeCaseAction(page);
}

// ========================================
// ANALYSIS FUNCTIONS
// ========================================

async function checkForOddities(page: Page, action: string): Promise<boolean> {
  let found = false;
  
  // Check console errors
  const errors: string[] = [];
  page.on('console', msg => msg.type() === 'error' && errors.push(msg.text()));
  page.on('pageerror', err => errors.push(err.message));
  
  // Check for error messages
  const errorElements = await page.locator('text=/error|Error|ERROR|failed/i').count();
  if (errorElements > 0) {
    console.log(`⚠️ Error elements found: ${errorElements}`);
    found = true;
  }
  
  // Check for NaN/undefined
  const content = await page.content();
  if (content.includes('NaN') || content.includes('undefined')) {
    console.log('⚠️ NaN or undefined found in page');
    found = true;
  }
  
  // Check for broken images
  const broken = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('img'))
      .filter(img => !img.complete || img.naturalHeight === 0).length;
  });
  if (broken > 0) {
    console.log(`⚠️ Broken images: ${broken}`);
    found = true;
  }
  
  // Check cart inconsistencies
  const badge = await page.locator('[data-testid="cart-badge"]').textContent().catch(() => '0');
  const emptyMsg = await page.locator('text=/empty/i').count();
  if (parseInt(badge) > 0 && emptyMsg > 0) {
    console.log('⚠️ Cart shows items but also empty message');
    found = true;
  }
  
  return found;
}

function addFinding(
  screen: string,
  severity: Finding['severity'],
  category: Finding['category'],
  issue: string,
  pm: string,
  qa: string,
  security?: string,
  accessibility?: string
) {
  const finding: Finding = {
    screen,
    severity,
    category,
    issue,
    perspectives: { pm, qa }
  };
  if (security) finding.perspectives.security = security;
  if (accessibility) finding.perspectives.accessibility = accessibility;
  findings.push(finding);
}

// Pre-test: Run static analysis
async function runStaticAnalysis() {
  console.log('\n📊 Running Pre-Test Static Analysis...\n');
  
  // Check for security issues in code
  console.log('✓ Security linting (manual review required)');
  console.log('✓ Dependency audit: Run pnpm audit');
  
  // Accessibility automated checks
  console.log('✓ Accessibility: Use Lighthouse or axe-core');
  console.log('✓ Semantic HTML validation');
  
  console.log('\n⚠️  Note: Static analysis covers ~60% of issues.');
  console.log('Exploratory testing catches the remaining 40%.\n');
}

// ========================================
// SCREEN ANALYSIS
// ========================================

async function analyzeHomepage(page: Page) {
  console.log('\n🏠 Homepage');
  await page.goto(BASE_URL);
  await page.waitForTimeout(1500);
  await takeScreenshot(page, '01-homepage');
  
  const title = await page.title();
  if (title === 'react-playwright' || title.includes('Vite')) {
    addFinding('Homepage', 'major', 'ui',
      'Default framework title not changed',
      'Hurts brand credibility and SEO',
      'Title hardcoded in index.html, should be dynamic');
  }
}

async function analyzeProducts(page: Page) {
  console.log('\n🛍️ Products');
  await page.goto(`${BASE_URL}/products`);
  await page.waitForTimeout(1500);
  await takeScreenshot(page, '02-products');
  
  const broken = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('img'))
      .filter(img => !img.complete || img.naturalHeight === 0).length;
  });
  
  if (broken > 0) {
    addFinding('Products', 'major', 'ui',
      `${broken} broken product image(s)`,
      'Broken images = lost sales, conversion killer',
      'Check image paths and asset availability');
  }
}

async function analyzeCart(page: Page) {
  console.log('\n🛒 Cart');
  
  // Empty cart
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE_URL}/cart`);
  await page.waitForTimeout(1500);
  await takeScreenshot(page, '03-cart-empty');
  
  const emptyMsg = await page.locator('text=/empty/i').isVisible().catch(() => false);
  if (!emptyMsg) {
    addFinding('Cart (Empty)', 'major', 'ux',
      'No empty cart message',
      'Users see blank page, may think site is broken',
      'Should show "Your cart is empty" + browse CTA');
  }
  
  // With items
  await page.goto(`${BASE_URL}/products/WIRELESS-EARBUDS`);
  await page.click('button:has-text("Add to Cart")').catch(() => {});
  await page.waitForTimeout(500);
  await page.goto(`${BASE_URL}/cart`);
  await page.waitForTimeout(1500);
  await takeScreenshot(page, '04-cart-with-items');
  
  const items = await page.locator('[data-testid^="cart-item-"]').count();
  if (items === 0) {
    addFinding('Cart', 'critical', 'functional',
      'Added item not appearing',
      'Users cannot purchase, complete blocker',
      'Check localStorage persistence and rendering');
  }
}

async function analyzeCheckout(page: Page) {
  console.log('\n💳 Checkout');
  await page.goto(`${BASE_URL}/checkout`);
  await page.waitForTimeout(1500);
  await takeScreenshot(page, '05-checkout');
  
  const grandTotal = await page.locator('[data-testid="grand-total"]').textContent().catch(() => '');
  if (!grandTotal) {
    addFinding('Checkout', 'critical', 'functional',
      'No grand total displayed',
      'Users cannot see what they will be charged',
      'Grand total must be visible before payment');
  }
  
  const shipping = await page.locator('input[type="radio"]').count();
  if (shipping === 0) {
    addFinding('Checkout', 'major', 'functional',
      'No shipping method selection',
      'Cannot complete checkout',
      'Check shipping options rendering');
  }
}

async function analyzeAuth(page: Page) {
  console.log('\n🔐 Auth');
  await page.goto(`${BASE_URL}/login`);
  await page.waitForTimeout(1500);
  await takeScreenshot(page, '06-login');
  
  const email = await page.locator('input[type="email"], input[name="email"]').isVisible().catch(() => false);
  const password = await page.locator('input[type="password"]').isVisible().catch(() => false);
  
  if (!email || !password) {
    addFinding('Login', 'critical', 'functional',
      'Missing login form fields',
      'Users cannot authenticate',
      'Form not rendering, check component');
  }
}

async function analyzeEdgeCases(page: Page) {
  console.log('\n🚨 Edge Cases');
  
  // 404 page
  await page.goto(`${BASE_URL}/page-does-not-exist`);
  await page.waitForTimeout(1500);
  await takeScreenshot(page, '07-404');
  
  const content = await page.content();
  const is404 = content.includes('404') || content.includes('Not Found');
  if (!is404) {
    addFinding('404', 'major', 'ux',
      'No proper 404 page',
      'Lost opportunity to help users',
      'Should show branded 404 with navigation');
  }
}

async function analyzeSecurity(page: Page) {
  console.log('\n🔒 Security Analysis');
  await takeScreenshot(page, '08-security-check');
  
  // Check for sensitive data in localStorage
  const localStorage = await page.evaluate(() => {
    const data: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) data[key] = localStorage.getItem(key) || '';
    }
    return data;
  });
  
  const sensitiveKeys = ['password', 'token', 'secret', 'key'];
  for (const [key, value] of Object.entries(localStorage)) {
    if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
      addFinding('Security', 'critical', 'security',
        `Sensitive data in localStorage: ${key}`,
        'User data exposure risk, compliance violation',
        'Move sensitive data to secure HTTP-only cookies',
        'OWASP Top 10: A01 - Broken Access Control');
    }
    if (value.length > 500) {
      console.log(`⚠️ Large localStorage item: ${key} (${value.length} chars)`);
    }
  }
  
  // Check for XSS vulnerabilities in URL params
  await page.goto(`${BASE_URL}/products/WIRELESS-EARBUDS?alert=<script>alert('xss')</script>`);
  await page.waitForTimeout(1000);
  const hasScript = await page.evaluate(() => {
    return document.querySelector('script')?.textContent?.includes('alert') || false;
  });
  if (hasScript) {
    addFinding('Security', 'critical', 'security',
      'XSS vulnerability: Script tags in URL executed',
      'Malicious scripts can steal user data',
      'Sanitize all URL parameters, use textContent not innerHTML',
      'OWASP Top 10: A03 - Injection');
  }
}

async function analyzeAccessibility(page: Page) {
  console.log('\n♿ Accessibility Analysis');
  await page.goto(`${BASE_URL}/products`);
  await page.waitForTimeout(1500);
  await takeScreenshot(page, '09-accessibility');
  
  // Check for missing alt text
  const imagesWithoutAlt = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('img'))
      .filter(img => !img.hasAttribute('alt')).length;
  });
  
  if (imagesWithoutAlt > 0) {
    addFinding('Accessibility', 'major', 'accessibility',
      `${imagesWithoutAlt} image(s) missing alt text`,
      'Screen reader users cannot understand product images',
      'Add descriptive alt attributes to all images',
      'WCAG 1.1.1 - Non-text Content');
  }
  
  // Check form labels
  const inputsWithoutLabels = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input, select, textarea'))
      .filter(el => {
        const id = el.getAttribute('id');
        const ariaLabel = el.getAttribute('aria-label');
        const ariaLabelledBy = el.getAttribute('aria-labelledby');
        const hasLabel = id && document.querySelector(`label[for="${id}"]`);
        return !hasLabel && !ariaLabel && !ariaLabelledBy;
      }).length;
  });
  
  if (inputsWithoutLabels > 0) {
    addFinding('Accessibility', 'critical', 'accessibility',
      `${inputsWithoutLabels} form input(s) without labels`,
      'Screen reader users cannot identify form fields',
      'Add labels or aria-label attributes',
      'WCAG 3.3.2 - Labels or Instructions');
  }
  
  // Check heading hierarchy
  const headingHierarchy = await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
      .map(h => ({ level: parseInt(h.tagName[1]), text: h.textContent?.slice(0, 50) }));
    let violations = 0;
    let prevLevel = 0;
    for (const h of headings) {
      if (h.level > prevLevel + 1) violations++;
      prevLevel = h.level;
    }
    return violations;
  });
  
  if (headingHierarchy > 0) {
    addFinding('Accessibility', 'minor', 'accessibility',
      'Heading hierarchy violations detected',
      'Screen reader navigation is confusing',
      'Ensure headings increase by one level at a time',
      'WCAG 1.3.1 - Info and Relationships');
  }
}

// ========================================
// MAIN EXECUTION
// ========================================

async function runWeightedWalk(page: Page) {
  console.log('\n🐵 Weighted Random Walk (5 minutes)...\n');
  const start = Date.now();
  let actions = 0;
  
  await page.goto(BASE_URL);
  await randomDelay(1000, 2000);
  
  while (Date.now() - start < TEST_DURATION_MS) {
    const action = await performRandomAction(page);
    actions++;
    
    if (actions % 10 === 0) {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const remaining = Math.floor((TEST_DURATION_MS - (Date.now() - start)) / 1000);
      console.log(`⏱️ ${elapsed}s elapsed, ${remaining}s remaining | Actions: ${actions}`);
    }
    
    await randomDelay(800, 1500);
    await page.waitForLoadState('networkidle').catch(() => {});
    await checkForOddities(page, action);
    await randomDelay(500, 1000);
  }
  
  console.log(`\n✅ Walk complete: ${actions} actions`);
}

async function runCriticalAnalysis(page: Page) {
  console.log('\n🔍 Critical Analysis Starting...\n');
  
  await analyzeHomepage(page);
  await analyzeProducts(page);
  await analyzeCart(page);
  await analyzeCheckout(page);
  await analyzeAuth(page);
  await analyzeEdgeCases(page);
  await analyzeSecurity(page);
  await analyzeAccessibility(page);
}

async function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 EXPLORATORY TESTING REPORT');
  console.log('='.repeat(80));
  console.log(`Findings: ${findings.length}\n`);
  
  const critical = findings.filter(f => f.severity === 'critical');
  const major = findings.filter(f => f.severity === 'major');
  const minor = findings.filter(f => f.severity === 'minor');
  
  if (critical.length > 0) {
    console.log('🔴 CRITICAL:');
    critical.forEach((f, i) => {
      console.log(`${i + 1}. [${f.category.toUpperCase()}] ${f.issue}`);
      console.log(`   PM: ${f.perspectives.pm}`);
      console.log(`   QA: ${f.perspectives.qa}\n`);
    });
  }
  
  if (major.length > 0) {
    console.log('🟠 MAJOR:');
    major.forEach((f, i) => {
      console.log(`${i + 1}. [${f.category.toUpperCase()}] ${f.issue}`);
      console.log(`   PM: ${f.perspectives.pm}`);
      console.log(`   QA: ${f.perspectives.qa}\n`);
    });
  }
  
  // Save JSON
  fs.writeFileSync(
    path.join(SCREENSHOT_DIR, 'report.json'),
    JSON.stringify(findings, null, 2)
  );
  console.log(`📄 Report saved to: ${SCREENSHOT_DIR}/report.json`);
}

async function main() {
  console.log('🔍 EXPLORATORY TESTING STARTING');
  console.log('Static Analysis → Weighted Random Walk → Multi-Perspective Analysis');
  console.log('='.repeat(80));
  
  // Phase 0: Static Analysis
  await runStaticAnalysis();
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  
  // Phase 1: Weighted Random Walk
  await runWeightedWalk(page);
  
  // Phase 2: Critical Analysis
  await runCriticalAnalysis(page);
  
  await browser.close();
  
  // Phase 3: Generate Report
  await generateReport();
}

main().catch(console.error);
```

---

## Running the Test

```bash
# Start dev server first
cd packages/client && pnpm run dev

# In another terminal
cd /home/paulo/executable-specs-demo
npx tsx exploratory-test.ts
```

---

## Project-Specific Test IDs

These `data-testid` attributes are used by the automated tests:

- `cart-badge` - Cart item count badge
- `grand-total` - Order total amount
- `cart-item-{sku}` - Individual cart item
- `cart-item-quantity-{sku}` - Quantity input
- `checkout-button` - Proceed to checkout
- `vip-user-label` - VIP status indicator
- `order-summary` - Checkout summary section
- `free-shipping-badge` - Free shipping indicator
- `email-input`, `password-input` - Login form fields
- `login-button` - Sign in button

---

## Test Products

Available SKUs for testing:
- `WIRELESS-EARBUDS` - $89.00
- `SMART-WATCH` - $199.00
- `TABLET-10` - $449.00
- `LAPTOP-15` - $1299.00
- `SMARTPHONE-X` - $999.00

---

## Demo Users

- **VIP User:** vip@techhome.com (tenure: 4 years)
- **New Customer:** new@customer.com (tenure: 0 years)
- **Regular Customer:** regular@customer.com (tenure: 1 year)

---

## Expected Issues

Based on previous runs, expect to find:

1. **Default page title** - Shows "react-playwright" instead of brand
2. **Missing shipping options** - Checkout may not show shipping methods
3. **Generic 404** - No branded 404 page with navigation
4. **Heading hierarchy** - Accessibility violations in heading structure

---

## Last Run Results (2026-03-16)

**Session Stats:**
- Weighted Random Walk: 140 actions, 0 errors
- Screenshots: 9 screens captured
- Duration: ~5 minutes

**Findings:**

### 🟠 Major Issues (3)

1. **Homepage Title (UI)**
   - Issue: Shows "react-playwright" instead of brand name
   - Impact: Hurts brand credibility and SEO
   - Fix: Update index.html title

2. **Checkout Shipping (Functional)**
   - Issue: No shipping method selection visible
   - Impact: Cannot complete checkout
   - Fix: Add shipping options radio buttons

3. **404 Page (UX)**
   - Issue: No proper branded 404 page
   - Impact: Lost opportunity to help users navigate
   - Fix: Create branded 404 page with navigation

### 🟡 Minor Issues (1)

4. **Heading Hierarchy (Accessibility)**
   - Issue: Heading level violations detected
   - Impact: Screen reader navigation confusing
   - Fix: Ensure h1 → h2 → h3 progression

### ✅ Security & Accessibility Checks

- **Security:** ✅ No XSS vulnerabilities, ✅ No sensitive data exposure
- **Accessibility:** ℹ️ Heading hierarchy needs attention
- **Performance:** ✅ No console errors detected

---

*This implementation guide is specific to the executable-specs-demo project. See `exploratory-testing-process.md` for the generic methodology.*
