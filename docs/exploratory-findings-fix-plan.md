# Exploratory Testing Findings - Fix Plan

**Generated:** 2026-03-16  
**From:** Exploratory Testing Session  
**Total Findings:** 4 issues (3 Major, 1 Minor)

---

## 🔴 Priority 1: Fix Major Issues

### Issue 1: Homepage Title - "react-playwright"

**Severity:** Major  
**Category:** UI  
**Impact:** Brand credibility, SEO  
**File:** `packages/client/index.html`

**Current State:**
```html
<title>react-playwright</title>
```

**Fix Required:**
```html
<title>TechHome | Premium Electronics</title>
```

**Acceptance Criteria:**
- [ ] Title shows "TechHome" or appropriate brand name
- [ ] Title includes relevant keywords for SEO
- [ ] Title changes dynamically for different routes (optional)

---

### Issue 2: Checkout - Missing Shipping Method Selection

**Severity:** Major  
**Category:** Functional  
**Impact:** Cannot complete checkout  
**File:** `packages/client/src/pages/checkout.tsx`

**Current State:**
- Checkout page displays cart total
- No shipping method selection visible
- Blocks checkout completion

**Expected Behavior:**
- Should display shipping options (Standard, Expedited, Express)
- User should be able to select shipping method
- Selected shipping cost should update grand total

**Fix Required:**
1. Add shipping method radio buttons to checkout page
2. Fetch available shipping methods from API
3. Update grand total based on selection
4. Persist shipping method selection

**Code Pattern (from checkout.ui.properties.test.ts):**
```typescript
// Tests expect:
await expect(page.getByRole('radio', { name: 'Standard' })).toBeVisible();
await expect(page.getByRole('radio', { name: 'Expedited' })).toBeVisible();
await expect(page.getByRole('radio', { name: 'Express' })).toBeVisible();
```

**Acceptance Criteria:**
- [ ] Standard shipping option visible
- [ ] Expedited shipping option visible
- [ ] Express shipping option visible
- [ ] Selecting option updates grand total
- [ ] Selection persists on page refresh

---

### Issue 3: 404 Page - Generic/Blank Error

**Severity:** Major  
**Category:** UX  
**Impact:** Lost user guidance opportunity  
**Files:** Router config, 404 component

**Current State:**
- Navigating to non-existent page shows blank/generic error
- No helpful navigation back to products
- Poor user experience

**Expected Behavior:**
- Branded 404 page with friendly message
- Clear navigation to products/homepage
- Search option (optional)
- Consistent with app styling

**Fix Required:**
1. Create `packages/client/src/pages/not-found.tsx`
2. Add 404 route to router configuration
3. Include:
   - Friendly error message ("Page not found")
   - Link to products page
   - Link to homepage
   - Search bar (optional)
   - TechHome branding

**Acceptance Criteria:**
- [ ] Branded 404 page displays for invalid URLs
- [ ] "Go to Products" button/link visible
- [ ] "Go Home" button/link visible
- [ ] Page matches app styling (colors, fonts)
- [ ] HTTP status code is 404

---

## 🟡 Priority 2: Fix Minor Issue

### Issue 4: Heading Hierarchy - Accessibility

**Severity:** Minor  
**Category:** Accessibility  
**Impact:** Screen reader navigation confusing  
**Files:** Various page components

**Current State:**
- Heading levels skip (e.g., h1 → h3 without h2)
- Violates WCAG 1.3.1 - Info and Relationships

**Expected Behavior:**
- Proper heading hierarchy: h1 → h2 → h3
- No skipped levels
- Screen readers can navigate correctly

**Common Violations to Check:**
1. Products page - h1 "Products" followed by product cards using h3
2. Product detail - h1 product name, but sections might skip
3. Cart page - h1 "Shopping Cart" but items might not use h2

**Fix Required:**
1. Audit each page for heading structure
2. Ensure logical progression: h1 → h2 → h3
3. Don't skip heading levels for styling purposes
4. Use CSS classes for styling, not heading levels

**Example Fix:**
```tsx
// ❌ Bad
<h1>Products</h1>
<div className="product-card">
  <h3>Product Name</h3>  {/* Skips h2 */}
</div>

// ✅ Good
<h1>Products</h1>
<div className="product-card">
  <h2>Product Name</h2>  {/* Proper hierarchy */}
</div>
```

**Acceptance Criteria:**
- [ ] Homepage has proper h1 → h2 structure
- [ ] Products page has proper h1 → h2 → h3 structure
- [ ] Product detail has proper heading hierarchy
- [ ] Cart page has proper heading hierarchy
- [ ] Checkout page has proper heading hierarchy
- [ ] No skipped heading levels detected in axe-core scan

---

## Implementation Order

**Recommended Sequence:**

1. **Issue 1** (Title) - 5 minutes
   - Simple HTML change
   - No risk

2. **Issue 4** (Headings) - 30 minutes
   - Audit and fix all pages
   - Can do in parallel with other work

3. **Issue 3** (404 Page) - 1 hour
   - Create new component
   - Update router
   - Add styling

4. **Issue 2** (Shipping) - 2-3 hours
   - Requires API changes
   - State management updates
   - Most complex

---

## Testing Strategy

### After Each Fix:

1. **Manual verification**
   - Navigate to affected page
   - Verify fix works
   - Check responsive design
   - Test edge cases

2. **Run exploratory test**
   ```bash
   npx tsx exploratory-test.ts
   ```

3. **Verify specific screen**
   - Check screenshot matches expectation
   - Confirm issue no longer appears in report

### Regression Testing:

After all fixes complete:
- Run full test suite: `pnpm run test:all`
- Run E2E tests: `cd test && pnpm test`
- Verify no new issues introduced

---

## Verification Checklist

**Before closing each issue:**

- [ ] Fix implemented according to plan
- [ ] Manual testing confirms resolution
- [ ] Screenshot captured showing fixed state
- [ ] Exploratory test no longer flags issue
- [ ] No console errors introduced
- [ ] Responsive design maintained
- [ ] E2E tests pass (if applicable)

**Final Verification:**
- [ ] All 4 issues resolved
- [ ] Full exploratory test run with 0 major issues
- [ ] E2E test suite passes
- [ ] Documentation updated

---

## Notes

- All findings documented with screenshots in `exploratory-findings/`
- JSON report available at `exploratory-findings/report.json`
- Previous exploratory test runs archived in `exploratory-findings/` with timestamps
- Security and accessibility checks passed (no critical findings)

---

*This plan should be updated as fixes are implemented. Mark checkboxes as complete.*
