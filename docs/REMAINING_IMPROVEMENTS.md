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

### 1. Add Cross-References to Pricing Strategy

**Location:** `docs/pricing-strategy.md`

**Problem:** No links from business rules to specific test files that verify each rule.

**Solution:** Add references after each rule section:
```markdown
**See:**
- Unit tests: `packages/domain/test/pricing.properties.test.ts:17`
- API tests: `test/e2e/api/pricing-api.spec.ts:42`
- UI tests: `test/e2e/checkout.ui.properties.test.ts:88`
```

---

### 2. Create Workflow Guide

**Location:** `docs/WORKFLOW_GUIDE.md` (new file)

**Purpose:** End-to-end guide showing spec → test → attestation workflow.

**Outline:**
1. Define rule in `pricing-strategy.md`
2. Write invariant test (property-based for API, web-first for UI)
3. Implement logic in domain layer
4. Run tests: `pnpm run test:all`
5. Generate attestation report
6. Verify traceability in `reports/attestation-full.html`

---

### 3. Document Naming Distinction

**Location:** `packages/domain/test/fixtures/invariant-helper.ts` and `test/e2e/fixtures/invariant-helper.ts`

**Problem:** API layer uses `verifyInvariant`, UI layer uses `invariant` - confusing for learners.

**Solution:** Add header comment in both files:
```typescript
/**
 * API Layer: verifyInvariant()
 * - Uses fast-check for property-based testing
 * - Generates 100+ random inputs to prove invariants
 * 
 * UI Layer: invariant()
 * - Playwright wrapper with web-first assertions
 * - Maps to Attestation Reports for compliance
 */
```

---

## Phase 3: Enhancements (Low Priority)

### 4. Add Inline "Why" Comments

Add explanatory comments to edge case tests explaining the business rationale.

---

### 5. Visual Diagram of Test Hierarchy

Create diagram showing:
- Layer: API Verification → GUI Verification
- Domain: Pricing → Cart → Checkout
- Context: Integration → Properties → Flow

---

### 6. CartBuilder Quick Reference

Create `docs/reference/CART_BUILDER.md` with:
- All available methods
- Chained examples
- Common patterns

---

## Completed Items ✅

- Path references in README (already correct)
- Path references in AGENTS.md (already correct)
- All P1-P3 tech debt from TECH_DEBT.md
