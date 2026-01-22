# Architecture Decision Records (ADR)

This repository is an opinionated reference architecture. We have made specific, non-standard choices to optimize for **Velocity** and **Compliance**.

This document explains the *Why* behind these decisions, and what alternatives were rejected.

---

## 1. Testing Scope: Sociable over Solitary (No "Mock Drift")

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

### When to Revisit: Non-Technical Stakeholders
This decision assumes that business stakeholders primarily read generated reports, not raw tests. Consider Gherkin if you have:
- Active, technical product owners who write scenarios directly
- Cross-functional teams where QA engineers own test maintenance
- Regulatory requirements requiring natural-language artifacts stored alongside code

---

## 3. Dual-View Reporting

### The Decision
We generate a custom HTML report that pivots the same test results into two views: **Technical** (Architecture) and **Business** (Goals).

### Why?
*   **Audience Gap:** Developers care about *Components* (Cart, Pricing). Stakeholders care about *Goals* (Revenue, Compliance).
*   **Single Source of Truth:** We don't want separate reports. One execution should satisfy both Engineering (Debuggability) and Product (Confidence).

---

## 4. Network Mocking Strategy: The "Split Brain"

### The Decision
We strictly distinguish between **Internal APIs** (mocked via Contract-First logic) and **External APIs** (mocked via Record/Replay).

### Why?
*   **Internal APIs (ATDD):** We control these. We use MSW to *simulate* the logic (e.g., "If cart > $100, return free shipping"). This allows testing business rules before the backend exists.
*   **External APIs (Self-Updating Mocks):** We do *not* control Stripe/Auth0. Hand-writing mocks (`mock-data.json`) is an anti-pattern because it captures a static, potentially incorrect assumption of the 3rd party API.
    *   **Record/Replay:** We use **Playwright HAR** to capture real traffic.
    *   **Auto-Update:** To refresh test data, we simply delete the HAR file and run against the real sandbox. This guarantees our test data perfectly matches the real API schema.

### Alternative Rejected: Unified Record/Replay for Everything
**Rejected:** Recording all traffic (internal and external) would couple tests to specific implementation details of our own APIs. Contract-First mocking allows us to specify *intent* ("free shipping threshold") rather than capture *incidental implementation* (specific response headers, ordering, etc.).

### The Benefit
We eliminate **Hard-Crafted Test Data**. Developers never waste time guessing the shape of a JSON response. The "Mock" is just a cached reality.

### When to Revisit: Unified Teams
This split-brain approach assumes clear ownership boundaries (frontend vs backend teams). If you have:
- Full-stack engineers who understand both ends
- Small teams with tight coupling between API and UI
- A philosophy that frontend and backend evolve in lockstep

Then a unified mocking strategy (record/replay for everything) may reduce complexity by maintaining one approach.

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

## 6. Rejection of the Page Object Model (POM)

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

## 7. Property-Based Testing First

### The Decision
We define business invariants first, prove them via Property-Based Testing (PBT), then implement the logic.
Example-based tests are used sparingly for documentation only.

### Why?
*   **The "Happy Path" Trap:** Manual examples (e.g., "1 item = $10, 2 items = $20") only verify the obvious. Humans forget edge cases (negative values, empty carts, overflow conditions).
*   **Infinite Examples:** PBT generates hundreds of random, valid test cases automatically. The machine proves the rule holds for *all* inputs, not just the ones you thought of.
*   **Refactoring Safety:** When code changes, you don't need to manually add new examples. The invariant is re-verified against fresh random inputs.

### Alternative Rejected: High-Coverage BDD Tables
**Rejected:** BDD "Scenario Outline" tables (e.g., 20 rows of test data) are brittle and create a false sense of completeness. They only verify the cases you explicitly write, not the infinite edge cases that PBT discovers automatically.

### Rule
*   **Invariants over Examples:** Use `fast-check` to prove business rules.
*   **Examples are Documentation:** Only use `it('Example: ...')` to illustrate specific scenarios mentioned in the business spec.

**Example:**
```typescript
// This single test verifies the rule across 100 random carts/users
it('Final Total is always <= Original Total', () => {
  verifyInvariant({
    ruleReference: 'pricing-strategy.md §1',
    rule: 'Prices never increase'
  }, (_items, _user, result) => {
    expect(result.finalTotal).toBeLessThanOrEqual(result.originalTotal);
  });
});
```

---

## 8. Shared Core Pattern

### The Decision
All test data generation lives in a monorepo-style `implementations/shared` directory, consumed by both API and GUI test suites.

### Why?
*   **Single Source of Truth:** The `CartBuilder` used in Vitest tests is identical to the one used in Playwright tests.
*   **Semantic Integrity:** Types and schemas are defined once and shared across layers. A schema change instantly breaks both API and GUI tests (a good thing).
*   **Cost Savings:** Avoids duplicate maintenance of test utilities across multiple implementations.

### Alternative Rejected: Separate Test Utilities
**Rejected:** Putting helpers in each implementation's `test/` directory creates duplication and drift. When a test changes in one implementation, the other implementation's helpers don't get updated, breaking the "Single Source of Truth."

### Structure
```
implementations/shared/
├── fixtures/
│   ├── cart-builder.ts      # Fluent API for creating carts
│   └── arbitraries.ts       # fast-check generators for PBT
└── src/
    └── types.ts             # Zod schemas shared by API, UI, and Tests
```

### Rule
*   **Never Duplicate Builders:** If you need a helper for test data, it belongs in `implementations/shared/fixtures`.
*   **No Magic Objects:** Tests must never use raw `{ name: "item", price: 100 }` literals. Always use `CartBuilder.new()`.

### When to Revisit: Single Implementation
This pattern assumes multiple test implementations (API + GUI at minimum). If you have:
- Only one test suite in your project
- No plans to add parallel implementations
- A small team where everyone works in the same codebase

Then the shared directory adds unnecessary indirection. Co-locate helpers with the tests that use them.

---

## 9. Fixture Routes over Storybook

### The Decision
For GUI component isolation, we use **Debug Routes** (`/debug/cart-view?scenario=vip-user`) instead of Storybook or similar frameworks.

### Why?
*   **Zero Setup Overhead:** Debug routes reuse your existing app's Providers (Auth, Router, Store). Storybook requires configuring parallel infrastructure.
*   **Visual Debugging:** Developers can visit the URL directly in their browser to inspect the exact state being tested.
*   **Security by Default:** Routes are conditionally included only when `import.meta.env.DEV` is true. They never exist in production.

### Alternative Rejected: Storybook
**Rejected:** Storybook introduces significant infrastructure overhead (separate config, custom decorators, duplicate Provider setup). For a teaching/reference repository, this creates unnecessary cognitive load. Debug routes leverage the existing app structure, keeping the "learning surface" smaller.

### Critical Security Rule
```typescript
// ✅ GOOD: Wrapped in Env Check
if (import.meta.env.DEV) {
  debugRouter.get('/cart-view', renderCartView);
} else {
  // ⛔️ PROD: 404 Not Found
  debugRouter.all('*', (c) => c.notFound());
}
```

### Rule
*   **Debug Routes Only for Isolation:** Use them to test specific UI states without navigating through the full user journey.
*   **Never Ship Debug Routes:** The `import.meta.env.DEV` guard is non-negotiable.

### When to Revisit: Component Libraries
This decision assumes a single application with a focused component set. Consider Storybook if you have:
- A design system or component library with 50+ reusable components
- Designers who need to browse and review components independently
- Multiple applications consuming a shared component library
- A need for comprehensive component documentation and accessibility testing
- Dedicated QA/design collaboration workflows around component catalogs

---

## 10. SQLite as Default Database

### The Decision
We use **SQLite** as the default database instead of PostgreSQL, MySQL, or other server-based databases.

### Why?
*   **Zero DevOps:** SQLite is just a file. No Docker containers, no connection pooling, no migration coordination.
*   **Instant Onboarding:** `git clone` puts the seed database in the repo. Every student/developer starts with identical data.
*   **Commit-able State:** Seed databases can be versioned alongside the code. Snapshots of test states live in Git.
*   **Production Viable:** Modern SQLite (with WAL mode) handles high concurrent workloads. It's not just for prototyping.

### Alternative Rejected: Dockerized PostgreSQL
**Rejected:** Docker adds significant overhead (container management, startup time, port conflicts) especially for teaching environments. For this reference architecture, the DevOps tax outweighs the scalability benefits.

### When to Use Server Databases
SQLite is the default here for teaching velocity. In production, teams should evaluate:
- Need for horizontal scaling across multiple app servers
- Advanced features like stored procedures, custom extensions
- Managed database services (RDS, Cloud SQL)

### Rule
*   **Default to SQLite:** For new features, prototypes, and teaching.
*   **Port to Server DB:** Only when scale dictates it—SQLite is surprisingly capable.

---

## 11. Deep Observability (Mandatory Tracing)

### The Decision
All tests **must** capture their inputs and outputs to a `tracer` (or Allure). A test without a trace is considered **incomplete**.

### Why?
*   **Audit Trail:** Regulated environments require evidence that tests actually ran with meaningful data, not just "PASS."
*   **Debuggability:** When a test fails, the trace shows exactly what inputs triggered the failure (critical for PBT counterexamples).
*   **Attestation Evidence:** The generated HTML report uses these traces to prove compliance to auditors.

### Alternative Rejected: Basic Pass/Fail
**Rejected:** A green checkmark proves code ran, not that it verified meaningful business rules. Without trace data, regulators have no evidence of *what* was tested.

### The Pattern
```typescript
// API Tests - Manual tracing
it('Invariant: Final Total is always <= Original Total', () => {
  verifyInvariant({
    ruleReference: 'pricing-strategy.md §1',
    rule: 'Prices never increase'
  }, (items, user, result) => {
    tracer.log(testName, { items, user }, result);
    expect(result.finalTotal).toBeLessThanOrEqual(result.originalTotal);
  });
});

// GUI Tests - Automatic via invariant() helper
invariant('VIP badge shown for VIP users', {
  ruleReference: 'pricing-strategy.md §3',
  rule: 'VIP badge is visible for eligible users'
}, async ({ page }) => {
  // Tracer automatically captures state changes
  // ...
});
```

### Verification Rule
After running tests, open `reports/{latest}/attestation-full.html`. If a test is listed but has no "Input/Output" trace, it is incomplete.

### When to Revisit: Non-Regulated Environments
This decision assumes regulated or compliance-heavy environments where audit trails matter. Consider simpler observability if you have:
- Internal tools with no external compliance requirements
- Small teams where failures are debugged in real time
- Short-lived prototypes or proof-of-concepts
- Resource-constrained environments where trace storage is costly

In these cases, standard test output + CI logs may be sufficient.

---

## 12. Dual-Coverage Strategy (Business vs. Code)

### The Decision
We verify quality using two distinct coverage metrics that must **both** pass quality gates.
1.  **Code Coverage (Technical):** Do tests execute the lines of code?
2.  **Domain Coverage (Business):** Do tests verify the rules in the requirements document?

### Why?
*   **The "Testing the Wrong Thing" Problem:** You can have 100% code coverage without testing a single business rule (e.g., executing a function but asserting nothing).
*   **The "Dead Requirements" Problem:** Features are often specified in Markdown but never implemented or tested. Domain Coverage highlights these gaps.
*   **Stakeholder Communication:** Business stakeholders don't care about `branches covered`. They care about `rules verified`.

### Implementation
*   **Tooling:** We use a custom `DomainCoverageParser` that reads `pricing-strategy.md` and maps it to test metadata (`ruleReference`).
*   **Reporting:** The final Attestation Report displays both metrics side-by-side.

### Rule
*   **All new features need 2 layers of tests:** One to execute the code (Code Coverage) and one to verify the invariant (Domain Coverage).

### Quality Gates
| Metric | Tool | Minimum Threshold | CI Gate |
|--------|------|-------------------|---------|
| Code Coverage (Lines) | vitest/v8 | 90% | Yes |
| Domain Coverage (Rules Verified) | DomainCoverageParser | 80% for critical features | Warning at 60%, Fail at 50% |

**Rationale for thresholds:**
- **90% code coverage**: Ensures dead code detection while allowing some unreachable error branches.
- **80% domain coverage**: Core rules must be verified. Lower rules may be documentation-only or pending implementation.

**Note on Domain Coverage:** A section with multiple invariants (e.g., "Bulk Discounts" with 3 invariant rules) counts as "covered" if ANY of its invariants have a passing test. This allows progressive discovery of edge cases.
