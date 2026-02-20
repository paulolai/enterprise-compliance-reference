# Executable Specifications Workflow Guide

This guide walks through the end-to-end workflow: from defining a business rule to seeing it verified in the attestation report.

## Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐    ┌──────────────────┐
│ 1. Define Rule  │ →  │ 2. Write Test    │ →  │3. Implement     │ →  │4. Attestation    │
│ in pricing-     │    │ (Invariant/PBT)  │    │ Domain Logic    │    │ Report           │
│ strategy.md     │    │                  │    │                 │    │                  │
└─────────────────┘    └──────────────────┘    └─────────────────┘    └──────────────────┘
```

---

## Step 1: Define the Business Rule

Edit `docs/pricing-strategy.md` to add your new rule.

**Required sections:**
- **Goal:** Why this rule exists (business context)
- **Rule:** The specific requirement
- **Invariant:** The mathematical property that must always hold

**Example:**
```markdown
## 6. New Discount Rule
**Goal:** Encourage first-time purchases.
- **Rule:** New users get 10% off their first order.
- **Invariant:** If user.tenureYears === 0, apply 10% discount.
```

---

## Step 2: Write the Invariant Test

Create a test file following the naming convention: `domain.layer.type.test.ts`

### For API/Domain Logic

Use `verifyInvariant()` from the invariant helper:

```typescript
// packages/domain/test/new-discount.properties.test.ts
import { verifyInvariant } from './fixtures/invariant-helper';

it('New users get 10% first-order discount', () => {
  verifyInvariant({
    ruleReference: 'pricing-strategy.md §6 - New User Discount',
    rule: 'Users with tenure === 0 receive 10% discount',
    tags: ['@pricing', '@new-user']
  }, (items, user, result) => {
    const expectedDiscount = user.tenureYears === 0 
      ? Math.round(result.originalTotal * 0.10)
      : 0;
    expect(result.newUserDiscount).toBe(expectedDiscount);
  });
});
```

### For UI/E2E Tests

Use `invariant()` from the Playwright helper:

```typescript
// test/e2e/new-user.ui.properties.test.ts
import { invariant } from './fixtures/invariant-helper';

invariant('New user sees discount applied in cart', {
  ruleReference: 'pricing-strategy.md §6 - New User Discount',
  rule: 'Discount visible on cart page for new users',
  tags: ['@pricing', '@ui']
}, async ({ page }) => {
  // Test implementation...
});
```

---

## Step 3: Implement the Domain Logic

Write the business logic in `packages/domain/src/`:

```typescript
// packages/domain/src/pricing-engine.ts
export function calculate(items: CartItem[], user: User): PricingResult {
  // Implementation that satisfies the invariant
}
```

Run tests to verify:
```bash
cd packages/domain
pnpm test
```

---

## Step 4: Generate Attestation Report

Run the full test suite with attestation:

```bash
pnpm run test:all
```

This generates:
- **Attestation Report:** `reports/run-{timestamp}/attestation/attestation-full.html`
- **Allure Report:** Available via `pnpm run reports:allure:serve`

---

## Step 5: Verify Traceability

Open the attestation report and verify:

1. **Hierarchy:** Test appears in correct section (API/GUI → Domain → Context)
2. **Rule Link:** Click the rule reference to verify it links to `pricing-strategy.md`
3. **Traces:** Check that input/output traces are captured
4. **Coverage:** Confirm Domain Coverage shows the new rule

---

## Common Commands

| Command | Purpose |
|---------|---------|
| `pnpm run test:all` | Run all tests + generate attestation |
| `cd packages/domain && pnpm test` | Run API/unit tests |
| `cd test && pnpm test` | Run E2E tests |
| `pnpm run reports:allure:serve` | Serve Allure report |
| `pnpm run test:coverage` | Run with code coverage |

---

## Pattern Quick Reference

| Layer | Helper | Use For |
|-------|--------|---------|
| API (Vitest) | `verifyInvariant()` | Domain logic, pricing calculations |
| API (Vitest) | `verifyExample()` | Specific edge cases |
| UI (Playwright) | `invariant()` | E2E flows, UI behavior |

---

## Next Steps

- **Read the Testing Framework:** [docs/TESTING_FRAMEWORK.md](TESTING_FRAMEWORK.md)
- **Learn PBT Patterns:** [docs/API_TESTING_PATTERNS.md](API_TESTING_PATTERNS.md)
- **Understand Reporting:** [docs/reference/attestation-architecture.md](reference/attestation-architecture.md)
