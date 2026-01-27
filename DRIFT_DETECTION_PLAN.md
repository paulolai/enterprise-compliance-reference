# Plan: Drift Detection & Automated Sync

## Goal
Transform the "Domain Coverage" system from a manual maintenance burden into an automated quality gate. We will implement "Drift Detection" to ensure the **Requirements (Markdown)** and **Verification (Code)** never diverge.

## 1. Documentation (The "Why" & "How")
Before building the tool, we define the contract.
*   [ ] **Update `docs/ARCHITECTURE_DECISIONS.md`**:
    *   Add **ADR 13: Drift Detection Strategy**.
    *   Explicitly decide: "We treat Documentation Bugs (typos, stale rules) as Build Failures."
*   [ ] **Update `docs/TESTING_FRAMEWORK.md`**:
    *   Add "Managing Drift" section.
    *   Explain the `drift:check` command.

## 2. Tooling: The Drift Detector & Fixer
*   [ ] **Create directory**: `implementations/shared/scripts/` (if not exists)
*   [ ] **Create directory**: `implementations/shared/src/modules/domain-coverage/` (for shared types)
Create a suite of scripts in `implementations/shared/scripts/`.

### A. The Detective (`check-drift.ts`)
*   [ ] **Implement** `implementations/shared/scripts/check-drift.ts`
*   **Inputs:** `pricing-strategy.md` and `**/*.test.ts`.
*   **Logic:**
    1.  Leverage existing `DomainCoverageParser` from `implementations/typescript-vitest/test/domain-coverage/`
    2.  Call `parseBusinessRules()` to get all rules from Markdown
    3.  Call `extractRuleReferences()` to get all references from Tests
    4.  Compare sets to identify:
        - **Orphaned Tests:** Tests referencing rules that don't exist in MD
        - **Missing Tests:** Rules in MD not referenced by any test
        - **Typos:** Rules with similar names (fuzzy match suggestion)
*   **[ ] Add npm scripts** (`drift:check`, `drift:fix`) to root `package.json`
*   **Outputs:**
    *   **Error (Exit 1):** Orphaned Tests exist (prevents misleading reporting)
    *   **Warning (Exit 0):** Missing Tests exist (alerts to unverified features)
    *   **Suggestion:** "Found 'Rule §5' in tests, but MD has 'Rule § 5'. Did you mean...?"

### B. The Fixer (`scaffold-tests.ts`)
*   [ ] **Implement** `implementations/shared/scripts/scaffold-tests.ts`
*   **Trigger:** `npm run drift:fix` or interactive CLI.
*   **Action:** For every "Missing Test":
    1.  Identify the Domain (e.g., "Pricing", "Shipping") based on the rule section.
    2.  Generate a new file (or append to existing) using the **Standard Invariant Pattern**.
    3.  **Auto-Code:**
        *   Imports: `CartBuilder`, `verifyInvariant`.
        *   Metadata: Fills `ruleReference` and `rule` description automatically.
        *   Body: `// TODO: Implement invariant logic for ${ruleDescription}`.
*   **Benefit:** Reduces the "Blank Page Problem" and enforces architectural standards (Imports, Builders, Naming) automatically.

## 3. Automation: Git Hooks
Make it impossible to commit "Lying Tests."
*   [ ] **Install `husky`**: Standard tool for Git hooks. ✅ **ALREADY INSTALLED** (`.husky/` exists)
*   [ ] **Update `.husky/pre-commit`**:
    *   Run `npm run drift:check`.
    *   (Optional) Run `npm run test:types` (fast check).
    *   If `drift:check` fails (Orphaned Test), the commit is rejected with: *"Error: Test references deleted rule. Run `npm run drift:fix` to resolve."*

## 4. Workflows (Future State)
*   [ ] **VS Code Task:** "Scaffold Missing Tests" (Auto-generate `.test.ts` file for untracked rules).

---

## Status Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Documentation (ADR 13 + Framework Docs) | ❌ Not Started | Sections marked as complete but files don't contain required content |
| `DomainCoverageParser` | ✅ Exists | Located at `implementations/typescript-vitest/test/domain-coverage/domain-coverage-parser.ts` |
| `check-drift.ts` (Detective) | ❌ Not Implemented | Scripts directory doesn't exist |
| `scaffold-tests.ts` (Fixer) | ❌ Not Implemented | Scripts directory doesn't exist |
| Husky (Git Hooks) | ⚠️ Partial | Installed, but pre-commit only runs `lint-staged`, not `drift:check` |
| npm scripts (`drift:check`, `drift:fix`) | ❌ Missing | Not in root `package.json` |
| VS Code Task | ❌ Not Implemented | N/A |

**Good News:** The foundational `DomainCoverageParser` already exists with exactly the methods referenced in the plan (`parseBusinessRules()`, `extractRuleReferences()`, `calculateCoverage()`).
