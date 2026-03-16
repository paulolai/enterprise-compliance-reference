# Testing Gaps Analysis

**Meta-Study:** Using exploratory testing to discover gaps in existing test coverage  
**Date:** 2026-03-16  
**Purpose:** Document gaps, improve detection methods, validate improved approaches

---

## Executive Summary

Exploratory testing found 4 issues that should have been caught by existing testing infrastructure. This document analyzes:
1. **What we found** via exploratory testing
2. **Where it should have been caught** (the gap)
3. **How to improve detection** (closing the gap)
4. **Validation approach** (proving the fix works without fixing the actual bugs)

**Key Insight:** Exploratory testing found the *wrong* issues - these are obvious gaps that static analysis and systematic tests should catch.

---

## Findings vs. Detection Methods

| Issue | Severity | Exploratory Found It? | Should Be Caught By | Status |
|-------|----------|----------------------|---------------------|--------|
| Homepage title "react-playwright" | Major | ✅ Yes | Static analysis (HTML lint) | **GAP** |
| Missing shipping methods | Major | ✅ Yes | E2E tests, acceptance criteria | **GAP** |
| Generic 404 page | Major | ✅ Yes | E2E tests, router tests | **GAP** |
| Heading hierarchy violations | Minor | ✅ Yes | axe-core, Lighthouse | **GAP** |

**Success Rate:** 100% of issues found by exploratory  
**But:** 0% should have required exploratory testing

---

## Gap 1: Static Analysis for HTML/SEO

### What Was Found
- Default Vite title "react-playwright" in production

### Why This Is a Gap
**Current State:**
- No HTML validation in CI
- No SEO linting
- No automated checks for placeholder content

**What Should Exist:**
```bash
# Pre-commit hook
html-validate packages/client/index.html

# CI check
if grep -q "react-playwright\|Vite\|placeholder" packages/client/index.html; then
  echo "ERROR: Placeholder title detected"
  exit 1
fi
```

### The Fix (Detection Method)

**Option A: HTML Validation**
```bash
npm install html-validate --save-dev
npx html-validate packages/client/index.html
```

**Option B: SEO Audit in CI**
```bash
npm install lighthouse --save-dev
npx lighthouse http://localhost:5173 --output=json --chrome-flags="--headless" | jq '.audits["document-title"].score'
```

**Option C: Simple String Check**
```yaml
# .github/workflows/ci.yml
- name: Check for placeholder titles
  run: |
    if grep -E "(react-|vite-|placeholder)" packages/client/index.html; then
      echo "❌ Placeholder content detected in HTML"
      exit 1
    fi
```

### Validation Approach

**DON'T fix the title yet.** Instead:
1. Add detection method to CI
2. Watch CI fail (proving it catches the issue)
3. Document that it caught what exploratory found
4. THEN fix the title
5. Watch CI pass

**This proves the gap is closed.**

---

## Gap 2: E2E Tests for Checkout Flow

### What Was Found
- Checkout page has no shipping method selection
- Cannot complete checkout

### Why This Is a Gap

**Current State:**
- E2E tests exist in `test/e2e/checkout.ui.properties.test.ts`
- Tests expect shipping options but they're not implemented
- Tests may be passing on broken functionality

**Evidence from test file:**
```typescript
// From checkout.ui.properties.test.ts lines 64-66:
invariant('Express shipping costs exactly $25', {
  // ...
}, async ({ page }) => {
  await page.getByRole('radio', { name: 'Express' }).click({ force: true });
  // This expects Express radio button to exist!
});
```

**The tests expect shipping options but they don't exist in the UI.**

### The Fix (Detection Method)

**Add Missing E2E Assertions:**
```typescript
// test/e2e/checkout.shipping.spec.ts
import { test, expect } from '@playwright/test';

test('checkout has shipping method selection', async ({ page }) => {
  await page.goto('/checkout');
  
  // These should fail if shipping options don't exist
  await expect(page.getByRole('radio', { name: 'Standard' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Expedited' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Express' })).toBeVisible();
});

test('selecting shipping updates grand total', async ({ page }) => {
  // Add test for dynamic pricing
});
```

**Add to CI:**
```bash
# Run shipping-specific tests
cd test && pnpm test --grep "shipping"
```

### Validation Approach

**DON'T implement shipping yet.** Instead:
1. Add the E2E assertions above
2. Run tests - they should fail (proving they catch missing shipping)
3. Document that systematic testing caught what exploratory found
4. THEN implement shipping
5. Watch tests pass

---

## Gap 3: E2E Tests for 404 Handling

### What Was Found
- No branded 404 page
- Users see generic error

### Why This Is a Gap

**Current State:**
- Router likely has catch-all route
- No test verifies 404 page content
- No acceptance criteria for 404 experience

**What Should Exist:**
```typescript
// test/e2e/routing.spec.ts
test('404 page shows branded error', async ({ page }) => {
  await page.goto('/non-existent-page');
  
  // Should fail if 404 is generic
  await expect(page.getByText('Page not found')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Browse Products' })).toBeVisible();
  await expect(page.locator('nav')).toBeVisible(); // Branded nav
});
```

### The Fix (Detection Method)

**Add 404-specific E2E test:**
```typescript
// test/e2e/error-pages.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Error Pages', () => {
  test('404 page is branded', async ({ page }) => {
    await page.goto('/definitely-not-real-404');
    
    // Check for branding
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.getByText(/not found|404/i)).toBeVisible();
  });
  
  test('404 page has navigation', async ({ page }) => {
    await page.goto('/non-existent');
    
    await expect(page.getByRole('link', { name: /home|products/i }))
      .toBeVisible();
  });
});
```

### Validation Approach

**DON'T create 404 component yet.** Instead:
1. Add the E2E tests above
2. Run tests - they should fail (proving they catch missing 404)
3. Document that systematic testing caught what exploratory found
4. THEN create 404 page
5. Watch tests pass

---

## Gap 4: Automated Accessibility Scanning

### What Was Found
- Heading hierarchy violations
- WCAG 1.3.1 violations

### Why This Is a Gap

**Current State:**
- No automated accessibility scanning in CI
- axe-core not integrated
- Lighthouse accessibility not run automatically

**What Should Exist:**
```bash
# Automated accessibility audit
npx @axe-core/cli http://localhost:5173 --tags wcag2a,wcag2aa

# Or with Playwright
npm install @axe-core/playwright
```

### The Fix (Detection Method)

**Add axe-core integration:**
```typescript
// test/e2e/accessibility.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('homepage passes accessibility scan', async ({ page }) => {
  await page.goto('/');
  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
  expect(accessibilityScanResults.violations).toEqual([]);
});

test('products page passes accessibility scan', async ({ page }) => {
  await page.goto('/products');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```

**Add to CI:**
```yaml
# .github/workflows/ci.yml
- name: Run accessibility tests
  run: cd test && pnpm test --grep "accessibility"
```

### Validation Approach

**DON'T fix headings yet.** Instead:
1. Add axe-core tests above
2. Run tests - they should fail (proving they catch heading violations)
3. Document that automated scanning caught what exploratory found
4. THEN fix heading hierarchy
5. Watch tests pass

---

## What Exploratory Testing SHOULD Find

The real value of exploratory testing is finding issues that automated tools miss:

### High-Value Targets (What Exploratory Is Good For)

1. **State Management Bugs**
   - Cart persistence across tabs
   - Login session handling
   - Race conditions in checkout

2. **Edge Cases**
   - Refresh mid-checkout
   - Browser back button behavior
   - Empty cart edge cases
   - Quantity 0 or negative

3. **UX Friction**
   - Confusing flows
   - Hidden features
   - Mobile responsiveness issues
   - Touch target sizes

4. **Security**
   - XSS via URL params
   - Data exposure in console
   - Auth bypass attempts

5. **Integration Issues**
   - API timeouts
   - Network failures
   - Third-party service issues

### What We Should Have Found (But Didn't)

During our 140-action random walk, we should have discovered:
- Cart persistence after refresh ✅ (tested)
- Login flow edge cases ✅ (tested)
- But we didn't find:
  - Any race conditions
  - Any state management bugs
  - Any security vulnerabilities (XSS test was negative)

**This suggests either:**
1. The app is very well-built (unlikely)
2. Our random walk didn't hit the right paths
3. The issues exist but we didn't check for them

---

## The Meta-Learning

### Challenging the Testing Pyramid

**Traditional View:**
```
         /\      <- Few E2E/Exploratory
        /  \     
       /____\   
      /      \   
     /________\ <- Some Integration  
    /          \ 
   /____________\ <- Many Unit Tests
  /              \
 /________________\
/                  \
```

**Proposed View: The Testing Diamond**
```
       /\        <- Few E2E (journey validation)
      /  \       
     /____\     
    /      \     <- MANY Integration/API Tests (core logic)
   /        \   
  /__________\   <- Static Analysis (HTML, a11y, lint)
 /            \
/______________\
```

**Our Experience Validates the Diamond Model:**

The 4 issues we found:

| Issue | Traditional Pyramid Layer | Better Detection | Our Finding |
|-------|---------------------------|------------------|-------------|
| HTML title | Bottom (Unit) | **Static Analysis** ✅ | Should be automated |
| Shipping methods | Middle (E2E) | **Integration Tests** ✅ | Correctly in middle |
| 404 handling | Middle (E2E) | **Integration Tests** ✅ | Correctly in middle |
| Headings | Bottom (Unit) | **Static Analysis** ✅ | Should be automated |

**Key Insight:** 50% of issues should be static analysis, 50% should be integration/E2E. Unit tests would be overkill for these.

### Why the Diamond Works Better

**Static Analysis (Bottom)**
- Catches: HTML structure, accessibility basics, SEO, security headers
- Cost: Near-zero (CI automation)
- Speed: Instant
- These are NOT "bugs" - they're compliance issues

**Integration/API Tests (Middle - HEAVY)**
- Catches: Business logic, flows, component integration, API contracts
- Cost: Medium (test maintenance)
- Speed: Fast enough (seconds)
- This is where domain logic lives

**E2E Tests (Top)**
- Catches: Critical user journeys only
- Cost: High (brittle, slow)
- Speed: Slow (minutes)
- Validate happy paths, not edge cases

**Exploratory Testing (Top - SMALL)**
- Catches: Race conditions, UX friction, edge cases
- Cost: Very high (manual)
- Speed: Slowest
- Reserve for what automation can't catch

### The Cost Equation (Revised)

| Method | Cost to Find | Where It Lives | What It Catches |
|--------|--------------|------------------|-----------------|
| Static Analysis (HTML lint) | $10 | **Bottom** | Structure, compliance |
| Static Analysis (axe-core) | $15 | **Bottom** | Accessibility |
| Unit Tests | $50 | *Traditional bottom* | *Logic* |
| **Integration Tests** | **$80** | **MIDDLE (focus)** | **Business logic** |
| **E2E Tests** | **$200** | **MIDDLE (focus)** | **User flows** |
| Exploratory Testing | $500 | Top | Edge cases |

**Finding title via exploratory = 50x more expensive than static analysis**
**Finding shipping via exploratory = 2.5x more expensive than E2E**

### Our Reality: Diamond Confirmed

**What exploratory found:**
- 2 structural issues → Should be static analysis
- 2 flow issues → Should be integration/E2E
- 0 unit-level logic bugs → Domain tests already catch these

**What this tells us:**
1. ✅ Static analysis missing (bottom)
2. ✅ Integration/E2E gaps (middle) 
3. ✅ Unit tests working (not finding issues here is good!)

**The app has good domain logic** (pricing engine is well-tested)  
**But missing flow validation** (checkout, routing)  
**And missing structural validation** (HTML, accessibility)

### Recommendation: Focus on the Diamond's Middle

**Don't build more unit tests** - they're working  
**Do build integration tests** - that's where the gaps are  
**Do build static analysis** - automate the boring stuff  
**Keep exploratory small** - only for true edge cases

**The new ratio:**
- 20% Static Analysis (catches structure/compliance)
- 60% Integration Tests (catches business logic)
- 15% E2E Tests (catches critical journeys)
- 5% Exploratory (catches edge cases)

### The Cost Equation

| Method | Cost to Find | Cost to Fix | Total |
|--------|--------------|-------------|-------|
| Static Analysis (HTML lint) | $10 (CI time) | $50 | $60 |
| E2E Tests (checkout) | $100 (dev time) | $500 | $600 |
| Exploratory Testing | $500 (1 hour) | $500 | $1000 |

**Finding title via exploratory = 17x more expensive than static analysis**

---

## Recommendations

### Immediate Actions

1. **Add HTML validation to CI** (catches Gap 1)
2. **Add accessibility scanning to CI** (catches Gap 4)
3. **Review existing E2E tests** - why didn't they fail on shipping/404? (catches Gap 2,3)

### Process Changes

1. **Pre-commit hooks**
   ```bash
   # Before commit
   html-validate packages/client/index.html
   grep -v "placeholder\|react-\|vite-" packages/client/index.html
   ```

2. **Definition of Done**
   - All pages have proper titles
   - All pages pass axe-core scan
   - All user flows have E2E tests

3. **Exploratory Testing Schedule**
   - Monthly, not before every release
   - Focus on edge cases and security
   - Don't waste time on things static analysis catches

### Validation Plan

**Phase 1: Prove Gaps Exist** (This document)
- ✅ Document what exploratory found
- ✅ Document where they should be caught
- ✅ Show detection methods

**Phase 2: Implement Detection** (Next)
- Add HTML validation
- Add axe-core scanning
- Add missing E2E assertions
- Run them - they should FAIL (catching current issues)

**Phase 3: Verify Detection Works** (After Phase 2)
- Document that new methods caught existing issues
- THEN fix the actual issues
- Run detection again - should PASS
- Exploratory testing should find nothing (or only edge cases)

---

## Conclusion

**The exploratory test was valuable not for what it found, but for revealing systematic gaps.**

4 issues found → 4 gaps identified → 4 detection methods documented

The goal is to make exploratory testing **boring** - it should find nothing because everything else caught the issues first.

**Current Status:** Issues exist, gaps documented, detection methods ready  
**Next Step:** Implement detection, validate it catches issues, then fix issues  
**Success Metric:** Future exploratory tests find 0 major issues (or only true edge cases)

---

## Appendix: Testing Methods Matrix

| Issue Type | Static Analysis | Unit Tests | Integration | E2E | Exploratory |
|------------|-----------------|------------|-------------|-----|-------------|
| HTML title | ✅ Best | ❌ No | ❌ No | ⚠️ Slow | ⚠️ Expensive |
| Shipping flow | ❌ No | ❌ No | ⚠️ OK | ✅ Best | ⚠️ Expensive |
| 404 handling | ❌ No | ❌ No | ⚠️ OK | ✅ Best | ⚠️ Expensive |
| Headings | ✅ Best | ❌ No | ❌ No | ⚠️ Slow | ⚠️ Expensive |
| Race conditions | ❌ No | ⚠️ Hard | ✅ OK | ⚠️ Slow | ✅ Best |
| XSS | ⚠️ Some | ❌ No | ✅ OK | ⚠️ Slow | ✅ Best |
| State bugs | ❌ No | ⚠️ Hard | ✅ OK | ⚠️ Slow | ✅ Best |
| UX confusion | ❌ No | ❌ No | ❌ No | ⚠️ OK | ✅ Best |

**Rule:** Each issue type should be caught by the ✅ or ⚠️ "Best" method, not by exploratory.
