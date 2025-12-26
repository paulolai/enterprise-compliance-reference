# Engineering Test Strategy

## 1. Philosophy: Code as Specification

We reject the traditional "Translation Layer" (Gherkin/Cucumber) in favor of a **Code-First** approach.
The "Specification" is defined by strong types and invariant properties, not loose English sentences.

> **Note:** This strategy complements the global [**Testing Framework**](./TS_TESTING_FRAMEWORK.md). While the framework provides the *mechanics* (file structure, mocking, assertions), this document provides the *methodology* (Property-Based Testing, Invariants) specific to the Pricing Engine domain.

> **See also:** [BDD Comparison](./BDD_COMPARISON.md) for a detailed analysis of why eliminating the translation layer beats "type-safe Gherkin" approaches.

### Core Tenets
1.  **Source of Truth:** `docs/pricing-strategy.md` defines the Business Rules.
2.  **Execution:** TypeScript + Vitest executes these rules.
3.  **Attestation:** The generated `reports/test-attestation.md` proves compliance.

## 2. Methodology: Property-Based Testing (PBT)

Instead of relying solely on static "Example-Based" tests (which only prove the happy path), we use **Property-Based Testing** (via `fast-check`) to define **Invariants**.

### The "Invariant" Pattern
For every Business Rule, we define a property that must hold true for **ALL** possible inputs (generated randomly).

| Rule Type | Testing Approach | Example |
| :--- | :--- | :--- |
| **Logic Rules** | **Invariants (PBT)** | "For ANY cart, total discount must never exceed 30%." |
| **Documentation** | **Examples (Static)** | "Buying 3 iPads should cost $2550." |

## 3. Test Hierarchy

The test suite mirrors the Business Domain strictly.

```text
Pricing Engine (System)
├── 1. Base Rules (Currency & Tax)
│   ├── Invariant: Final <= Original
│   └── Example: Simple Sum
├── 2. Bulk Discounts
│   ├── Invariant: 3+ Items -> 15% Off
│   └── Example: 3x iPad
├── 3. VIP Tier
│   ├── Invariant: Tenure > 2y -> 5% Off Subtotal
│   └── Example: VIP User
└── 4. Safety Valve
    └── Invariant: Cap at 30%
```

## 4. Reporting & Attestation

We treat the Test Report as a **Compliance Artifact**.
- **Format:** Hierarchical Markdown (convertible to HTML).
- **Content:**
    - Executive Summary (Pass/Fail Rates).
    - Detailed Audit Log (Scenario-by-Scenario).
    - Reproducibility Metadata (Seeds).

## 5. Tooling

-   **Framework:** Vitest
-   **PBT Library:** fast-check
-   **Reporter:** Custom `AttestationReporter`
