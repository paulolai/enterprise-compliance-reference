# Implementation Plan: Fix Repository into Proper Example

## Overview

Transform this repository from a disjointed demonstration into a cohesive, working e-commerce example that properly demonstrates ATDD with the Code-as-Specification pattern.

---

## Tech Stack Decisions

| Decision | Rationale |
|----------|-----------|
| **Custom CSS** | Zero dependencies, code is transparent, focus on ATDD patterns |
| **SQLite + Drizzle** | Real persistence, teaches systemic type safety, committable seed DBs |
| **Real Stripe sandbox** | Actual integration pattern, realistic payment flow that students will encounter |

---

## Issues Identified

### 1. Tech Stack Claims vs Reality
- **README claims**: shadcn/ui, SQLite + Drizzle
- **Reality**: Not installed
- **Impact**: README is misleading to new users

### 2. Disconnected Implementations
- `typescript-vitest/` has a PricingEngine tested with Vitest
- `react-playwright/` has a Hono API that doesn't use PricingEngine
- **Result**: No shared execution path between test layers

### 3. Incomplete Features
- Add to Cart: Only shows alert, doesn't update store
- No database for order persistence
- Debug routes: No index page to list scenarios
- No real payment flow

### 4. Navigation Issues
- `npm run dev` from root doesn't work
- Users must `cd` into subdirectories to run commands

---

## Implementation Plan

### ✅ Phase 1: Deep Domain Specs (COMPLETED)

Created domain specs following the deep understanding methodology in `DEEP_DOMAIN_UNDERSTANDING.md`:

**Files created** in `docs/specs/stories/`:
- [x] `01-pricing-calculation.md` - Domain: Pricing Calculation
- [x] `02-cart-management.md` - Domain: Cart Management
- [x] `03-payment-processing.md` - Domain: Payment Processing
- [x] `04-order-persistence.md` - Domain: Order Persistence
- [x] `05-debug-page.md` - Domain: Debug Page
- [x] `06-complete-checkout.md` - Domain: Complete Checkout

### ✅ Phase 2: Test Specifications (COMPLETED)

Written test files for all domains:

**API Integration Tests** (Playwright):
- [x] `implementations/react-playwright/src/test/api/pricing-api.spec.ts`
- [x] `implementations/react-playwright/src/test/api/debug-api.spec.ts`
- [x] `implementations/react-playwright/src/test/api/payments-api.spec.ts`
- [x] `implementations/react-playwright/src/test/api/orders-api.spec.ts`

**Unit Tests** (Vitest):
- [x] `implementations/typescript-vitest/test/database/schema.spec.ts`
- [x] `implementations/typescript-vitest/test/database/migrations.spec.ts`

**E2E Tests** (Playwright):
- [x] Updated `implementations/react-playwright/src/test/e2e/cart.ui.properties.test.ts` (added tests for persistence, price preservation, merging)
- [x] `implementations/react-playwright/src/test/e2e/debug-index-page.ui.spec.ts`
- [x] `implementations/react-playwright/src/test/e2e/checkout-complete-flow.ui.test.ts`

### ✅ Phase 3: Implementation (IN PROGRESS)

**Database Schema** (COMPLETED):
- [x] `implementations/shared/src/db/schema.ts` - Drizzle schema (orders, orderItems, products)
- [x] `implementations/shared/src/db/index.ts` - Database connection with better-sqlite3
- [x] `implementations/shared/src/db/seed.ts` - Seed data script (11 products)
- [x] `drizzle.config.ts` - Drizzle kit configuration
- [x] Installed `drizzle-orm`, `better-sqlite3`, `drizzle-kit`

**API Routes** (COMPLETED):
- [x] `implementations/react-playwright/src/server/routes/orders.ts`
- [x] `implementations/react-playwright/src/server/routes/products.ts`
- [x] All routes registered in `src/server/index.ts`

**Bug Fixes** (COMPLETED):
- [x] Add to Cart - Functionality connected to Zustand store in `ProductDetail.tsx`.

**Remaining**:
- [ ] `implementations/react-playwright/src/server/routes/payments.ts` - Stripe integration
- [x] `implementations/react-playwright/src/pages/debug/index.tsx` - Debug index page
- [x] Root package.json scripts
- [ ] Run final verification tests

---

## Phase 1: Quick Wins (Document Current State) (COMPLETED)

**File**: `README.md` (already started)
- [x] Add WIP banner at top
- [x] Add TODOs for incorrect tech stack entries
- [x] Add folder structure section
- [x] Update running commands
- [x] Remove TODOs and finalize tech stack table

**File**: `AGENTS.md`
- [x] Add repository structure reference table

---

### Phase 2: Fix Core Integration (P0) (COMPLETED)

#### 2.1 Connect PricingEngine to Hono API

**File**: `implementations/react-playwright/src/server/routes/pricing.ts`

Currently this likely has a stub. Need to:
1. Import the PricingEngine from shared
2. Call it with cart/user inputs
3. Return pricing result

**File**: `implementations/shared/src/pricing-engine.ts`
- [x] Ensure it's exported properly for consumption by Hono

#### 2.2 Fix "Add to Cart" functionality

**File**: `implementations/react-playwright/src/components/cart/` (check components)
- [x] Find where "Add to Cart" UI elements are
- [x] Replace `window.alert()` with actual `useCartStore.addItem()` call
- [x] Update badge to reflect real cart count

---

### Phase 3: Add Debug Index Page (IN PROGRESS)

**New File**: `implementations/react-playwright/src/pages/debug/index.tsx`

Create a debug index page that:
1. Lists all available debug endpoints
2. Shows available URL parameters for each
3. Provides buttons/links to navigate to scenarios
4. Displays current cart state (for debugging)

Features:
- Link to `/debug/cart-view?scenario=vip`
- Link to `/debug/cart-view?scenario=bulk`
- Link to `/debug/cart-view?scenario=bundle`
- Link to `/debug/checkout`
- Show current store state snapshot
- Quick reset button

Update `implementations/react-playwright/src/App.tsx` to add route for `/debug`

---

### Phase 4: SQLite + Drizzle Implementation (P1) (COMPLETED)

#### 4.1 Setup Database Layer

**Files to create**:
- [x] `implementations/shared/src/db/schema.ts` - Drizzle schema definitions
- [x] `implementations/shared/src/db/index.ts` - Database connection and client
- [x] `implementations/shared/src/db/seed.ts` - Seed data for dev/testing

**Schema**:
```typescript
// orders, order_items, products tables
// Proper types matching shared domain models
```

#### 4.2 Install Dependencies

**Root package.json**:
- [x] Installed `drizzle-orm`, `better-sqlite3`, `drizzle-kit`

#### 4.3 Create API Routes

**File**: `implementations/react-playwright/src/server/routes/orders.ts`
- [x] POST `/api/orders` - Create order
- [x] GET `/api/orders/:id` - Get order details
- [x] GET `/api/orders/user/:userId` - Get user's orders

**File**: `implementations/react-playwright/src/server/routes/products.ts`
- [x] GET `/api/products` - Get product catalog (replace static store data)
- [x] GET `/api/products/:sku` - Get single product

---

### Phase 5: Stripe Integration (P1)

#### 5.1 Setup Stripe

**Install**: `stripe` package

**Create**: `implementations/react-playwright/src/server/routes/payments.ts`
- POST `/api/payments/create-intent` - Create Stripe PaymentIntent
- POST `/api/payments/confirm` - Confirm payment, create order

**Environment**: Add to `.env.example`:
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=...
```

#### 5.2 Update Checkout Page

**File**: `implementations/react-playwright/src/pages/CheckoutPage.tsx`
- Integrate Stripe Elements for payment form
- Call PaymentIntent creation API
- Handle success/failure states
- Redirect to order confirmation

---

### Phase 6: Finalize README

**File**: `README.md`

Remove TODOs and update "Clean Room Teaching Stack" table:

| Layer | Technology | Rationale |
| --- | --- | --- |
| **Frontend** | **Vite + React** | Instant feedback loops. |
| **UI Components** | **Custom CSS** | Minimal dependencies, focus on ATDD patterns. |
| **State Management** | **Zustand** | Simple, TypeScript-first state with persistence. |
| **Backend** | **Hono** | Ultra-light, standards-based replacement for Express. |
| **Database** | **SQLite + Drizzle** | Zero DevOps with systemic type safety. |
| **Payments** | **Stripe** | Real-world payment integration pattern. |
| **Testing** | **Vitest + Playwright** | The "Double Loop" engines for ATDD. |

Add section explaining the multi-implementation structure:
- Why we have separate `typescript-vitest/` and `react-playwright/`
- How they represent different ATDD layers (unit vs E2E)
- How the shared `PricingEngine` is the "golden path"

---

### Phase 7: Root-Level Convenience Commands

**File**: `package.json` (root)

Add scripts:
```json
{
  "scripts": {
    "dev:frontend": "cd implementations/react-playwright && npm run dev",
    "dev:backend": "cd implementations/react-playwright && npm run dev:with-server",
    "test:unit": "cd implementations/typescript-vitest && npm test",
    "test:e2e": "cd implementations/react-playwright && npm test",
    "test:all": "npm run test:unit && npm run test:e2e",
    "db:generate": "drizzle-kit generate",
    "db:push": "drizzle-kit push",
    "db:seed": "node implementations/shared/src/db/seed.js"
  }
}
```

---

### Phase 8: Unify Test Reporting

**Issue**: Vitest runs generate attestation reports, Playwright runs use allure-report

**Solution**: Create a unified script that:
1. Runs Vitest tests (generates attestation)
2. Runs Playwright tests (generates allure)
3. Generates combined report

**File**: `scripts/run-all-tests.sh` (new)

---

## File Changes Summary

| File/Directory | Action | Description |
|----------------|--------|-------------|
| `README.md` | Update | Finalize tech stack, add structure docs |
| `AGENTS.md` | Update | Already done - added structure reference |
| `implementations/react-playwright/src/server/routes/pricing.ts` | Fix | Connect to PricingEngine |
| `implementations/react-playwright/src/pages/debug/index.tsx` | Create | Debug index page |
| `implementations/react-playwright/src/App.tsx` | Update | Add `/debug` route |
| `implementations/shared/src/db/` | Create | Database layer (schema, connection, seeds) |
| `implementations/react-playwright/src/server/routes/orders.ts` | Create | Orders API |
| `implementations/react-playwright/src/server/routes/products.ts` | Create | Products API |
| `implementations/react-playwright/src/server/routes/payments.ts` | Create | Stripe integration |
| `implementations/react-playwright/src/pages/CheckoutPage.tsx` | Update | Stripe Elements integration |
| `package.json` | Update | Add convenience scripts, Stripe, Drizzle deps |
| `drizzle.config.ts` | Create | Drizzle configuration |
| `.env.example` | Update | Add Stripe keys |
| `scripts/run-all-tests.sh` | Create | Unified test runner |

---

## Verification Steps

1. Run `npm run db:push && npm run db:seed` - Should set up database
2. Run `npm run test:unit` - Should execute Vitest tests
3. Run `npm run dev:frontend` - Should start React dev server
4. Navigate to `/debug` - Should see debug index page
5. Click debug scenario - Should navigate with seeded state
6. Add items to cart - Should actually add to cart state
7. Checkout with Stripe - Should create PaymentIntent and order
8. Run `npm test:e2e` - Should execute Playwright tests
9. Check attestation report - Should show test results
