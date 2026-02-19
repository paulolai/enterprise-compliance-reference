# Testing Framework Guide

This document defines the standards for writing tests within this project, focusing on the **Executable Specifications Pattern** across both API and GUI layers.

For layer-specific implementation patterns, see:
- **[API Testing Patterns](API_TESTING_PATTERNS.md)** - Vitest, fast-check, property-based testing
- **[GUI Testing Patterns](GUI_TESTING_PATTERNS.md)** - Playwright, visual regression, debug routes

<!-- toc -->

- [Philosophy: Code as Specification](#philosophy-code-as-specification)
  * [Core Tenets](#core-tenets)
- [Quick Start](#quick-start)
  * [Run All Tests (Clean Room Report)](#run-all-tests-clean-room-report)
  * [API Tests (Dev Mode)](#api-tests-dev-mode)
  * [GUI Tests (Dev Mode)](#gui-tests-dev-mode)
- [Test Types & When to Use Each](#test-types--when-to-use-each)
- [Core Philosophy](#core-philosophy)
  * [1. Invariants over Examples](#1-invariants-over-examples)
  * [2. Deep Observability](#2-deep-observability)
  * [3. Shared Truth](#3-shared-truth)
  * [4. Dev-Native Velocity](#4-dev-native-velocity)
- [Tools & Stack](#tools--stack)
  * [Runners](#runners)
  * [Core Libraries](#core-libraries)
- [Shared Test Data Management](#shared-test-data-management)
- [Coverage & Quality Gates](#coverage--quality-gates)
  * [A. Code Coverage (Technical)](#a-code-coverage-technical)
  * [B. Domain Coverage (Business)](#b-domain-coverage-business)
- [Reporting & Attestation](#reporting--attestation)
  * [Types of Reports](#types-of-reports)
  * [Attestation Report Content](#attestation-report-content)
  * [Accessing Reports](#accessing-reports)
- [Maturity Model (Progressive Adoption)](#maturity-model-progressive-adoption)
  * [Level 1: Traceable Unit Tests (Low Friction)](#level-1-traceable-unit-tests-low-friction)
  * [Level 2: Data-Driven Tests (Medium Rigor)](#level-2-data-driven-tests-medium-rigor)
  * [Level 3: Property-Based Invariants (High Rigor)](#level-3-property-based-invariants-high-rigor)
  * [When to Level Up?](#when-to-level-up)
- [Definition of Done (PR Checklist)](#definition-of-done-pr-checklist)
- [How to Debug](#how-to-debug)
- [File Naming Convention](#file-naming-convention)
- [Deep Dive References](#deep-dive-references)

<!-- tocstop -->

---

## Philosophy: Code as Specification

We reject the traditional "Translation Layer" (Gherkin/Cucumber) in favor of a **Code-First** approach. The "Specification" is defined by strong types and invariant properties, not loose English sentences.

**Why Code-First?**
- **No Translation Tax**: Business specifications and test code use the same language (TypeScript)
- **Type Safety**: The compiler catches what English sentences miss
- **Executable**: Tests are the specification—they prove requirements are met

### Core Tenets

1. **Source of Truth**: `docs/pricing-strategy.md` defines the Business Rules.
2. **Execution**: TypeScript + Vitest/Playwright executes these rules.
3. **Attestation**: The generated reports prove compliance.

> **See also:** [BDD Comparison](BDD_COMPARISON.md) for a detailed analysis of why eliminating the translation layer beats "type-safe Gherkin" approaches.

---

## Quick Start

### Run All Tests (Clean Room Report)
This is the recommended way to verify the system. It creates a self-contained, timestamped report.

```bash
pnpm run test:all
# Output: reports/run-<timestamp>/attestation/attestation-full.html
```

### API Tests (Dev Mode)
```bash
cd implementations/executable-specs/unit
pnpm install
pnpm test
```

### GUI Tests (Dev Mode)
```bash
cd implementations/executable-specs/e2e
pnpm install
pnpm exec playwright test
```

---

## Test Types & When to Use Each

| Situation | Test Type | Tool | File Location |
|-----------|-----------|------|---------------|
| **Business Rules** (Pricing, Logic) | Property-Based Test | **Vitest** | `test/*.properties.test.ts` |
| **User Experience** (Flows, Visuals) | GUI Invariant Test | **Playwright** | `src/test/e2e/*.ui.properties.test.ts` |
| **Multi-Rule Interactions** | Integration Test | **Vitest** | `test/integration.properties.test.ts` |
| **Specific Scenarios** | Example Test | **Vitest/PW** | `*.spec.ts` |

---

## Core Philosophy

### 1. Invariants over Examples
While happy-path examples are useful for documentation, **Mathematical Invariants** (proven via Property-Based Testing) are the standard for logic verification.

**The Invariant Pattern:**
For every Business Rule, define a property that must hold true for **ALL** possible inputs (generated randomly via `fast-check`).

| Rule Type | Testing Approach | Example |
|-----------|------------------|---------|
| **Logic Rules** | **Invariants (PBT)** | "For ANY cart, total discount must never exceed 30%." |
| **Documentation** | **Examples (Static)** | "Buying 3 iPads should cost $2550." |

### 2. Deep Observability
Every test must log its inputs and outputs to the `tracer` (or Allure) to ensure the generated **Attestation Report** provides a complete audit trail.

### 3. Shared Truth
We use a **Shared Core** (`implementations/executable-specs/shared`) for builders, types, and arbitraries. Logic and Tests share the same language.

### 4. Dev-Native Velocity
Tests should run fast and be a development accelerator, not a maintenance burden.

---

## Tools & Stack

### Runners
- **Vitest** - Node.js API Logic (Fast)
- **Playwright** - Browser GUI (Realistic)

### Core Libraries
- **Property-Based Testing**: [fast-check](https://fast-check.dev/)
- **Observability**: Custom `TestTracer` + `Allure` (Unified Reporting)
- **Coverage**: Custom `DomainCoverage` (Business Rules) + `v8` (Code Lines)

---

## Shared Test Data Management

We strictly separate "Test Data Generation" from "Test Execution". All generators live in the **Shared Core**.

| Component | Location | Purpose |
|-----------|----------|---------|
| **CartBuilder** | `implementations/executable-specs/shared/fixtures/cart-builder.ts` | Fluent API for creating valid cart states. |
| **Arbitraries** | `implementations/executable-specs/shared/fixtures/arbitraries.ts` | `fast-check` generators for PBT (covers edge cases). |
| **Types** | `implementations/executable-specs/shared/src/types.ts` | Zod schemas shared by API, UI, and Tests. |

**Rule:** Never use "magic objects" in tests. Always use the `CartBuilder`.

---

## Coverage & Quality Gates

We enforce quality through a dual-coverage strategy (See [**ADR 13: Dual-Coverage**](ARCHITECTURE_DECISIONS.md#13-dual-coverage-strategy-business-vs-code)).

### A. Code Coverage (Technical)
- **Tool:** `@vitest/coverage-v8`
- **Metric:** Lines, Functions, Branches executed.
- **Gate:** Enforced via `vitest.config.ts`.
- **Goal:** Ensure no "dead code" exists.

### B. Domain Coverage (Business)
- **Tool:** Custom `DomainCoverageParser`
- **Metric:** Percentage of Rules in `pricing-strategy.md` verified by at least one test.
- **Gate:** Visible in the Attestation Report.
- **Goal:** Ensure no "dead requirements" exist (features specified but not tested).

**Verification:**
Run `pnpm run test:coverage` to generate both reports. The Attestation Report (`attestation-full.html`) displays a consolidated view.

---

## Reporting & Attestation

We treat the Test Report as a **Compliance Artifact**.

### Types of Reports

| Report Type | Purpose | Format |
|-------------|---------|--------|
| **Attestation Report** | Business compliance, requirement traceability | HTML + Markdown |
| **Allure Report** | Technical test execution, hierarchy visualization | HTML (interactive) |
| **Coverage Report** | Code coverage metrics (lines, branches, functions) | HTML, JSON |

### Attestation Report Content
- **Requirement Traceability Matrix**: Business Rule → Test Link
- **Executive Summary**: Pass/Fail rates, domain coverage percentage
- **Detailed Audit Log**: Scenario-by-scenario with input/output traces
- **Reproducibility Metadata**: Seeds for property-based tests
- **Visual Evidence**: Screenshots for GUI tests as proof-of-compliance

### Accessing Reports
- **Attestation**: `pnpm run test:all` → generates `reports/run-<timestamp>/attestation/attestation-full.html`
- **Allure**: `pnpm run reports:allure:serve` → live-reload server at localhost
- **Coverage**: `pnpm run test:coverage` → generates in `coverage/` directory

---

## Maturity Model (Progressive Adoption)

We recognize that "Property-Based Invariants" (Level 3) is a significant shift.
Teams can adopt this framework progressively while still gaining the benefits of the **Attestation Report**.

### Level 1: Traceable Unit Tests (Low Friction)
**Goal:** Get your tests on the "Radar" (Coverage Report) without changing how you write logic.
**Method:** Use `verifyExample` to wrap your standard manual test.

```typescript
it('Rule §1: Basic calculation', async () => {
  await verifyExample({
    ruleReference: 'pricing-strategy.md §1',
    rule: 'Basic cart calculation',
    tags: ['@pricing']
  }, () => {
    // 1. Standard Setup
    const cart = CartBuilder.new().withItem('Apple', 100).build();

    // 2. Standard Execution
    const result = PricingEngine.calculate(cart.items, cart.user);

    // 3. Standard Assertion
    expect(result.finalTotal).toBe(100);

    // 4. (Optional) Return for automatic logging to the report
    return { input: cart, output: result };
  });
});
```

### Level 2: Data-Driven Tests (Medium Rigor)
**Goal:** Verify known edge cases efficiently.
**Method:** Use `test.each` combined with `verifyExample`.

```typescript
test.each([
  { qty: 1, expected: 100 },
  { qty: 5, expected: 500 },
  { qty: 0, expected: 0 }
])('Rule §1: Quantity Logic', async ({ qty, expected }) => {
  return verifyExample({
    ruleReference: 'pricing-strategy.md §1',
    rule: `Quantity: ${qty}`,
    tags: ['@pricing']
  }, async () => {
    const cart = CartBuilder.new().withItem('Apple', 100, qty).build();
    const result = PricingEngine.calculate(cart.items, cart.user);
    expect(result.finalTotal).toBe(expected);
    return { input: cart, output: result };  // Auto-log
  });
});
```

### Level 3: Property-Based Invariants (High Rigor)
**Goal:** Mathematical proof of correctness across infinite inputs.
**Method:** Use `verifyInvariant` with `fast-check`.

```typescript
it('Rule §1: Total is consistent', () => {
  verifyInvariant({
    ruleReference: 'pricing-strategy.md §1',
    rule: 'Total equals sum of items',
    tags: ['@critical']
  }, (items, user, result) => {
    // Logic that holds true for ANY valid cart
    expect(result.finalTotal).toBeLessThanOrEqual(result.originalTotal);
  });
});
```

### When to Level Up?

| Signal | Current State | Recommended Action |
|--------|---------------|-------------------|
| Writing `test.each` with 3-5 similar cases | **Level 1** | Move to **Level 2** (data-driven) |
| Same assertion repeated across multiple files | **Level 1-2** | Consider **Level 3** (property) |
| Test covers "all known edge cases" from spec | **Level 2** | Evaluate for **Level 3** verification |
| Input setup is complex with many combinations | **Level 2** | Consider **Level 3** generator |
| Test verifies a critical business invariant | *Any* | Use **Level 3** for mathematical proof |

---

## Definition of Done (PR Checklist)

Before submitting a PR, verify:

1. **Traceability:** Every test has a valid `ruleReference` linking to `pricing-strategy.md`.
2. **Observability:** The test appears in the **Attestation Report** (`pnpm run reports:attestation`) with captured Input/Output traces.
3. **Hierarchy:** The test file follows the `domain.layer.type.test.ts` convention (e.g., `cart.api.properties.test.ts`) so it appears in the correct Report Section.
4. **No Flakiness:** API tests run instantly; GUI tests use **Seams** (not UI clicks) for setup.
5. **Visuals:** If a GUI test, does it verify the *Business State* (e.g., "Badge Visible") or just the *DOM*? (Prefer Business State).
6. **Coverage:** Ensure your new code is covered by both Unit Tests (for logic) and reflected in Domain Coverage.

---

## How to Debug



**If a test fails:**



1.  **Check the Dual Report:** Run `pnpm run test:all` and open `reports/run-<timestamp>/attestation/attestation-full.html`.

   - **Technical View:** Is it an API logic bug or a GUI rendering bug?

   - **Business View:** Which Rule is broken?



2. **Inspect the Trace:** Click "View Execution Trace" in the report.
   - Look at the JSON `Input` vs `Output`.
   - If it's a Property Test, look at the **Counterexample** provided by fast-check (the simplest case that fails).

3. **Visual Evidence:** For GUI tests, check the attached Screenshot in the report trace.

---

## File Naming Convention

Test files MUST follow the `domain.layer.type.test.ts` convention to enable automatic metadata derivation.

| Pattern | Domain | Layer | Type |
|---------|--------|-------|------|
| `pricing.api.properties.test.ts` | Pricing | API | Property-Based |
| `cart.ui.spec.ts` | Cart | UI | Example |
| `checkout.integration.test.ts` | Checkout | Integration | Mixed |

---

## Deep Dive References

- **[API Testing Patterns](API_TESTING_PATTERNS.md)** - Specific patterns for Vitest and fast-check
- **[GUI Testing Patterns](GUI_TESTING_PATTERNS.md)** - Specific patterns for Playwright
- **[Invariants & Property-Based Testing](reference/infinite-examples.md)** - How PBT extends the BDD "Examples" pillar
- **[Regression Safety](reference/regression-safety.md)** - How invariant tests catch bugs manual scenarios miss
