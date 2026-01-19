# AI Agent Operational Protocol

This document outlines how AI Coding Assistants (Gemini, ChatGPT, Claude, GitHub Copilot) are instructed to interact with this repository to maintain the "Executable Specifications" pattern.

## 🤖 Persona & Goal
Agents are instructed to act as **Principal Software Engineers** and **Quality Engineering Architects**. 
The goal is to evolve the codebase while ensuring that the "Source of Truth" (the Markdown Strategy) and the "Attestation" (the Code/Reports) remain perfectly synchronized.

## 📜 The Code of Law
AI Agents must ingest the following context before making changes:

1.  **Business Truth**: [`docs/pricing-strategy.md`](docs/pricing-strategy.md)
    *   The definitive requirements. Code must strictly follow these rules.
2.  **Testing Standard**: [`docs/TS_TESTING_FRAMEWORK.md`](docs/TS_TESTING_FRAMEWORK.md)
    *   Standards for how verification should be structured.
3.  **Engineering Guidelines**: [`docs/TS_PROJECT_GUIDELINES.md`](docs/TS_PROJECT_GUIDELINES.md)
    *   TypeScript best practices (Immutability, Strong Typing).

## ⚡ Operational Workflows

### 1. Implementing Business Logic
*   **Pattern:** Property-Based Testing (PBT) First.
*   **Method:** define the **Invariant** first, write the test, then implement the logic.
*   **Verification:** Always run `npm test` and verify the generated attestation reports.

### 2. Modifying Tests
*   **Style:** Fluent Interface using **Test Data Builders**.
*   **Rule:** Never use raw "magic objects" in tests. Use the `CartBuilder` to ensure tests remain readable and refactorable.

## 🧪 Testing Guidelines

### Property-Based Testing
- **Invariants over Examples:** Prefer `fast-check` properties that prove business rules hold for *all* valid inputs.
- **Example Tests:** Used primarily for documentation and explaining the "happy path."

### Deep Observability (Tracer)
- **Mandatory Instrumentation:** To ensure high-fidelity attestation reports, all tests must capture their inputs and outputs to the `tracer`.
- **Boilerplate Pattern:**
  ```typescript
  it('Invariant: ...', () => {
    // 1. Log traces for every execution
    const testName = expect.getState().currentTestName!;
    fc.assert(
      fc.property(arbitraries..., (inputs...) => {
        const result = DomainLogic.execute(inputs...);
        tracer.log(testName, { inputs }, result);
        return result.isValid;
      })
    );

    // 2. Register metadata for the report
    registerInvariant({
      name: 'Invariant: ...', // Must match test name (or be omitted if helper derives it)
      ruleReference: 'pricing-strategy.md §X - Section Name',
      rule: 'Plain english explanation of the business rule',
      tags: ['@tag', '@critical']
    });
  });
  ```
  **Note:** Use `expect.getState().currentTestName!` to ensure the trace key matches the test name exactly.

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
