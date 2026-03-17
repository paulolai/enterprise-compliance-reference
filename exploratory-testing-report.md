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

## Test Sessions

### Session 1: Homepage & Navigation
**Goal:** Verify basic functionality and UI elements
**Time:** 5 minutes
**Findings:**
- ✅ Homepage loads with "TechHome | Premium Electronics" title
- ✅ Navigation links present (Products, Cart)
- ⚠️ **ISSUE:** X-Frame-Options meta tag warning in console (security header should be HTTP header, not meta)

### Session 2: Product Catalog
**Goal:** Verify product display and pricing
**Time:** 5 minutes
**Findings:**
- ✅ Products display with prices in AUD format
- ✅ Product details page accessible
- ✅ Add to cart functionality works
- ⚠️ **ISSUE:** Products may have placeholder images (to verify)

### Session 3: Cart Functionality
**Goal:** Test cart operations and pricing calculations
**Time:** 10 minutes
**Findings:**
- [ ] Adding single item to cart
- [ ] Adding multiple quantities
- [ ] Cart total calculations
- [ ] Removing items from cart
- [ ] Cart persistence across page reload

### Session 4: Pricing Rules Validation
**Goal:** Verify all pricing rules are applied correctly
**Time:** 15 minutes
**Test Scenarios:**
1. **Bulk Discount:** Add 3+ of same SKU
2. **VIP Discount:** Test with VIP user session
3. **Safety Valve:** Verify 30% cap
4. **Free Shipping:** Cart > $100
5. **Express Shipping:** Fixed $25
6. **Expedited Shipping:** 15% surcharge

### Session 5: Checkout Flow
**Goal:** Test complete purchase flow
**Time:** 10 minutes
**Findings:**
- [ ] Shipping address validation
- [ ] Payment form validation
- [ ] Order summary display
- [ ] Order confirmation

### Session 6: Edge Cases
**Goal:** Test boundary conditions and error handling
**Time:** 10 minutes
**Scenarios:**
- [ ] Empty cart behavior
- [ ] Invalid quantities (negative, zero)
- [ ] Network failures
- [ ] Concurrent cart modifications

## Issues Found

### Issue 1: X-Frame-Options Meta Tag
**Severity:** Low
**Category:** Security Headers
**Description:** X-Frame-Options should be HTTP header, not meta tag
**Location:** HTML head section
**Recommendation:** Move to HTTP response headers

## To Be Continued...
