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
    const testName = expect.getState().currentTestName!;
    fc.assert(
      fc.property(arbitraries..., (inputs...) => {
        const result = DomainLogic.execute(inputs...);
        tracer.log(testName, { inputs }, result);
        return result.isValid;
      })
    );
  });
  ```

## 🚫 Forbidden Patterns
*   **No Gherkin/Cucumber:** We explicitly reject the "Translation Layer" tax.
*   **No `any` types:** Strict TypeScript is required to maintain the "Code as Specification" integrity.
*   **No Console Logs for Verification:** Use the custom reporter and tracer for all audit trails.