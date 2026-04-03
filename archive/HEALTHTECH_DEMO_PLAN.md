# HealthTech Demo: The "Compliance Guardrails" Engine

**Concept:** An automated verification layer that ensures AI Administrative Agents strictly adhere to hospital protocols and documentation standards.

## 🎯 The Mission
**Avoid the "Medical Device" Trap.** We are *not* building an AI Doctor that diagnoses patients or prescribes drugs (which requires FDA clearance).

**The Pivot:** We are building the **"AI Compliance Officer"**—an invisible safety net that watches over the AI Admin Assistant. It ensures that automated notes, billing codes, and summaries never violate operational invariants.

*   **Problem:** AI Agents represent a massive efficiency gain for admin tasks, but hospitals can't use them if they hallucinate dates, invent patient IDs, or skip mandatory compliance steps.
*   **Your Solution:** A deterministic **Process Verification Engine** that mathematically proves the AI's administrative output matches the source of truth and follows standard operating procedures (SOPs).

---

## 🏗 The Architecture

### 1. The Domain: "Process Adherence Engine"
Instead of "Pricing Rules," your engine calculates **Compliance Status**.

*   **Inputs (Zod Schemas):**
    *   `PatientContext`: Demographics, Admission Date, Discharge Date.
    *   `ClinicalNotes`: Raw text or structured data from the visit.
    *   `AIGeneratedSummary`: The draft discharge summary or billing claim produced by the LLM.

*   **The Logic (Pure Function):**
    *   `ComplianceEngine.verify(context, generated_output)` -> `Result<Verified, ComplianceAlert[]>`

### 2. The Invariants (Administrative Safety)
These are the non-negotiable operational rules. We use Property-Based Testing to prove the engine catches every sloppy mistake the AI might make.

*   **Invariant 1: The "Anti-Hallucination" Data Lock**
    *   *Rule:* "Every Date, Patient ID, and Provider Name in the Output MUST match an exact value in the Input Source."
    *   *PBT:* Generate random patient records. Feed "corrupted" AI summaries (wrong dates, typo IDs) into the engine. Prove it *always* flags the discrepancy.

*   **Invariant 2: The "Critical Protocol" Check**
    *   *Rule:* "If Diagnosis includes 'Sepsis', the Output MUST document 'Antibiotic Administration Time'."
    *   *PBT:* Generate cases with specific diagnoses. Ensure the engine *always* alerts if the mandatory reporting field is missing.

*   **Invariant 3: The "Privacy Firewall" (PII Check)**
    *   *Rule:* "If `ReportType == EXTERNAL`, the Output MUST NOT contain SSN patterns or Phone Numbers."
    *   *PBT:* Inject fake PII into generated reports. Prove the engine *never* lets it pass without an alert.

### 3. The "AI Loop" (Admin Assistance)
This demonstrates **Human-in-the-Loop** safety.

1.  **Step 1: The Task.** "Draft a discharge summary for Patient #12345."
2.  **Step 2: The Draft.** The Agent produces a fluid, readable summary. *But it hallucinates the admission date as yesterday (it was actually last week).*
3.  **Step 3: The Guardrails.** Your `ComplianceEngine` runs the invariants against the Source Data.
4.  **Step 4: The Alert.** The engine flags: `ALERT: Admission Date Discrepancy. Source: 2023-10-01, Draft: 2023-10-08.`
5.  **Step 5: The Correction.** The Agent (or Human) receives the alert and corrects the data.
6.  **Step 6: Final Log.** The system logs the correction for audit purposes (Attestation).

---

## 🚀 Why This Gets You Hired

*   **Regulatory Savvy:** You understand the difference between *Clinical Decision Support* (High Risk) and *Administrative Automation* (High Value/Lower Risk).
*   **Operational Resilience:** You solve the "Trust" problem for hospital operations.
*   **Data Integrity:** You use rigorous engineering (Zod/PBT) to ensure patient data isn't corrupted by LLM stochasticity.

## 🛠 Reusing Your Existing Code
*   `PricingEngine` -> `ComplianceEngine`
*   `CartBuilder` -> `PatientRecordBuilder` (Fluent interface for test data)
*   `AttestationReporter` -> **"Compliance Audit Trail"** (Proves the guardrails were active).

## 📝 Next Steps
1.  **Freeze** the current Pricing/Cart code as your "Legacy Enterprise Reference."
2.  **Fork** to a new repo (`ai-compliance-guardrails`).
3.  **Implement** the `ComplianceEngine` with Data Integrity and Protocol invariants.
4.  **Write** the Story: "How I made AI safe for Hospital Administration."
