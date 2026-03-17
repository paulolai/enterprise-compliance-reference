# HealthTech Implementation: AI Agent Task List

**Goal:** Transform the extracted Invariant Pattern into the **AI Clinical Guardrails** demo.

---

## 🏗 Phase 1: Domain Mapping (Schema-First)

**Objective:** Define the "Language" of hospital administrative compliance.

1.  **Define Patient Schema:** In `packages/shared/src/types.ts`, create `PatientProfile` (Age, Weight, Diagnosis, AllergyList).
2.  **Define AI Output Schema:** Create `AIGeneratedSummary` (DraftText, ExtractedDates, ProtocolCheckmarks).
3.  **Refactor Result Pattern:** Ensure all compliance checks return the `Result<Verified, ComplianceAlert[]>` union.

## 🧪 Phase 2: Invariant Definition (Rigor-First)

**Objective:** Write the safety tests *before* the engine.

1.  **Create `compliance.properties.test.ts`** in `packages/domain/test/`.
2.  **Implement Invariant 1: Date Integrity.** Prove that AI-extracted dates match the source patient record.
3.  **Implement Invariant 2: Protocol Adherence.** Prove that if 'Sepsis' is present, 'Antibiotic Time' is mandatory.
4.  **Implement Invariant 3: PII Leakage.** Prove that summaries do not contain social security patterns.

## 🧠 Phase 3: The Engine (Implementation)

**Objective:** Build the deterministic logic that satisfies the tests.

1.  **Create `ComplianceEngine.ts`** in `packages/domain/src/`.
2.  **Logic:** Implement the data-locking and protocol-checking logic.
3.  **Iterate:** Refactor the engine until all 3 Properties pass with 100+ random inputs from `fast-check`.

## 📊 Phase 4: Attestation (Proof)

**Objective:** Generate the audit trail.

1.  **Update `test-runner.ts`:** Ensure it references the new compliance tests.
2.  **Execute:** `pnpm run test:all`.
3.  **Verify:** Open the HTML report and ensure it shows the "Clinical Safety" EPIC and "Date Integrity" STORIES.

## 🤖 Persona Reminder
*   **Don't build a doctor.** Focus on administrative process compliance.
*   **Use the Data Builders.** Don't write raw objects; create a `PatientBuilder` in `packages/shared/fixtures/`.
*   **Log everything.** Use `tracer.log` for the Attestation Report evidence.
