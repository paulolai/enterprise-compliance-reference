# Exploratory Testing Coverage Gaps Analysis
**Date:** 2026-03-17
**Source:** Manual Exploratory Testing Session

## Systemic View: From Issues to Testing Gaps

Following the pattern: **Find Issue → Identify Pattern → Build Detection → Prevent Category**

---

## Gap 1: Server Startup Integration Testing

### Issues Found
- Health route import errors (db from shared module)
- Shutdown handler import errors (close from shared module)
- Standalone server import errors (seedProducts from shared module)
- Missing env exports not caught

### Pattern Identified
**Module dependency changes not propagating to all consumers**

When the shared module's exports were refactored (db moved to server package), dependent files weren't updated. This is a **module contract breakage** pattern.

### Testing Gap
**NO integration test verifies server can actually start**

Current gaps:
- Unit tests don't catch cross-module import issues
- No test starts the actual server and hits health endpoint
- No validation that all routes load without errors
- No test for graceful shutdown

### Detection to Build
Create: `packages/server/test/server-startup.integration.test.ts`

```typescript
// Should verify:
1. Server starts without throwing
2. Health endpoint returns 200
3. All API routes are registered
4. Graceful shutdown works
5. All imports resolve correctly
```

### Category Prevention
Add CI check that:
1. Builds server package
2. Starts server in test mode
3. Waits for /health to return 200
4. Fails if startup takes >30s or throws

---

## Gap 2: Environment Variable Testing

### Issue Found
- Rate limiter uses `import.meta.env.DEV` which doesn't exist in Node.js context
- Server environment variables not validated

### Pattern Identified
**Environment-specific code not tested in target environment**

### Testing Gap
**NO test runs code in actual Node.js context vs Vite context**

Current gaps:
- Middleware tested in isolation (Vitest/Vite environment)
- No test runs server in production-like standalone mode
- import.meta.env assumptions not validated

### Detection to Build
Create: `packages/server/test/middleware/environment.context.test.ts`

```typescript
// Should verify:
1. Rate limiter works in development mode
2. Rate limiter applies in production mode
3. Security headers are set
4. No Vite-specific globals used in server code
```

### Category Prevention
Add lint rule: "No import.meta.env in server package"

---

## Gap 3: Security Header Testing

### Issue Found
- X-Frame-Options in meta tag instead of HTTP header
- Console warnings about security headers

### Pattern Identified
**Security headers implemented incorrectly**

### Testing Gap
**NO automated check validates security headers**

Current gaps:
- Accessibility tests check DOM but not HTTP headers
- No test validates CSP, X-Frame-Options, etc.
- Security middleware not tested

### Detection to Build
Create: `scripts/static-analysis/validate-security-headers.ts`

```typescript
// Should verify for each page:
1. X-Frame-Options header present (not meta tag)
2. Content-Security-Policy header present
3. No security headers in meta tags
4. Proper cache-control headers
```

### Category Prevention
Add to CI: Security header validation must pass

---

## Gap 4: Pricing API Edge Cases

### Testing Verified ✅
- Bulk discount for quantity 3: **PASS**
- Free shipping over $100: **PASS**
- Cents precision: **PASS**

### Gaps Still Uncovered
**NO tests for:**
- VIP discount with tenure > 2 years
- Safety valve (30% discount cap)
- Express shipping ($25 fixed)
- Expedited shipping (15% surcharge)
- Weight-based shipping calculation
- Negative quantities (validation)
- Zero quantities
- Invalid SKUs
- Concurrent cart modifications

### Detection to Build
Create: `packages/domain/test/pricing.edge-cases.test.ts`

```typescript
// Should verify:
1. VIP user gets 5% additional discount
2. Safety valve caps at 30% total discount
3. Express shipping always $25 regardless of weight
4. Expedited surcharge calculated on original total
5. Weight surcharge: $2 per kg
6. Shipping not counted toward discount cap
7. Validation rejects negative/zero quantities
```

---

## Gap 5: Cart UI Integration Testing

### Issues Found
- Add to cart button selectors not working in exploratory test
- Cart page not displaying prices in manual testing

### Pattern Identified
**UI tests pass but actual user interactions fail**

### Testing Gap
**E2E tests use test IDs but real app uses different structure**

Current gaps:
- Tests rely on data-testid attributes
- Real app may not have those attributes
- No test actually clicks "Add to Cart" on real products page
- Cart persistence not verified end-to-end

### Detection to Build
Enhance: `test/e2e/cart.ui.test.ts`

```typescript
// Should verify:
1. Can add product to cart from products page
2. Cart badge updates immediately
3. Cart persists after page reload
4. Can remove items from cart
5. Cart total displays correctly
6. Works with real product catalog
```

---

## Gap 6: Shipping Calculation Testing

### Testing Verified ✅
- Base shipping $7: **PASS**
- Weight surcharge calculation: **PASS**
- Free shipping threshold $100: **PASS**

### Gaps Still Uncovered
**NO tests for:**
- Express shipping override
- Expedited shipping 15% surcharge
- Multiple items weight accumulation
- Heavy items shipping cost
- Shipping when cart value exactly $100.00

### Detection to Build
Create: `packages/domain/test/shipping.edge-cases.test.ts`

```typescript
// Should verify:
1. Express shipping always $25 (ignore weight, cart value)
2. Expedited surcharge = 15% of original subtotal
3. Weight calculated: Σ(item.weight × quantity)
4. Exactly $100.00 = NO free shipping
5. Shipping + product discounts < 30% cap
```

---

## Priority Matrix

| Gap | Impact | Effort | Priority |
|-----|--------|--------|----------|
| Server Startup Integration | High | Medium | **P0** |
| Environment Context | High | Low | **P0** |
| Security Headers | Medium | Low | **P1** |
| Pricing Edge Cases | High | Medium | **P1** |
| Cart UI Integration | Medium | High | **P2** |
| Shipping Edge Cases | Medium | Medium | **P2** |

---

## Recommended Next Actions

1. **Immediate (This Sprint)**
   - Create server startup integration test
   - Add environment context test for rate limiter
   - Document all findings in test backlog

2. **Short Term (Next 2 Sprints)**
   - Build security header validator
   - Add pricing edge case tests
   - Fix critical gaps blocking manual testing

3. **Medium Term**
   - Refactor cart UI tests to use real selectors
   - Add comprehensive shipping tests
   - Build automated exploratory testing suite

---

## Success Metrics

**Before:**
- Server fails to start with import errors
- 4 failed E2E tests in checkout validation
- No automated security header checks

**After (Target):**
- Server startup test passes in CI
- All E2E tests pass
- Security headers validated automatically
- Zero import-related runtime errors
