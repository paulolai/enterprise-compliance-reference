# Reference: The Evolution of BDD (Philosophy Alignment)

**Honoring the Vision, Upgrading the Machinery.**

> *"The goal is shared understanding, not syntax."* — Dan North

## Overview
This document serves as the "Alignment Checklist" for the Reference Architecture. It proves that Executable Specifications are not a rejection of Behavior-Driven Development (BDD), but its natural evolution for high-scale, modern engineering.

We assess our architecture against the **3 Pillars of BDD** defined by Dan North in 2003.

---

## Pillar 1: Collaborative Conversations
*   **Dan's Vision:** BDD is about having a conversation about behavior between stakeholders and developers.
*   **The Problem:** Gherkin forces the conversation into a rigid, pseudo-code syntax (Given/When/Then) that developers find tedious and stakeholders rarely read.
*   **The Reference Architecture:**
    *   Conversations happen in plain English **Markdown Strategy Documents** (`docs/pricing-strategy.md`).
    *   We separate the **Conversation** (Philosophy) from the **Verification** (Code).
    *   **Result:** More time spent on actual behavior, zero time spent on regex boilerplate.

---

## Pillar 2: Examples to Clarify
*   **Dan's Vision:** Use examples to clarify requirements and discover edge cases.
*   **The Problem:** Manual Gherkin scenarios are finite and limited to human imagination.
*   **The Reference Architecture:**
    *   **Infinite Examples:** We use Property-Based Testing (PBT) to generate thousands of examples automatically.
    *   **Regression Safety:** We use Golden Masters to lock down critical business boundaries.
    *   **Result:** We don't just "clarify" with 5 examples; we **prove** with 5,000.

---

## Pillar 3: Shared Understanding
*   **Dan's Vision:** The primary outcome of BDD is shared understanding.
*   **The Problem:** "Living Documentation" in Gherkin often becomes "Undead Documentation"—files that exist in the repo but are never read and silently desync from reality.
*   **The Reference Architecture:**
    *   **Continuous Attestation:** We generate a "Receipt of Quality"—an automated report showing the verified rules and actual execution evidence.
    *   **Type Safety:** The compiler ensures the code and the specification never drift.
    *   **Result:** A verifiable audit trail that both engineers and auditors can trust.

---

## Why We Moved Beyond Gherkin

Dan North famously noted: *"If Gherkin helps your team collaborate, use it. But it's not the only way."*

My experience has shown that Gherkin is often a barrier, not an enabler:
1.  **At Google:** Velocity was achieved by avoiding translation layers entirely. Engineers relied on native signals from the build system and compiler. Gherkin was non-existent because it would have been a tax on that speed.
2.  **At CBA:** The introduction of Gherkin created "Quality Silos" and "Translation Layer Taxes" that slowed down refactoring and disconnected developers from the specifications.

## Conclusion: BDD 2.0
We are not "abandoning" BDD. We are moving from **Ceremonial BDD** (Gherkin) to **Executable BDD** (Reference Architecture). 

We prioritize the **Outcome** (Shared Understanding) over the **Syntax** (Given/When/Then). This is the standard required for high-assurance engineering.
