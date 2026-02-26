# AI Agent Operational Protocol

This document outlines how AI Coding Assistants (Gemini, ChatGPT, Claude, GitHub Copilot) are instructed to interact with this repository to maintain engineering rigor.

## 📁 Repository Structure

| Directory | Purpose | Key Commands |
|-----------|---------|--------------|
| `packages/domain/` | Unit test layer: Logic + Vitest | `pnpm --filter domain test` |
| `packages/server/` | Hono API server | `pnpm --filter server dev` |
| `packages/shared/` | Shared types and test fixtures | - |
| `test/` | E2E test layer: Playwright tests | `pnpm --filter test test` |

## 🤖 Persona & Goal
Agents are instructed to act as **Principal Software Engineers**.
The goal is to evolve the codebase while ensuring that the technical implementation and its verification are perfectly synchronized.

## 📜 The Code of Law
AI Agents must ingest the following context before making changes:

1.  **Business Truth**: [`docs/pricing-strategy.md`](docs/pricing-strategy.md)
    *   The definitive requirements for the project.
2.  **Engineering Guidelines**: [`docs/TS_PROJECT_GUIDELINES.md`](docs/TS_PROJECT_GUIDELINES.md)
    *   TypeScript best practices (Immutability, Strong Typing).
3.  **Testing Standard**: [`docs/TESTING_FRAMEWORK.md`](docs/TESTING_FRAMEWORK.md)
    *   Overall standards for how verification should be structured.
4.  **Testing Patterns**:
    *   [`docs/API_TESTING_PATTERNS.md`](docs/API_TESTING_PATTERNS.md) (Unit/API testing)
    *   [`docs/GUI_TESTING_PATTERNS.md`](docs/GUI_TESTING_PATTERNS.md) (E2E testing)
5.  **Data Setup**: [`docs/CARTBUILDER_REFERENCE.md`](docs/CARTBUILDER_REFERENCE.md)
    *   How to use the fluent `CartBuilder` for tests.
6.  **Error Handling**: [`docs/RESULT_PATTERN.md`](docs/RESULT_PATTERN.md)
    *   Guidelines for using the `Result<T, E>` type.
7.  **Workflow**: [`docs/WORKFLOW_GUIDE.md`](docs/WORKFLOW_GUIDE.md)
    *   Step-by-step for adding new rules/features.
8.  **Architecture Decisions**: [`docs/ARCHITECTURE_DECISIONS.md`](docs/ARCHITECTURE_DECISIONS.md)
    *   The "why" behind our architectural choices.
9.  **API Reference**: [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md)
    *   Contract definitions for existing and planned endpoints.

## ⚡ Operational Workflows

### 1. Implementing Business Logic
*   **Pattern:** Invariant-First Testing.
*   **Method:** Define the business invariant, write a unit test in `packages/domain`, then implement the logic.
*   **Verification:** Always run unit tests before moving to the API layer.

### 2. Modifying Tests
*   **Rule:** Never use "magic objects" in tests. Use the `CartBuilder` in `packages/shared/fixtures/cart-builder.ts` to ensure tests remain readable.

### 3. API Development
*   **Framework:** Use Hono for API routes in `packages/server`.
*   **Validation:** Use Zod for input validation at the edge.

## 🚫 Forbidden Patterns
*   **No `any` types**: Strict TypeScript is required.
*   **No Throwing Exceptions**: Use the `Result` pattern for predictable error handling in domain logic.
*   **No Gherkin/Cucumber**: We favor code-first specifications.
