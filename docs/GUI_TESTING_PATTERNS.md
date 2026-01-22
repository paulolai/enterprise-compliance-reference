# GUI Testing Patterns

This document defines the canonical patterns for GUI/E2E testing using **Playwright**. For framework-level concepts, see [Testing Framework Guide](TESTING_FRAMEWORK.md).

## Table of Contents
1. [Quick Start](#quick-start-first-test-in-5-minutes)
2. [Core Philosophy](#core-philosophy)
3. [Fixture Route Pattern](#fixture-route-pattern)
4. [The "Seam-Based" Setup Pattern](#the-seam-based-setup-pattern)
5. [Intent-Based Drivers](#intent-based-drivers)
6. [Visual Invariant Pattern](#visual-invariant-pattern)
7. [Visual Regression Testing](#visual-regression-testing)
8. [Complete Test File Example](#complete-test-file-example)
9. [Allure Reporting](#allure-reporting-for-gui-tests)
10. [Observability & Attestation](#observability--attestation)
11. [Anti-Patterns](#anti-patterns-to-reject)

---

## Quick Start: First Test in 5 Minutes

```typescript
// src/test/e2e/cart.ui.properties.test.ts
import { test, expect } from '@playwright/test';

test('Invariant: Cart total matches sum of line items', async ({ page }) => {
  // 1. Navigate to fixture route (debug state)
  await page.goto('/debug/cart-view?scenario=standard-cart');

  // 2. Query the UI using semantic selectors
  const grandTotal = await page.getByTestId('grand-total').textContent();
  const itemsTotal = await page.getByTestId('items-total').textContent();

  // 3. Assert business truth
  expect(grandTotal).toBe(itemsTotal);
});
```

**Key Concepts:**
- **Fixture Route:** `/debug/...` pages render specific test states
- **Semantic Selectors:** `getByTestId`, `getByRole`, `getByLabel` (not CSS)
- **Business Assertion:** Verify what matters, not DOM structure

---

## Core Philosophy

### 1. The UI is a Projection of State

For isolation, we do not rely on heavy frameworks like Storybook. Instead, we use **Fixture Routes** (or "Debug Routes") to render components, pages, or flows in specific states.

- **The Idea:** Create routes like `/debug/cart-view?scenario=vip-user` that are only available during development.
- **Critical Security Rule:** These routes **MUST** be conditionally included only when `import.meta.env.DEV` is true. They must **never** exist in the production bundle.
- **Why it wins:**
  - **Visual Debugging:** Developers and students can visit the URL to see the exact state being tested.
  - **Zero Setup:** All Providers (Auth, Router, Store) are already configured in the app's main entry point.
  - **Isolation:** You test the "Cart Page" without needing to navigate through the "Login" or "Catalog" pages.

### 2. Tests are "User Intent" Specifications

We verify **Business Capabilities**, not DOM structures.
- **Bad (Implementation):** `await page.click('#submit-btn')`
- **Good (Intent):** `await App.checkout.placeOrder(user)`

### 3. Velocity over Ceremony

- **Dev-Native:** Tests should run fast against your local dev server.
- **No Gherkin:** Write TypeScript.
- **Fluent Builders:** Use the shared `CartBuilder` to define scenarios concisely.

---

## Fixture Route Pattern

### Avoiding Hardcoded Routes

Instead of spreading route strings throughout tests, centralize them:

**Option A: Route Constants**
```typescript
// src/test/fixtures/routes.ts
export const DEBUG_ROUTES = {
  cartView: (params: { tenureYears?: number; scenario?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return `/debug/cart-view${qs ? '?' + qs : ''}`;
  },
  checkout: (scenario: string) => `/debug/checkout?scenario=${scenario}`
};

// Usage in tests
import { DEBUG_ROUTES } from './fixtures/routes';

test('Invariant: VIP Badge visible', async ({ page }) => {
  await page.goto(DEBUG_ROUTES.cartView({ tenureYears: 5 }));
  await expect(page.getByTestId('vip-badge')).toBeVisible();
});
```

**Option B: Fixture Builder (Fluent)**
```typescript
// src/test/fixtures/fixture-builder.ts
export const fixture = {
  cart: () => ({
    withUser: (tenureYears: number) => ({
      url: () => `/debug/cart-view?tenureYears=${tenureYears}`,
      goto: (page: Page) => page.goto(`/debug/cart-view?tenureYears=${tenureYears}`)
    })
  })
};

// Usage
test('Invariant: VIP Badge visible', async ({ page }) => {
  await fixture.cart().withUser(5).goto(page);
  await expect(page.getByTestId('vip-badge')).toBeVisible();
});
```

**Option C: Test Helper Functions**
```typescript
// src/test/fixtures/navigation.ts
export async function navigateToCartScenario(
  page: Page,
  scenario: 'vip-user' | 'new-user' | 'bulk-discount' | 'empty'
) {
  await page.goto(`/debug/cart-view?scenario=${scenario}`);
}

// Usage
test('Invariant: VIP Badge visible', async ({ page }) => {
  await navigateToCartScenario(page, 'vip-user');
  await expect(page.getByTestId('vip-badge')).toBeVisible();
});
```

### Security: Development-Only Routes

These "Cheats" are backdoor routes. You **MUST** ensure they never ship to production.

```typescript
// src/server/routes/debug.ts
// ✅ GOOD: Wrapped in Env Check
export const debugRouter = new Hono();

if (import.meta.env.DEV) {
  debugRouter.post('/seed-cart', async (c) => { ... });
  debugRouter.post('/reset-db', async (c) => { ... });
} else {
  // ⛔️ PROD: 404 Not Found
  debugRouter.all('*', (c) => c.notFound());
}
```

---

## The "Seam-Based" Setup Pattern

To keep tests fast and non-flaky, we "cheat" during setup. We use **Backend Seams** to establish preconditions instantly.

### The "Teleport" Method

If you are testing the **Checkout Logic**:
1. **Don't** visit the home page, search, add to cart, then go to cart.
2. **Do** POST a prepared cart to the API, then `page.goto('/checkout')`.

```typescript
test('Invariant: Free shipping applies > $100', async ({ page, request }) => {
  // 1. Build State (Pure Logic)
  const cart = CartBuilder.new()
    .withItem('HighValueItem', 15000)
    .build();

  // 2. Teleport (API Seam)
  await request.post('/api/debug/seed-cart', { data: cart });

  // 3. Verify (UI)
  await page.goto('/checkout');
  await expect(page.getByRole('status')).toHaveText('Free Shipping');
});
```

---

## Intent-Based Drivers

Avoid creating classes that mirror HTML files. Create "Drivers" that group **User Actions**.

```typescript
// drivers/checkout.driver.ts
export const checkoutDriver = (page: Page) => ({
  // The Intent
  selectShipping: async (method: string) => {
    await page.getByRole('radio', { name: method }).check();
  },

  // The Query (Answer a question)
  getGrandTotal: async () => {
    const text = await page.getByTestId('grand-total').textContent();
    return parseFloat(text!);
  }
});

// Usage
test('Invariant: Shipping cost reflects selection', async ({ page }) => {
  const checkout = checkoutDriver(page);
  await checkout.selectShipping('EXPRESS');
  expect(await checkout.getGrandTotal()).toBeGreaterThan(await checkout.getGrandTotal());
});
```

---

## Visual Invariant Pattern

Assert that the UI *truthfully* reflects the business domain.

```typescript
import { invariant } from './fixtures/invariant-helper';

invariant('VIP Badge visibility matches tenure', {
  ruleReference: 'pricing-strategy.md §3',
  rule: 'VIP badge shown for users with tenure > 2 years',
  tags: ['@critical']
},
// PBT Property
async (page, { user }) => {
  // Inject state
  await seedUserSession(page, user);

  // Assert visual truth
  const isVipVisible = await page.getByTestId('vip-badge').isVisible();
  expect(isVipVisible).toBe(user.tenureYears > 2);
}
);
```

---

## Visual Regression Testing

We use Visual Regression not just to catch CSS bugs, but as **Attestation Evidence**.

### Storage & Versioning
- **Location**: Snapshots are stored in `__snapshots__` directories next to the test files.
- **Git LFS**: All binary screenshots (`*.png`) **MUST** be tracked via Git LFS to prevent repo bloat.
  ```bash
  git lfs track "**/__snapshots__/**/*.png"
  ```
- **Naming with Traceability**: Include the rule reference from the business spec for full traceability.
  - **✅ Good:** `pricing-strategy-3.2-vip-badge-active.png` (links to §3.2 of pricing-strategy.md)
  - **✅ Also Good:** `vip-badge-active.png` (simple, component-focused)
  - **❌ Avoid:** `screenshot-1.png`, `test.png` (no semantic meaning)

### Scope: Targeted vs. Full Page

**Avoid Full Page Snapshots** for attestation. They are brittle and fail when unrelated parts of the page (like a footer) change.

- **✅ Good (Targeted):** Snapshot only the component relevant to the rule.
  ```typescript
  // Invariant: VIP Badge is visible
  const badge = page.getByTestId('vip-badge');
  await expect(badge).toHaveScreenshot('vip-badge-active.png');
  ```
- **❌ Bad (Broad):** Snapshot the entire viewport to check a badge.

### Assertion Strategy

Use Playwright's native `toHaveScreenshot()` with appropriate tolerance:

```typescript
await expect(component).toHaveScreenshot('component-name.png', {
  maxDiffPixelRatio: 0.01, // Allow 1% difference for font rendering nuances
});
```

**Tolerance Guidelines:**

| Component Type | Recommended Tolerance | Reason |
|----------------|----------------------|--------|
| **Text/Badges** | `0.01` (1%) | Font anti-aliasing creates small pixel differences |
| **Icons/Graphics** | `0` (exact) | SVG icons should render identically |
| **Complex UI** | `0.02` (2%) | Multi-element layouts may have subpixel positioning diffs |
| **Full Pages** | `0.03` (3%) | More elements = higher cumulative variance (but avoid full pages) |

### Cross-Platform Consistency (The "Docker Rule")

Fonts render differently on macOS, Windows, and Linux.

- **Rule**: The **Linux** rendering (CI Environment) is the Canonical Standard.
- **Workflow**:
  1. Run tests locally. If visuals fail due to OS differences, ignore them or use the Docker helper.
  2. To update snapshots: `npm run test:update-snapshots:docker`. This spins up a Linux container to generate the authoritative images.

### Attestation Integration

- **Trace**: When a visual check passes, log `Visual Evidence: [Image Name]` to the tracer.
- **Report**: The Attestation Report uses these confirmed paths to embed the "Golden Master" as evidence of compliance.

---

## Complete Test File Example

This example combines all patterns: fixture routes, API seams, intent drivers, visual regression, and attestation.

```typescript
// src/test/e2e/checkout.ui.properties.test.ts
import { test, expect } from '@playwright/test';
import { checkoutDriver } from '../drivers/checkout.driver';
import { seedCartSession } from '../fixtures/api-seams';
import { CartBuilder } from '../../../shared/fixtures/cart-builder';
import { tracer } from '../modules/tracer';

test.describe('Checkout Invariants', () => {
  test('Invariant: Grand total equals product total plus shipping', async ({ page, request }) => {
    // 1. Build State using shared CartBuilder
    const cart = CartBuilder.new()
      .withItem('laptop', 89900, 1)  // $899.00
      .withItem('earbuds', 8900, 3)   // $26.70 total, qualifies for bulk
      .build();

    const user = { email: 'test@example.com', tenureYears: 1 };

    // 2. Teleport via API Seam (fast setup)
    await seedCartSession(request, cart, user);

    // 3. Navigate to checkout
    await page.goto('/checkout');

    // 4. Use Intent-Based Driver for actions and queries
    const checkout = checkoutDriver(page);
    await checkout.selectShipping('STANDARD');

    // 5. Verify business truth
    const grandTotal = await checkout.getGrandTotal();
    const productTotal = await checkout.getProductTotal();
    const shipping = await checkout.getShippingCost();

    expect(productTotal + shipping).toBeCloseTo(grandTotal, 0.01);

    // 6. Visual Regression (targeted)
    const orderSummary = page.getByTestId('order-summary');
    await expect(orderSummary).toHaveScreenshot('checkout-standard-shipping.png', {
      maxDiffPixelRatio: 0.01
    });

    // 7. Attestation trace
    tracer.log('Invariant: Grand total equals product total plus shipping', {
      input: { cart, user },
      output: { grandTotal, productTotal, shipping },
      visualEvidence: 'checkout-standard-shipping.png'
    });
  });

  test('Invariant: VIP badge shown iff tenure > 2 years', async ({ page, request }) => {
    const cart = CartBuilder.new().withItem('laptop', 89900, 1).build();

    // Test VIP user
    await seedCartSession(request, cart, { email: 'vip@example.com', tenureYears: 4 });
    await page.goto('/checkout');

    const vipBadge = page.getByTestId('vip-badge');
    await expect(vipBadge).toBeVisible();
    await expect(vipBadge).toHaveScreenshot('vip-badge-visible.png', {
      maxDiffPixelRatio: 0
    });

    // Test regular user
    await seedCartSession(request, cart, { email: 'user@example.com', tenureYears: 1 });
    await page.goto('/checkout');

    await expect(vipBadge).toHaveCount(0);
  });
});
```

---

## Troubleshooting: Common Screenshot Failures

### "Screenshot mismatch due to anti-aliasing"
**Symptom:** Test fails with ~0.5-2% diff, visual check shows identical content.

**Solution:** Adjust tolerance based on component type:
```typescript
// For text-heavy components
maxDiffPixelRatio: 0.02  // Increase from 0.01
```

### "Font rendering differs on macOS vs Linux"
**Symptom:** Tests pass locally (macOS) but fail in CI (Linux).

**Solution:**
1. Run in Docker to match CI:
   ```bash
   npm run test:docker
   ```
2. Or increase tolerance for affected tests:
   ```typescript
   maxDiffPixelRatio: 0.02  // Platform-safe
   ```

### "Snapshot changes on unrelated UI update"
**Symptom:** Footer/header change breaks cart badge snapshot.

**Solution:**
1. Use **targeted snapshots** (snap only the component, not full page)
2. If full page is needed, use `clip` to focus on relevant area:
   ```typescript
   await expect(page).toHaveScreenshot('cart.png', {
     clip: { x: 0, y: 0, width: 800, height: 200 }  // Only top portion
   });
   ```

### "Timestamp/date values cause diffs"
**Symptom:** Tests fail due to dynamic content (time, dates).

**Solution:**
1. Mock dates in fixture routes
2. Or use `{ animations: 'disabled', caret: 'hide' }` snapshots:
   ```typescript
   await expect(page).toHaveScreenshot('cart.png', {
     animations: 'disabled',
     caret: 'hide'
   });
   ```

---

## Allure Reporting for GUI Tests

The `invariant()` test wrapper automatically generates Allure metadata for GUI tests. No manual configuration is needed in individual tests.

### Automatic Metadata Mapping

The `invariant()` helper in `src/test/e2e/fixtures/invariant-helper.ts` automatically:

1. **Derives Technical Hierarchy** from filename:
   ```typescript
   // cart.ui.properties.test.ts → Suite: "Cart"
   // checkout.ui.properties.test.ts → Suite: "Checkout"
   ```

2. **Maps Business Rule References** to Epic/Feature/Story:
   ```typescript
   {
     ruleReference: 'pricing-strategy.md §3 - VIP Tier',
     rule: 'VIP badge is visible for eligible users',
     tags: ['@vip', '@pricing']
   }
   ```
   → Epic: "3. VIP Tier", Story: "pricing-strategy.md §3 - VIP Tier"

3. **Attaches Screenshots** on failure automatically

### Viewing Reports

**Generate reports after running GUI tests:**

```bash
# Run GUI tests
cd implementations/react-playwright
npm test

# Generate Allure report (from root)
cd ../..
npm run reports:allure

# View Allure report
npm run reports:allure:open
# or live reload:
npm run reports:allure:serve

# Generate Attestation report for compliance
npm run reports:attestation
```

---

## Observability & Attestation

GUI tests must provide "Proof of Quality" just like API tests.

1. **Trace Business Steps**: Log "User added item", not "Clicked button X".
2. **Screenshots as Artifacts**: Auto-capture screenshots on failure and at key verification points.
3. **Network correlation**: Ensure failed tests dump the API response bodies to the log.

---

## Anti-Patterns to Reject

- ❌ **Sleeping**: Never use `await page.waitForTimeout(1000)`. Use Web-First Assertions (`toBeVisible()`).
- ❌ **XPath / CSS Selectors**: Avoid `div > span:nth-child(2)`. Use `getByRole`, `getByLabel`, or `getByTestId`.
- ❌ **Testing the Framework**: Don't test that React can render a `<div>`. Test that *Your Pricing Logic* rendered the correct number in that `<div>`.
- ❌ **UI Setup**: If a test takes 30 seconds because it clicks through the whole flow, it is wrong. Use Seams.
