# Testing Framework Guide

This document defines the standards for writing tests within this project, focusing on the **Executable Specifications Pattern**.

## Philosophy: Code as Specification

We reject the traditional "Translation Layer" (Gherkin/Cucumber) in favor of a **Code-First** approach. The "Specification" is defined by strong types and invariant properties.

### Core Tenets

1. **Source of Truth**: Logic and Domain types define the Business Rules.
2. **Execution**: TypeScript + Vitest/Playwright executes these rules.
3. **Attestation**: The tests prove that the system behaves according to its business domain.

## Core Philosophy

### 1. Invariants over Examples
While happy-path examples are useful for documentation, **Mathematical Invariants** (proven via Property-Based Testing) are the standard for logic verification.

**The Invariant Pattern:**
For every Business Rule, define a property that must hold true for **ALL** possible inputs (generated randomly via `fast-check`).

### 2. Deep Observability
Every test should log its inputs and outputs to ensure a clear audit trail during debugging.

### 3. Shared Truth
We use a **Shared Core** (`packages/shared`) for builders, types, and arbitraries. Logic and Tests share the same language.

## Test Types & When to Use Each

| Situation | Test Type | Tool | File Location |
|-----------|-----------|------|---------------|
| **Business Rules** | Property-Based Test | **Vitest** | `test/*.properties.test.ts` |
| **User Experience** | GUI Invariant Test | **Playwright** | `test/e2e/*.ui.test.ts` |
| **Specific Scenarios** | Example Test | **Vitest/PW** | `*.spec.ts` |

## Definition of Done (PR Checklist)

Before submitting, verify:
1. Every test verifies a business rule or invariant.
2. The test file follows the `domain.layer.type.test.ts` convention.
3. API tests run instantly.
