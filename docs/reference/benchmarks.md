# Reference: Maintenance & Velocity Benchmarks

**Observed Impact from the Reference Implementation.**

> *Focusing on the friction of change, not just the count of lines.*

## Overview
To measure the impact of the Reference Architecture, we implemented the same Pricing Engine twice: once using the industry-standard **Gherkin (Cucumber)** pattern and once using **Executable Specifications**. 

While line counts can be misleading (infrastructure code vs. test specifications), the **Friction of Change** is an unambiguous metric.

---

## The "Refactor Stress" Benchmark
We timed a common architectural change: renaming a core property (`bulkDiscount` → `volumeDiscount`) that impacts the Engine, the Tests, and the Reports.

| Metric | Gherkin Implementation | Executable Specs | Improvement |
| :--- | :--- | :--- | :--- |
| **Refactor Time** | ~120 seconds | ~7 seconds | **17x Faster** |
| **Mechanism** | String Search & Regex | Compiler & IDE Symbol Rename | **Type-Safe** |
| **Error Detection** | Runtime (Test Failure) | Compile-Time (IDE Error) | **Instant** |

### The Gherkin Tax:
1.  **Search:** Find all strings in `.feature` files.
2.  **Update:** Manually edit step definition regex patterns.
3.  **Debug:** Fix "Step Not Found" errors caused by subtle regex mismatches.
4.  **Verify:** Pray that no "Zombie Tests" (passing tests that no longer match the spec) were created.

### The Executable Spec Advantage:
1.  **Symbol Rename:** Press `F2` on the property in the TypeScript source.
2.  **Auto-Update:** The IDE updates all references in the Engine and the Specs instantly.
3.  **Immediate Signal:** The compiler guarantees that if the project builds, the Specification and the Code are semantically aligned.

---

## Coverage & Signal Density
Traditional tests rely on human imagination to populate "Example Tables."

*   **Legacy Gherkin:** 66 hand-written scenarios. Each scenario is a "Point in Space." If you miss a boundary (e.g., exactly $100.00), you miss the bug.
*   **Executable Specs:** 65 Invariants + 14 Golden Masters. Using **Property-Based Testing**, the machine generates thousands of examples per run, exploring the "Mathematical Space" between the points.

**Result:** We achieve higher confidence with fewer files because we leverage the computer to generate the examples, rather than asking engineers to be data entry clerks.

---

## The "Continuous Attestation" ROI
In a bank-grade environment (like CBA), the "Release Process" is often the biggest bottleneck.

*   **The Manual Process:** Capturing Postman screenshots, pasting into Word, uploading to ServiceNow. Time: **Hours per release.**
*   **The Reference Architecture:** The system generates a self-contained HTML audit artifact as a byproduct of the test run. Time: **Seconds (Automated).**

---

## Summary
We don't promise a generic "dollar amount" of savings. We promise a **Structural Reduction in Friction**. 

By removing the **Translation Layer**, we ensure that quality is no longer a "downstream activity" but a low-latency signal integrated into the developer's IDE. This is how you achieve Google-grade velocity in a Bank-grade environment.