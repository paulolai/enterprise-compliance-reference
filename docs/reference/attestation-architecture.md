# Reference: Attestation Report Architecture

**The "Killer App" of Executable Specifications.**

> *Replacing "Trust Me" with Verified Evidence.*

## Overview
The **Attestation Report** solves the political problem of "Stakeholder Visibility" by generating a business-friendly receipt of quality directly from test execution.

In the Reference Architecture, the report is not a separate document; it is a compiled artifact of the codebase. It combines:
1.  **Intent:** The Business Rule (from `pricing-strategy.md`).
2.  **Verification:** The Test Execution (from `vitest`).
3.  **Evidence:** The Input/Output Trace (from the `Tracer` module).

## Architecture Components

The system consists of three distinct parts that work together to produce a **Self-Contained Audit Artifact**. This artifact replaces the need for manual Postman screenshots, Word documents, and ServiceNow uploads by providing a single, verifiable HTML file containing all evidence.

### 1. Metadata Registration (The Link)
We decorate tests with metadata to link "Code" back to "Conversation."

```typescript
// test/modules/invariant-helper.ts
export function registerInvariant(meta: TestMetadata) {
  // Pushes metadata to a global store keyed by test name
  globalMetadataStore.add(expect.getState().currentTestName, meta);
}
```

### 2. The Tracer Module (The Evidence)
The `Tracer` captures the *actual* runtime values. This is the automated replacement for the "Postman Screenshot."

```typescript
// test/modules/tracer.ts
export class Tracer {
  log(testName: string, input: any, output: any) {
    // Captures the inputs, outputs, and internal logs for this specific run
    // Persists to the audit artifact
  }
}
```

### 3. The Reporter (The Presentation)
The reporter aggregates data into a **Portable Audit Document**. It is not just a summary; it is a full record of execution.

It generates a static HTML file that includes:
*   **Requirement Traceability Matrix:** Every business rule mapped to its verification tests.
*   **Full Execution Traces:** Clickable buttons to view the exact JSON that went into and out of the system.
*   **Embedded Logs:** Any debug or system logs generated during that specific test run are embedded in the report.

## Why This Replaces Gherkin & Manual Screenshots
In traditional "Bank-Grade" environments, compliance is achieved through manual labor: capturing screenshots to prove an API works.

1.  **Gherkin:** Promises visibility but fails because the text is loosely coupled to the code.
2.  **Manual Screenshots:** Provide evidence but are slow, impossible to scale, and "Dead on Arrival."
3.  **The Attestation Report:** Combines the **Readability** of Gherkin with the **Evidence** of a screenshot, but does it automatically at the speed of CI.

## Regulatory Compliance
For banking and regulated industries (like CBA), this architecture supports **Continuous Compliance**:
1.  **Unique Run ID:** Every report is tied to a specific CI/CD build number.
2.  **Immutable Artifact:** The HTML report can be stored in an artifact repository (e.g., Artifactory) for 7 years.
3.  **Audit Trail:** Auditors can trace a requirement to a specific line of code and a specific test execution.

## Alternatives & Comparison

Why build a custom reporter instead of using off-the-shelf tools?

| Approach | Pros | Cons | Why Reference Arch Wins |
| :--- | :--- | :--- | :--- |
| **Allure Framework** | Beautiful UI, industry standard, supports history. | Generic "Test Reporting," not "Regulatory Attestation." Lacks strict linkage to Markdown Strategy docs without heavy customization. | **Purpose-Built Compliance:** Our reporter enforces the link between `pricing-strategy.md` and the code. |
| **Jira Plugins (Xray/Zephyr)** | Managers love Jira integration. Centralized. | **Developers hate it.** Forces dependency on external SaaS APIs. Slow feedback loop. Not a self-contained artifact. | **Developer Experience:** We generate the evidence *locally* in seconds. No Jira API keys required. |
| **Docs-as-Code (Docusaurus)** | Great "Living Documentation" websites. | High maintenance complexity. Requires a separate build pipeline for the docs site. | **Simplicity:** We generate a single, portable HTML file. Zero infrastructure required. |

### The "Goldilocks" Solution
The Reference Architecture uses a **Custom Reporter** because it offers the perfect balance:
*   **Zero Dependencies:** Just `npm test` -> `report.html`.
*   **Strict Traceability:** Enforces the link to business rules.
*   **Self-Contained:** Logs and traces are embedded. You can email the file to an auditor, and it works offline for 7 years.

---

*See the implementation in `test/reporters/attestation-reporter.ts`.*
