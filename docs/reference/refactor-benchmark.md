# Case Study: The "Gherkin Tax" Validation

**Experiment:** Renaming the core property `bulkDiscountTotal` to `volumeDiscountTotal` across both implementations.

**Methodology:** This experiment was conducted using **AI Coding Agents** (acting as developers) to perform the refactor. By using agents, we removed "human typing speed" as a variable and focused purely on the **structural friction** and **iteration count** required by each architecture.

---

## Reference Architecture (`packages/domain`)

### Agent Observation: "Deterministic Alignment"

1. **Instruction:** "Rename `bulkDiscountTotal` to `volumeDiscountTotal` everywhere."
2. **Action:** The agent identified the property in `src/types.ts`.
3. **Signal:** The TypeScript compiler immediately flagged every desynced file:
   ```text
   src/pricing-engine.ts(63,7): error TS2353: Object literal may only specify known properties, and 'volumeDiscountTotal' does not exist
   test/pricing.test.ts(37,21): error TS2339: Property 'volumeDiscountTotal' does not exist on type 'PricingResult'.
   ```
4. **Resolution:** The agent followed the compiler's exhaustive list of errors. Verification was complete before the first test run.

**Total time:** ~7 seconds
**Result:** 100% Success. Zero Semantic Drift.

### Why This Was Frictionless
*   **Exact Location Tracking:** Every error provided a `file.ts(line,col)` coordinate. The agent didn't have to "search"; it was "told."
*   **Type Safety:** The compiler acted as a mathematical proof. It was impossible for the agent to finish without aligning the specification and the logic.

---

## Legacy Gherkin Suite (`comparison-gherkin/cucumber`)

### Agent Observation: "The Iteration Trap"

1. **Instruction:** "Rename `bulkDiscountTotal` to `volumeDiscountTotal` everywhere."
2. **Action:** The agent updated the engine and types.
3. **Friction (Silent Failure):** The engine compiled successfully. The agent initially thought it was done.
4. **Friction (Runtime Failure):** Upon running tests, the agent encountered 21 failures:
   ```text
   Expected undefined to equal +0
   at World.<anonymous> (step-definitions/pricing.steps.ts:138:45)
   ```
5. **Friction (Regex Drift):** After fixing the step definitions, the tests failed again with "Undefined Step" errors. The agent had renamed the regex terminology but the `.feature` files still used the old wording.
6. **Manual Search:** The agent had to grep through multiple feature files to update "English" strings to match the new regex patterns.

**Total time:** ~120 seconds (Multiple agent loops + runtime debugging)
**Result:** Success, but high risk of "Zombie Tests" (passing tests that no longer match the spec description).

### Why This Was Painful
*   **Loose Coupling:** The "Documentation" (Gherkin) and the "Logic" (TypeScript) provided no signals to each other.
*   **The "One Missed Reference" Risk:** If the agent had missed one scenario in a large feature file, the test would simply not run (Undefined Step), which might be ignored in a high-noise CI environment.

---

## Benchmark Results (AI Agent Simulation)

| Metric | Reference Architecture | Legacy Gherkin | Improvement |
| :--- | :--- | :--- | :--- |
| **Completion Time** | ~7 seconds | ~120 seconds | **17x Faster** |
| **Safety Mechanism** | Compiler & Types | Manual String Matching | **Structural Safety** |
| **Iteration Count** | 1 (Atomic) | 3+ (Trial & Error) | **High Integrity** |

---

## Conclusion

This experiment proves that the **Gherkin Tax** is a structural architecture issue, not a human skill issue. Even when using AI agents capable of instant search and high-speed editing, the **loose coupling** of Gherkin introduced significant latency and required multiple rounds of runtime debugging to achieve alignment.

**Executable Specifications are "Agent-Native" Architecture.** They provide the strong, unambiguous signals required for both humans and AI to maintain quality at scale.
