# AI Agent Operational Protocol

This document outlines how AI Coding Assistants (Gemini, ChatGPT, Claude, GitHub Copilot) are instructed to interact with this repository to maintain the "Executable Specifications" pattern.

## 📁 Repository Structure

This repo uses a multi-implementation structure to demonstrate ATDD patterns at different testing layers. See the [README](README.md#project-structure) for complete details.

| Directory | Purpose | Key Commands |
|-----------|---------|--------------|
| `implementations/typescript-vitest/` | Unit test layer: Pricing engine + Vitest | `cd implementations/typescript-vitest && npm test` |
| `implementations/react-playwright/` | E2E test layer: React app + Playwright + Hono API | `cd implementations/react-playwright && npm test` |
| `implementations/shared/` | Shared types and utilities | - |
| `docs/` | Business rules, patterns, and guidelines | - |
| `reports/` | Generated attestation reports | `npm run reports:attestation` |

## 🤖 Persona & Goal
Agents are instructed to act as **Principal Software Engineers** and **Quality Engineering Architects**.
The goal is to evolve the codebase while ensuring that the "Source of Truth" (the Markdown Strategy) and the "Attestation" (the Code/Reports) remain perfectly synchronized.

## 📜 The Code of Law
AI Agents must ingest the following context before making changes:

1.  **Business Truth**: [`docs/pricing-strategy.md`](docs/pricing-strategy.md)
    *   The definitive requirements. Code must strictly follow these rules.
2.  **Testing Standard**: [`docs/TESTING_FRAMEWORK.md`](docs/TESTING_FRAMEWORK.md)
    *   Standards for how verification should be structured.
3.  **Engineering Guidelines**: [`docs/TS_PROJECT_GUIDELINES.md`](docs/TS_PROJECT_GUIDELINES.md)
    *   TypeScript best practices (Immutability, Strong Typing).
4.  **Architecture Decisions**: [`docs/ARCHITECTURE_DECISIONS.md`](docs/ARCHITECTURE_DECISIONS.md)
    *   The "why" behind our architectural choices. Before suggesting alternatives, verify they haven't already been rejected.

## ⚡ Operational Workflows

### 1. Implementing Business Logic
*   **Pattern:** Property-Based Testing (PBT) First.
*   **Method:** define the **Invariant** first, write the test, then implement the logic.
*   **Verification:** Always run `npm test` and verify the generated attestation reports.

### 2. Modifying Tests
*   **Style:** Fluent Interface using **Test Data Builders**.
*   **Rule:** Never use raw "magic objects" in tests. Use the `CartBuilder` to ensure tests remain readable and refactorable.

## 🧪 Testing Guidelines

### Hierarchical Metadata Strategy
To enable multi-dimensional reporting (Technical Slicing vs. Business Slicing), we populate both xUnit and BDD hierarchies automatically.

**1. Technical Hierarchy (System Structure):**
*   **Parent Suite:** **Layer** (e.g., `API Verification`, `GUI Verification`). Derived from the test runner.
*   **Suite:** **Domain** (e.g., `Pricing`, `Cart`). Derived from filename (`cart.ui.test.ts` -> `Cart`).
*   **Sub Suite:** **Context**. Derived from the test group or `describe` block.

**2. Business Hierarchy (Behavior):**
*   **Epic:** **Business Goal** (e.g., `Revenue Protection`). Optional, passed via metadata.
*   **Feature:** **Domain** (Same as Suite).
*   **Story:** **Business Rule**. Derived from `ruleReference` (e.g., `pricing-strategy.md §2`).

**Tagging Policy:**
*   **Tags (`@`)** are reserved exclusively for **Cross-Cutting Concerns** (e.g., `@critical`, `@slow`, `@compliance`).
*   **Do not** manually add tags for Layer or Domain.

### File Naming Convention
Test files MUST follow the `domain.layer.type.test.ts` convention to enable this automation.
*   `cart.ui.properties.test.ts` -> Domain: **Cart**, Layer: **UI**
*   `pricing.api.spec.ts` -> Domain: **Pricing**, Layer: **API**

### Property-Based Testing
- **Invariants over Examples:** Prefer `fast-check` properties that prove business rules hold for *all* valid inputs.
- **Example Tests:** Used primarily for documentation and explaining the "happy path."

### Deep Observability (Tracer)
- **Mandatory Instrumentation:** To ensure high-fidelity attestation reports, all tests must capture their inputs and outputs to the `tracer`.
- **API Tests:** Use `tracer.log(testName, input, output)`.
- **GUI Tests:** The `invariant` helper automatically handles basic logging, but ensure critical state changes are captured.

**Verification Rule:** After running tests, check `reports/{latest}/attestation-full.html`. If a test is listed but has no "Input/Output" trace, it is considered **incomplete**.

### Network Mocking Strategy (The Split Brain)

Distinguish clearly between **Domain Logic** (internal) and **Integration Boundaries** (external).

| Category | Definition | Strategy | Tool |
| --- | --- | --- | --- |
| **Internal (New)** | APIs *you* are building. | **Contract-First (ATDD).** Write the mock manually to define the spec before the backend exists. | **MSW** (Hand-coded) |
| **External (3rd Party)** | APIs *others* control (Stripe, Auth0). | **Record & Replay.** Treat the API as a black box. Record the real dev environment once, then replay forever. | **Playwright HAR** |

**For Component Tests (Vitest):**
*   **Recommendation:** Push testing of external integrations *up* to Playwright (E2E).
*   **Advanced:** If you *must* unit test a component hitting an external API, feed the Playwright HAR into MSW to ensure a single source of truth.

## 🚫 Forbidden Patterns
*   **No Gherkin/Cucumber:** We explicitly reject the "Translation Layer" tax.
*   **No `any` types:** Strict TypeScript is required to maintain the "Code as Specification" integrity.
*   **No Console Logs for Verification:** Use the custom reporter and tracer for all audit trails.

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
