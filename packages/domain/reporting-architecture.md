# Reporting Architecture: Dual-Artifact Strategy

**Two complementary artifacts, designed for different stakeholders.**

## Overview

The Reference Architecture generates **two separate reports** from every test run, each optimized for a specific use case:

| Artifact | Design Target | Primary Use Case | Technical Requirement |
| :--- | :--- | :--- | :--- |
| **Attestation Report** | Regulatory compliance, business rule traceability | Audits, compliance reviews, stakeholder evidence | None (self-contained HTML) |
| **Allure Report** | Historical analysis, team collaboration, integration | Developer analytics, CI monitoring, PR reviews | Requires HTTP server |

**This is deliberate architecture**, not a compromise. Each persona gets the format that serves them best.

---

## Clean Room Reporting Strategy

To ensure data integrity and prevent historical pollution, we use a **Clean Room** approach orchestrated by `scripts/test-runner.ts`.

### The Workflow (`pnpm run test:all`)

1.  **Generate Run ID**: Creates a unique timestamped folder: `reports/run-YYYY-MM-DD.../`
2.  **Isolate Env**: Sets `ALLURE_RESULTS_DIR` to a subdirectory within that folder.
3.  **Execute Tests**: Runs Vitest and Playwright, which write *only* to this isolated folder.
4.  **Generate Report**: Reads *only* from the isolated results folder.

### Directory Structure

```
reports/
└── run-2026-01-27T10-30-00/
    ├── raw-results/       # Raw JSON data from Vitest/Playwright
    │   ├── api/
    │   └── gui/
    └── attestation/       # Generated HTML reports
        ├── attestation-full.html
        └── attestation.md
```

---

## Attestation Report (Primary Compliance Artifact)

### Purpose
Designed for auditors, compliance officers, and business stakeholders who need proof that the system works correctly.

### Features
- **Business Rule Traceability Matrix**: Maps every requirement to verifying tests
- **Embedded Execution Traces**: Exact inputs/outputs from test runs
- **Pass/Fail Status by Invariant**: Clear business rule verification
- **Git Metadata**: Full audit trail (commit hash, uncommitted changes)

### Usage
```bash
# Run all tests in a clean environment
pnpm run test:all

# Output location:
# reports/run-{timestamp}/attestation/attestation-full.html
```

### Why It Works Offline
The attestation report is a **static HTML file** with all data embedded inline. It contains no JavaScript that makes external network requests, so opening it directly from `file://` protocol works perfectly.

**Perfect for:**
- Emailing to auditors
- Storing in artifact repositories (Artifactory, Nexus) for 7 years
- Opening on air-gapped systems

---

## Allure Report (Historical Analytics)

### Purpose
Designed for developers, QA leads, and engineering managers who need to track trends, identify flakiness, and collaborate on test failures.

### Features
- **Test Duration Trends**: Track performance over time
- **Flakiness Detection**: Identify unstable tests
- **Visual Dashboards**: Charts, graphs, and metrics
- **Enterprise Integration**: Jira, Slack, Teams, CI badges
- **History Tracking**: Compare runs across builds

### Usage
```bash
# Generate the report
npm run test:allure
npm run report:allure:generate

# Interactively view (recommended)
npm run report:allure:serve

# Or view generated static report with HTTP server
npm run report:allure:view
```

### ⚠️ Critical: HTTP Server Required

Allure reports are **Single Page Applications** that use JavaScript (`fetch()` API) to load JSON data files. Modern browsers block these requests when opening files directly (`file://` protocol) due to Cross-Origin Resource Sharing (CORS) policies.

**❌ This will NOT work:**
```bash
# Opening directly fails with console errors
open allure-report/index.html
# Browser console: "Access to fetch at file://... from origin 'null' has been blocked by CORS policy"
```

**✅ This DOES work:**
```bash
# Required: serve via HTTP
npm run report:allure:view
# or
npx --yes http-server reports/allure-report -o -c-1
```

### Viewing GitHub Actions Artifacts

When downloading Allure reports from GitHub Actions artifacts:

**Step 1:** Download `allure-report-{run_number}` artifact from GitHub Actions
**Step 2:** Extract the ZIP file
**Step 3:** Serve the folder with an HTTP server:

```bash
cd path/to/extracted/allure-report-{run_number}
npx --yes http-server . -o -c-1
# Report opens automatically in browser
```

**Alternative:** If you have the repo locally:
```bash
cd implementations/typescript-vitest
npm run report:allure:view  # Uses existing reports/allure-report
```

### Technical Explanation

Allure uses this architecture:
1. **index.html** - Minimal shell that loads JavaScript
2. **app.js** - Loads and renders JSON data files via `fetch()`
3. **data/*.json** - Test execution data, history, statistics

When opened via `file://`:
- Browser treats each file as a separate "origin"
- JavaScript's `fetch()` requests are blocked by CORS policy
- Report appears blank or shows spinner forever

When served via HTTP:
- All files share the same origin (http://localhost:port)
- `fetch()` requests work correctly
- Report loads and displays properly

---

## Comparison: What Works Where

| Action | Attestation Report | Allure Report |
| :--- | :--- | :--- |
| Open `index.html` directly | ✅ Works | ❌ CORS errors |
| Serve with HTTP server | ✅ Works | ✅ Works |
| Email as attachment | ✅ Works | ❌ Won't render |
| Store for 7-year audit | ✅ Works | ⚠️ Needs server |
| Share link to stakeholders | ✅ Works | ⚠️ Needs deployment |

---

## Design Philosophy

### Why Two Systems?

In traditional organizations, you see one of two problems:

1. **Generic Test Reporting**: Teams use Allure/JUnit reports for everything. Auditors hate them because they're too technical and show no business rule traceability.

2. **Manual Evidence**: Teams generate PDFs/Word docs with screenshots. Developers hate them because they're slow, manual, and desync from code.

**Our solution**: Two purpose-built artifacts from the same test run.
- **Auditors** get business-friendly traceability (attestation)
- **Developers** get engineering analytics (Allure)

### Zero Integration Effort

Both reporters run simultaneously from the same test execution:

```typescript
// vitest.config.allure.ts
reporters: [
  'default',
  'allure-vitest/reporter',        // For historical trends
  './test/reporters/attestation-reporter.ts'  // For compliance
]
```

No double-running, no extra time, no maintenance burden.

### Separate Paths, Same Source

Both reporters consume the same test execution data but organize it differently:

| Data Source | Attestation Presentation | Allure Presentation |
| :--- | :--- | :--- |
| `registerInvariant()` metadata | Business rule + traceability matrix | Severity levels + tags |
| `tracer.log()` execution traces | Embedded JSON in HTML | Optional attachments |
| Test pass/fail status | Per-invariant status | Historical graphs |

---

## Enterprise Deployment

### For Teams Without Allure Infrastructure

The attestation report works out-of-the-box:
1. Run tests in CI
2. Upload `attestation-reports` artifact
3. Store compliance artifact for regulatory requirements

Allure can be added later as teams mature and need historical tracking.

### For Teams With Existing Allure Infrastructure

Migration is zero-friction:
1. Update CI to run `test:allure` alongside existing tests
2. Upload Allure artifacts to your existing Allure server
3. Continue using attestation reports for compliance

No code changes required in test files.

---

## Quick Reference

```bash
# Standard local development
npm test                          # Both reports generated

# Generate Allure report
npm run test:allure              # Run with Allure reporter
npm run report:allure:generate   # Create static HTML

# View Allure report (interactive vs static)
npm run report:allure:serve      # Live server with latest results
npm run report:allure:view       # Serve static generated HTML

# GitHub Actions artifacts
# Download → Extract → Serve with HTTP server
cd path/to/extracted/allure-report-{run_number}
npx --yes http-server . -o -c-1
```

---

**Bottom Line**: Attestation for compliance (works everywhere), Allure for analytics (requires HTTP server). Both from the same tests, zero extra effort.
