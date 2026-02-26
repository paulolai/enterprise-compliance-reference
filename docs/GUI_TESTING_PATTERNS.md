# GUI Testing Patterns

This document defines the canonical patterns for GUI testing using **Playwright**.

## Philosophy: Testing User Behavior

We test the application from the user's perspective, focusing on what they see and interact with, rather than internal implementation details.

---

## 1. Use API Seams for State Setup

GUI tests should **never** set up complex state through the GUI (e.g., clicking through 5 pages to add items). Use "Backdoor" API routes to "Teleport" the app.

```typescript
// ✅ Good: Fast and stable
test('Checkout with VIP discount', async ({ page, request }) => {
  // Setup state via API
  await request.post('/api/debug/seed-session', {
    data: { 
      cart: [{ sku: 'IPAD', quantity: 1 }],
      user: { tenureYears: 5 }
    }
  });
  
  await page.goto('/checkout');
  await expect(page.getByText('VIP Discount Applied')).toBeVisible();
});
```

---

## 2. Intent-Based Locators

Avoid brittle CSS selectors (`#btn-01`) or XPath. Use **Accessible Roles** and **User Intents**.

```typescript
// ✅ Good: Semantic and robust
await page.getByRole('button', { name: 'Place Order' }).click();
await page.getByLabel('Shipping Address').fill('123 Main St');

// ❌ Bad: Implementation coupled
await page.locator('.btn-primary').nth(2).click();
```

---

## 3. Visual Regression

For layouts where pixel-perfection matters (e.g., PDF reports, complex dashboards), use screenshots.

```typescript
await expect(page).toHaveScreenshot('invoice-layout.png');
```

---

## 4. Network Mocking Strategy

- **Internal APIs**: Let them run (Sociable Testing).
- **External APIs (Stripe/Auth0)**: Use Playwright **HAR Record/Replay**. This ensures you are testing against "Cached Reality" rather than a manual guess of their schema.

```typescript
// Record if HAR doesn't exist, otherwise replay
await page.routeFromHAR('./test/fixtures/stripe-success.har', {
  url: 'https://api.stripe.com/**',
  update: !process.env.CI
});
```
