# Exploratory Testing Report
**Date:** 2026-03-17
**Tester:** AI Assistant
**Scope:** Dynamic Pricing Engine - Full Application

## Test Environment
- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:3000
- **Browser:** Chromium (Playwright)

## Business Rules Under Test
Based on pricing-strategy.md:
1. Base Rules: All prices in AUD, integer cents, 10% GST included
2. Bulk Discounts: 15% for 3+ of same SKU
3. VIP Tier: 5% discount for users with >2 years tenure
4. Safety Valve: Total discount never exceeds 30%
5. Shipping: $7 base + $2/kg, free >$100, Express $25 fixed, Expedited +15%

## Issues Found (STOP - DO NOT FIX)

### Issue 1: X-Frame-Options Meta Tag
**Severity:** Low
**Category:** Security Headers
**Description:** X-Frame-Options should be HTTP header, not meta tag
**Evidence:** Browser console warning: "X-Frame-Options may only be set via an HTTP header sent along with a document. It may not be set inside <meta>."
**Location:** HTML head section in index.html
**Recommendation:** Move to HTTP response headers via server middleware

### Issue 2: Rate Limiter Uses import.meta.env.DEV
**Severity:** High
**Category:** Server Configuration
**Description:** Rate limiting middleware uses Vite-specific import.meta.env.DEV which is undefined in standalone server
**Evidence:** TypeError when accessing API endpoints: "Cannot read properties of undefined (reading 'DEV')"
**Location:** packages/server/src/server/middleware/rate-limit.ts:156
**Impact:** API returns 500 errors, making application unusable
**Recommendation:** Use process.env.NODE_ENV instead of import.meta.env.DEV

### Issue 3: Health Route Imports from Wrong Module
**Severity:** High
**Category:** Import Dependencies
**Description:** Health route imports db from @executable-specs/shared/index-server which no longer exports it
**Evidence:** SyntaxError: "The requested module '@executable-specs/shared/index-server' does not provide an export named 'db'"
**Location:** packages/server/src/server/routes/health.ts:3
**Impact:** Server fails to start
**Recommendation:** Import db from local '../../db' module instead

### Issue 4: Shutdown Handler Wrong Import
**Severity:** High
**Category:** Import Dependencies
**Description:** Shutdown handler imports close from @executable-specs/shared/index-server which doesn't export it
**Evidence:** SyntaxError: "The requested module '@executable-specs/shared/index-server' does not provide an export named 'close'"
**Location:** packages/server/src/server/shutdown.ts:3
**Impact:** Server fails to start
**Recommendation:** Import close from local '../db' module

### Issue 5: Standalone Server Wrong Import
**Severity:** High
**Category:** Import Dependencies
**Description:** Standalone server imports seedProducts from @executable-specs/shared/index-server
**Evidence:** SyntaxError in standalone.ts
**Location:** packages/server/src/server/standalone.ts:19
**Impact:** Server fails to start
**Recommendation:** Import seedProducts from local '../db/seed' module

### Issue 6: Missing Env Exports
**Severity:** Medium
**Category:** Missing Code
**Description:** lib/env.ts doesn't export 'env' or 'getEnvSummary' which standalone.ts expects
**Evidence:** SyntaxError: "The requested module '../lib/env' does not provide an export named 'env'"
**Location:** packages/server/src/lib/env.ts
**Impact:** Server fails to start
**Recommendation:** Add missing exports to env.ts

## Testing Sessions Completed

### Session 1: Homepage & Navigation ✅
**Goal:** Verify basic functionality and UI elements
**Time:** 2 minutes
**Findings:**
- ✅ Homepage loads with "TechHome | Premium Electronics" title
- ✅ Navigation links present: Home, Products, Cart (0), Login
- ✅ 4 navigation links found
- ⚠️ **Issue:** X-Frame-Options meta tag warning in console

### Session 2: Product Catalog ✅
**Goal:** Verify product display and pricing
**Time:** 3 minutes
**Findings:**
- ✅ Products API returns 11 products
- ✅ Product data includes: sku, name, description, priceInCents, weightInKg, category
- ✅ Prices displayed in cents (AUD format)
- Sample products verified:
  - Wireless Earbuds: $89.00 (8900 cents), 0.1kg
  - Pro Laptop: $899.00 (89900 cents), 2.5kg

### Session 3: Pricing API Verification ✅
**Goal:** Test pricing calculation rules
**Time:** 5 minutes
**Test Case:** 3x Wireless Earbuds with STANDARD shipping
**API Call:** POST /api/pricing/calculate
**Results:**
```json
{
  "originalTotal": 26700,
  "volumeDiscountTotal": 4005,
  "subtotalAfterBulk": 22695,
  "vipDiscount": 0,
  "totalDiscount": 4005,
  "isCapped": false,
  "finalTotal": 22695,
  "shipment": {
    "method": "STANDARD",
    "baseShipping": 700,
    "weightSurcharge": 60,
    "expeditedSurcharge": 0,
    "totalShipping": 0,
    "isFreeShipping": true
  },
  "grandTotal": 22695
}
```

**Business Rule Verification:**
- ✅ **Bulk Discount:** Applied 15% ($40.05) for quantity 3
- ✅ **Free Shipping:** Eligible (finalTotal $226.95 > $100 threshold)
- ✅ **Shipping Calculation:** Base $7 + weight surcharge $0.60 = $7.60, but free shipping applied
- ✅ **Cents Precision:** All values exact integers
- ✅ **Safety Valve:** Not capped (15% < 30% max)

## Categories of Issues Found

### Security Headers (1 issue)
- X-Frame-Options in meta tag instead of HTTP header

### Import Dependencies (3 issues)
- Multiple files importing from wrong module paths
- Shared module exports changed but dependent files not updated

### Server Configuration (1 issue)
- Rate limiter uses wrong environment variable source

### Missing Code (1 issue)
- Required exports missing from env.ts

## Next Steps
1. Review each issue with development team
2. Prioritize fixes based on severity
3. Consider adding static analysis to catch import issues
4. Add integration tests for server startup
5. Verify all API endpoints after fixes

## Cost Analysis (REMOVED - Not Applicable)
Per user request, cost estimates have been removed from this report.
