# Plan: Drift Detection & Automated Sync

## Goal
Transform the "Domain Coverage" system from a manual maintenance burden into an automated quality gate. We will implement "Drift Detection" to ensure the **Requirements (Markdown)** and **Verification (Code)** never diverge.

## 1. Documentation (The "Why" & "How")
Before building the tool, we define the contract.
*   **Update `docs/ARCHITECTURE_DECISIONS.md`**:
    *   Add **ADR 13: Drift Detection Strategy**.
    *   Explicitly decide: "We treat Documentation Bugs (typos, stale rules) as Build Failures."
*   **Update `docs/TS_TESTING_FRAMEWORK.md`**:
    *   Add "Managing Drift" section.
    *   Explain the `drift:check` command.

## 2. Tooling: The Drift Detector & Fixer
Create a suite of scripts in `implementations/shared/scripts/`.

### A. The Detective (`check-drift.ts`)
*   **Inputs:** `pricing-strategy.md` and `**/*.test.ts`.
*   **Logic:**
    1.  Parse all `Rule §X` definitions from Markdown.
    2.  Parse all `ruleReference: '...'` from Tests.
    3.  Compare sets.
*   **Outputs:**
    *   **Error (Exit 1):** If an "Orphaned Test" exists (references a non-existent rule). This prevents misleading reporting.
    *   **Warning (Exit 0):** If a "Missing Test" exists (rule defined but not tested).
    *   **Suggestion:** "Found 'Rule §5' in tests, but MD has 'Rule § 5'. Did you mean...?"

### B. The Fixer (`scaffold-tests.ts`)
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
*   **Install `husky`**: Standard tool for Git hooks.
*   **Pre-Commit Hook**:
    *   Run `npm run drift:check`.
    *   (Optional) Run `npm run test:types` (fast check).
    *   If `drift:check` fails (Orphaned Test), the commit is rejected with: *"Error: Test references deleted rule. Run `npm run drift:fix` to resolve."*

## 4. Workflows (Future State)
*   **VS Code Task:** "Scaffold Missing Tests" (Auto-generate `.test.ts` file for untracked rules).

## Implementation Order
1.  **Docs:** Define the standard first.
2.  **Script:** Build the `drift-checker` logic.
3.  **Hook:** Enforce it via Husky.
