# Architecture Decision Records (ADR)

This repository is an opinionated reference architecture. We have made specific, non-standard choices to optimize for **Velocity** and **Compliance**.

This document explains the *Why* behind these decisions, and what alternatives were rejected.

<!-- toc -->

- [I. Testing Strategy](#i-testing-strategy)
  * [1. Testing Scope: Sociable over Solitary (No "Mock Drift")](#1-testing-scope-sociable-over-solitary-no-mock-drift)
    + [The Decision](#the-decision)
    + [Why?](#why)
    + [Rule](#rule)
  * [2. Rejection of Gherkin (Cucumber)](#2-rejection-of-gherkin-cucumber)
    + [The Decision](#the-decision-1)
    + [Why?](#why-1)
    + [The Alternative](#the-alternative)
    + [When to Revisit: Non-Technical Stakeholders](#when-to-revisit-non-technical-stakeholders)
  * [3. Property-Based Testing First](#3-property-based-testing-first)
    + [The Decision](#the-decision-2)
    + [Why?](#why-2)
    + [Alternative Rejected: High-Coverage BDD Tables](#alternative-rejected-high-coverage-bdd-tables)
    + [Rule](#rule-1)
  * [4. "Seam-Based" State Management](#4-seam-based-state-management)
    + [The Decision](#the-decision-3)
    + [Why?](#why-3)
  * [5. Rejection of the Page Object Model (POM)](#5-rejection-of-the-page-object-model-pom)
    + [The Decision](#the-decision-4)
    + [Why?](#why-4)
    + [Code Comparison](#code-comparison)
- [II. Architecture & Implementation](#ii-architecture--implementation)
  * [6. Network Mocking Strategy: The "Split Brain"](#6-network-mocking-strategy-the-split-brain)
    + [The Decision](#the-decision-5)
    + [Why?](#why-5)
    + [Alternative Rejected: Unified Record/Replay for Everything](#alternative-rejected-unified-recordreplay-for-everything)
    + [The Benefit](#the-benefit)
    + [When to Revisit: Unified Teams](#when-to-revisit-unified-teams)
  * [7. Shared Core Pattern](#7-shared-core-pattern)
    + [The Decision](#the-decision-6)
    + [Why?](#why-6)
    + [Alternative Rejected: Separate Test Utilities](#alternative-rejected-separate-test-utilities)
    + [Structure](#structure)
    + [Rule](#rule-2)
    + [When to Revisit: Single Implementation](#when-to-revisit-single-implementation)
  * [8. Fixture Routes over Storybook](#8-fixture-routes-over-storybook)
    + [The Decision](#the-decision-7)
    + [Why?](#why-7)
    + [Alternative Rejected: Storybook](#alternative-rejected-storybook)
    + [Critical Security Rule](#critical-security-rule)
    + [Rule](#rule-3)
    + [When to Revisit: Component Libraries](#when-to-revisit-component-libraries)
  * [9. SQLite as Default Database](#9-sqlite-as-default-database)
    + [The Decision](#the-decision-8)
    + [Why?](#why-8)
    + [Alternative Rejected: Dockerized PostgreSQL](#alternative-rejected-dockerized-postgresql)
    + [When to Use Server Databases](#when-to-use-server-databases)
    + [Rule](#rule-4)
  * [10. Result Pattern for Error Handling](#10-result-pattern-for-error-handling)
    + [The Decision](#the-decision-9)
    + [Why?](#why-9)
    + [Alternative Rejected: Exceptions for Business Logic](#alternative-rejected-exceptions-for-business-logic)
    + [The Pattern](#the-pattern)
    + [Available Utilities](#available-utilities)
    + [Rule](#rule-5)
    + [When to Revisit: Performance-Critical Paths](#when-to-revisit-performance-critical-paths)
    + [References](#references)
  * [16. UI Component Architecture: shadcn/ui over Heavy Libraries](#16-ui-component-architecture-shadcnui-over-heavy-libraries)
    + [The Decision](#the-decision-10)
    + [Why?](#why-10)
    + [Consequences](#consequences)
    + [Alternatives Rejected](#alternatives-rejected)
- [III. Compliance & Reporting](#iii-compliance--reporting)
  * [11. Dual-View Reporting](#11-dual-view-reporting)
    + [The Decision](#the-decision-11)
    + [Why?](#why-11)
  * [12. Deep Observability (Mandatory Tracing)](#12-deep-observability-mandatory-tracing)
    + [The Decision](#the-decision-12)
    + [Why?](#why-12)
    + [Alternative Rejected: Basic Pass/Fail](#alternative-rejected-basic-passfail)
    + [The Pattern](#the-pattern-1)
    + [Verification Rule](#verification-rule)
    + [When to Revisit: Non-Regulated Environments](#when-to-revisit-non-regulated-environments)
  * [13. Dual-Coverage Strategy (Business vs. Code)](#13-dual-coverage-strategy-business-vs-code)
    + [The Decision](#the-decision-13)
    + [Why?](#why-13)
    + [Implementation](#implementation)
    + [Rule](#rule-6)
    + [Quality Gates](#quality-gates)
  * [14. Package Manager: pnpm {#14-package-manager-pnpm}](#14-package-manager-pnpm-%2314-package-manager-pnpm)
    + [The Decision {#the-decision-13}](#the-decision-%23the-decision-13)
    + [Why? {#why-13}](#why-%23why-13)
    + [Rule {#rule-7}](#rule-%23rule-7)
  * [15. Dependency Version Management: Workspace Catalogs](#15-dependency-version-management-workspace-catalogs)
    + [The Decision](#the-decision-14)
    + [Why?](#why-14)
    + [Catalog Categories](#catalog-categories)
    + [Rule](#rule-7)
    + [Blocked Updates](#blocked-updates)

<!-- tocstop -->

## I. Testing Strategy

### 1. Testing Scope: Sociable over Solitary (No "Mock Drift")
**Status:** Accepted
**Date:** 2026-01-22

#### The Decision
We prioritize **Sociable Tests** (Integration/Component) over **Solitary Unit Tests**.
-   **Pure Logic (Solitary):** Tested extensively (e.g., `PricingEngine`). Zero mocks allowed.
-   **Components/Services (Sociable):** Tested with real collaborators. We do *not* mock internal classes or functions.

#### Why?
*   **The "Mock Drift" Danger:** A mock represents your *assumption* of how a dependency works. When the real dependency changes but the mock doesn't, tests pass but production crashes (The "Lying Test").
*   **Refactoring Resistance:** Mocks often couple tests to implementation details (e.g., `expect(repo).toHaveBeenCalledWith(...)`). Refactoring the internal flow breaks the test even if the behavior is correct.
*   **Maintenance Tax:** Keeping mocks synchronized with their real counterparts is low-value toil.

#### Rule
*   **Mock only at the Boundaries:** Network (External APIs), Time, and Randomness.
*   **Never Mock Internals:** If Class A calls Class B, the test for Class A should run real Class B code.

---

### 2. Rejection of Gherkin (Cucumber)
**Status:** Accepted
**Date:** 2026-01-22

#### The Decision
We explicitly reject Gherkin/Cucumber layers.
We use **TypeScript as the Specification Language**.

#### Why?
*   **The "Translation Tax":** Gherkin requires maintaining a regex mapping layer (`steps.ts`) between English and Code. This layer is expensive, brittle, and rarely read by stakeholders.
*   **Type Safety:** Gherkin text has no type safety. `Given I have 5 items` passes a string "5" to code that expects a number.
*   **Refactoring:** Renaming a business concept in TypeScript is one `F2` keypress. In Gherkin, it's a grep/sed nightmare.

#### The Alternative
We use **Attestation Reporting** to generate the "English" view from the code metadata, rather than writing English to generate code execution.

#### When to Revisit: Non-Technical Stakeholders
This decision assumes that business stakeholders primarily read generated reports, not raw tests. Consider Gherkin if you have:
- Active, technical product owners who write scenarios directly
- Cross-functional teams where QA engineers own test maintenance
- Regulatory requirements requiring natural-language artifacts stored alongside code

---

### 3. Property-Based Testing First
**Status:** Accepted
**Date:** 2026-01-22

#### The Decision
We define business invariants first, prove them via Property-Based Testing (PBT), then implement the logic.
Example-based tests are used sparingly for documentation only.

#### Why?
*   **The "Happy Path" Trap:** Manual examples (e.g., "1 item = $10, 2 items = $20") only verify the obvious. Humans forget edge cases (negative values, empty carts, overflow conditions).
*   **Infinite Examples:** PBT generates hundreds of random, valid test cases automatically. The machine proves the rule holds for *all* inputs, not just the ones you thought of.
*   **Refactoring Safety:** When code changes, you don't need to manually add new examples. The invariant is re-verified against fresh random inputs.

#### Alternative Rejected: High-Coverage BDD Tables
**Rejected:** BDD "Scenario Outline" tables (e.g., 20 rows of test data) are brittle and create a false sense of completeness. They only verify the cases you explicitly write, not the infinite edge cases that PBT discovers automatically.

#### Rule
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

### 4. "Seam-Based" State Management
**Status:** Accepted
**Date:** 2026-01-22

#### The Decision
GUI tests never set up state through the GUI if an API exists.
We use **API Seams** (Backdoor Routes) to "Teleport" the application into the desired state.

#### Why?
*   **Speed:** Creating a user via UI takes 5s. Creating via API takes 50ms.
*   **Stability:** If the "Login Page" is broken, we shouldn't fail the "Checkout" tests.
*   **Isolation:** We test the *Checkout*, not the *User Journey to reach Checkout*.

```typescript
// Pattern
await api.post('/seed/cart', complexCartData); // 50ms
await page.goto('/checkout'); // Instant test
```

---

### 5. Rejection of the Page Object Model (POM)
**Status:** Accepted
**Date:** 2026-01-22

#### The Decision
We avoid Class-based Page Objects that mirror the DOM structure.
Instead, we use **Intent-Based Drivers** (Functional Composition) and **Fluent Builders** for state.

#### Why?
*   **The Problem with POM:** Page Objects often become "God Classes" that mix *Locators* (HTML structure), *Actions* (Clicking), and *Assertions* (Business Logic). They encourage coupling tests to the page layout rather than user intent.
*   **The Solution:**
    *   **Drivers:** Small, functional helpers that expose *User Intents* (e.g., `checkout.selectShipping()`) rather than *Page Mechanics* (e.g., `page.click('#shipping')`).
    *   **Builders:** Separates *Data Setup* (`CartBuilder`) from *Page Interaction* (`PageBuilder`).

#### Code Comparison

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

## II. Architecture & Implementation

### 6. Network Mocking Strategy: The "Split Brain"
**Status:** Accepted
**Date:** 2026-01-22

#### The Decision
We strictly distinguish between **Internal APIs** (mocked via Contract-First logic) and **External APIs** (mocked via Record/Replay).

#### Why?
*   **Internal APIs (ATDD):** We control these. We use MSW to *simulate* the logic (e.g., "If cart > $100, return free shipping"). This allows testing business rules before the backend exists.
*   **External APIs (Self-Updating Mocks):** We do *not* control Stripe/Auth0. Hand-writing mocks (`mock-data.json`) is an anti-pattern because it captures a static, potentially incorrect assumption of the 3rd party API.
    *   **Record/Replay:** We use **Playwright HAR** to capture real traffic.
    *   **Auto-Update:** To refresh test data, we simply delete the HAR file and run against the real sandbox. This guarantees our test data perfectly matches the real API schema.

#### Alternative Rejected: Unified Record/Replay for Everything
**Rejected:** Recording all traffic (internal and external) would couple tests to specific implementation details of our own APIs. Contract-First mocking allows us to specify *intent* ("free shipping threshold") rather than capture *incidental implementation* (specific response headers, ordering, etc.).

#### The Benefit
We eliminate **Hard-Crafted Test Data**. Developers never waste time guessing the shape of a JSON response. The "Mock" is just a cached reality.

#### When to Revisit: Unified Teams
This split-brain approach assumes clear ownership boundaries (frontend vs backend teams). If you have:
- Full-stack engineers who understand both ends
- Small teams with tight coupling between API and UI
- A philosophy that frontend and backend evolve in lockstep

Then a unified mocking strategy (record/replay for everything) may reduce complexity by maintaining one approach.

---

### 7. Shared Core Pattern
**Status:** Accepted
**Date:** 2026-01-22

#### The Decision
All test data generation lives in a monorepo-style `packages/shared` directory, consumed by both API and GUI test suites.

#### Why?
*   **Single Source of Truth:** The `CartBuilder` used in Vitest tests is identical to the one used in Playwright tests.
*   **Semantic Integrity:** Types and schemas are defined once and shared across layers. A schema change instantly breaks both API and GUI tests (a good thing).
*   **Cost Savings:** Avoids duplicate maintenance of test utilities across multiple implementations.

#### Alternative Rejected: Separate Test Utilities
**Rejected:** Putting helpers in each implementation's `test/` directory creates duplication and drift. When a test changes in one implementation, the other implementation's helpers don't get updated, breaking the "Single Source of Truth."

#### Structure
```
packages/shared/
├── fixtures/
│   ├── cart-builder.ts      # Fluent API for creating carts
│   └── arbitraries.ts       # fast-check generators for PBT
└── src/
    └── types.ts             # Zod schemas shared by API, UI, and Tests
```

#### Rule
*   **Never Duplicate Builders:** If you need a helper for test data, it belongs in `packages/shared/fixtures`.
*   **No Magic Objects:** Tests must never use raw `{ name: "item", price: 100 }` literals. Always use `CartBuilder.new()`.

#### When to Revisit: Single Implementation
This pattern assumes multiple test implementations (API + GUI at minimum). If you have:
- Only one test suite in your project
- No plans to add parallel implementations
- A small team where everyone works in the same codebase

Then the shared directory adds unnecessary indirection. Co-locate helpers with the tests that use them.

---

### 8. Fixture Routes over Storybook
**Status:** Accepted
**Date:** 2026-01-22

#### The Decision
For GUI component isolation, we use **Debug Routes** (`/debug/cart-view?scenario=vip-user`) instead of Storybook or similar frameworks.

#### Why?
*   **Zero Setup Overhead:** Debug routes reuse your existing app's Providers (Auth, Router, Store). Storybook requires configuring parallel infrastructure.
*   **Visual Debugging:** Developers can visit the URL directly in their browser to inspect the exact state being tested.
*   **Security by Default:** Routes are conditionally included only when `import.meta.env.DEV` is true. They never exist in production.

#### Alternative Rejected: Storybook
**Rejected:** Storybook introduces significant infrastructure overhead (separate config, custom decorators, duplicate Provider setup). For a teaching/reference repository, this creates unnecessary cognitive load. Debug routes leverage the existing app structure, keeping the "learning surface" smaller.

#### Critical Security Rule
```typescript
// ✅ GOOD: Wrapped in Env Check
if (import.meta.env.DEV) {
  debugRouter.get('/cart-view', renderCartView);
} else {
  // ⛔️ PROD: 404 Not Found
  debugRouter.all('*', (c) => c.notFound());
}
```

#### Rule
*   **Debug Routes Only for Isolation:** Use them to test specific UI states without navigating through the full user journey.
*   **Never Ship Debug Routes:** The `import.meta.env.DEV` guard is non-negotiable.

#### When to Revisit: Component Libraries
This decision assumes a single application with a focused component set. Consider Storybook if you have:
- A design system or component library with 50+ reusable components
- Designers who need to browse and review components independently
- Multiple applications consuming a shared component library
- A need for comprehensive component documentation and accessibility testing
- Dedicated QA/design collaboration workflows around component catalogs

---

### 9. SQLite as Default Database
**Status:** Accepted
**Date:** 2026-01-22

#### The Decision
We use **SQLite** as the default database instead of PostgreSQL, MySQL, or other server-based databases.

#### Why?
*   **Zero DevOps:** SQLite is just a file. No Docker containers, no connection pooling, no migration coordination.
*   **Instant Onboarding:** `git clone` puts the seed database in the repo. Every student/developer starts with identical data.
*   **Commit-able State:** Seed databases can be versioned alongside the code. Snapshots of test states live in Git.
*   **Production Viable:** Modern SQLite (with WAL mode) handles high concurrent workloads. It's not just for prototyping.

#### Alternative Rejected: Dockerized PostgreSQL
**Rejected:** Docker adds significant overhead (container management, startup time, port conflicts) especially for teaching environments. For this reference architecture, the DevOps tax outweighs the scalability benefits.

#### When to Use Server Databases
SQLite is the default here for teaching velocity. In production, teams should evaluate:
- Need for horizontal scaling across multiple app servers
- Advanced features like stored procedures, custom extensions
- Managed database services (RDS, Cloud SQL)

#### Rule
*   **Default to SQLite:** For new features, prototypes, and teaching.
*   **Port to Server DB:** Only when scale dictates it—SQLite is surprisingly capable.

---

### 10. Result<T, E> Pattern for Error Handling
**Status:** Accepted
**Date:** 2026-01-22

#### The Decision
We use the `Result<T, E>` discriminated union type for explicit error handling instead of throwing exceptions for business logic errors.

#### Why?
*   **Forces Error Handling:** With exceptions, it's easy to silently ignore errors (empty catch block). With `Result`, the compiler forces callers to handle both success and failure paths.
*   **Explicit Control Flow:** try/catch blocks can nest deeply and create complex control jumps. `Result` composes linearly with `map` and `chain` utilities.
*   **Type Safety:** Exceptions break type safety—any function can throw anything at runtime. `Result<T, E>` makes the error type `E` explicit in the function signature.
*   **Testability:** Testing functions that return `Result` is simpler—just assert on the return value. Testing exception-throwing functions requires mocking or try/catch wrapping.

#### Alternative Rejected: Exceptions for Business Logic
**Rejected:** Using exceptions for normal business flows (validation failures, "not found" errors) conflates truly exceptional errors with expected failure modes. This makes it harder to reason about what errors a function can actually produce.

#### The Pattern
```typescript
// Type definition
type Result<T, E> = Success<T> | Failure<E>;

interface Success<T> {
  success: true;
  value: T;
}

interface Failure<E> {
  success: false;
  error: E;
}

// Example usage
function divide(a: number, b: number): Result<number, string> {
  if (b === 0) {
    return failure('Division by zero');
  }
  return success(a / b);
}

// Compose operations safely
const result = chain(
  parseAge(input),
  validateAdult,
  calculateDiscount
);
```

#### Available Utilities
*   `success(value)` / `failure(error)` - Create Results
*   `isSuccess()` / `isFailure()` - Type guards
*   `map()` - Transform success values, propagate failures
*   `chain()` - Compose operations that return Results
*   `unwrap()` / `unwrapOr()` / `unwrapOrElse()` - Extract values
*   `match()` - Pattern matching for side effects
*   `all()` - Combine multiple Results
*   `tryCatch()` / `tryCatchAsync()` - Convert exceptions to Results
*   `fromNullable()` - Handle null/undefined values
*   `fromZod()` - Convert Zod validation results

#### Rule
*   **Use Result for Business Logic Failures:** Validation errors, "not found" cases, expected failures.
*   **Keep Exceptions for True Exceptions:** Only throw for truly exceptional conditions (system corruption, programmer errors, things that should crash).
*   **Prefer `chain()` Over Nested `if isSuccess`:** The `chain` utility composes linearly and stops at the first failure.

#### When to Revisit: Performance-Critical Paths
This pattern adds a small overhead for creating Result objects. For ultra-hot paths where exceptions are genuinely rare and performance is critical, traditional exceptions may be appropriate. Consider:
*   Loop bodies executed millions of times per second
*   Known-zero-failure-rate operations after initial validation
*   Strict latency requirements where object allocation matters

In most business applications, the clarity and safety benefits outweigh the minimal overhead.

#### References
*   Implementation: `packages/shared/src/result.ts`
*   Tests: `packages/domain/test/result.spec.ts` (42 tests)
*   Documentation: `docs/RESULT_PATTERN.md`

---

### 16. UI Component Architecture: shadcn/ui over Heavy Libraries
**Status:** Accepted
**Date:** 2026-02-19

#### The Decision
We adopt **shadcn/ui** as the UI framework for this project.

Technically, this is not a library dependency but a pattern of copying component source code into our repository. These components are built using **Radix UI** (headless primitives for accessibility/behaviour) and styled with **Tailwind CSS**.

#### Why?
*   **Testing Rigour:** Radix UI primitives guarantee WAI-ARIA compliance. This enforces "Testing by User Behaviour" (e.g., `screen.getByRole('dialog')`) rather than implementation details.
*   **Code Ownership:** Because the component code lives in our repo (`/components/ui`), we have full control over the implementation. No `node_modules` abstraction layer.
*   **Decoupled Architecture:** This choice demonstrates the separation of behaviour (Radix) from presentation (Tailwind).
*   **Visual Standardisation:** Provides a clean, professional aesthetic out-of-the-box.

#### Consequences

**Positive:**
*   Radix UI primitives guarantee WAI-ARIA compliance
*   Full code ownership in `/components/ui`
*   Decoupled behaviour/presentation architecture
*   Professional visual standard

**Negative:**
*   Initial boilerplate (more files than a single package)
*   Manual maintenance (copy-paste upgrades vs `npm update`)

#### Alternatives Rejected

*   **Heavy Component Libraries (MUI):** Rejected - "black box" nature, heavy bundle size, rigid DOM structures.
*   **Utility-First CSS (Raw Tailwind):** Rejected - high effort to build fully accessible interactive components.

---

## III. Compliance & Reporting

### 11. Dual-View Reporting
**Status:** Accepted
**Date:** 2026-01-22

#### The Decision
We generate a custom HTML report that pivots the same test results into two views: **Technical** (Architecture) and **Business** (Goals).

#### Why?
*   **Audience Gap:** Developers care about *Components* (Cart, Pricing). Stakeholders care about *Goals* (Revenue, Compliance).
*   **Single Source of Truth:** We don't want separate reports. One execution should satisfy both Engineering (Debuggability) and Product (Confidence).

---

### 12. Deep Observability (Mandatory Tracing)
**Status:** Accepted
**Date:** 2026-01-22

#### The Decision
All tests **must** capture their inputs and outputs to a `tracer` (or Allure). A test without a trace is considered **incomplete**.

#### Why?
*   **Audit Trail:** Regulated environments require evidence that tests actually ran with meaningful data, not just "PASS."
*   **Debuggability:** When a test fails, the trace shows exactly what inputs triggered the failure (critical for PBT counterexamples).
*   **Attestation Evidence:** The generated HTML report uses these traces to prove compliance to auditors.

#### Alternative Rejected: Basic Pass/Fail
**Rejected:** A green checkmark proves code ran, not that it verified meaningful business rules. Without trace data, regulators have no evidence of *what* was tested.

#### The Pattern
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

#### Verification Rule
After running tests, open `reports/{latest}/attestation-full.html`. If a test is listed but has no "Input/Output" trace, it is incomplete.

#### When to Revisit: Non-Regulated Environments
This decision assumes regulated or compliance-heavy environments where audit trails matter. Consider simpler observability if you have:
- Internal tools with no external compliance requirements
- Small teams where failures are debugged in real time
- Short-lived prototypes or proof-of-concepts
- Resource-constrained environments where trace storage is costly

In these cases, standard test output + CI logs may be sufficient.

---

### 13. Dual-Coverage Strategy (Business vs. Code)
**Status:** Accepted
**Date:** 2026-01-22

#### The Decision
We verify quality using two distinct coverage metrics that must **both** pass quality gates.
1.  **Code Coverage (Technical):** Do tests execute the lines of code?
2.  **Domain Coverage (Business):** Do tests verify the rules in the requirements document?

#### Why?
*   **The "Testing the Wrong Thing" Problem:** You can have 100% code coverage without testing a single business rule (e.g., executing a function but asserting nothing).
*   **The "Dead Requirements" Problem:** Features are often specified in Markdown but never implemented or tested. Domain Coverage highlights these gaps.
*   **Stakeholder Communication:** Business stakeholders don't care about `branches covered`. They care about `rules verified`.

#### Implementation
*   **Tooling:** We use a custom `DomainCoverageParser` that reads `pricing-strategy.md` and maps it to test metadata (`ruleReference`).
*   **Reporting:** The final Attestation Report displays both metrics side-by-side.

#### Rule
*   **All new features need 2 layers of tests:** One to execute the code (Code Coverage) and one to verify the invariant (Domain Coverage).

#### Quality Gates
| Metric | Tool | Minimum Threshold | CI Gate |
|--------|------|-------------------|---------|
| Code Coverage (Lines) | vitest/v8 | 90% | Yes |
| Domain Coverage (Rules Verified) | DomainCoverageParser | 80% for critical features | Warning at 60%, Fail at 50% |

**Rationale for thresholds:**
- **90% code coverage**: Ensures dead code detection while allowing some unreachable error branches.
- **80% domain coverage**: Core rules must be verified. Lower rules may be documentation-only or pending implementation.

**Note on Domain Coverage:** A section with multiple invariants (e.g., "Bulk Discounts" with 3 invariant rules) counts as "covered" if ANY of its invariants have a passing test. This allows progressive discovery of edge cases.

---

### 14. Package Manager: pnpm {#14-package-manager-pnpm}
**Status:** Accepted
**Date:** 2026-01-24

#### The Decision {#the-decision-13}
We use **pnpm** as the package manager instead of npm or yarn.

#### Why? {#why-13}
*   **Disk Efficiency:** pnpm uses a content-addressable filesystem, storing dependencies only once on disk. With multiple packages in a monorepo, this saves significant space and install time.
*   **Strict Dependency Handling:** pnpm creates symbolic links in `node_modules/.pnpm`, preventing a common issue where packages can accidentally access undeclared dependencies (phantom dependencies).
*   **Monorepo Support:** Native workspace support via `workspace:*` protocol makes managing inter-package dependencies straightforward.
*   **Fast Installations:** pnpm is generally faster than npm/yarn due to efficient caching and parallel installation.

#### Rule {#rule-7}
*   **Use `pnpm exec` for Running Binaries:** When executing CLI tools from `node_modules/.bin`, use `pnpm exec <command>` (or `pnpm exec -- <command>` for passing flags) instead of `npx` or direct node command invocation.
*   **Workspace Protocol:** For monorepo internal dependencies, use `"workspace:*"` in package.json dependencies.

---

### 15. Dependency Version Management: Workspace Catalogs
**Status:** Accepted  
**Date:** 2026-02-18

#### The Decision
We use **pnpm Workspace Catalogs** to centralize dependency version management in `pnpm-workspace.yaml`. All shared dependencies across workspaces should use the `catalog:` protocol.

#### Why?
*   **Single Source of Truth:** One place to update versions that propagate to all workspaces.
*   **Consistency:** Prevents version drift where different packages use different versions of the same dependency (e.g., vitest 4.0.16 in one package, 4.0.18 in another).
*   **Easier Updates:** Bumping a version in one place updates all consumers automatically on next `pnpm install`.
*   **Visibility:** Makes it clear which dependencies are shared across the monorepo vs. package-specific.

#### Catalog Categories
```yaml
catalog:
  # Core runtime dependencies (used in production)
  zod: ^4.3.6
  zustand: ^5.0.11
  
  # Testing libraries (shared test infrastructure)
  vitest: ^4.0.18
  fast-check: ^4.5.3
  "@playwright/test": ^1.58.2
  
  # TypeScript ecosystem
  typescript: ^5.9.0
  "@types/node": ^25.2.3
  
  # React ecosystem (frontend)
  react: ^19.2.4
  "react-dom": ^19.2.4
  "@types/react": ^19.2.14
  
  # Build tools
  vite: ^7.2.4
  tsx: ^4.21.0
  
  # Linting (see Blocked Updates below)
  eslint: ^9.39.1  # v10 blocked
```

#### Rule
*   **Use `catalog:` for Shared Dependencies:** If a dependency is used in 2+ packages, add it to the catalog.
*   **Document Blocked Updates:** When a dependency cannot be updated to latest, document the reason (see below).
*   **Package-Specific Versions:** Only use explicit versions for dependencies unique to one package.

#### Blocked Updates
The following dependencies are intentionally held at versions below latest:

| Package | Current | Latest | Reason | Tracking |
|---------|---------|--------|--------|----------|
| eslint | 9.39.2 | 10.0.0 | `eslint-plugin-react-hooks` v7.0.1 does not support ESLint v10 peer dependency | https://github.com/facebook/react/issues/32549 |
| @eslint/js | 9.39.2 | 10.0.1 | Locked to match eslint version | Same as above |

**When to Update:** Once `eslint-plugin-react-hooks` adds ESLint v10 support (React v19 stable or v20), we can upgrade both packages.