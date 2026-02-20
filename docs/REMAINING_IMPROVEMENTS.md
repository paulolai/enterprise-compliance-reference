# Remaining Documentation Improvements

Based on code review in `kimi-plan.md` and `ADR-extracts.md` - items not yet implemented.

---

## Phase 1: Path Updates (High Priority)

### ADR-extracts.md Still Has Old Paths

**Location:** `ADR-extracts.md`

**Problem:** Lines 44 and 50 still reference old paths.

**Status:** ✅ FIXED - Updated to `packages/shared`

---

## Phase 2: Documentation Improvements (Medium Priority)

### Task 1: Add Cross-References in pricing-strategy.md

**File:** `docs/pricing-strategy.md`

**Action:** Add "See:" references after each rule section linking to test files.

**Example:**
```markdown
## 2. Bulk Discounts
...existing content...

**See:**
- Property tests: `packages/domain/test/pricing.properties.test.ts:17-30`
- Integration tests: `packages/domain/test/integration.properties.test.ts:10-56`
```

**Rules to link:**
| Rule | Test File |
|------|-----------|
| §1 Base Rules | `pricing.properties.test.ts:7-15`, `pricing.properties.test.ts:57-78` |
| §2 Bulk Discounts | `pricing.properties.test.ts:17-30` |
| §3 VIP Tier | `pricing.properties.test.ts:32-41` |
| §4 Safety Valve | `pricing.properties.test.ts:43-55`, `integration.properties.test.ts:10-56` |
| §5.1-5.5 Shipping | `shipping.properties.test.ts:7-59` |

---

### Task 2: Create WORKFLOW_GUIDE.md

**File:** `docs/WORKFLOW_GUIDE.md` (new)

**Outline:**
```markdown
# Executable Specifications Workflow Guide

## Overview
End-to-end workflow: Business Rule → Invariant Test → Implementation → Attestation

## Step 1: Define the Rule
- Edit `docs/pricing-strategy.md`
- Document goal, rule, invariant, edge cases

## Step 2: Write the Invariant Test
- Create test file following `domain.layer.type.test.ts` convention
- Use `verifyInvariant()` with proper metadata
- Link to business rule via `ruleReference`

## Step 3: Implement the Logic
- Write domain logic in `packages/domain/src/`
- Run tests: `pnpm test`

## Step 4: Generate Attestation
- Run: `pnpm run test:all`
- Open: `reports/run-{timestamp}/attestation/attestation-full.html`

## Step 5: Verify Traceability
- Check that test appears in correct hierarchy
- Verify input/output traces captured
- Confirm business rule link works

## Example: Adding a New Discount Rule
[Walkthrough with code examples]
```

---

### Task 3: Document Naming Distinction

**Files:**
- `packages/domain/test/fixtures/invariant-helper.ts`
- `test/e2e/fixtures/invariant-helper.ts`

**Action:** Add header comment explaining API vs UI naming.

```typescript
/**
 * Invariant Testing Helpers
 * 
 * API Layer (this file): verifyInvariant()
 * - Uses fast-check for property-based testing
 * - Generates 100+ random inputs to prove invariants mathematically
 * - Use for: Domain logic, pricing calculations, business rules
 * 
 * UI Layer (test/e2e): invariant()
 * - Playwright wrapper with web-first assertions
 * - Generates attestation reports for compliance
 * - Use for: E2E flows, UI behavior, user interactions
 */
```

---

## Phase 3: Enhancements (Low Priority)

### Task 4: Add Inline "Why" Comments

Add explanatory comments to edge case tests explaining the business rationale.

---

### Task 5: Visual Diagram of Test Hierarchy

Create diagram showing:
- Layer: API Verification → GUI Verification
- Domain: Pricing → Cart → Checkout
- Context: Integration → Properties → Flow

---

### Task 6: CartBuilder Quick Reference

Create `docs/reference/CART_BUILDER.md` with:
- All available methods
- Chained examples
- Common patterns

---

## Execution Order

1. Add cross-references to pricing-strategy.md
2. Create WORKFLOW_GUIDE.md
3. Add header comments to invariant-helper.ts files

## Files to Modify/Create

| Action | File |
|--------|------|
| Edit | `docs/pricing-strategy.md` |
| Create | `docs/WORKFLOW_GUIDE.md` (~100 lines) |
| Edit | `packages/domain/test/fixtures/invariant-helper.ts` |
| Edit | `test/e2e/fixtures/invariant-helper.ts` |

---

## Completed Items ✅

- Path references in README (already correct)
- Path references in AGENTS.md (already correct)
- All P1-P3 tech debt from TECH_DEBT.md
- Path updates in ADR-extracts.md
