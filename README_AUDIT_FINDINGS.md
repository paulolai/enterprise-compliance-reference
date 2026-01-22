# README Audit Findings

Date: 2026-01-23

## Summary

The root README.md describes a comprehensive "Shift Left Reference Architecture" full-stack application that **does not exist**. While many components are present, the README makes claims about technologies and workflows that are missing or incorrect.

---

## What DOES Exist

| Technology | Location | Notes |
|------------|----------|-------|
| **Vite + React** | `implementations/react-playwright/` | Frontend with multiple pages |
| **Hono backend** | `implementations/react-playwright/src/server/` | API routes for pricing, auth, debug |
| **Vitest** | `implementations/typescript-vitest/` | Unit tests for pricing engine |
| **Playwright** | `implementations/react-playwright/` | E2E tests |
| **Property-Based Testing** | `fast-check` | Used in both implementations |
| **Allure Reports** | Root and subdirectories | For test reporting |
| **Attestation Reports** | `reports/` | Custom compliance reports |
| ** Zustand** | `implementations/react-playwright/` | State management |
| **React Router** | `implementations/react-playwright/` | Routing |

| Pages/Features | Location |
|---------------|----------|
| HomePage, ProductsPage, ProductDetailPage | `implementations/react-playwright/src/pages/` |
| CartPage, CheckoutPage | `implementations/react-playwright/src/pages/` |
| LoginPage, RegisterPage | `implementations/react-playwright/src/pages/` |
| Pricing Engine (domain logic) | `implementations/typescript-vitest/src/pricing-engine.ts` |

---

## What is MISSING (Claims vs Reality)

| README Claim | Reality |
|--------------|---------|
| **shadcn/ui** | Not installed anywhere in the repo |
| **SQLite** | No database layer found |
| **Drizzle ORM** | Not installed anywhere |
| `npm run dev` (from root) | Script doesn't exist at root level. Must use `cd implementations/react-playwright && npm run dev` |
| "Clone-and-Run" simplicity | Requires navigating to subdirectories, running separate test suites |
| Full e-commerce cart system | Basic components exist but no complete cart functionality |

---

## Actual Folder Structure

```
implementations/
├── typescript-vitest/     # Core pricing engine + Vitest unit tests
│   ├── src/               # Pricing engine business logic
│   ├── test/              # Vitest tests (properties, integration)
│   └── scripts/           # Attestation report generation
│
├── react-playwright/      # React app + Playwright E2E tests + Hono API
│   ├── src/               # React frontend
│   │   ├── components/    # cart, checkout, product, UI components
│   │   ├── pages/         # Home, Products, Cart, Checkout, Login, Register
│   │   ├── server/        # Hono backend API
│   │   ├── store/         # Zustand state management
│   │   └── providers/     # React context providers
│   └── test-results/      # Playwright test output
│
├── shared/                # Shared types/utilities
└── typescript-cucumber/   # Cucumber implementation (for comparison docs)
```

---

## Root Scripts vs Subdirectory Scripts

### Root commands (existing):
```bash
npm test                    # Runs tests in typescript-vitest only
npm run reports:attestation # Generates attestation reports
npm run reports:allure      # Generates Allure reports from root
npm run docs:fix            # Auto-generates TOCs in docs/
```

### Subdirectory commands (not documented in README):
```bash
# React app dev server
cd implementations/react-playwright && npm run dev

# Run Playwright E2E tests
cd implementations/react-playwright && npm test

# Run Vitest tests
cd implementations/typescript-vitest && npm test
```

---

## Specific README Sections Needing Updates

### 1. "The 'Clean Room' Teaching Stack" table
- Remove `shadcn/ui` (not installed)
- Remove `SQLite + Drizzle` (not installed)
- Update rationale to match actual stack

### 2. "Running the Project" section
- Fix `npm run dev` - doesn't work from root
- Document need to `cd` into subdirectories
- Document separate test runners (Vitest vs Playwright)

### 3. "Viewing the Artifacts" section
- Currently appears accurate for Allure and Attestation reports

### 4. Architecture explanation
- Should explain the multi-implementation approach (typescript-vitest vs react-playwright)
- Document what each implementation demonstrates

---

## Recommended Readme Updates

1. **Remove shadcn/ui references entirely**
2. **Remove SQLite/Drizzle mentions**
3. **Add folder structure section** after "Getting Started"
4. **Update "Running the Project"** with accurate commands
5. **Clarify this is a demonstration/teaching repo**, not a production reference architecture
6. **Document the multi-implementation pattern** (unit vs E2E layers)

---

## AGENTS.md Alignment

AGENTS.md references docs that explain the patterns but doesn't document the actual folder structure. Should either:
- Reference a new folder structure section in README
- Include its own lightweight copy of the structure

Current docs referenced in AGENTS.md:
- `docs/pricing-strategy.md` - Business rules (exists)
- `docs/TESTING_FRAMEWORK.md` - Testing standards (exists)
- `docs/TS_PROJECT_GUIDELINES.md` - TS best practices (exists)
- `docs/ARCHITECTURE_DECISIONS.md` - Architecture rationale (exists)

---

## What's Missing for Complete Implementation

### Core Functionality Gaps

| Feature | Current Status | What's Needed |
|---------|----------------|---------------|
| **Add to Cart** | ⚠️ UI alert only | Actual cart state update (event dispatched but not handled by store) |
| **Database** | ❌ None | SQLite + Drizzle ORM for order persistence |
| **Real Auth** | ⚠️ Mock only | Password auth, sessions, JWT tokens |
| **Checkout Payment** | ⚠️ Basic UI | Real payment processing, order creation |
| **Product Search** | ❌ None | Search functionality |
| **Order History** | ❌ None | User's past orders page |
| **Admin Panel** | ❌ None | Manage products, view orders |

### Integration Gaps

The two test layers exist independently but aren't connected:

```
typescript-vitest/           react-playwright/
├── PricingEngine.ts   ──X──>  └── (doesn't consume PricingEngine.js)
├── Unit tests (Vitest)      └── E2E tests (Playwright)
└── Attestation reports     └── Different test reporting paths
```

**Critical Issue:** The Hono API at `/api/pricing` doesn't use the same `PricingEngine` that's tested by Vitest. There's no shared execution path.

### Debug Routes (State)

**No auto-generated index exists.** There are two manual debug pages:
- `/debug/cart-view` - `CartDebugPage.tsx` - Visual debugging for cart states
- `/debug/checkout` - `CheckoutDebugPage.tsx` - Checkout flow debugging

A debug index page that lists and links all scenarios would improve developer experience.

### Priority Order for Completion

| Priority | Task | Why |
|----------|------|-----|
| P0 | Connect pricing API to PricingEngine | Core business logic integration |
| P0 | Implement "Add to Cart" functionality | Minimal viable flow |
| P1 | Add SQLite + Drizzle for orders | Real app behavior |
| P1 | Implement checkout payment flow | End-to-end purchase |
| P1 | Unify test reporting (single attestation) | Single source of truth |
| P2 | Add search & order history | Better UX |
| P3 | Admin panel | Product management |

### What Actually Works Today

- ✅ Product catalog display (11 products across 3 categories)
- ✅ Product filtering by category
- ✅ Cart state management (Zustand with localStorage persistence)
- ✅ Debug teleport API (`POST /api/debug/seed-session`) for test scenarios
- ✅ Pricing engine unit tests (Vitest + fast-check with 100+ properties)
- ✅ E2E test framework (Playwright)
- ✅ Attestation report generation from Vitest runs
- ✅ Auth seeding API for test users
