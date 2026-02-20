# Trust Your Agents with Invariant-Based Verification

**How to create rigorous verification that lets AI agents work autonomously for extended periods.**

---

## The Problem

You give an AI agent a task. It writes code. Tests pass. You ship it. Then bugs appear in production.

**Why?** The agent optimized for "tests pass" rather than "actually correct." Without deep invariants, there's no way to distinguish "works for my test cases" from "actually works."

## The Solution

This repo demonstrates **invariant-based verification** - a workflow where:

1. **You define correctness** as mathematical invariants, not test cases
2. **Agents implement** against those invariants
3. **Property-based testing** proves the invariants hold for all inputs
4. **Attestation reports** prove the work was done

> "Human defines what's correct. Agent finds a way to achieve it. Machine proves it holds."

---

## The Core Pattern

```typescript
// Define the invariant - what MUST be true
it('Invariant: Discount never exceeds 30%', () => {
  fc.assert(
    fc.property(cartArb, userArb, (cart, user) => {
      const result = PricingEngine.calculate(cart, user);
      return result.discount <= result.originalTotal * 0.30;
    })
  );
});
```

This single test proves the rule for **millions of possible inputs**, not just the 3-5 examples a human would write.

---

## How It Works

### 1. Define Invariants (Business Rules)
Write tests that express what must **always** be true, not what should happen for specific inputs.

### 2. Let Agents Iterate
Give the agent the invariants and let it implement. It will try many approaches, failing tests until it finds one that satisfies all invariants.

### 3. Machine-Verify
Fast-check generates hundreds of random inputs. If any input violates the invariant, you know the implementation is wrong.

### 4. Attestation Report
Every run produces evidence linking back to the original business rule - proof the work was done correctly.

---

## Why This Works for AI Agents

| Traditional Tests | Invariant-Based |
|-------------------|------------------|
| Human writes 10 examples | Machine generates 100s |
| Agent can game specific cases | Agent must satisfy universal truth |
| "Works for my test data" | "Proof it works for all data" |
| Brittle - edge cases slip through | Robust - edge cases are found |

---

## The Stack

- **Property-Based Testing**: [fast-check](https://fast-check.dev/)
- **Test Framework**: Vitest
- **E2E**: Playwright
- **Attestation**: Custom reporter → HTML reports

---

## Quick Start

```bash
# Install
pnpm install

# Run all tests (includes attestation report generation)
pnpm run test:all

# Run property-based tests only
cd packages/domain && pnpm test
```

---

## Key Files

| Path | Purpose |
|------|---------|
| `docs/pricing-strategy.md` | The business rules (source of truth) |
| `packages/domain/test/` | Property-based tests with invariants |
| `packages/shared/fixtures/` | CartBuilder - fluent test data |
| `reports/run-*/attestation/` | Generated proof of correctness |

---

## The Feedback Loop

```
┌─────────────────────────────────────────────────────────────┐
│  1. Define Invariant                                        │
│     "Discount ≤ 30% of original total"                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Agent implements PricingEngine                          │
│     (iterates, fails tests, tries again)                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  3. fast-check generates 100s of random carts               │
│     - Negative prices? handled                              │
│     - 10,000 items? handled                                 │
│     - Any user type? works                                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Attestation report proves rule was verified             │
└─────────────────────────────────────────────────────────────┘
```

---

## Comparison: With vs Without Rigor

### Without Rigor (Traditional)
- Agent writes tests for 3-5 happy paths
- Tests pass
- Edge cases found in production
- No evidence of verification

### With Invariants
- Agent must satisfy universal proof
- Edge cases caught by PBT
- Attestation report proves completeness
- Human can trust the result

---

## For Developer Experience Teams

This pattern enables **trustworthy agentic workflows**:

1. Define the contract (invariants)
2. Let agents implement
3. Verify with PBT
4. Prove with attestation

No need to review every line - the verification proves correctness.

---

## Related

- [Property-Based Testing Guide](docs/reference/infinite-examples.md)
- [Attestation Architecture](docs/reference/attestation-architecture.md)
- [Pricing Strategy](docs/pricing-strategy.md)

---

## 📦 Migration Manifest

When extracting this pattern to a new repository (e.g., `agent-trust-pattern`), copy **only** these core artifacts. This separates the "Trust Engine" from the specific application implementation.

### ✅ What to Copy (The Trust Engine)

| Path | Description |
|------|-------------|
| `packages/domain/` | **The Brain.** Contains the pure logic (`src/`) and invariant tests (`test/`). |
| `packages/shared/` | **The Language.** Contains Zod schemas, types, and the `CartBuilder` fluent interface. |
| `docs/pricing-strategy.md` | **The Rules.** The source of truth document (replace with your own domain rules). |
| `packages/domain/test/reporters/` | **The Proof.** The custom reporter that generates the Attestation Report. |
| `docs/TESTING_FRAMEWORK.md` | **The Guide.** Instructions on how to write property-based tests. |

### ❌ What to Leave Behind (The App Implementation)

| Path | Reason |
|------|--------|
| `packages/client/` | React frontend (specific to the demo app). |
| `packages/server/` | Hono API server (specific to the demo app). |
| `test/e2e/` | Playwright E2E tests (UI-specific). |
| `docker-compose.yml` | Infrastructure configs. |
| `.github/workflows/` | CI/CD pipelines (rebuild these for the new repo). |

