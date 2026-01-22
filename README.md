# Shift Left Reference Architecture: Developer-Native Compliance

**An up-to-date public recreation of the reference implementation built at Commonwealth Bank.**

> [!NOTE] Work in Progress (WIP)
> This repository demonstrates ATDD (Acceptance Test-Driven Development) in practice. The testing infrastructure was built first to enable test runs before the full application implementation was completed. See the [folder structure](#project-structure) for the current state.

> *How to enable developers to own Quality & Compliance without slowing them down.*

---

## 🎯 The Mission

"Shift Left" initiatives usually fail because organizations ask developers to do "QA Work"—writing Gherkin scripts, taking manual screenshots, and filling out Word documents for ServiceNow.

Engineers also struggle to write tests that verify **behaviour** rather than **implementation details**—they end up testing *how* the code works instead of *what* it achieves.

**This repository demonstrates the only way to make Shift Left work in regulated environments:**
You must stop asking developers to be testers and start enabling them to do testing using their native tools.

This requires **Developer-Native Compliance**: tools that automate the bureaucracy so engineers can focus on code.

---

## 🚀 The Solution: Signals over Silos

We eliminate the "Translation Layer Tax" and the "Manual Attestation Tax." Instead of separate QA artifacts, we generate **Regulatory-Grade Evidence** as a direct side effect of standard engineering practices.

### 1. Automated Attestation (Visual Evidence)
Every test run generates a self-contained **Attestation Report** designed for auditors, not just developers. It maps every execution back to the original business requirement in `pricing-strategy.md`.

[**View Latest Attestation Report (GitHub Actions)**](https://github.com/paulolai/executable-specs-demo/actions)
*(Navigate to a recent run and download the `attestation-reports` artifact)*

### 2. The Code: Gherkin vs. Executable Specs
Stop writing fragile strings. Use Type-Safe Test Data Builders.

The reality is that **non-engineers rarely read feature files**—the supposed "ubiquitous language" ends up being read only by the engineers who wrote it.

| The "Gherkin Tax" (Legacy) | The "Executable Spec" (This Repo) |
| :--- | :--- |
| **Fragile Strings:** `Given I have 5 items` | **Type-Safe Code:** `CartBuilder.new().withItem({ name, price, quantity: 5 })` |
| **Manual Math:** You calculate expected values | **Invariants:** The machine proves the rule holds |
| **Zero IDE Support:** Rename requires find/replace | **Full IDE Support:** Refactor with confidence |
| **Semantic Drift:** Feature files diverge from code | **Semantic Integrity:** The code *is* the spec |

**Legacy Gherkin (Maintenance Burden):**
```gherkin
Scenario Outline: Bulk discount
  Given I have a cart with items:
    | sku | qty | price |
    | IPAD | <qty> | 1000 |
  Then the volume discount is <bulk_discount>
  # PAIN: You must manually calculate every row!
  Examples:
    | qty | bulk_discount |
    | 3   | 450           |
    | 10  | 1500          |
```

**Executable Spec (Developer Native):**
```typescript
export function verifyInvariant(metadata: InvariantMetadata, assertion: AssertionCallback) {
  fc.assert(
    fc.property(cartArb, userArb, (items, user) => {
      const result = PricingEngine.calculate(items, user);
      tracer.log(testName, { items, user }, result);
      assertion(items, user, result);
      return true;
    })
  );
});

// Using the helper - the invariant is proven across 100 random cart/users
it('Invariant: Final Total is always <= Original Total', () => {
  verifyInvariant({
    ruleReference: 'pricing-strategy.md §1',
    rule: 'Final Total must never exceed Original Total (prices never increase)',
    tags: ['@pricing', '@base-rules', '@revenue-protection']
  }, (_items, _user, result) => {
    expect(result.finalTotal).toBeLessThanOrEqual(result.originalTotal);
  });
});
```

---

## 🏗 The 3 Pillars of Enablement

### 1. Zero-Tax Verification (The Google Lesson)
At **Google**, we didn't have "QA Tooling" teams—we had **Engineering Productivity (EngProd)**. Our mission was to be **Dev Accelerators**. We built tools that served the engineer, not the process. This architecture replaces the "Gherkin Burden" with **Type-Safe Test Data Builders**, ensuring testing is a high-speed feedback loop that feels like coding, not data entry.

### 2. Continuous Attestation (The CBA Lesson)
In banking, you can't ship without proof. We generate **two complementary artifacts** from every run (see the [**Reporting Architecture**](implementations/typescript-vitest/reporting-architecture.md) for details):
- **Attestation Report**: Business-rule traceability for auditors. Generated via `npm run reports:attestation`.
- **Allure Report**: Historical trends and flakiness detection for engineers.

### 3. Infinite Examples (The Scalability Lesson)
Using **Property-Based Testing**, we define a business rule once and let the machine generate hundreds of randomized test cases (negative values, empty carts, massive quantities) that humans forget to check.

---

## 🏛 Origin Story

This project is a public recreation of the work I delivered as **Commonwealth Bank’s first Staff Quality Engineer**, synthesizing lessons from 20+ years including years at **Google** and high-growth startups.

It solves a specific, painful problem found in enterprises:
*   **The Pain:** Developers blocked by manual evidence gathering and fragile automation.
*   **The Solution:** A Reference Architecture that delivers **Bank-grade compliance with Google-grade velocity.**

---

## 🛠 Getting Started

### The "Clean Room" Teaching Stack
We use a modern stack designed for instant learning, prioritizing **Clone-and-Run** simplicity.

<!-- TODO: Update this table with current state. Remove shadcn/ui, SQLite, Drizzle references (not installed). Document actual UI library and state management (Zustand). -->
| Layer | Technology | Rationale |
| --- | --- | --- |
| **Frontend** | **Vite + React** | Instant feedback loops. No "Server Component" confusion. |
| **UI Lib** | **[TODO: Document actual UI library]** | <!-- TODO: shadcn/ui not currently installed --> |
| **Backend** | **Hono** | The "Feynman" of Backends. Ultra-light, standards-based replacement for Express. |
| **Database** | **[TODO: Document actual DB layer]** | <!-- TODO: SQLite + Drizzle not currently installed --> |
| **Testing** | **Vitest + Playwright** | The "Double Loop" engines for ATDD. |

<!-- TODO: Update rationale section after tech stack is finalized -->
#### Why this specific stack?
*   **Hono:** Removes boilerplate. Lets you teach "API Concepts" without fighting the framework.
*   **SQLite:** Removes the "DevOps Wall". Committable "seed" databases ensure every student starts with the same state.
*   **Drizzle:** Enables **Systemic Type Safety**. Backend schema changes instantly break frontend mocks (a good thing).

### Running the Project

```bash
# 1. Install dependencies (runs from root)
npm install

# 2. Run the Vitest unit tests (pricing engine layer)
npm test

# 3. Navigate to React app and start dev server
cd implementations/react-playwright
npm run dev

# 4. Run Playwright E2E tests (from react-playwright dir)
cd implementations/react-playwright
npm test
```

## 📁 Project Structure

This repository follows a multi-implementation structure to demonstrate ATDD patterns at different layers:

```
implementations/
├── typescript-vitest/     # Unit test layer: Pricing engine + Vitest
│   ├── src/               # Core business logic (PricingEngine)
│   ├── test/              # Property-based tests, integration tests
│   └── scripts/           # Attestation report generation
│
├── react-playwright/      # E2E test layer: React app + Playwright + Hono API
│   ├── src/
│   │   ├── components/    # Cart, checkout, product components
│   │   ├── pages/         # Home, Products, Cart, Checkout, Login, Register
│   │   ├── server/        # Hono backend API (pricing, auth)
│   │   ├── store/         # Zustand state management
│   │   └── providers/     # React context providers
│   └── test-results/      # Playwright test output
│
├── shared/                # Shared types and utilities
└── typescript-cucumber/   # Cucumber implementation (documentation/contrast only)

reports/                   # Generated attestation reports
docs/                      # Business rules, patterns, and guidelines
```

### Documentation Automation

We use `markdown-toc` to automatically maintain Table of Contents in our documentation:

```bash
# Generate TOCs for all documentation files
npm run docs:fix
```

**How it works:**
- Any markdown file with the `<!-- toc -->` token will have its TOC regenerated automatically on commit
- This is handled by `husky` (pre-commit hook) and `lint-staged`
- No manual TOC updates needed—stay focused on content

### Viewing the Artifacts
- **Audit Evidence:** Open `reports/{timestamp}/attestation-full.html`
- **Engineering Trends:** `npm run reports:allure:serve` (Requires Java)

---

## 📚 Quick Reference

| Topic | Document |
|-------|----------|
| **Testing Framework** | [docs/TESTING_FRAMEWORK.md](docs/TESTING_FRAMEWORK.md) |
| **API Testing Patterns** | [docs/API_TESTING_PATTERNS.md](docs/API_TESTING_PATTERNS.md) |
| **GUI Testing Patterns** | [docs/GUI_TESTING_PATTERNS.md](docs/GUI_TESTING_PATTERNS.md) |
| **Invariants & PBT** | [docs/reference/infinite-examples.md](docs/reference/infinite-examples.md) |
| **Type Safety** | [docs/reference/semantic-integrity.md](docs/reference/semantic-integrity.md) |
| **Business Rules** | [docs/pricing-strategy.md](docs/pricing-strategy.md) |

---

## 📚 Essential Reading

*   **[Reporting Architecture](implementations/typescript-vitest/reporting-architecture.md)** ⭐ **Viewing Allure reports requires HTTP server** - See this guide
*   **[The Shift Left Playbook](docs/guides/shift-left-playbook.md)** - How to coach teams through this transition.
*   **[Attestation Architecture](docs/reference/attestation-architecture.md)** - How we automate compliance.
*   **[Bug Discovery Evidence](docs/reference/bug-discovery-evidence.md)** - Real-world evidence that invariant tests catch bugs hand-written scenarios miss.

---

*This architecture is designed for Engineering Leaders who need to prove that "High Velocity" and "High Compliance" are not mutually exclusive.*