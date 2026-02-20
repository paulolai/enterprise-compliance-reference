# TypeScript Project Development Guidelines

This document outlines the core development principles for this project.

## Core Principles

### 1. Verification-Driven Development
We follow the "Executable Specifications" pattern. Logic is defined in Markdown and proven through code.
- **[`TESTING_FRAMEWORK.md`](./TESTING_FRAMEWORK.md)**: The canonical guide for writing tests.

### 2. Functional Programming
We favor a functional style to ensure logic is pure and testable:
- **Immutability**: Use `Readonly<T>`, `const`, and functional methods (`map`, `filter`, `reduce`).
- **Pure Functions**: Business logic (like the Pricing Engine) should be free of side effects.
- **Composition**: Build complex rules by composing simpler ones.

### 3. Strong Typing as Documentation
TypeScript's type system is not just for safety; it's part of the specification.
- **Avoid `any`**: Use specific types or `unknown`.
- **Domain Modeling**: Types should reflect the business domain (e.g., `Cents`, `CartItem`).

### 4. Requirement Validation
Never declare success until the complete business invariant is validated:
- **Understand the Invariant**: Clarify the "Always" and "Never" rules before coding.
- **Test the Full Lifecycle**: Ensure rules hold across various combinations of state and input.

## Code Organization

- **Source**: `src/` contains the pure logic and domain types.
- **Tests**: `test/` contains fluent builders, arbitraries, and the test suites.
- **Reporters**: Custom attestation logic lives in `test/reporters/`.

## Naming Conventions

### Files & Directories
- **General**: Use `kebab-case` for most files and directories (e.g., `pricing-engine.ts`, `cart-store.ts`).
- **React Components**: Use `PascalCase` for component files to match the component name (e.g., `ProductCard.tsx`, `CheckoutPage.tsx`).

### Code Symbols
- **Variables & Functions**: Use `camelCase` (e.g., `calculateTotal`, `cartItem`).
- **Types & Interfaces**: Use `PascalCase` (e.g., `PricingResult`, `CartItem`).
- **Constants**: Use `UPPER_SNAKE_CASE` for global constants (e.g., `MAX_RETRIES`).

### Test Files
We use specific suffixes to distinguish test types for reporting and tooling:
- **`*.spec.ts`**: Unit tests and specific examples (e.g., `pricing.spec.ts`).
- **`*.properties.test.ts`**: Property-based invariant tests using `fast-check` (e.g., `pricing.properties.test.ts`).
- **`*.ui.test.ts`**: End-to-End or UI integration tests (e.g., `checkout.ui.test.ts`).

## Commit Guidelines
We use [Conventional Commits](https://www.conventionalcommits.org).
- `feat`: A new business rule or feature.
- `fix`: A bug fix.
- `test`: Improving verification or adding invariants.
- `docs`: Documentation updates.

## Documentation Automation
We use `markdown-toc` to automatically maintain Table of Contents in our documentation.
- **How it works:** Any markdown file with the `

<!-- toc -->



<!-- tocstop -->

` token will have its TOC regenerated automatically on commit.
- **Manual Trigger:** Run `npm run docs:fix` to regenerate TOCs for all files in `docs/`.
- **Infrastructure:** This is handled by `husky` (pre-commit hook) and `lint-staged`.