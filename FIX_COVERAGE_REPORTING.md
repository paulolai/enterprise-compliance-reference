# Plan to Fix Coverage Reporting

## Context
The "Lead Engineer Polish" implementation added two critical reporting features:
1. **Traditional Code Coverage** (via Vitest/v8)
2. **Domain Coverage** (mapping tests to `pricing-strategy.md`)

While the features are implemented and tests are passing, the **Domain Coverage** metrics are not appearing in the final Attestation Report. 

### The Problem
The `CoverageReporter` (a custom Vitest reporter) is responsible for parsing the business rules and checking test coverage. Currently, it fails to write its intermediate data (`domain-coverage.json`) to the `reports/coverage/` directory. Because this file is missing, the `AttestationReporter` (which generates the final HTML) defaults to showing 0% coverage.

This is primarily a **Path Resolution** issue common in monorepos where the test runner's working directory differs from the reporter's context.

## The Fix Plan

### 1. Standardize Reporting Path
Modify `implementations/typescript-vitest/test/reporters/coverage-reporter.ts` to use a robust, absolute path resolution strategy. Instead of relying on `process.cwd()`, we will use `__dirname` relative to the reporter file to find the project root.

### 2. Synchronization of Reporters
Ensure `CoverageReporter` finishes its execution *before* `AttestationReporter` attempts to read the results. Vitest runs reporters in sequence, but we need to ensure the filesystem operations are synchronous or properly awaited.

### 3. Verification of "v8" Coverage Path
The traditional code coverage is reporting 0% because the `include` glob in `vitest.config.ts` might not be matching the files correctly due to path differences between the implementation and the shared logic. We will update the config to use absolute paths for the `include` array.

### 4. Implementation Steps
1.  **Fix `CoverageReporter.ts`**: Update `onInit` to correctly resolve the absolute path to `reports/coverage`.
2.  **Fix `vitest.config.ts`**: Update the `coverage.include` paths to ensure the shared pricing engine is tracked.
3.  **Add Debug Logs**: Add explicit `console.log` statements in the reporters to confirm file writes are succeeding.
4.  **Run & Verify**: Execute `npm run test:coverage` and confirm `reports/coverage/domain-coverage.json` exists before checking the HTML report.

## Why this matters for the interview
A Lead Engineer doesn't just write code; they ensure the **Obsrevability** of the system is reliable. Fixing "silent reporting failures" demonstrates the persistence and attention to detail required to maintain high-quality automation platforms.
