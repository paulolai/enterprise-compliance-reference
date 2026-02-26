# TypeScript Project Development Guidelines

This document outlines the core development principles for this project.

## Core Principles

### 1. Verification-Driven Development
We follow the "Executable Specifications" pattern. Logic is defined by invariants and proven through code.
- **[`TESTING_FRAMEWORK.md`](./TESTING_FRAMEWORK.md)**: The canonical guide for writing tests.

### 2. Functional Programming
We favor a functional style to ensure logic is pure and testable:
- **Immutability**: Use `Readonly<T>`, `const`, and functional methods (`map`, `filter`, `reduce`).
- **Pure Functions**: Business logic should be free of side effects.

### 3. Strong Typing as Documentation
TypeScript's type system is part of the specification.
- **Avoid `any`**: Use specific types or `unknown`.
- **Domain Modeling**: Types should reflect the business domain (e.g., `Cents`, `CartItem`).

## Naming Conventions

### Files & Directories
- **General**: Use `kebab-case` (e.g., `pricing-engine.ts`).
- **React Components**: Use `PascalCase` (e.g., `ProductCard.tsx`).

### Test Files
- **`*.spec.ts`**: Unit tests and specific examples.
- **`*.properties.test.ts`**: Property-based invariant tests using `fast-check`.
- **`*.ui.test.ts`**: End-to-End or UI integration tests.

## Commit Guidelines
We use [Conventional Commits](https://www.conventionalcommits.org).
- `feat`: A new business rule or feature.
- `fix`: A bug fix.
- `test`: Improving verification or adding invariants.
