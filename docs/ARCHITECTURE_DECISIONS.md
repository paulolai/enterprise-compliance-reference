# Architecture Decision Records (ADR)

This repository is an opinionated reference architecture. We have made specific, non-standard choices to optimize for **Velocity** and **Compliance**.

This document explains the *Why* behind these decisions, and what alternatives were rejected.

---

## 1. Rejection of the Page Object Model (POM)

### The Decision
We avoid Class-based Page Objects that mirror the DOM structure.
Instead, we use **Intent-Based Drivers** (Functional Composition) and **Fluent Builders** for state.

### Why?
*   **The Problem with POM:** Page Objects often become "God Classes" that mix *Locators* (HTML structure), *Actions* (Clicking), and *Assertions* (Business Logic). They encourage coupling tests to the page layout rather than user intent.
*   **The Solution:**
    *   **Drivers:** Small, functional helpers that expose *User Intents* (e.g., `checkout.selectShipping()`) rather than *Page Mechanics* (e.g., `page.click('#shipping')`).
    *   **Builders:** Separates *Data Setup* (`CartBuilder`) from *Page Interaction* (`PageBuilder`).

### Code Comparison

**Legacy POM (Avoid):**
```typescript
class CartPage {
  get submitBtn() { return page.locator('#submit'); }
  async checkout() { await this.submitBtn.click(); } // Tightly coupled to DOM
}
```

**Intent-Driver (Preferred):**
```typescript
const checkoutDriver = (page: Page) => ({
  placeOrder: async () => await page.getByRole('button', { name: 'Place Order' }).click()
});
```

---

## 2. Rejection of Gherkin (Cucumber)

### The Decision
We explicitly reject Gherkin/Cucumber layers.
We use **TypeScript as the Specification Language**.

### Why?
*   **The "Translation Tax":** Gherkin requires maintaining a regex mapping layer (`steps.ts`) between English and Code. This layer is expensive, brittle, and rarely read by stakeholders.
*   **Type Safety:** Gherkin text has no type safety. `Given I have 5 items` passes a string "5" to code that expects a number.
*   **Refactoring:** Renaming a business concept in TypeScript is one `F2` keypress. In Gherkin, it's a grep/sed nightmare.

### The Alternative
We use **Attestation Reporting** to generate the "English" view from the code metadata, rather than writing English to generate code execution.

---

## 3. Network Mocking Strategy: The "Split Brain"

### The Decision
We strictly distinguish between **Internal APIs** (mocked via Contract-First logic) and **External APIs** (mocked via Record/Replay).

### Why?
*   **Internal APIs:** We control them. We use MSW to *simulate* the logic (e.g., "If cart > $100, return free shipping"). This allows testing business rules before the backend exists (ATDD).
*   **External APIs:** We do *not* control Stripe/Auth0. Hand-writing mocks for them is dangerous because their API might change. We use **Playwright HAR** (Record/Replay) to capture real traffic and replay it, ensuring we test against reality.

---

## 4. Dual-View Reporting

### The Decision
We generate a custom HTML report that pivots the same test results into two views: **Technical** (Architecture) and **Business** (Goals).

### Why?
*   **Audience Gap:** Developers care about *Components* (Cart, Pricing). Stakeholders care about *Goals* (Revenue, Compliance).
*   **Single Source of Truth:** We don't want separate reports. One execution should satisfy both Engineering (Debuggability) and Product (Confidence).

---

## 5. "Seam-Based" State Management

### The Decision
GUI tests never set up state through the GUI if an API exists.
We use **API Seams** (Backdoor Routes) to "Teleport" the application into the desired state.

### Why?
*   **Speed:** Creating a user via UI takes 5s. Creating via API takes 50ms.
*   **Stability:** If the "Login Page" is broken, we shouldn't fail the "Checkout" tests.
*   **Isolation:** We test the *Checkout*, not the *User Journey to reach Checkout*.

```typescript
// Pattern
await api.post('/seed/cart', complexCartData); // 50ms
await page.goto('/checkout'); // Instant test
```

---

## 6. Testing Scope: Sociable over Solitary (No "Mock Drift")

### The Decision
We prioritize **Sociable Tests** (Integration/Component) over **Solitary Unit Tests**.
-   **Pure Logic (Solitary):** Tested extensively (e.g., `PricingEngine`). Zero mocks allowed.
-   **Components/Services (Sociable):** Tested with real collaborators. We do *not* mock internal classes or functions.

### Why?
*   **The "Mock Drift" Danger:** A mock represents your *assumption* of how a dependency works. When the real dependency changes but the mock doesn't, tests pass but production crashes (The "Lying Test").
*   **Refactoring Resistance:** Mocks often couple tests to implementation details (e.g., `expect(repo).toHaveBeenCalledWith(...)`). Refactoring the internal flow breaks the test even if the behavior is correct.
*   **Maintenance Tax:** Keeping mocks synchronized with their real counterparts is low-value toil.

### Rule
*   **Mock only at the Boundaries:** Network (External APIs), Time, and Randomness.
*   **Never Mock Internals:** If Class A calls Class B, the test for Class A should run real Class B code.
