# Testing Diamond Model

**An Alternative to the Testing Pyramid**

---

## The Traditional Pyramid Problem

```
          /\
         /  \          <- E2E Tests (few)
        /____\
       /      \
      /________\        <- Integration Tests (some)
     /          \
    /____________\
   /              \
  /________________\    <- Unit Tests (many)
 /                  \
/____________________\
```

**The assumption:** Write lots of unit tests, fewer integration, very few E2E.

**The reality:** Unit tests catch logic errors, but most bugs are in:
- **Structure** (HTML, accessibility) → Static Analysis
- **Integration** (APIs, flows, state) → Integration Tests
- **Domain Logic** → Property Tests (not traditional unit tests)

---

## The Testing Diamond

```
          /\
         /  \           <- E2E + Exploratory (top point)
        /    \
       /______\
      /        \
     /          \       <- Integration Tests (widest middle)
     \          / 
      \_______ /      
       \      /
        \    /          <- Static Analysis (bottom point)
         \  /
          \/
```

**The diamond shape emphasizes:**
- **Top point:** Minimal E2E/Exploratory (just validation)
- **Wide middle:** Heavy focus on Integration tests (where value lives)
- **Bottom point:** Automated static analysis (structure/compliance)
- **Thin vertical:** Minimal Unit tests (replaced by types + properties)

**The focus:** Heavy on the middle, automate the bottom, minimal top.

---

## Our Experience

The exploratory testing session found 4 issues:

| Issue | Diamond Layer | Detection Method | Cost to Find |
|-------|---------------|------------------|--------------|
| HTML title "react-playwright" | **Static Analysis** | HTML validation | $10 |
| Shipping methods missing | **Integration** | E2E tests | $100 |
| Generic 404 page | **Integration** | E2E tests | $100 |
| Heading hierarchy | **Static Analysis** | axe-core | $15 |

**Breakdown:**
- 50% Static Analysis issues
- 50% Integration issues
- 0% Unit Test issues (none found!)

**What this means:** The domain logic (pricing engine) is well-tested. The gaps are in flows and structure.

---

## Layer Breakdown

### Bottom: Static Analysis (20% of coverage)

**What it catches:**
- HTML structure (missing titles, broken tags)
- Accessibility (headings, labels, contrast)
- Security (headers, CSP, secrets)
- SEO (meta tags, structured data)

**Why it's valuable:**
- Near-zero cost (automated in CI)
- Instant feedback
- Not "bugs" - compliance issues

**Tools:**
- html-validate
- axe-core
- Lighthouse
- ESLint security plugins

**Our gaps:**
- ❌ No HTML validation
- ❌ No accessibility scanning
- ❌ No SEO checks

### Middle: Integration Tests (60% of coverage)

**What it catches:**
- Business logic flows (checkout → payment → confirmation)
- API contracts (frontend ↔ backend)
- State management (cart persistence)
- Component integration

**Why it's the focus:**
- This is where user value lives
- Fast enough (seconds)
- Catches real bugs, not implementation details

**Tools:**
- Playwright (component + E2E)
- MSW (API mocking)
- Property-based testing (fast-check)

**Our gaps:**
- ❌ Missing shipping flow tests
- ❌ Missing 404 routing tests
- ❌ Missing auth flow tests

### Top: E2E + Exploratory (20% of coverage)

**What it catches:**
- Critical user journeys (happy path only)
- Cross-browser issues
- Edge cases (race conditions, UX friction)

**Why it's minimal:**
- High cost (slow, brittle)
- Manual exploratory is expensive
- Automation catches 95% of issues

**Tools:**
- Playwright (critical paths only)
- Manual exploratory (monthly)

**Our gaps:**
- ⚠️ Running too much exploratory (catching obvious issues)

---

## Why Unit Tests Are Different

**Traditional view:** "Write lots of unit tests"

**Our reality:**
- Domain logic is tested via **property-based tests** (integration level)
- React components tested via **Playwright** (integration level)
- Pure functions validated via **TypeScript** (static analysis)

**The insight:** Modern tools blur the line between unit and integration.

- TypeScript catches type errors (static)
- Vitest + fast-check catches logic (property-based)
- Playwright components catch rendering (integration)

**We don't need 1000 unit tests** - we need:
- Property tests for domain logic ✅ (have these)
- Component tests for UI ✅ (have these)
- Static analysis for structure ❌ (missing)
- Integration tests for flows ❌ (missing)

---

## Cost Comparison

| Method | Cost to Find | What It Catches | Diamond Position |
|--------|--------------|-----------------|------------------|
| Static Analysis | $10 | Structure, compliance | **Bottom** |
| Unit Tests | $50 | Logic | *Traditional bottom* |
| Integration Tests | $80 | Business logic | **MIDDLE** |
| E2E Tests | $200 | User flows | **MIDDLE** |
| Exploratory | $500 | Edge cases | Top |

**Finding HTML title:**
- Via exploratory: $500
- Via static analysis: $10
- **Savings: 50x**

**Finding shipping flow:**
- Via exploratory: $500
- Via E2E: $200
- **Savings: 2.5x**

---

## Implementation Strategy

### Phase 1: Static Analysis (Quick wins)

**Week 1-2:**
1. Add HTML validation to CI
2. Add axe-core scanning
3. Add Lighthouse CI

**Expected:** Catch HTML title, headings, basic accessibility

### Phase 2: Integration Tests (Core work)

**Week 3-6:**
1. Add shipping flow E2E tests
2. Add 404 routing tests
3. Add checkout complete flow
4. Add auth flow tests

**Expected:** Catch shipping, 404, flow gaps

### Phase 3: Reduce Exploratory (Validate)

**Month 2:**
1. Run exploratory test
2. Should find 0 major issues
3. Or only edge cases (race conditions, etc.)

**Success metric:** Exploratory becomes boring

---

## Comparison: Pyramid vs Diamond

### Pyramid Project
```
Unit Tests:     1000 tests (catches logic errors)
Integration:    100 tests  (catches API issues)
E2E:            20 tests   (catches journey issues)
Exploratory:    Monthly    (catches edge cases)
```

**Problem:** Exploratory keeps finding obvious stuff

### Diamond Project
```
Static Analysis: Automated (catches structure)
Property Tests:  50 tests   (catches domain logic)
Integration:     200 tests  (catches flows)
E2E:             30 tests   (catches journeys)
Exploratory:     Quarterly  (catches edge cases)
```

**Result:** Exploratory finds nothing (or only interesting edge cases)

---

## Our Current State

| Layer | What We Have | What We Need | Gap |
|-------|--------------|--------------|-----|
| Static Analysis | ❌ None | HTML, axe-core, Lighthouse | **HIGH** |
| Property Tests | ✅ Pricing engine | More domain logic | Low |
| Component Tests | ✅ Playwright | More coverage | Medium |
| Integration | ⚠️ Some E2E | Shipping, 404, auth | **HIGH** |
| E2E | ⚠️ Basic | Complete flows | Medium |
| Exploratory | ✅ Working | Should find less | **GOAL** |

**We're closer to the diamond than the pyramid** - we just need to:
1. Add static analysis (bottom)
2. Fill integration gaps (middle)
3. Reduce exploratory burden (top)

---

## Conclusion

**The testing pyramid made sense when:**
- Unit testing was the only fast feedback
- Integration was slow and expensive
- Static analysis didn't exist

**The testing diamond makes sense now:**
- Static analysis is instant
- Integration tests are fast enough
- Unit tests are replaced by types + properties

**Our exploratory testing session proved it:**
- The domain logic works (property tests caught it)
- The structure is broken (needs static analysis)
- The flows are incomplete (needs integration tests)

**Focus the work:**
- ✅ Keep property tests (they work)
- ✅ Keep component tests (they work)
- ❌ **Add static analysis** (catch structure)
- ❌ **Add integration tests** (catch flows)
- ⚠️ **Reduce exploratory** (should find nothing)

---

*See [testing-gaps-analysis.md](testing-gaps-analysis.md) for detailed gap analysis.*
