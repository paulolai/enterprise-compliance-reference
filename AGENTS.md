# AI Agent Operational Protocol

This document defines the **High-Assurance Engineering Standards** for the Executable Specifications repository.

**For:** All AI assistants and developers
**Quick Start:**
- **Building?** → Read [Workflow Guide](docs/WORKFLOW_GUIDE.md)
- **Framework?** → Read [Testing Framework](docs/TESTING_FRAMEWORK.md)
- **TypeScript?** → Read [TS Guidelines](docs/TS_PROJECT_GUIDELINES.md)
- **Architecture?** → Read [Architecture Decisions](ADR-extracts.md)

---

## 🏛 Core Philosophy: "Executable Specifications"

The Markdown Strategy is the absolute Source of Truth. The code and tests exist merely to *prove* the strategy is true. 

**Critical Rule:** Never write code or tests without first defining the business rule and its invariant in the strategy document.

---

## Standards Quick Reference

| Standard | Purpose | Location |
|----------|---------|----------|
| **Business Truth** | The definitive requirements | `docs/pricing-strategy.md` |
| **Workflow Guide** | How to build & verify | `docs/WORKFLOW_GUIDE.md` |
| **Testing Standards** | How to structure verification | `docs/TESTING_FRAMEWORK.md` |
| **TypeScript Rules** | Typing and mutability | `docs/TS_PROJECT_GUIDELINES.md` |
| **Architecture** | Constraints & Decisions | `ADR-extracts.md` |

---

## Project Context

**Domain:** E-commerce / Pricing Engine Testing
**Stack:** TypeScript, Vitest, Playwright, Hono, React
**Package Manager:** `pnpm`

**Essential Commands:**
```bash
# Run all tests + generate attestation
pnpm run test:all

# Run API/unit tests
cd packages/domain && pnpm test

# Run E2E tests
cd test && pnpm test

# Serve Allure report
pnpm run reports:allure:serve
```

---

## Building New Features: Mandatory Sequence

**⚠️ CRITICAL:** When modifying business logic, you MUST follow this **5-Step Lifecycle IN ORDER**:

1. **Define Rule** - Edit `docs/pricing-strategy.md` to define the Goal, Rule, and Invariant.
2. **Write Test** - Create `domain.layer.type.test.ts` (using `verifyInvariant()` or `invariant()`).
3. **Implement Logic** - Write the pure domain logic.
4. **Attestation Report** - Run `pnpm run test:all` to generate evidence.
5. **Verify Traceability** - Ensure the report links back to the strategy and captures traces.

**📖 Full Details:** [WORKFLOW_GUIDE.md](docs/WORKFLOW_GUIDE.md)

---

## Infrastructure Code Standards

Infrastructure code (OTel setup, reporters, test fixtures, CI scripts, build tooling)
follows the same Test-First lifecycle as business logic.

**Rule:** No infrastructure module ships without a test that exercises it through its
public API. Mocking internal dependencies is forbidden — test behavior, not implementation.

**Mandatory sequence:**
1. **Write the test** — Define what correct behavior looks like
2. **Implement the infrastructure** — Write the minimum code to pass
3. **Verify** — Test passes, no regressions

**What to test:**
- **Setup/initialization** — Does the module initialize without errors?
- **Data flow** — Does data move through the pipeline correctly?
- **Failure modes** — Does it fail loudly with clear messages?
- **Integration** — Do components work together end-to-end?

**Forbidden:**
- Shipping infrastructure without tests
- Mocking the component under test
- "It's just config" excuses — config has behavior

---

## Engineering Standards

### 0. Subagent Dispatch (Performance)

When implementing tests or code that does NOT require full conversation context,
use subagents to avoid filling the context window.

**Use subagents when:**
- Writing independent test files (each test file is self-contained)
- Fixing unrelated bugs in separate files
- Generating boilerplate or scaffolding
- Any task where the agent can work with just file paths and a clear brief

**Don't use subagents when:**
- The task requires understanding prior decisions in this conversation
- Multiple changes depend on each other
- You need to verify cross-cutting concerns

**Pattern:** Dispatch one subagent per independent file. Give them the file path,
the surrounding context they need, and the exact requirements. They return
passing tests — you verify and integrate.

### 1. File Naming Convention
Test files MUST follow: `domain.layer.type.test.ts`
- `cart.ui.properties.test.ts` → Domain: **Cart**, Layer: **UI**
- `pricing.api.spec.ts` → Domain: **Pricing**, Layer: **API**

### 2. Deep Observability (Tracer)
All tests must capture inputs and outputs.
- **API Tests:** `tracer.log(testName, input, output)`
- **GUI Tests:** Handled automatically by `invariant()` helper.

### 3. TypeScript Rules (`verbatimModuleSyntax`)
The project uses `verbatimModuleSyntax: true`. When importing types, you MUST use `import type`:
```typescript
✅ import type { PricingResult } from '@shared/types';
❌ import { PricingResult } from '@shared/types';
```

### 4. Network Mocking
- **Internal APIs:** MSW (Hand-coded Contract-First)
- **External APIs:** Playwright HAR (Record & Replay)

### 5. Forbidden Patterns
- **NO Gherkin/Cucumber:** We explicitly reject the translation layer tax.
- **NO `any` types:** Strict TypeScript maintains specification integrity.
- **NO magic objects in tests:** Use `CartBuilder` and test data builders.

---

## 🎯 Systemic View of Failures (MANDATORY)

When ANY issue is discovered (bug, test failure, manual finding, code review comment), you MUST treat it as a **symptom of a systemic gap**, not just an isolated problem.

### The Pattern

```
Find Issue → Identify Pattern → Build Detection → Prevent Category
     ↑                                                     ↓
   REPEAT ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
```

### Example: From "Title Bug" to "Static Analysis"

**❌ Wrong Approach:**
- Exploratory test finds: "react-playwright" title
- Fix: Change title to "TechHome"
- Result: Next sprint finds "vite.svg" favicon

**✅ Correct Approach:**
- Exploratory test finds: "react-playwright" title
- **Pattern:** Placeholder/default content in HTML
- **Category:** Static Analysis gap
- **Solution:** Build `validate-html.ts` that checks for ALL placeholders
- **Result:** Catches title, favicon, meta tags, descriptions in one validator

### Implementation

For EVERY issue found:

1. **Ask:** "What category does this belong to?"
   - HTML/SEO structure
   - Accessibility compliance
   - Performance budgets
   - Security headers
   - Placeholder content patterns

2. **Build:** Create/modify the category validator
   - Don't just fix the one instance
   - Build detection for the entire category

3. **Document:** Add to validation suite
   - `scripts/static-analysis/validate-*.ts`
   - Run in CI before any exploratory testing

### Validation Hierarchy

Issues should be caught at the **cheapest** level:

```
Static Analysis (CI) → Integration Tests → E2E Tests → Exploratory Testing
```

**Rule:** If exploratory testing finds it, a cheaper method should have caught it.

### Category-Based Validators

```
scripts/static-analysis/
├── validate-html.ts          # Titles, meta tags, SEO, favicons
├── validate-accessibility.ts # axe-core, WCAG compliance
├── validate-performance.ts   # Bundle size, images, lazy loading
├── validate-security.ts      # Headers, CSP, dependencies
└── validate-patterns.ts      # Placeholders, TODOs, mock data
```

**When adding a new validator:**
- Document what category it covers
- List specific checks it performs
- Run it against current codebase
- It should FAIL (catching existing issues)
- Fix issues until it PASSES
- Add to CI workflow

### Cost Multiplier

Earlier detection is cheaper:
- Static Analysis catches issues at the source
- Exploratory testing catches them in user-facing scenarios  
- Production bugs are most expensive to fix

---

## 🧪 Exploratory Testing Protocol

Exploratory testing is NOT about finding and fixing individual bugs. It's about discovering **systemic gaps** in the testing strategy.

### The Exploratory Testing Cycle

```
┌─────────────────────────────────────────────────────────────┐
│  EXPLORE → DISCOVER → IDENTIFY PATTERN → BUILD DETECTION   │
│      ↑                                                     │
│      └─────────────────────────────────────────────────────┘
```

**Critical Rule:** NEVER fix bugs during exploratory testing. Document them, identify the pattern, and build detection instead.

### Phase 1: Explore

**Goal:** Use the application as a real user would

**Activities:**
- Start the application (if it starts)
- Navigate through key flows
- Try edge cases
- Watch for errors in console and network
- Document behavior, NOT fixes

**Output:** `docs/exploratory-testing-report.md`

### Phase 2: Discover

**Goal:** Find issues without fixing them

**Questions to ask for each issue:**
1. What category does this belong to? (import, config, env, security)
2. What would catch this entire category?
3. Is this symptom or root cause?

**STOP HERE.** Do not fix. Document in:
- `docs/exploratory-testing-report.md` - What was found
- `docs/issue-fixes-log.md` - How to fix (if known)

### Phase 3: Identify Pattern

**Goal:** Find the systemic gap that allowed this issue

**Common patterns:**
- **Import/Export Issues** → Missing module contract tests
- **Environment Assumptions** → Missing environment validation
- **Configuration Errors** → Missing startup validation
- **Security Headers** → Missing security contract tests

### Phase 4: Build Detection

**Goal:** Create tests that catch the ENTIRE CATEGORY of issues

**NOT this:**
```typescript
// ❌ Fragile - specific to one bug
test('health.ts should import db from correct path', () => {
  expect(healthImports.db).toBe('../../db');
});
```

**DO this:**
```typescript
// ✅ General-purpose - catches any import issue
test('server should start without throwing', async () => {
  const server = spawn('tsx', ['src/server/standalone.ts']);
  await waitForServer(server);
  // If ANYTHING is broken, server fails to start
});
```

**Create these artifacts:**

1. **General-Purpose Tests** - Catches entire categories
   - `packages/*/test/*.integration.test.ts`
   - Test behavior, not implementation
   - Validate contracts, not specific code

2. **Static Analysis** - Fast pattern detection
   - `scripts/static-analysis/validate-*.ts`
   - Pattern-based, not file-specific
   - Run in CI before tests

3. **Documentation** - How to fix patterns
   - `docs/issue-fixes-log.md`
   - Pattern → Solution mapping
   - Reference for when tests fail

### Phase 5: Validate Detection

**Goal:** Prove the tests actually catch bugs

**Method:**
1. Intentionally introduce bugs
2. Run tests
3. Verify tests fail with clear messages
4. Restore original code
5. Document results

**Script:** `scripts/introduce-bugs.sh`

**Results:** `docs/bug-detection-test-results.md`

### Exploratory Testing Checklist

- [ ] Start application and document behavior
- [ ] Navigate key user flows
- [ ] Document all issues found (don't fix!)
- [ ] Categorize each issue
- [ ] Identify systemic gaps
- [ ] Build general-purpose tests
- [ ] Create static analysis validators
- [ ] Validate tests catch bugs
- [ ] Document fixes separately
- [ ] Update issue-fixes-log.md
- [ ] Commit and push

### Example: From Exploratory Testing to Prevention

**What happened:**
1. Exploratory testing found broken imports when server wouldn't start
2. Pattern: Module contract violations
3. Solution: Server startup integration test
4. Validation: Introduced bugs, verified test caught them
5. Result: All future import issues caught in <10 seconds

**Artifacts created:**
- `packages/server/test/server-startup.integration.test.ts`
- `packages/server/test/module-contracts.integration.test.ts`
- `scripts/static-analysis/validate-server-startup.ts`
- `docs/issue-fixes-log.md`
- `docs/bug-detection-test-results.md`

**ROI:** 10 minutes of exploratory testing → prevents infinite regressions

---

## Landing the Plane (Session Completion)

Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**
1. Run quality gates: `pnpm run test:all`
2. Sync with remote: `git pull --rebase` and `bd sync`
3. Push to remote: `git push`
4. Verify: `git status` MUST show "up to date with origin"
