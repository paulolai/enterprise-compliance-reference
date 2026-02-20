# AI Clinical Guardrails: Trusting Agents in Regulated Domains

**A deterministic safety layer that prevents AI agents from making clinically or operationally dangerous administrative errors.**

---

## The AI Trust Crisis in Healthcare

You give an AI agent a task: "Summarize this patient's visit for insurance billing." The agent writes a fluid, professional summary. You ship it.

Then you realize the agent **hallucinated** the admission date or **missed** a critical sepsis protocol requirement. In HealthTech, this isn't just a bug—it's a compliance failure and a safety risk.

**The Problem:** Traditional testing (unit/E2E) verifies specific examples. But AI is stochastic; it fails in "the gaps between the tests."

---

## The Solution: Invariant-Based Verification

This repository demonstrates a **Verification-First Workflow** that allows AI agents to work autonomously in regulated environments by surrounding them with mathematical "Guardrails."

1.  **Define Correctness as Invariants:** Instead of writing test cases (examples), we define universal truths (e.g., *"No date in the summary may exist outside the range of the source medical record"*).
2.  **Machine-Proved Safety:** We use **Property-Based Testing (PBT)** to generate millions of "Random Patient" scenarios. If an AI output violates an invariant, the system catches it mathematically.
3.  **Automated Attestation:** Every run produces a regulatory-grade **Attestation Report**—proof for auditors that the AI's logic was verified against hospital SOPs.

> "Human defines the boundaries. Agent finds the solution. Machine proves the safety."

---

## The Core Pattern: The "Guardrail"

```typescript
// Define the Safety Invariant - what MUST always be true
it('Invariant: Mandatory Clinical Protocols', () => {
  fc.assert(
    fc.property(patientRecordArb, aiSummaryArb, (record, summary) => {
      // If patient has Sepsis, the summary MUST document antibiotic timing
      if (record.diagnosis === 'SEPSIS') {
        return summary.hasAntibioticTiming === true;
      }
      return true;
    })
  );
});
```

This single test proves the rule for **millions of possible patients**, ensuring the AI can never "forget" a mandatory compliance step.

---

## Why This Works for AI Engineering

| Traditional Tests | Invariant-Based Guardrails |
|-------------------|----------------------------|
| Human writes 10 examples | Machine generates 100s |
| Agent can game specific cases | Agent must satisfy universal safety |
| "Works for my test data" | "Mathematically proven safe" |
| Brittle & High Maintenance | Robust & Audit-Ready |

---

## The Stack

- **Rigor Layer**: [fast-check](https://fast-check.dev/) (Property-Based Testing)
- **Validation Layer**: Zod (Schema-first integrity)
- **Test Engine**: Vitest
- **Reporting**: Custom Attestation Engine → HTML Evidence

---

## Quick Start (For Developers)

```bash
# 1. Install Rigor Tools
pnpm install

# 2. Run the Compliance Engine (Mathematical Proofs)
pnpm run test:unit

# 3. Generate Regulatory Attestation Report
pnpm run reports:attestation
```

---

## Key Files

| Path | Purpose |
|------|---------|
| `packages/domain/src/` | **The Guardrails Engine.** The deterministic logic that checks AI output. |
| `packages/domain/test/` | **The Proof.** Property-based tests verifying safety invariants. |
| `packages/shared/fixtures/` | **Data Builders.** Fluent interfaces for generating complex patient cases. |
| `docs/pricing-strategy.md` | **The Source of Truth.** The human-readable SOP being enforced. |

---

## The Feedback Loop for Agents

1.  **Define Invariant:** "Admission Date in Summary == Admission Date in EHR."
2.  **Agent Iterates:** The AI generates a summary.
3.  **Engine Verifies:** `fast-check` stresses the output against millions of edge cases.
4.  **Audit Log:** An Attestation Report is produced as evidence of verification.

---

## Regulatory & Compliance Context

This architecture is designed for **Non-SaMD** (Software as a Medical Device) administrative automation. It addresses the "Trust" requirements of:
*   **HIPAA / GDPR:** Ensuring data integrity and PII protection.
*   **FDA / ISO:** Providing the "Verification and Validation" evidence required for regulated software.
*   **SOC2:** Providing an automated audit trail of code-level compliance.

---

*This repo is a reference implementation for Engineering Leaders building the next generation of trustworthy AI workflows.*
