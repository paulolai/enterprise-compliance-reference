# Plan: Staff/Principal Level Production-Ready Implementation

## Executive Summary

This plan elevates the checkout flow implementation from "working code" to an exemplar demonstrating:
- **Software Engineering**: Clean architecture, Zod-first types, domain-driven design
- **Quality Engineering**: Test coverage, property-based tests, test data builders
- **SRE**: Observability, reliability patterns, graceful degradation, deployment
- **Platform Engineering**: Health checks, infrastructure as code patterns
- **Engineering Leadership**: Documentation, architecture decisions, onboarding

**Key Principle: Zod-First Architecture**
- Zod schemas are the single source of truth for all runtime validation
- TypeScript types derive from schemas via `z.infer<>`
- Environment config validated at startup (fails fast)
- API requests validated at boundaries with detailed field errors
- Never have separate type definitions that can drift from validation

**Status:** Checkout flow committed (`486fa09`) - 8/39 E2E tests failing

**Existing ADRs:** See `docs/ARCHITECTURE_DECISIONS.md` (13 decisions documented)

---

## Part 1: E2E Test Fixes (Immediate Priority)

### Failing Tests (8 total)

| # | Test | Root Cause |
|---|------|------------|
| 1 | Add to cart preserves price | Missing `cart-item-price-{sku}` test ID |
| 2 | Pricing accuracy in checkout | Strict mode: 2 elements match `/shipping/i` |
| 3 | VIP discount in checkout | localStorage not persisting across navigation |
| 4 | Debug index loads | Strict mode: 2 elements match `/debug/i` |
| 5 | Reset button clears state | Add-to-cart button shows alert only |
| 6 | Debug page dev-only marked | Strict mode: 6 elements match pattern |
| 7 | Empty Cart scenario | Add-to-cart button broken |
| 8 | VIP User scenario | Add broken + localStorage issue |

### Phase 1: Fix Add-to-Cart Functionality

**File:** `implementations/react-playwright/src/pages/ProductDetailPage.tsx`
- Connect button to Zustand `addToCart` action
- Add loading/error state

### Phase 2: Fix LocalStorage Seeding Pattern

**File:** `implementations/react-playwright/src/test/e2e/checkout-complete-flow.ui.test.ts`
- Replace `page.evaluate()` with `context.addInitScript()`
- This demonstrates understanding of browser lifecycle and React hydration

### Phase 3: Add Missing Test IDs

**Files:**
- `implementations/react-playwright/src/components/ui/PriceDisplay.tsx`
- `implementations/react-playwright/src/components/cart/CartItem.tsx`
- Add optional `testId` prop pattern for testability

### Phase 4: Fix Strict Mode Violations

- Use specific selectors instead of regex patterns
- Demonstrates thoughtful test design

---

## Part 2: Software Engineering Excellence

### 2.1 Domain-Driven Design Patterns (Zod-First)

**Philosophy:** Zod schemas are the source of truth. All TypeScript types are derived via `z.infer<>`. This ensures validation and types are always in sync.

| Component | Action | Zod Pattern |
|-----------|--------|-------------|
| `domain/cart/schema.ts` | Cart domain Zod schemas | `const cartItemSchema = z.object(...); export type CartItem = z.infer<typeof cartItemSchema>` |
| `domain/cart/fns.ts` | Pure functions on validated data | Functions accept `z.infer<>` types, return typed Results |
| `domain/pricing/schema.ts` | Pricing domain Zod schemas | All pricing inputs/outputs as schemas |
| `domain/pricing/invariants.ts` | Documented PBT invariants | Properties tested against schema-generated values |

**Example Pattern:**
```typescript
// schema.ts - Single source of truth
export const cartItemSchema = z.object({
  sku: z.string().min(1),
  name: z.string(),
  price: centsSchema,
  quantity: z.number().int().positive(),
  weightInKg: z.number().nonnegative(),
});

// Type derived automatically - never drifts
export type CartItem = z.infer<typeof cartItemSchema>;
export type CartItemCreate = z.input<typeof cartItemSchema>;  // Raw input type
```

### 2.2 Error Handling Architecture

**File:** `implementations/react-playwright/src/lib/errors.ts` (New)

```typescript
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public cause?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public fields: Record<string, string>) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}
```

**Files to update:** All API routes to use typed errors
**Existing Reference:** ADR-10: Result Pattern for Error Handling

### 2.3 TypeScript Excellence

| Action | File | Status |
|--------|------|--------|
| Strict mode checklist | `tsconfig.json` | Verify `strict: true` |
| Remove remaining `any` | grep -r "as any" src/ | Cleanup needed |
| Discriminated unions for API responses | `lib/api.ts` | New file |
| Generic utilities (Result type) | `shared/src/result.ts` | ✅ Already exists (42 tests) |

### 2.4 State Management Patterns

| Pattern | Implementation | Reference |
|---------|----------------|-----------|
| State selectors | Add derived state to cart store | Zustand patterns |
| Action creators | Keep actions pure and testable | - |
| State normalization | Consider if needed for orders | - |

---

## Part 3: SRE/Observability Excellence

### 3.1 Structured Logging

**File:** `implementations/react-playwright/src/lib/logger.ts` (New)

```typescript
interface LogContext {
  userId?: string;
  request_id: string;
  action: string;
  [meta: string]: unknown;
}

export const logger = {
  child(context: Partial<LogContext>): Logger { /* ... */ },
  info(message: string, context?: Partial<LogContext>) { /* ... */ },
  error(message: string, error: unknown, context?: Partial<LogContext>) { /* ... */ },
  // metrics, tracing hooks
};
```

**Integration:**
- Middleware in `server/index.ts` to add `request_id`
- All API routes use `logger.child({ action: '...' })`
**Reference:** ADR-12: Deep Observability (Mandatory Tracing)

### 3.2 Health Check & Readiness

**File:** `implementations/react-playwright/src/server/routes/health.ts` (New)

```typescript
// /health - liveness probe (app running)
// /readyz - readiness probe (dependencies ready)
// /livez - detailed health status
```

Checks:
- Database connectivity
- Stripe API (if configured)
- Memory usage
- Request latency bucketing

### 3.3 Metrics Framework

**File:** `implementations/react-playwright/src/lib/metrics.ts` (New)

```typescript
export const metrics = {
  counter: {
    httpRequestsTotal: (method: string, path: string, status: number) => void,
    cartAdditions: (userId?: string) => void,
    checkoutsStarted: (userId?: string) => void,
    checkoutsCompleted: (userId?: string, value: number) => void,
  },
  histogram: {
    requestDuration: (action: string, durationMs: number) => void,
    pricingCalculationTime: (itemCount: number, durationMs: number) => void,
  },
  gauge: {
    activeUsers: () => void,
    databaseConnections: () => void,
  },
};
```

### 3.4 Error Tracking

| Feature | Implementation |
|---------|----------------|
| Error boundaries | React ErrorBoundary with Sentry integration point |
| API error aggregation | Centralized error response format |
| Error rate sampling | Don't log every repeated error |

---

## Part 4: Quality Engineering Excellence

### 4.1 Test Infrastructure

**File:** `implementations/react-playwright/src/test/setup/test-utils.ts` (New)

```typescript
// Reusable test utilities
export { renderWithStore } from './render-with-store';
export { waitForCartState } from './wait-for-predicates';
export { mockAPI } from './api-mocking';
```

**Reference:** ADR-7: Shared Core Pattern (CartBuilder exists)

### 4.2 Test Data Builders

**Files:** `implementations/react-playwright/src/test/builders/` (Add to existing)

```typescript
// cart-builder.ts - Extends existing shared builder
export class PageBuilder {
  private cart: CartItem[];
  private user: User;
  // Fluent interface for setting up complete page state
}
```

**Reference:** `implementations/shared/fixtures/cart-builder.ts` already exists

### 4.3 Property-Based Tests

**File:** `implementations/react-playwright/src/test/properties/cart-invariants.test.ts` (New)

Document and prove cart invariants:
- Total price equals sum of item prices minus discounts
- VIP discount only applies when tenure >= 3 years
- Free shipping threshold exactly $100

**Reference:** ADR-3: Property-Based Testing First

### 4.4 Contract Tests

**Files:** `implementations/react-playwright/src/test/api/contract/` (New)

Test API contracts:
- Request/response schemas validated
- Error codes consistent
- Rate limiting responses handled

**Reference:** ADR-6: Network Mocking Strategy (Split Brain)

---

## Part 5: Security & Compliance

### 5.1 Comprehensive Zod Validation Pipeline

**Philosophy:** Zod is the single source of truth for all runtime validation. Types for testing, runtime validation, and API contracts should all derive from Zod schemas.

**File:** `implementations/react-playwright/src/lib/validation.ts` (New)

```typescript
// Request schemas - validate at API boundary
export const requestSchemas = {
  createOrder: z.object({
    userId: z.string().email(),
    items: z.array(cartItemSchema).min(1),
    total: centsSchema,
    pricingResult: pricingResultSchema,
    shippingAddress: addressSchema,
    stripePaymentIntentId: z.string(),
  }),
  processPayment: z.object({
    paymentIntentId: z.string(),
    cartItems: z.array(cartItemSchema).min(1),
    shippingAddress: addressSchema,
  }),
};

// Middleware helper
export const validateRequest = (schema: z.ZodSchema) => async (c, next) => {
  try {
    const body = await c.req.json();
    const validated = schema.parse(body);
    c.set('validatedBody', validated);
    await next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({
        error: 'Validation failed',
        fields: error.flatten().fieldErrors,
      }, 400);
    }
    throw error;
  }
};
```

**Files to create:**
- `src/lib/validation/schemas.ts` - All Zod schemas centralized
- `src/lib/validation/middleware.ts` - Validation middleware

**Integration:** All API routes use `validateRequest(requestSchemas.xxx)` before handlers

**Reference:** Types already use Zod in `shared/src/types.ts` - expand to cover all input/output boundaries

### 5.2 Security Headers Middleware

**File:** `implementations/react-playwright/src/server/middleware/security.ts` (New)

```typescript
export const securityHeaders = async (c, next) => {
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '1; mode=block');
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  c.header('Content-Security-Policy', CSP_POLICY);
  await next();
};
```

### 5.3 Rate Limiting

**File:** `implementations/react-playwright/src/server/middleware/rate-limit.ts` (New)

```typescript
// Different limits per endpoint
const limits = {
  '/api/auth/login': { window: 15 * 60, max: 5 }, // 5 per 15min
  '/api/payments/create-intent': { window: 60, max: 10 }, // 10 per minute
  '/api/pricing/calculate': { window: 60, max: 50 }, // 50 per minute
};
```

### 5.4 CORS Configuration

**File:** `implementations/react-playwright/src/server/middleware/cors.ts` (New)

Environment-aware CORS with credentials support.

---

## Part 6: Platform Engineering Excellence

### 6.1 Configuration Management (Zod-Validated)

**File:** `implementations/react-playwright/src/lib/env.ts` (New)

**Pattern:** Environment variables validated at startup using Zod. Fails fast on invalid config.

```typescript
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_PATH: z.string().default('./data/shop.db'),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  CORS_ORIGINS: z.string().transform(s => s.split(',') ?? ['http://localhost:5173']),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  PORT: z.coerce.number().default(5173),
});

// Fails fast on invalid env - type-safe access guaranteed
export const env = envSchema.parse(process.env);

// Type derived from schema
export type Env = z.infer<typeof envSchema>;
```

### 6.2 Graceful Shutdown

**File:** `implementations/react-playwright/src/server/shutdown.ts` (New)

```typescript
export const setupGracefulShutdown = (server: Server) => {
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, starting graceful shutdown...`);
    // Stop accepting new connections
    // Wait for in-flight requests (with timeout)
    // Close database connections
    // Flush logs/metrics
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};
```

### 6.3 Deployment Artifacts

**Files to create:**
- `.env.example` - All configuration documented
- `Dockerfile` - Containerized deployment
- `docker-compose.yml` - Local development with DB
- `.k8s/` - Kubernetes manifests (example)
- `terraform/` - Infrastructure as code (example)

---

## Part 7: Engineering Leadership Artifacts

### 7.1 Additional Architecture Decisions

**Folder:** `docs/adr/`

Existing ADRs (13 total): See `docs/ARCHITECTURE_DECISIONS.md`

Potential additions:
- 014: Stripe integration approach for checkout
- 015: Database transaction handling for orders
- 016: Session/token strategy for authentication

### 7.2 Onboarding Documentation

**File:** `docs/ONBOARDING.md` (New)

- Local setup (one command)
- Architecture overview diagram
- Key files and their responsibilities
- Making your first change
- Running tests locally

### 7.3 API Documentation

**File:** `docs/API.md` (New)

Each endpoint documented with:
- Description
- Authentication requirements
- Request schema
- Response schema (200, 4xx, 5xx)
- Rate limits
- Example curl command

### 7.4 Runbooks

**Folder:** `docs/runbooks/` (New)

- `checkout-failure.md` - Troubleshooting checkout issues
- `stripe-webhook.md` - Handling Stripe callbacks
- `database-recovery.md` - Backup/restore procedures

---

## Implementation Roadmap

### Sprint 1 (IN PROGRESS): E2E Tests + Quick Wins
- [ ] Fix 8 failing E2E tests (including localStorage seeding issue)
- [x] Add convenience scripts to root `package.json`
- [ ] Add `.env.example`
- [x] Connect "Add to Cart" to Zustand store
- [ ] Remove `window.alert()`, add toast
- [ ] Clean up `console.log` -> logger
- [x] Update README and Plan documents

### Sprint 2: SRE Foundation
- [ ] Structured logging (`lib/logger.ts`)
- [ ] Health check endpoints
- [ ] Security headers middleware
- [ ] CORS configuration
- [ ] Environment validation

### Sprint 3: Quality Foundation
- [ ] Error hierarchy (`lib/errors.ts`)
- [ ] Test utilities (`test/setup/`)
- [ ] Test data builders (`test/builders/`)
- [ ] Property-based test invariants doc

### Sprint 4: Observability
- [ ] Metrics framework (`lib/metrics.ts`)
- [ ] Request tracing (request IDs)
- [ ] Error boundary integration
- [ ] API contract tests

### Sprint 5: Documentation & Deployment
- [ ] Additional ADRs (optional)
- [ ] Onboarding guide
- [ ] API documentation
- [ ] Runbooks folder
- [ ] Dockerfile, docker-compose.yml

---

## Critical Files to Create/Modify

### New Files
```
lib/
  logger.ts                - Structured logging with context
  errors.ts                - Error hierarchy (AppError, ValidationError)
  env.ts                   - Zod-validated environment config
  metrics.ts               - Observability framework
  validation/
    schemas.ts            - All Zod schemas (single source of truth)
    middleware.ts         - Hono validation middleware

server/
  routes/health.ts        - Liveness, readiness, detailed health endpoints
  middleware/
    security.ts           - Security headers, CSP
    cors.ts               - Configured CORS
    rate-limit.ts         - Per-endpoint rate limiting
    request-id.ts         - Request tracing

domain/
  cart/
    schema.ts             - Cart domain Zod schemas
    fns.ts                - Pure functions (accept z.infer<> types)
    invariants.ts         - PBT invariant documentation
  pricing/
    schema.ts             - Pricing domain Zod schemas
    invariants.ts         - Pricing invariants

test/
  setup/test-utils.ts     - Reusable test helpers
  builders/page-builder.ts - Extends shared CartBuilder

docs/
  ONBOARDING.md          - Quick setup guide
  API.md                 - Endpoint documentation
  runbooks/
    checkout-failure.md  - Troubleshooting guide
    stripe-webhook.md     - Webhook handling
    database-recovery.md  - Backup/restore procedures

.env.example            - All config options documented
Dockerfile              - Container image
docker-compose.yml      - Local dev environment
```

### Modified Files
```
src/main.tsx          - ErrorBoundary, Toaster
src/server/index.ts   - Middleware stack
all API routes        - Use logger, typed errors
test files            - Use test utilities/builders
README.md             - Actual project content
```

---

## Documentation References

| Topic | File |
|-------|------|
| Architecture Decisions | `docs/ARCHITECTURE_DECISIONS.md` |
| Testing Framework | `docs/TESTING_FRAMEWORK.md` |
| TypeScript Guidelines | `docs/TS_PROJECT_GUIDELINES.md` |
| API Testing Patterns | `docs/API_TESTING_PATTERNS.md` |
| GUI Testing Patterns | `docs/GUI_TESTING_PATTERNS.md` |

---

## Verification

```bash
# All tests
npm test                      # 137/137 passing
cd implementations/react-playwright && npm test  # 39/39 passing

# Type safety
npx tsc --noEmit              # No errors

# Security
npm audit                     # No high/critical

# Observability
curl http://localhost:5173/api/health  # 200 with details
curl http://localhost:5173/api/readyz  # 200 with dependencies

# Documentation
find docs -name "*.md" | wc -l        # Comprehensive docs
```
