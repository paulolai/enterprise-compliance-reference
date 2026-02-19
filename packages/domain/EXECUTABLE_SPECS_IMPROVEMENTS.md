# Executive Specifications Enhancement Plan

## Objective
Transform the existing TypeScript Vitest test suite into a **production-grade reference implementation** of the Executable Specifications pattern with:
- Property-based testing with business rule traceability
- Serenity BDD-inspired living documentation via structured metadata
- Business tags for categorization and filtering (e.g., `@pricing`, `@shipping`, `@vip`, `@critical`)
- Enhanced attestation reports showing coverage by tag and business domain

---

## Overview of 10 Improvements

### 1. ✅ Focused Arbitraries for Boundary Testing
**File**: `test/fixtures/focused-arbitraries.ts` (NEW)

Create targeted generators that systematically hit edge cases where invariants are most likely to fail.

#### Generators to Implement:
- `vipBoundaryUserArb` - Users with tenure 0,1,2,3,4 (tests >2 boundary)
- `bulkBoundaryItemArb` - Items with quantity 1,2,3,4,5 (tests >=3 boundary)
- `cartWithBulkDiscountArb` - Guarantees at least one bulk-discounted item
- `cartAroundFreeShippingThresholdArb` - Tests ±200 cents around $100 threshold
- `cartExactlyFreeShippingThresholdArb` - Tests exactly $99.99, $100.00, $100.01
- `cartThatHitsDiscountCapArb` - Large orders that trigger 30% safety valve

**Impact**: Eliminates the need for thousands of random iterations to hit critical boundaries.

---

### 2. 📋 Business Rule Traceability with Structured Metadata (Serenity-Inspired)
**Files**: Modify `test/pricing.properties.test.ts`, `test/shipping.properties.test.ts`, `test/fixtures/invariant-helper.ts`, `test/modules/tracer.ts`

Add structured metadata (Serenity BDD-inspired) that explicitly links test cases to business rules with tags for categorization.

#### Metadata Structure:
```typescript
interface InvariantMetadata {
  name: string;
  ruleReference: string; // e.g., "pricing-strategy.md §3"
  rule: string;
  tags: string[]; // Serenity-style tags: ['@pricing', '@vip', '@critical']
  additionalInfo?: string;
}
```

#### Pattern (replacing string-based verifyInvariant):
```typescript
import { verifyInvariant } from './fixtures/invariant-helper';

verifyInvariant({
  name: 'Invariant: VIP Discount Rule',
  ruleReference: 'pricing-strategy.md §3 - VIP Tier',
  rule: 'VIPs receive 5% discount on cart subtotal if tenure > 2 years. Applied AFTER bulk discounts.',
  tags: ['@pricing', '@vip', '@discount', '@critical'],
  additionalInfo: 'Order: VIP discount calculated on post-bulk subtotal'
}, (items, user, result) => {
  if (user.tenureYears > 2) {
    const expected = Math.round(result.subtotalAfterBulk * 0.05);
    expect(result.vipDiscount).toBe(expected);
  } else {
    expect(result.vipDiscount).toBe(0);
  }
});
```

**Impact**:
- Creates bidirectional traceability between documentation and tests
- Enables tag-based filtering in attestation reports (e.g., "Show all @critical tests")
- Foundation for Living Documentation Reports that group tests by domain/tag

---

### 3. 💬 Custom Failure Messages with Business Context
**File**: Modify `test/fixtures/invariant-helper.ts`

Enhance `verifyInvariant` and `verifyShippingInvariant` with business-contextual error formatting using the structured metadata.

#### Implementation:
```typescript
try {
  assertion(items, user, result);
} catch (error) {
  const context = explainBusinessContext(items, user, result, method);
  throw new Error(
    `Invariant Violation: ${metadata.name}\n` +
    `Business Rule: ${metadata.ruleReference} - ${metadata.rule}\n` +
    `Tags: ${metadata.tags.join(', ')}\n` +
    `Business Context:\n${context}\n\n` +
    `Counterexample:\n${JSON.stringify({ items, user, method, result }, null, 2)}\n\n` +
    `Original Error: ${error}`
  );
}
```

Add `explainBusinessContext()` helper that summarizes:
- Cart value and composition
- User eligibility status
- Discount calculations
- Shipping method selected
- Which tags apply to this failure

**Impact**: Makes debugging business rule violations self-documenting and actionable with all relevant metadata included.

---

### 4. 🔍 Integration Invariants (Multi-Rule Testing)
**File**: Create `test/integration.properties.test.ts` (NEW)

Add tests that verify rules interact correctly when combined.

#### Invariants to Test:
1. **Free Shipping Post-Discount Check**
   - Original > $100 but final ≤ $100 should NOT get free shipping
   - Ensures threshold check happens AFTER all discounts

2. **VIP Calculation Ordering**
   - VIP discount calculated on (original - bulk), NOT original % 5
   - Ensures sequential application of discounts

3. **Discount Cap Doesn't Apply to Shipping**
   - Verify grandTotal = finalTotal + totalShipping
   - Ensure shipping costs are additive, not included in discount calculations

4. **Express Delivery Override**
   - Express shipping always $25 regardless of discounts or threshold
   - Verify it overrides free shipping logic

**Impact**: Prevents subtle bugs where individual rules pass but interactions fail.

---

### 5. 📊 Statistical Invariant Validation
**File**: Create `test/statistics.spec.ts` (NEW)

Add statistical coverage analysis to ensure invariants exercise the business rules they claim to test.

#### Implementation:
```typescript
const stats = {
  vipUsers: 0,
  nonVipUsers: 0,
  exactlyTwoYearTenure: 0,
  bulkItems: 0,
  nonBulkItems: 0,
  freeShippingQualifying: 0,
  freeShippingNotQualifying: 0,
  discountCapHit: 0,
};

fc.assert(fc.property(...), { numRuns: 5000 });

console.table(stats);
expect(stats.vipUsers).toBeGreaterThan(100);
expect(stats.bulkItems).toBeGreaterThan(100);
```

**Impact**: Provides confidence that invariants actually exercise critical paths.

---

### 6. 🎯 Targeted Arbitraries for High-Value Rules
**File**: Add to `test/fixtures/focused-arbitraries.ts`

Extend with focused arbitraries for specific high-impact rules:
- `cartWithFreeShippingArb` - Guaranteed free shipping
- `cartNoFreeShippingArb` - Guaranteed no free shipping
- `expressShippingCartArb` - Specifically for express delivery logic
- `expeditedShippingCartArb` - Specifically for expedited surcharge logic

**Usage in tests**:
```typescript
it('Invariant: Expedited surcharge = 15% of originalTotal', () => {
  fc.assert(
    fc.property(expressShippingCartArb, (cart, user) => {
      const result = PricingEngine.calculate(cart, user, ShippingMethod.EXPEDITED);
      expect(result.shipment.expeditedSurcharge).toBe(Math.round(result.originalTotal * 0.15));
    })
  );
});
```

**Impact**: Guarantees invariants exercise specific edge cases.

---

### 7. ⚡ Tracer Sampling for Performance
**File**: Modify `test/modules/tracer.ts`

Add configurable sampling logging to reduce file size and runtime for high-iteration tests.

#### Implementation:
```typescript
class TestTracer {
  private sampleRate: number = 1.0;
  private alwaysLogTests: Set<string> = new Set();

  setSampleRate(rate: number) { this.sampleRate = Math.max(0, Math.min(1, rate)); }
  alwaysLog(testName: string) { this.alwaysLogTests.add(testName); }

  log(testName: string, input: any, output: any) {
    const shouldLog = this.alwaysLogTests.has(testName) || Math.random() < this.sampleRate;
    if (!shouldLog) return;
    // ... existing logging
  }
}
```

**Usage in test setup**:
```typescript
beforeEach(() => {
  tracer.setSampleRate(0.1); // Log 10% of property runs
  tracer.alwaysLog('Invariant: Safety Valve Cap'); // Always log critical rules
});
```

**Impact**: Reduces test runtime by 90% while maintaining auditability of critical rules.

---

### 8. 📊 Enhanced Attestation with Living Documentation
**File**: Modify `test/modules/tracer.ts` and `test/fixtures/invariant-helper.ts`

Add invariant summary section with coverage metrics to attestation reports, grouped by tags for Living Documentation.

#### Data Structure:
```typescript
interface InvariantSummary {
  name: string;
  ruleReference: string;
  rule: string;
  tags: string[];
  totalRuns: number;
  passed: boolean;
  failureReason?: string;
  edgeCasesCovered: {
    vipUsers: number;
    nonVipUsers: number;
    bulkItems: number;
    freeShippingQualifying: number;
    expressShipping: number;
    expeditedShipping: number;
    discountCapHit: number;
  };
}

interface TagCoverage {
  tag: string;
  invariants: string[];
  totalRuns: number;
  passed: boolean;
  uniqueEdgeCases: number;
}
```

#### Implementation:
- Track edge cases during property execution
- Collect summary statistics per invariant
- Group statistics by tag
- Export to attestation report with both:
  - **Invariant view**: All tests with coverage metrics
  - **Tag view**: Living documentation grouped by domain (`@pricing`, `@shipping`, `@vip`)

#### Living Documentation Report Example:
```json
{
  "summary": {
    "totalInvariants": 14,
    "totalRuns": 52000,
    "passed": true
  },
  "byTag": {
    "@pricing": {
      "invariants": ["Invariant: Final Total ≤ Original Total", "..."],
      "totalRuns": 28000,
      "coverage": {
        "vipUsers": 1420,
        "bulkItems": 3580,
        "discountCapHit": 890
      }
    },
    "@shipping": {
      "invariants": ["Invariant: Standard Shipping Calc", "..."],
      "totalRuns": 24000,
      "coverage": {
        "freeShippingQualifying": 2100,
        "expressShipping": 1800
      }
    }
  }
}
```

**Impact**:
- Attestation reports show not just "passed" but "well-tested" with coverage metrics
- Living documentation view shows business rule health by domain
- Enables stakeholders to filter by tag (e.g., "Show all @critical tests passed?")

---

### 9. 🛡️ Precondition Tests (Input Validation)
**File**: Create `test/preconditions.spec.ts` (NEW)

Add tests that verify the system rejects invalid inputs (domain enforcement).

#### Preconditions to Test:
1. Negative quantities must be rejected
2. Zero or negative prices must be rejected
3. Negative weights must be rejected
4. Empty SKUs must be rejected
5. Negative tenure years must be rejected

**Impact**: Invariants assume domain validity; preconditions ensure the domain is enforced.

---

### 10. 🔄 Golden Master Regression Testing
**File**: Create `test/regression.golden-master.test.ts` (NEW)

Add regression testing framework to detect unintended behavioral changes.

#### Implementation:
```typescript
describe('Regression: Golden Master Integrity', () => {
  it('Invariant: All existing calculations produce identical results', () => {
    const goldenMaster = loadGoldenMaster();

    fc.assert(fc.property(cartArb, userArb, shippingMethodArb, (items, user, method) => {
      const currentResult = PricingEngine.calculate(items, user, method);
      const hash = calculateContentHash({ items, user, method });

      if (goldenMaster[hash]) {
        expect(currentResult).toEqual(goldenMaster[hash]);
      }
      return true;
    }));
  });
});
```

#### Utilities:
- `loadGoldenMaster()` - Loads saved results from `test/fixtures/golden-master.json`
- `calculateContentHash()` - Creates stable hash of inputs
- `saveGoldenMaster()` - Export function to capture current state

**Impact**: Enables confident refactoring by catching unintended behavioral changes.

---

## Implementation Order

### Phase 1: Foundation (Prerequisites for other improvements)
1. ✅ **#1 Focused Arbitraries** - Base layer for other tests
2. ✅ **#2 Business Rule Traceability** - Document existing tests first

### Phase 2: Enhanced Testing Capabilities
3. ✅ **#3 Custom Failure Messages** - Improve debugging
4. ✅ **#6 Targeted Arbitraries** - Extend #1 with more generators
5. ✅ **#9 Precondition Tests** - Independent, easy to add

### Phase 3: Advanced Testing Patterns
6. ✅ **#4 Integration Invariants** - Multi-rule testing
7. ✅ **#5 Statistical Invariants** - Coverage analysis
8. ✅ **#10 Golden Master Regression** - Regression infrastructure

### Phase 4: Reporting & Performance
9. ✅ **#7 Tracer Sampling** - Performance optimization
10. ✅ **#8 Enhanced Attestation** - Reporting improvements

---

## Migration Guide

### For Existing Tests
No breaking changes - all improvements are additive or modify test infrastructure, not test logic.

### For New Tests
1. Use the new structured `verifyInvariant` with metadata object instead of string
2. Add business tags for categorization (e.g., `@pricing`, `@shipping`, `@vip`, `@critical`)
3. Link to business rules with `ruleReference` field (e.g., "pricing-strategy.md §3")
4. Use focused arbitraries for boundary conditions
5. Consider adding integration invariants for complex features

### Tagging Guidelines (Serenity BDD-inspired)
Recommended tags for this domain:
- `@pricing` - All pricing calculation invariants
- `@shipping` - All shipping calculation invariants
- `@vip` - Invariants involving VIP tier logic
- `@discount` - Invariants involving any discount logic
- `@boundary` - Tests specifically targeting edge cases
- `@critical` - High-priority business rules (e.g., 30% discount cap)
- `@integration` - Multi-rule interaction tests

### For CI/CD
- Golden master management: Run `npm run update-golden-master` when intentionally changing behavior
- Attestation reports: Now include invariant coverage summaries grouped by tag
- Test sampling: Adjust based on CI resource constraints (10-20% recommended)
- Tag filtering: Can run specific tag subsets (e.g., "Run only @critical tests")

### For Living Documentation
- **Business stakeholders**: Use tag view to see health by domain (e.g., "All @pricing tests: 100% coverage")
- **Developers**: Use invariant view for detailed coverage metrics
- **QA teams**: Filter by `@critical` tags for release gate decisions

---

## Success Criteria

### Quality Metrics
- ✅ All 10 improvements implemented
- ✅ Tests pass with enhanced error reporting including business tags
- ✅ All invariants have structured metadata with tags
- ✅ Attestation reports show both invariant and tag views
- ✅ Statistical analysis shows >100 edge cases covered per invariant
- ✅ Golden master regression passes

### Documentation
- ✅ All invariants linked to business rules via `ruleReference` field
- ✅ All invariants tagged with appropriate business domain tags
- ✅ README updated with new testing patterns and tag guidelines
- ✅ Examples in docs/ demonstrate focused arbitraries usage
- ✅ Living documentation reports show tag-based health metrics

### Living Documentation
- ✅ Can view attestation reports by tag (e.g., "Show all @pricing tests")
- ✅ Can filter reports by priority (e.g., "Show only @critical tests")
- ✅ Tag coverage shows unique edge cases covered per domain
- ✅ Reports include business rule references for each invariant
- ✅ Business stakeholders can understand test coverage without technical knowledge

### Performance
- ✅ Test suite runs < 5 seconds with 20% sampling
- ✅ Tracer file size reduced by 80%
- ✅ Property-based tests maintain >1000 iterations with meaningful coverage
- ✅ Tag groupings don't significantly impact report generation time

---

## Risk Mitigation

### Potential Issues
1. **Breaking changes**: All improvements are additive - no breaking changes to existing tests
2. **Test runtime**: Sampling addresses this; can be adjusted per test suite
3. **Maintenance overhead**: Focused arbitraries require updates if business rules change (same as existing arbitraries)

### Rollback Plan
If any improvement causes issues, can be removed independently:
- Each improvement is self-contained
- Minimal interdependencies
- No changes to production code or core business logic

---

## Next Steps

1. Execute implementations in order (Phases 1-4)
2. Run full test suite after each phase
3. Update documentation as we go
4. Final integration testing with all 10 improvements
5. Update project readme with new capabilities

---

## Serenity BDD Inspiration

This implementation adapts key concepts from Serenity BDD for a property-based testing context:

### What We Adopted
1. **Business Tags** - Serenity's tag system (`@pricing`, `@critical`, etc.) for categorization and filtering
2. **Structured Metadata** - Explicit linking of tests to business requirements, not just test names
3. **Living Documentation** - Reports that both developers and business stakeholders can understand
4. **Coverage by Domain** - Grouping tests by business area, not just technical grouping

### What We Didn't Adopt
1. **User Stories** - No "As a customer, when..." narrative style - keeping it strictly business rule focused
2. **Screenplay Pattern** - Not applicable to property-based testing (this is for end-to-end tests)
3. **Feature Files** - No Gherkin/Cucumber - rejecting the translation layer as per project guidelines

### Why This Works for Executable Specifications
Serenity BDD's contribution to this project is **traceability and categorization**, not testing style. By combining:
- Property-based testing (proving invariants for ALL inputs)
- Serenity's metadata and tagging (business context, traceability)
- Direct TypeScript specifications (no Gherkin translation layer)

We create a system where tests serve dual purposes:
1. **Technical verification** - Proving business rules work mathematically
2. **Business documentation** - Living reports showing rule health by domain

---

## Business ↔ Engineering Collaboration Process

### The Philosophy: Minimal Ceremony, Maximum Alignment

Successful shift-left teams are **already collaborating**. We don't need new meetings or workshops - we need **shared language and concrete artifacts** that both teams can reference.

### The Truth: Code IS the Collaboration

If you're already collaborating well, the only missing piece is **documentation of what was agreed upon**. The invariant in the test file IS the collaboration artifact.

```typescript
// This IS the business agreement:
verifyInvariant({
  name: 'Total discount never exceeds 30%',
  ruleReference: 'pricing-strategy.md §4',
  rule: 'Total Discount (Bulk + VIP) ≤ 30% of Original Total',
  tags: ['@pricing', '@safety-valve', '@revenue-protection', '@critical']
}, (items, user, result) => {
  const maxAllowed = result.originalTotal * 0.30;
  expect(result.totalDiscount).toBeLessThanOrEqual(maxAllowed);
});
```

Every stakeholder can read this and see: the business rule, the priority (`@critical`), and the technical verification.

---

### Process for Business Rule Changes

#### Step 1: Strategy Document Review (PR)

When business wants to change a rule:
1. Open PR on `pricing-strategy.md` with clear "What/Why/Impact"
2. Business reviews PR (already doing this)
3. **Business approval = agreement on the rule text**

Example PR description:
```markdown
## Change: Free shipping threshold $100 → $150
**Why**: Increase cart size, reduce cart abandonment
**Section**: §5.2 - Free Shipping Threshold
**Impact**: Will affect free shipping eligibility in 8% of test cases
```

#### Step 2: Invariant Sketch (Fast Feedback Loop)

**Before implementing business logic**, engineer writes a tiny invariant sketch:

```typescript
describe('Rule Change: Free Shipping at $150', () => {
  it('Free shipping triggered > $150', () => {
    verifyInvariant({
      name: 'Free shipping triggered at $150',
      ruleReference: 'pricing-strategy.md §5.2 (updated)',
      rule: 'If finalTotal > $150.00, then totalShipping = 0',
      tags: ['@shipping', '@free-shipping', '@customer-experience', '@rule-change']
    }, (items, user, method, result) => {
      if (result.finalTotal > 15000) {
        expect(result.shipment.totalShipping).toBe(0);
      }
    });
  });
});
```

**Process**:
1. Run tests - they'll fail (expected, rule not implemented yet)
2. Report shows: "12% of test cases will now qualify for free shipping"
3. Email/screenshot report to stakeholder: "Here's the impact of $150 threshold"
4. Stakeholder says "OK" or "Too many, let's do $140"
5. Engineer tweaks number, runs again, shows revised impact (5 minutes)
6. Stakeholder approves ✓

**Why this works**:
- Concrete artifact: stakeholder sees actual impact (12% of carts)
- Fast iteration: change number, run, show (5 minutes)
- No meetings: email/slack/screenshot enough
- Business-friendly: report shows "12% more carts qualify" (not code)

#### Step 3: Implementation

Only after stakeholder approval of invariant sketch does engineer implement business logic.

Tests then pass - proof of implementation.

---

### The Review Loop: Code Review, Not Meeting

**Add one checkbox to PR template**:

```markdown
## Business Rule Review
For each invariant added/modified:
- [ ] Business stakeholder reviewed: Invariant matches strategy document
- [ ] Appropriate tags applied (@critical for revenue impact, etc.)
```

**That's it.** Collaboration happens in code review where it already happens.

---

### Two Tags You Both Need

**Business-focused** (stakeholders care):
- `@revenue-protection` - Prevents margin erosion
- `@customer-experience` - Affects delivery promises
- `@critical` - High-priority, red flags

**Engineering-focused** (developers care):
- `@pricing` - Discount logic
- `@shipping` - Delivery logic
- `@boundary` - Edge case tests

**Both teams use**:
- `@high-risk` - Areas that fail often (agreed during incidents)

---

### Living Documentation: The Report

After `npm test`, you get `reports/latest/report.html` with:

**Developer View** (tab 1 - "Technical Details"):
```
Invariant: Total discount never exceeds 30%
- Runs: 1,000 random test cases
- Edge cases: 142 VIP users, 358 bulk discounts, 89 hit discount cap
- Passed: ✅
```

**Business View** (tab 2 - "Business Health"):
```
Safety Valve (Revenue Protection @critical)
Protects revenue by capping discounts at 30%

Edge Cases Covered:
• Large orders ($5K items, 20+ qty) - tested 89 times
• VIP users with bulk discounts - tested 142 times
• Combined discounts (bulk + VIP) - tested 289 times

Status: ✅ Confirmed protecting revenue
```

**Zero training**. Business clicks "Business" tab and reads business language.

---

### One File You Need: Business Rule Changes Tracker

```markdown
# BUSINESS_RULE_CHANGES.md

## In Progress Changes

### Free Shipping Threshold ($100 → $150)
- **Status**: Reviewing impact
- **Strategy PR**: #123 (approved)
- **Invariant**: test/shipping.properties.test.ts - line 45
- **Impact Analysis**: 12% of test cases will now qualify
- **Business Approval**: Awaiting stakeholder review
- **Engineered by**: @dev

### VIP Tenure Change (>2 → >3 years)
- **Status**: Drafting invariant
- **Strategy PR**: #124 (open)
- **Invariant**: Not yet written
- **Next Steps**: Engineer to write invariant sketch

## Completed This Sprint

### Discount Cap 30% → 25%
- **Completed**: Sprint 14, Week 2
- **Strategy PR**: #119
- **Invariant**: test/pricing.properties.test.ts - line 52
- **Result**: 4% reduction in average discount (finance approved)
```

**Why exists**: Quick visibility into what's being worked on without digging PRs.
**How to use**: Update when status changes (5 seconds/invariant).

---

### What You DON'T Need (Ceremony Removed)

❌ No separate review meetings
❌ No signoff documents
❌ No milestone checkpoints
❌ No prototype reviews
❌ No collaboration workshops

**Why**: You're already good at this. Don't add overhead.

---

### What You DO Need (30 Seconds to Add)

✅ **Metadata in tests** (already writing test, add `tags: []` array)
✅ **PR checkbox** (one line in template)
✅ **One README section** (business stakeholders can review coverage)
✅ **Auto-generated report** (runs automatically, no extra work)

---

### Practical Adoption: 4 Weeks to Cultural Shift

#### Week 1: Add Metadata (2 hours)
Update existing tests with structured metadata and tags.

#### Week 2: Share Report (30 seconds)
Run `npm test`, email `report.html` to stakeholder.

#### Week 3: PR Template (10 minutes)
Add one checkbox for business rule review.

#### Week 4: First Rule Change Using Process
Business requests change → strategy PR → invariant sketch → business sees impact → approve → implement

**Cultural shift happens organically** through artifact-based collaboration.

---

### Why This Drives "Shift Left" Even Further

1. **Business sees concrete impact** before code is written (invariant sketch → report)
2. **Engineers see the "why"** in tags (`@critical` = CFO cares about this)
3. **Iteration is cheap** (tweak number → run → show, 5 minutes)
4. **Zero translation** (test = invariant = business rule, same thing)
5. **Learning happens** (business starts thinking in invariants, engineers in business terms)

---

### Example End-to-End: Changing Free Shipping Threshold

**Day 1**: Business opens issue: "Can we increase free shipping to $150? We're losing carts at checkout."
**Day 1**: Engineer updates `pricing-strategy.md` PR with impact analysis.
**Day 2**: Business approves strategy PR: "Yes, let's try $150."
**Day 2**: Engineer writes invariant sketch (shows 12% of carts will qualify).
**Day 2**: Engineer runs tests, emails report: "12% of test cases now get free shipping."
**Day 3**: Business: "Whoa, that's too expensive. Let's compromise at $140."
**Day 3**: Engineer changes `15000` → `14000`, runs tests (8% qualify).
**Day 3**: Business: "OK, proceed."
**Day 4**: Engineer implements business logic. Tests pass ✓
**Day 5**: Deploy

**Total time**: 5 days
**Number of meetings**: 0
**Shared artifacts**: Strategy PR, invariant sketch, test report

---

### Success Metrics

**Cultural Shift**:
- ✅ Business stakeholders know which rules are `@critical` by week 2
- ✅ Engineers ask "Is this revenue-protecting?" by week 3
- ✅ Rule changes start with strategy review, not implementation by week 4

**Process Metrics**:
- ✅ 0 added meetings
- ✅ All rules changes linked to strategy PRs
- ✅ All invariants tagged appropriately
- ✅ Reports shared with stakeholders on major changes

**Business Value**:
- ✅ Business sees impact before implementation (invariant sketch reports)
- ✅ Faster feedback loops (5 minutes vs week of meetings)
- ✅ Clear traceability from requirement to test to report
