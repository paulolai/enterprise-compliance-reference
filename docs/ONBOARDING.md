# Shift Left Reference Architecture: Onboarding Guide

Welcome to the Executable Specifications Demo! This guide will help you get set up and productive quickly.

---

## Prerequisites

Before you begin, ensure you have the following installed:

| Tool | Minimum Version | Installation |
|------|-----------------|--------------|
| Node.js | 18.x or higher | [nodejs.org](https://nodejs.org/) |
| pnpm | 9.x | `npm install -g pnpm` |

Verify your installation:

```bash
node --version  # Should be v18 or higher
pnpm --version  # Should be v9.x
```

---

## One-Command Local Setup

Get up and running with a single command:

```bash
git clone https://github.com/your-org/executable-specs-demo.git && cd executable-specs-demo
pnpm install
```

Start the application services (in separate terminals):

**Terminal 1 (Frontend):**
```bash
pnpm run dev:frontend
```

**Terminal 2 (Backend):**
```bash
pnpm run dev:backend
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **API**: http://localhost:5173/api

---

## Architecture Overview

```
executable-specs-demo/
├── docs/                          # Business requirements and patterns
│   ├── pricing-strategy.md       # The Source of Truth (business rules)
│   ├── TESTING_FRAMEWORK.md      # Testing standards
│   └── ARCHITECTURE_DECISIONS.md # Design rationale
├── packages/
│   ├── domain/                   # Unit test layer (pricing engine)
│   │   ├── src/                  # Price calculation logic
│   │   └── test/                 # Property-based tests
│   ├── client/                   # React frontend app
│   │   ├── src/                  # React components & Hono API server
│   │   └── ...
│   ├── server/                   # Backend API server
│   │   └── src/                  # Hono routes & Drizzle DB
│   └── shared/                   # Common types and schemas
├── test/                         # E2E test layer (Playwright)
│   ├── e2e/                      # End-to-end user journey tests
│   └── ...
└── reports/                      # Generated attestation reports
```

### Key Architectural Principles

1. **Zod-First**: All validation uses Zod schemas; types derive from schemas
2. **Property-Based Testing**: Prefer invariants over examples
3. **Test Data Builders**: Fluent interfaces for readable test setup
4. **No Translation Layer**: Tests use the same TypeScript domain models as production

---

## Key Files and Responsibilities

| File | Purpose | Owner |
|------|---------|-------|
| `docs/pricing-strategy.md` | Business requirements - THE SOURCE OF TRUTH | Product/Domain Team |
| `packages/shared/src/pricing-engine.ts` | Core pricing logic (domain layer) | Backend Team |
| `packages/server/src/routes/pricing.ts` | Pricing API endpoint | Backend Team |
| `packages/client/src/components/Cart.tsx` | Shopping cart UI | Frontend Team |
| `test/e2e/` | E2E tests | QA Team |
| `packages/domain/test/` | Unit tests | QA Team |

---

## Making Your First Change

### Example: Add a Volume Discount Rule

1. **Update the Business Source of Truth**

   Edit `docs/pricing-strategy.md`:
   ```markdown
   ## 5. Volume Discount
   Orders totaling over $500 receive 5% off base shipping.
   ```

2. **Write a Property Test First**

   In `packages/domain/test/pricing/volume-discount.properties.test.ts`:
   ```typescript
   it('should apply 5% shipping discount for orders over $500', () => {
     fc.assert(
       fc.property(
         fc.array(fixedCartItem()),
         (items) => {
           const cart = { items, shippingMethod: ShippingMethod.STANDARD };
           const result = calculate(cart);
           // ... invariant check
         }
       )
     );
   });
   ```

3. **Run Tests** (should fail initially)
   ```bash
   cd packages/domain && pnpm test
   ```

4. **Implement the Logic**

   Edit `packages/shared/src/pricing-engine.ts`:
   ```typescript
   if (baseTotal > 50000) {  // $500 in cents
     shippingCents = Math.round(shippingCents * 0.95);
   }
   ```

5. **Verify All Tests Pass**
   ```bash
   pnpm run test:all
   ```

6. **Generate Attestation Report**
   ```bash
   pnpm run reports:attestation
   # Open reports/latest/attestation-full.html
   ```

---

## Running Tests Locally

### Unit Tests (Vitest)

```bash
cd packages/domain
pnpm test                    # Run all tests
pnpm run test:watch          # Watch mode
pnpm run test:coverage       # Coverage report
pnpm run test:allure         # Generate Allure report
```

### E2E Tests (Playwright)

```bash
cd test
pnpm test                    # Run all tests (headless)
pnpm run test:headed         # Run with visible browser
pnpm run test:ui             # Playwright Test UI
```

### All Tests (Root)

```bash
pnpm run test:unit            # Run unit tests
pnpm run test:e2e             # Run E2E tests
pnpm run test:all             # Run all test suites
```

---

## Common Workflows

### Adding a New API Endpoint

1. Define Zod schemas in `packages/shared/src/types.ts`
2. Create route in `packages/server/src/routes/<domain>.ts`
3. Register route in `packages/server/src/index.ts`
4. Write API test in `test/api/<domain>.api.test.ts`

### Adding a New UI Component

1. Create component file in `packages/client/src/components/`
2. Add test in `test/e2e/<component>.ui.test.ts`
3. Export and use in `packages/client/src/App.tsx`

### Adding a New Domain Rule

1. Update `docs/pricing-strategy.md` (THE SOURCE OF TRUTH)
2. Write property test in `packages/domain/test/`
3. Implement rule in `packages/shared/src/`
4. Verify E2E tests cover the behavior

---

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 5173
lsof -i :5173  # macOS/Linux
netstat -ano | findstr :5173  # Windows

# Kill the process or change PORT in .env
```

### Database Locked

SQLite locks occur when multiple processes try to write simultaneously. This is expected behavior and will resolve automatically. If it persists:

```bash
rm packages/server/data/shop.db
pnpm run db:seed
```

### CORS Errors

Ensure your `.env` has the correct `CORS_ORIGINS`:
```bash
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

## Next Steps

1. Read `docs/pricing-strategy.md` - understand the business domain
2. Read `docs/TESTING_FRAMEWORK.md` - learn the testing patterns
3. Try running `pnpm run test:all` - verify everything works
4. Explore the test code - see how property-based tests work
5. Make a small change - modify a business rule and watch tests update

---

## Need Help?

- Review `docs/ARCHITECTURE_DECISIONS.md` for design rationale
- Check existing tests for patterns to follow
- Run with `LOG_LEVEL=debug` for verbose output
- Check `reports/latest/attestation-full.html` for test trace information
