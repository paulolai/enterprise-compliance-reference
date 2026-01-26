# Onboarding Guide

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
pnpm run dev:frontend
```

In a separate terminal, start the backend:

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
├── implementations/
│   ├── typescript-vitest/        # Unit test layer (pricing engine)
│   │   ├── src/                  # Price calculation logic
│   │   └── test/                 # Property-based tests
│   ├── react-playwright/         # E2E test layer (full app)
│   │   ├── src/
│   │   │   ├── app/              # React components
│   │   │   ├── server/           # Hono API server
│   │   │   └── lib/              # Shared utilities
│   │   └── test/                 # Playwright E2E tests
│   └── shared/                   # Common types and schemas
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
| `implementations/shared/src/pricing-engine.ts` | Core pricing logic (domain layer) | Backend Team |
| `implementations/react-playwright/src/server/routes/pricing.ts` | Pricing API endpoint | Backend Team |
| `implementations/react-playwright/src/app/components/Cart.tsx` | Shopping cart UI | Frontend Team |
| `implementations/react-playwright/src/test/` | E2E tests | QA Team |
| `implementations/typescript-vitest/src/test/` | Unit tests | QA Team |

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

   In `implementations/typescript-vitest/src/test/pricing/volume-discount.properties.test.ts`:
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
   cd implementations/typescript-vitest && pnpm test
   ```

4. **Implement the Logic**

   Edit `implementations/shared/src/pricing-engine.ts`:
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
cd implementations/typescript-vitest
pnpm test                    # Run all tests
pnpm run test:watch          # Watch mode
pnpm run test:coverage       # Coverage report
pnpm run test:allure         # Generate Allure report
```

### E2E Tests (Playwright)

```bash
cd implementations/react-playwright
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

1. Define Zod schemas in `src/lib/validation/schemas.ts`
2. Create route in `src/server/routes/<domain>.ts`
3. Register route in `src/server/index.ts`
4. Write API test in `src/test/api/<domain>.api.test.ts`

### Adding a New UI Component

1. Create component file in `src/app/components/`
2. Add test in `src/test/gui/<component>.ui.test.ts`
3. Export and use in `src/app/App.tsx`

### Adding a New Domain Rule

1. Update `docs/pricing-strategy.md` (THE SOURCE OF TRUTH)
2. Write property test in `implementations/typescript-vitest/`
3. Implement rule in `implementations/shared/src/`
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
rm implementations/react-playwright/data/shop.db
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
