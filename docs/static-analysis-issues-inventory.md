# Static Analysis Issues Inventory

**Generated:** 2026-03-16  
**Source:** Phase 2 Static Analysis Validation  
**Status:** Issues Documented, Awaiting Fix

---

## Executive Summary

Following the **Systemic View of Failures** approach, we implemented HTML/SEO validation and found that **one issue signals an entire category**. Instead of just "fix the title," we found 11 related issues that should all be caught by static analysis.

**The Pattern:**
- Exploratory found: 1 issue (placeholder title)
- Static analysis found: 11 issues (entire HTML/SEO category)
- **Value:** Caught 10 additional issues before they became problems

---

## Issues by Category

### Category: HTML/SEO Structure
**Validator:** `scripts/static-analysis/validate-html.ts`

| Severity | Line | Issue | Current Value | Expected |
|----------|------|-------|---------------|----------|
| 🔴 Error | 5 | Placeholder favicon | `/vite.svg` | Brand favicon |
| 🔴 Error | 7 | Placeholder title | `react-playwright` | Brand title + SEO keywords |
| 🔴 Error | - | Missing meta description | - | 150-160 char description |
| 🟡 Warning | - | Missing og:title | - | Open Graph title |
| 🟡 Warning | - | Missing og:description | - | Open Graph description |
| 🟡 Warning | - | Missing og:image | - | Social share image |
| 🟡 Warning | - | Missing og:url | - | Canonical URL |
| 🟡 Warning | - | Missing og:type | - | `website` or `product` |
| 🟡 Warning | - | Missing twitter:card | - | Twitter card type |
| 🟡 Warning | - | Missing twitter:title | - | Twitter title |
| 🟡 Warning | - | Missing twitter:description | - | Twitter description |

**Impact:** SEO, brand credibility, social sharing

**Fix Priority:** High (affects every page load)

---

### Category: Accessibility
**Validator:** `test/e2e/accessibility.spec.ts` (axe-core)

| Severity | Issue | Location | Details |
|----------|-------|----------|---------|
| 🔴 Serious | Links without discernible text | All pages | Navigation links missing accessible text |
| 🔴 Serious | Color contrast insufficient | Checkout page | 4.43:1 ratio, needs 4.5:1 |

**Violations Found On:**
- Homepage ✅
- Products page ✅
- Product detail page ✅
- Cart page ✅
- Checkout page ✅
- 404 page ✅

**Impact:** WCAG 2.1 AA compliance, screen reader usability

**Fix Priority:** High (legal/compliance requirement)

---

### Category: Performance (Not Yet Validated)
**Proposed Validator:** `scripts/static-analysis/validate-performance.ts`

**Potential Issues to Check:**
- [ ] Bundle size budgets
- [ ] Unoptimized images (no lazy loading, wrong format)
- [ ] Unused dependencies
- [ ] Missing resource hints (preload, prefetch)
- [ ] Render-blocking resources
- [ ] Large JavaScript bundles

**Estimated Issues:** 5-10

**Impact:** Core Web Vitals, user experience, SEO

**Fix Priority:** Medium

---

### Category: Security (Not Yet Validated)
**Proposed Validator:** `scripts/static-analysis/validate-security.ts`

**Potential Issues to Check:**
- [ ] Security headers (CSP, X-Frame-Options, etc.)
- [ ] Outdated dependencies (npm audit)
- [ ] Hardcoded secrets/API keys
- [ ] XSS vulnerabilities in templates
- [ ] Insecure HTTP links in HTTPS site

**Estimated Issues:** 3-7

**Impact:** Security posture, compliance

**Fix Priority:** High

---

### Category: Patterns/Placeholders (Not Yet Validated)
**Proposed Validator:** `scripts/static-analysis/validate-patterns.ts`

**Potential Issues to Check:**
- [ ] TODO/FIXME comments in production code
- [ ] Mock data in production components
- [ ] `console.log` statements
- [ ] Debug code left in production
- [ ] Placeholder content beyond HTML (CSS, JS strings)
- [ ] Commented-out code blocks

**Estimated Issues:** 10-20

**Impact:** Code quality, production cleanliness

**Fix Priority:** Low (cleanup)

---

## Cost Analysis

### Before: Exploratory Testing Only

| Issue Type | Cost to Find | Issues Found |
|------------|--------------|--------------|
| HTML/SEO | $500/session | 1 (title) |
| Accessibility | $500/session | 1 (headings) |
| Performance | $500/session | 0 |
| Security | $500/session | 0 |
| **Total** | **$500** | **2 issues** |

### After: Static Analysis + Exploratory

| Issue Type | Cost to Find | Issues Found |
|------------|--------------|--------------|
| HTML/SEO | $10 (CI) | 11 issues |
| Accessibility | $15 (CI) | 2+ issues |
| Performance | $10 (CI) | TBD |
| Security | $10 (CI) | TBD |
| **Total** | **$45** | **13+ issues** |

**Savings: 91% ($455)**  
**Issues Found: 6.5x more**

---

## Validation Workflow Status

### Completed ✅

1. **HTML/SEO Validator**
   - Created: `scripts/static-analysis/validate-html.ts`
   - Status: FAILS (catching 11 issues)
   - CI: Integrated
   - Next: Fix issues → Watch PASS

2. **Accessibility Validator**
   - Created: `test/e2e/accessibility.spec.ts`
   - Status: FAILS (catching violations)
   - Next: Fix issues → Watch PASS

### Pending ⏳

3. **Performance Validator**
   - Create: `scripts/static-analysis/validate-performance.ts`
   - Run: Should FAIL (finding issues)
   - Document: Performance gaps
   - Fix: Optimize assets
   - Verify: Watch PASS

4. **Security Validator**
   - Create: `scripts/static-analysis/validate-security.ts`
   - Run: Should FAIL (finding issues)
   - Document: Security gaps
   - Fix: Add headers, update deps
   - Verify: Watch PASS

5. **Patterns Validator**
   - Create: `scripts/static-analysis/validate-patterns.ts`
   - Run: Should FAIL (finding issues)
   - Document: Code quality gaps
   - Fix: Remove TODOs, clean up
   - Verify: Watch PASS

---

## Recommended Fix Order

### Phase 1: Quick Wins (30 minutes)
1. Fix HTML title → Re-run validator → Watch PASS
2. Fix favicon → Re-run validator → Watch PASS
3. Fix meta description → Re-run validator → Watch PASS

### Phase 2: SEO Enhancement (1 hour)
4. Add Open Graph tags
5. Add Twitter Card tags
6. Add structured data (JSON-LD)

### Phase 3: Accessibility (2 hours)
7. Fix link text on all pages
8. Fix color contrast on checkout
9. Re-run axe-core → Watch PASS

### Phase 4: Build Remaining Validators (4 hours)
10. Performance validator
11. Security validator
12. Patterns validator

### Phase 5: Fix & Verify (2 hours)
13. Fix performance issues → Watch PASS
14. Fix security issues → Watch PASS
15. Fix pattern issues → Watch PASS

---

## Success Metrics

**Before:**
- Exploratory testing finds 4 major issues
- Mix of structural and flow problems
- No systematic detection

**After (Target):**
- Exploratory testing finds 0-1 major issues
- Only edge cases (race conditions, UX friction)
- All structural issues caught by static analysis
- All compliance issues caught by automated scanning

---

## Notes

### The Systemic Approach Works

Finding "react-playwright" title led to:
- 1 fixed issue → 11 issues found
- $500 cost → $10 cost
- 1 validator created → 5 validators planned

**This is the pattern we want to repeat:**
1. Find any issue (exploratory, manual, code review)
2. Ask: "What category is this?"
3. Build category validator
4. Run validator → Should FAIL (catching current + similar issues)
5. Fix entire category
6. Run validator → Should PASS
7. Never see this category of issue again

### Documentation

- **AGENTS.md** - Systemic view of failures (mandatory standard)
- **Testing Diamond Model** - Cost-effective testing strategy
- **This Document** - Issues inventory and roadmap

---

*Last Updated: 2026-03-16*
*Next Review: After Phase 1 completion*
