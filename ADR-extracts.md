# ADR Extracts for AI Agents

This document is **GENERATED** from `docs/ARCHITECTURE_DECISIONS.md`.
DO NOT EDIT MANUALLY - Changes will be overwritten on next sync.

Last generated: 2026-02-18T12:44:13.426Z

---

## Testing Strategy

✅ **[MUST]** Mock only at the Boundaries:** Network (External APIs), Time, and Randomness.
   *ADR-1: Testing Scope: Sociable over Solitary (No "Mock Drift")* (Rule)

✅ **[MUST]** Never Mock Internals:** If Class A calls Class B, the test for Class A should run real Class B code.
   *ADR-1: Testing Scope: Sociable over Solitary (No "Mock Drift")* (Rule)

ℹ️ **[INFO]** We prioritize **Sociable Tests** (Integration/Component) over **Solitary Unit Tests**. -   **Pure Logic (Solitary):** Tested extensively (e.g., `PricingEngine`). Zero mocks allowed. -   **Components/Services (Sociable):** Tested with real collaborators. We do *not* mock internal classes or functions.
   *ADR-1: Testing Scope: Sociable over Solitary (No "Mock Drift")* (The Decision)

ℹ️ **[INFO]** We explicitly reject Gherkin/Cucumber layers. We use **TypeScript as the Specification Language**.
   *ADR-2: Rejection of Gherkin (Cucumber)* (The Decision)

✅ **[MUST]** Invariants over Examples:** Use `fast-check` to prove business rules.
   *ADR-3: Property-Based Testing First* (Rule)

✅ **[MUST]** Examples are Documentation:** Only use `it('Example: ...')` to illustrate specific scenarios mentioned in the business spec.
   *ADR-3: Property-Based Testing First* (Rule)

ℹ️ **[INFO]** We define business invariants first, prove them via Property-Based Testing (PBT), then implement the logic. Example-based tests are used sparingly for documentation only.
   *ADR-3: Property-Based Testing First* (The Decision)

ℹ️ **[INFO]** GUI tests never set up state through the GUI if an API exists. We use **API Seams** (Backdoor Routes) to "Teleport" the application into the desired state.
   *ADR-4: "Seam-Based" State Management* (The Decision)

ℹ️ **[INFO]** We avoid Class-based Page Objects that mirror the DOM structure. Instead, we use **Intent-Based Drivers** (Functional Composition) and **Fluent Builders** for state.
   *ADR-5: Rejection of the Page Object Model (POM)* (The Decision)

## Architecture & Implementation

ℹ️ **[INFO]** We strictly distinguish between **Internal APIs** (mocked via Contract-First logic) and **External APIs** (mocked via Record/Replay).
   *ADR-6: Network Mocking Strategy: The "Split Brain"* (The Decision)

✅ **[MUST]** Never Duplicate Builders:** If you need a helper for test data, it belongs in `packages/shared/fixtures`.
   *ADR-7: Shared Core Pattern* (Rule)

✅ **[MUST]** No Magic Objects:** Tests must never use raw `{ name: "item", price: 100 }` literals. Always use `CartBuilder.new()`.
   *ADR-7: Shared Core Pattern* (Rule)

ℹ️ **[INFO]** All test data generation lives in a monorepo-style `packages/shared` directory, consumed by both API and GUI test suites.
   *ADR-7: Shared Core Pattern* (The Decision)

✅ **[MUST]** Debug Routes Only for Isolation:** Use them to test specific UI states without navigating through the full user journey.
   *ADR-8: Fixture Routes over Storybook* (Rule)

✅ **[MUST]** Never Ship Debug Routes:** The `import.meta.env.DEV` guard is non-negotiable.
   *ADR-8: Fixture Routes over Storybook* (Rule)

ℹ️ **[INFO]** For GUI component isolation, we use **Debug Routes** (`/debug/cart-view?scenario=vip-user`) instead of Storybook or similar frameworks.
   *ADR-8: Fixture Routes over Storybook* (The Decision)

✅ **[MUST]** Default to SQLite:** For new features, prototypes, and teaching.
   *ADR-9: SQLite as Default Database* (Rule)

✅ **[MUST]** Port to Server DB:** Only when scale dictates it—SQLite is surprisingly capable.
   *ADR-9: SQLite as Default Database* (Rule)

ℹ️ **[INFO]** We use **SQLite** as the default database instead of PostgreSQL, MySQL, or other server-based databases.
   *ADR-9: SQLite as Default Database* (The Decision)

✅ **[MUST]** Use Result for Business Logic Failures:** Validation errors, "not found" cases, expected failures.
   *ADR-10: Result&lt;T, E&gt; Pattern for Error Handling* (Rule)

💭 **[SHOULD]** Keep Exceptions for True Exceptions:** Only throw for truly exceptional conditions (system corruption, programmer errors, things that should crash).
   *ADR-10: Result&lt;T, E&gt; Pattern for Error Handling* (Rule)

💭 **[SHOULD]** Prefer `chain()` Over Nested `if isSuccess`:** The `chain` utility composes linearly and stops at the first failure.
   *ADR-10: Result&lt;T, E&gt; Pattern for Error Handling* (Rule)

✅ **[MUST]** Loop bodies executed millions of times per second
   *ADR-10: Result&lt;T, E&gt; Pattern for Error Handling* (When to Revisit: Performance-Critical Paths)

✅ **[MUST]** Known-zero-failure-rate operations after initial validation
   *ADR-10: Result&lt;T, E&gt; Pattern for Error Handling* (When to Revisit: Performance-Critical Paths)

✅ **[MUST]** Strict latency requirements where object allocation matters
   *ADR-10: Result&lt;T, E&gt; Pattern for Error Handling* (When to Revisit: Performance-Critical Paths)

ℹ️ **[INFO]** We use the `Result&lt;T, E&gt;` discriminated union type for explicit error handling instead of throwing exceptions for business logic errors.
   *ADR-10: Result&lt;T, E&gt; Pattern for Error Handling* (The Decision)

## Compliance & Reporting

ℹ️ **[INFO]** We generate a custom HTML report that pivots the same test results into two views: **Technical** (Architecture) and **Business** (Goals).
   *ADR-11: Dual-View Reporting* (The Decision)

ℹ️ **[INFO]** All tests **must** capture their inputs and outputs to a `tracer` (or Allure). A test without a trace is considered **incomplete**.
   *ADR-12: Deep Observability (Mandatory Tracing)* (The Decision)

✅ **[MUST]** Tooling: We use a custom `DomainCoverageParser` that reads `pricing-strategy.md` and maps it to test metadata (`ruleReference`).
   *ADR-13: Dual-Coverage Strategy (Business vs. Code)* (Implementation)

✅ **[MUST]** Reporting: The final Attestation Report displays both metrics side-by-side.
   *ADR-13: Dual-Coverage Strategy (Business vs. Code)* (Implementation)

✅ **[MUST]** All new features need 2 layers of tests:** One to execute the code (Code Coverage) and one to verify the invariant (Domain Coverage).
   *ADR-13: Dual-Coverage Strategy (Business vs. Code)* (Rule)

✅ **[MUST]** Code Coverage (Lines): vitest/v8 minimum threshold is 90%
   *ADR-13: Dual-Coverage Strategy (Business vs. Code)* (Quality Gates)

✅ **[MUST]** Domain Coverage (Rules Verified): DomainCoverageParser minimum threshold is 80% for critical features
   *ADR-13: Dual-Coverage Strategy (Business vs. Code)* (Quality Gates)

ℹ️ **[INFO]** We verify quality using two distinct coverage metrics that must **both** pass quality gates. 1.  **Code Coverage (Technical):** Do tests execute the lines of code? 2.  **Domain Coverage (Business):** Do tests verify the rules in the requirements document?
   *ADR-13: Dual-Coverage Strategy (Business vs. Code)* (The Decision)

✅ **[MUST]** Use `pnpm exec` for Running Binaries:** When executing CLI tools from `node_modules/.bin`, use `pnpm exec &lt;command&gt;` (or `pnpm exec -- &lt;command&gt;` for passing flags) instead of `npx` or direct node command invocation.
   *ADR-14: Package Manager: pnpm {#14-package-manager-pnpm}* (Rule)

✅ **[MUST]** Workspace Protocol:** For monorepo internal dependencies, use `"workspace:*"` in package.json dependencies.
   *ADR-14: Package Manager: pnpm {#14-package-manager-pnpm}* (Rule)

✅ **[MUST]** Use `catalog:` for Shared Dependencies:** If a dependency is used in 2+ packages, add it to the catalog.
   *ADR-15: Dependency Version Management: Workspace Catalogs* (Rule)

✅ **[MUST]** Document Blocked Updates:** When a dependency cannot be updated to latest, document the reason (see below).
   *ADR-15: Dependency Version Management: Workspace Catalogs* (Rule)

✅ **[MUST]** Package-Specific Versions:** Only use explicit versions for dependencies unique to one package.
   *ADR-15: Dependency Version Management: Workspace Catalogs* (Rule)

ℹ️ **[INFO]** We use **pnpm Workspace Catalogs** to centralize dependency version management in `pnpm-workspace.yaml`. All shared dependencies across workspaces should use the `catalog:` protocol.
   *ADR-15: Dependency Version Management: Workspace Catalogs* (The Decision)

