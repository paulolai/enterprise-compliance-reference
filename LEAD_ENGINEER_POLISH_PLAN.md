# Lead Engineer Polish Plan

**Objective:** Elevate the repository from a "working demo" to a "production-grade Quality Platform" to directly address the requirements for the "Build & Lead Test Automation" role at Neara.

## 1. Quality Gates: Code Coverage
**JD Requirement:** *"Ensuring coverage across UI, API, and backend layers."*

We need to prove we can measure and enforce quality standards, not just run tests.

*   [ ] **Install Provider:** Add `@vitest/coverage-v8` to `implementations/typescript-vitest`.
*   [ ] **Configure Vitest:** Update `vitest.config.ts` to enable coverage reporting.
    *   Target: `src/domain/**` (Business Logic).
    *   Exclusion: Test files, configuration files.
*   [ ] **Set Thresholds:** Enforce a hard failure if branch coverage drops below 80%. This demonstrates "Leadership" (setting standards).
*   [ ] **CI Integration:** Upload coverage reports as artifacts in GitHub Actions.

## 2. CI/CD Pipeline Maturity
**JD Requirement:** *"Integrating them into our CI/CD pipelines for continuous validation."*

Currently, the CI ignores the GUI layer. This is a critical gap.

*   [ ] **Linting & Typing:** Add a job to run `eslint` and `tsc` (Type Check) for *both* implementations. A Lead Engineer never allows type errors into `main`.
*   [ ] **Playwright Integration:**
    *   Add a job to build the React app.
    *   Serve the app (using `preview` or a lightweight server).
    *   Run Playwright E2E tests against the serving app.
*   [ ] **Artifact Management:** Ensure Playwright traces and screenshots are uploaded only on failure (optimizing storage).

## 3. Visual Regression Strategy
**JD Requirement:** *"Select and implement modern test automation tools."*

Visual testing is a key differentiator of modern tools (Playwright) vs. legacy ones (Selenium).

*   [ ] **Snapshot Test:** Add a single visual regression test in `cart.gui.test.ts` (e.g., `expect(page).toHaveScreenshot()`).
*   [ ] **CI Configuration:** Handle the "Linux vs. Mac" font rendering issue by configuring Playwright to use Docker or standardizing the CI environment. (Or explicitly noting this challenge in docs).

## 4. Operational Documentation
**JD Requirement:** *"Define the testing architecture... that will scale."*

*   [ ] **Flakiness Strategy:** Update `TEST_STRATEGY.md` to explicitly define how to handle flaky tests (Retries in CI = 2, Retries Local = 0).
*   [ ] **Adoption Guide:** Create `GUIDE_FOR_NEARA.md` mapping this repo's features to their JD requirements.

## Execution Order
1.  **CI Repair:** Get Playwright running in GitHub Actions (High Priority).
2.  **Coverage:** Enable Vitest coverage gates.
3.  **Visuals:** Add the screenshot test.
4.  **Docs:** Write the Adoption Guide.
