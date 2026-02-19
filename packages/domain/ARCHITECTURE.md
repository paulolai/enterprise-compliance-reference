# Pricing Engine Architecture

This document outlines the design philosophy, core patterns, and component overview of the TypeScript implementation of the Executable Specifications pattern.

## Design Philosophy

This library implements **"Executable Specifications"** - a methodology where the code *is* the documentation. We reject the "Translation Layer" tax of Gherkin/Cucumber in favor of:
- **Direct Logic Mapping:** Business rules in `pricing-strategy.md` map directly to TypeScript functions and property-based tests.
- **Attestation Reports:** Stakeholders verify the system by reading the output (Attestation Report), not the input (Feature files).
- **Type Safety as a Specification:** Zod schemas and TypeScript types enforce business constraints at compile and runtime.

## Core Patterns

### 1. Type-Safe Domain Modeling
We use **Zod** to define our schemas. This provides:
- **Runtime Validation:** Rejects malformed data at system boundaries.
- **Type Inference:** TypeScript types are automatically kept in sync with schemas.
- **Integer Cents:** All monetary values use integer cents to avoid floating-point errors.

### 2. Property-Based Testing (PBT)
Instead of hand-writing 100s of scenarios, we use `fast-check` to define **Mathematical Invariants**:
- We define a property that must *always* hold true (e.g., "Discount ≤ 30%").
- The framework generates 100s of random inputs per test run.
- If a failure is found, it "shrinks" the input to the simplest possible counterexample.

### 3. Business Metadata Capture
We capture business intent directly in the test code using `registerInvariant`:
- **Rule Reference:** Links to the specific section in `pricing-strategy.md`.
- **Tags:** Categorizes tests by priority (`@critical`) or domain (`@pricing`).
- **Traces:** Logs actual inputs and outputs for every test scenario.

### 4. Multi-Worker Test Execution
To handle large test suites, our `Tracer` supports parallel execution:
- **File-Based Persistence:** Workers append to shared `JSONL` files in a temporary run directory.
- **Unique Run IDs:** Every test run is isolated and preserved for historical auditing.
- **Atomic Appends:** Ensures trace integrity even when multiple processes write simultaneously.

## Component Overview

### `PricingEngine` (The Core)
- **Purpose:** Pure, stateless calculation logic.
- **Robustness:** Validates all inputs using Zod schemas before processing.
- **Transparency:** Returns a detailed `PricingResult` showing every step of the calculation (bulk discounts, VIP discounts, shipping breakdowns).

### `Tracer` (The Observer)
- **Purpose:** Observability and stakeholder reporting.
- **Features:** Captures metadata, logs interactions, and calculates coverage statistics across business tags.

### `AttestationReporter` (The Auditor)
- **Purpose:** Generates human-readable evidence.
- **Output:** HTML and Markdown reports featuring a **Requirement Traceability Matrix** and a **Detailed Audit Log** with input/output samples.

## Test Hierarchy

- `pricing.spec.ts`: Unit tests for specific happy-path and edge-case scenarios.
- `pricing.properties.test.ts`: Mathematical invariants for core pricing rules.
- `preconditions.spec.ts`: Validation of input boundaries and error handling.
- `integration.properties.test.ts`: Tests for interactions between multiple complex rules.
- `regression.golden-master.test.ts`: Ensures system stability against known baseline outputs.

## Getting Started for Developers

1.  **Run Tests:** `npm test`
2.  **Review Evidence:** Open `../../reports/latest/attestation-full.html`.
3.  **Add a Rule:**
    - Update `docs/pricing-strategy.md`.
    - Define a new invariant in `test/pricing.properties.test.ts`.
    - Use `CartBuilder` for readable test data setup.
