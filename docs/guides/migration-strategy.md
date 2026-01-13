# Guide: Migration Strategy (Strangler Fig)

**A Risk-Free Path from Gherkin to Executable Specifications.**

> *Do not rewrite. Evolve.*

## Overview
The **Strangler Fig Pattern** (coined by Martin Fowler) involves gradually migrating a legacy system by wrapping it with new functionality until the old system can be decommissioned. 

We apply this pattern to **Test Architecture**. You do not need to stop shipping to "fix your tests." This guide shows you how to migrate with zero downtime.

## Phase 1: Stop the Bleeding (Week 1+)

**Goal:** Zero new Gherkin.
**Action:** All *new* features are written using the Reference Architecture.

1.  **Define:** Write the conversation in `pricing-strategy.md` (Markdown).
2.  **Verify:** Write the TypeScript test using PBT or Golden Masters.
3.  **Report:** Generate the Attestation Report for that feature.

**ROI:** Immediate. New features are 4x faster to write and maintain. The team learns the new pattern on greenfield code.

## Phase 2: Convert on Pain (Month 1+)

**Goal:** Eliminate high-tax legacy tests.
**Action:** When a Gherkin feature file breaks or needs significant refactoring, **do not fix the regex.** Delete it and replace it.

1.  **Identify:** "I need to change the Shipping logic, and 15 Cucumber steps just failed."
2.  **Replace:** Instead of spending 4 hours debugging regex, spend 30 minutes writing a new `shipping.spec.ts` using the Golden Master pattern to capture the current behavior.
3.  **Delete:** Remove `shipping.feature` and `shipping.steps.ts`.

**ROI:** You avoid the "sunk cost" of fixing brittle tests. You slowly strangle the legacy suite.

## Phase 3: The Core (Quarter 1+)

**Goal:** Full migration.
**Action:** Once the team is comfortable and the benefits are proven, target the remaining "Core" Gherkin tests.

1.  **Map:** Use `pricing-strategy.md` to ensure you know what needs covering.
2.  **Port:** Move the logic to PBT Invariants.
3.  **Verify:** Ensure Attestation Reports cover all business rules.
4.  **Decommission:** Remove the Cucumber dependency entirely.

## Business Value of This Approach
*   **Low Risk:** You never have a period where you "stop shipping" to "fix tests."
*   **Training:** The team learns TypeScript testing gradually on new features.
*   **Proof:** You build a portfolio of "Success Stories" (e.g., "The new shipping module has zero bugs") to convince management to finish the migration.

## Talking to Management
*"We aren't rewriting the tests. We are upgrading our quality gates as we touch the code. It's part of our normal refactoring process."*
