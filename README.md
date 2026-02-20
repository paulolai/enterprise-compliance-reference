# Shift Left Reference Architecture: Developer-Native Compliance

**An up-to-date public recreation of the reference implementation built at Commonwealth Bank.**

> [!NOTE]
> This repository demonstrates ATDD (Acceptance Test-Driven Development) in practice. The testing infrastructure was built first to enable test runs before the full application implementation was completed—a core Shift Left principle. The project is now feature-complete with comprehensive documentation and teaching resources.

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

## 🏛 The 3 Pillars of Developer-Native Compliance

### 1. Zero-Tax Verification (The Google Lesson)
**The Problem:** Traditional QA processes slow developers down with context switching and manual data entry.
**The Solution:** At **Google**, Engineering Productivity (EngProd) tools served the engineer, not the process. We replace the "Gherkin Tax" with **Type-Safe Test Data Builders**, ensuring testing is a high-speed feedback loop that feels like coding, not bureaucracy.

### 2. Continuous Attestation (The CBA Lesson)
**The Problem:** In regulated industries like banking, shipping features is blocked by manual evidence gathering (screenshots, Word docs).
**The Solution:** We generate **Regulatory-Grade Evidence** as a direct side-effect of the CI/CD pipeline. Every test run produces two distinct artifacts:
- **Attestation Report**: A business-readable audit trail linking execution back to `pricing-strategy.md` for compliance officers.
- **Allure Report**: A technical dashboard for engineers to track flakiness and trends.

### 3. Autonomous Quality (The Scalability Lesson)
**The Problem:** Human testers (and developers) inevitably miss edge cases. Writing enough examples to cover every scenario is impossible.
**The Solution:** We move from "Example-Based Testing" to **Property-Based Testing (PBT)**. Instead of writing 50 separate test cases, we define a single **Invariant** (e.g., "Discount never exceeds 30%"). The machine then generates hundreds of randomized scenarios—negative numbers, massive quantities, distinct user types—proving the rule holds universally.

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

| Layer | Technology | Rationale |
| --- | --- | --- |
| **Frontend** | **Vite + React** | Instant feedback loops. No "Server Component" confusion. |
| **UI Lib** | **CSS Modules** | Standard, maintainable CSS without complex framework overhead. |
| **State** | **Zustand** | Minimalist state management that simplifies testing. |
| **Backend** | **Hono** | The "Feynman" of Backends. Ultra-light, standards-based replacement for Express. |
| **Database** | **SQLite + Drizzle** | Zero-config SQL database with full TypeScript schema validation. |
| **Testing** | **Vitest + Playwright** | The "Double Loop" engines for ATDD. |

#### Why this specific stack?
*   **Hono:** Removes boilerplate. Lets you teach "API Concepts" without fighting the framework.
*   **SQLite:** Removes the "DevOps Wall". Committable "seed" databases ensure every student starts with the same state.
*   **Drizzle:** Enables **Systemic Type Safety**. Backend schema changes instantly break frontend mocks (a good thing).

### Running the Project

```bash
# 1. Install dependencies (runs from root)
pnpm install

# 2. Run All Tests (Unit + E2E + Attestation Report)
# This uses the "Clean Room" runner for a self-contained verification
pnpm run test:all

# 3. Navigate to React app and start dev server
cd packages/client
pnpm run dev
```

### Running Tests Locally

#### Unit Tests (API Layer)

```bash
# Run from root
pnpm run test:unit

# Or from the vitest directory
cd packages/domain
pnpm test
```

#### E2E Tests (GUI Layer)

E2E tests use Playwright and require browser binaries. **First-time setup:**

```bash
# Install Playwright browsers (one-time, ~130MB download)
cd test
pnpm exec playwright install chromium

# Run E2E tests
pnpm test
```

**Notes:**
- Browsers are cached in `~/.cache/ms-playwright/` and won't re-download on subsequent installs
- CI automatically handles browser installation with caching
- Run `pnpm run test:all` from root to execute both unit and E2E tests together

#### Troubleshooting

| Issue | Solution |
|-------|----------|
| `Executable doesn't exist` | Run `pnpm exec playwright install chromium` |
| Tests timeout | Increase timeout in `playwright.config.ts` or check if dev server started |
| Port 5173 in use | Kill existing process: `lsof -ti:5173 | xargs kill` |

## 📁 Project Structure

This repository follows a monorepo structure to demonstrate ATDD patterns at different layers:

```
packages/
├── domain/              # Unit test layer: Pricing engine + Vitest
│   ├── src/            # Core business logic (PricingEngine)
│   ├── test/           # Property-based tests, integration tests
│   └── scripts/        # Attestation report generation
│
├── client/             # React frontend app
│   ├── src/
│   │   ├── components/ # Cart, checkout, product components
│   │   ├── pages/     # Home, Products, Cart, Checkout, Login, Register
│   │   ├── store/     # Zustand state management
│   │   └── lib/       # Auth, validation, utilities
│   └── ...
│
├── server/             # Hono API backend
│   ├── src/
│   │   ├── server/    # Routes, middleware
│   │   ├── lib/      # Logger, metrics, validation
│   │   └── db/       # Drizzle SQLite schema
│   └── ...
│
└── shared/            # Shared types, fixtures, arbitraries
    ├── src/           # Types, result, pricing engine
    └── fixtures/      # CartBuilder, Allure helpers, arbitraries

test/                   # E2E test layer: Playwright
├── e2e/               # End-to-end tests
│   ├── cart.ui.properties.test.ts
│   ├── checkout.ui.properties.test.ts
│   └── fixtures/      # invariant-helper, API seams
└── playwright.config.ts

comparison-gherkin/    # Gherkin/Cucumber anti-pattern demo
docs/                  # Business rules, patterns, and guidelines
reports/               # Generated attestation reports
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
- **Audit Evidence:** Open `reports/run-{timestamp}/attestation/attestation-full.html`
- **Engineering Trends:** `npm run reports:allure:serve` (Requires Java)

---

## 📚 Quick Reference

| Topic | Document |
|-------|----------|
| **Testing Framework** | [docs/TESTING_FRAMEWORK.md](docs/TESTING_FRAMEWORK.md) |
| **Teaching Guide** | [docs/TEACHING_GUIDE.md](docs/TEACHING_GUIDE.md) - Learn executable specs step-by-step |
| **CartBuilder Reference** | [docs/CARTBUILDER_REFERENCE.md](docs/CARTBUILDER_REFERENCE.md) - Quick reference |
| **API Testing Patterns** | [docs/API_TESTING_PATTERNS.md](docs/API_TESTING_PATTERNS.md) |
| **GUI Testing Patterns** | [docs/GUI_TESTING_PATTERNS.md](docs/GUI_TESTING_PATTERNS.md) |
| **Invariants & PBT** | [docs/reference/infinite-examples.md](docs/reference/infinite-examples.md) |
| **Type Safety** | [docs/reference/semantic-integrity.md](docs/reference/semantic-integrity.md) |
| **Business Rules** | [docs/pricing-strategy.md](docs/pricing-strategy.md) |

---

## 📚 Essential Reading

*   **[Reporting Architecture](packages/domain/reporting-architecture.md)** ⭐ **Viewing Allure reports requires HTTP server** - See this guide
*   **[The Shift Left Playbook](docs/guides/shift-left-playbook.md)** - How to coach teams through this transition.
*   **[Attestation Architecture](docs/reference/attestation-architecture.md)** - How we automate compliance.
*   **[Bug Discovery Evidence](docs/reference/bug-discovery-evidence.md)** - Real-world evidence that invariant tests catch bugs hand-written scenarios miss.

---

*This architecture is designed for Engineering Leaders who need to prove that "High Velocity" and "High Compliance" are not mutually exclusive.*