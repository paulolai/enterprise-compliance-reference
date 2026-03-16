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

## Engineering Standards

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
      $10                   $100              $500           $1000+
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

| Detection Level | Cost Per Issue | Cumulative Cost |
|----------------|---------------|-----------------|
| None (prod bug) | $5,000+ | $5,000+ |
| Exploratory | $500 | $500 × N issues |
| Static Analysis | $10 | $10 (catches all) |

**Finding 4 issues via exploratory: $2,000**  
**Same 4 via static analysis: $40**  
**Savings: 50x**

---

## Landing the Plane (Session Completion)

Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**
1. Run quality gates: `pnpm run test:all`
2. Sync with remote: `git pull --rebase` and `bd sync`
3. Push to remote: `git push`
4. Verify: `git status` MUST show "up to date with origin"
