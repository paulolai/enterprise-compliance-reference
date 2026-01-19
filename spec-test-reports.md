# Specification: Allure Test Reports (API & GUI)

**Status:** Draft for Review
**Authors:** Executable Specs Team
**Date:** 2025-01-19

---

## Executive Summary

Use **Allure** as the primary **Engineering Dashboard** for both API and GUI tests, while maintaining the Custom Attestation Report for **Regulatory Compliance**.

- **Narrative steps** — `allure.step()` for GIVEN/WHEN/THEN
- **Business hierarchy** — `allure.epic()` / `allure.feature()` / `allure.story()`
- **Evidence attachments** — `allure.attachment()` for JSON traces and screenshots
- **Visual diffs** — Built-in side-by-side comparison for image attachments
- **Executive summary** — Native pass/fail statistics and trend views

### The Dual-Report Strategy

| Feature | Allure Report (Engineering) | Attestation Report (Compliance) |
| :--- | :--- | :--- |
| **Audience** | Developers & QA | Auditors & Stakeholders |
| **Goal** | Debugging, Flakiness Analysis, Trends | Sign-off, Traceability, Immutable Evidence |
| **Format** | Interactive Web App | Self-Contained HTML / PDF |
| **Retention** | Rolling History (CI) | Permanent Artifact (Versioned) |
| **Data Source** | `allure-results` (JSON) | `allure-results` (JSON) + Tracer |

**Architecture Decision:**
We will use `allure-results` (standard JSON output) as the **Single Source of Truth**. The Custom Attestation Reporter will be refactored to consume these JSON files instead of running as a separate runtime listener. This prevents double-instrumentation.

---

## Table of Contents

1. [Overview](#overview)
2. [Allure Architecture](#allure-architecture)
3. [API Test Configuration](#api-test-configuration)
4. [GUI Test Configuration](#gui-test-configuration)
5. [Business Hierarchy Mapping](#business-hierarchy-mapping)
6. [Evidence Attachments](#evidence-attachments)
7. [Report Structure](#report-structure)
8. [CI Persistence Strategy](#ci-persistence-strategy)
9. [File Structure](#file-structure)

---

## Overview

### Why Allure?

| Feature | Custom Reporter | Allure |
|---------|-----------------|--------|
| Steps/narrative | Manual HTML | Built-in `allure.step()` |
| Feature hierarchy | Manual mapping | `epic()` / `feature()` / `story()` |
| JSON evidence | Manual HTML blocks | `allure.attachment()` |
| Screenshot diffs | Manual comparison | Built-in side-by-side |
| History/trends | Manual tracking | Native support |
| CI integration | Manual setup | Standard plugins |
| Maintenance | Full custom code | Library updates |

### Unified Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Single Source of Truth                       │
│                   (allure-results/ JSON)                        │
└─────────────────────────────┬───────────────────────────────────┘
                              │
          ┌───────────────────┴───────────────────┐
          ▼                                       ▼
┌───────────────────────┐             ┌───────────────────────┐
│     Allure Report     │             │  Attestation Report   │
│   (Engineering View)  │             │   (Compliance View)   │
│                       │             │                       │
│ - Flakiness Trends    │             │ - Rule Traceability   │
│ - Stack Traces        │             │ - Signed Evidence     │
│ - Visual Diffs        │             │ - Auditor Friendly    │
└───────────────────────┘             └───────────────────────┘
```

---

## Allure Architecture

### Components

1. **Allure Framework** — Core reporting library (via npm adapters)
2. **Vitest Adapter** — `allure-vitest` for API tests
3. **Playwright Adapter** — `allure-playwright` for GUI tests
4. **Report Generator** — `allure-commandline` for HTML generation

### Data Flow

```
Test Execution
    ↓
Allure Adapter writes JSON to allure-results/
    ↓
allure generate --clean allure-results/
    ↓
HTML Report (allure-report/)
```

---

## API Test Configuration

### Installation

```bash
cd implementations/typescript-vitest
npm install -D allure-vitest
```

### Vitest Configuration

**File:** `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import { VitestAllureReporter } from 'allure-vitest';

export default defineConfig({
  reporters: [
    'default',
    new VitestAllureReporter({
      resultsDir: '../../allure-results/api',
      links: {
        issue: 'https://github.com/owner/repo/issues/%s',
        tms: 'https://tms.example.com/testcases/%s',
      }
    })
  ]
});
```

### Test Metadata

```typescript
import { test, expect } from 'vitest';
import { allure } from 'allure-vitest';

test.describe('Epic: Pricing Strategy', () => {
  test.describe('Feature: VIP Recognition', () => {
    test('Story: VIP Discount Applied', async () => {
      // Business hierarchy
      allure.epic('Pricing Strategy');
      allure.feature('VIP Recognition');
      allure.story('VIP Discount Applied');
      allure.issue('PRICING-42');

      // Tags for filtering
      allure.tags('@pricing', '@vip', '@critical');

      // Narrative steps
      await allure.step('GIVEN: a customer with > 2 years tenure', async () => {
        const user = { email: 'vip@test.com', tenureYears: 4 };

        // Attach input as evidence
        allure.attachment('User Input', JSON.stringify(user, null, 2), 'application/json');
      });

      await allure.step('WHEN: pricing is calculated', async () => {
        const cart = CartBuilder.new().withItem('laptop', 89900).build();
        const result = PricingEngine.calculate(cart, user);

        // Attach output as evidence
        allure.attachment('Pricing Result', JSON.stringify(result, null, 2), 'application/json');
      });

      await allure.step('THEN: 5% discount is applied to subtotal', async () => {
        expect(result.vipDiscount).toBeGreaterThan(0);
      });
    });
  });
});
```

### Property-Based Tests with Allure

```typescript
test('Invariant: VIP discount for tenure > 2 years (PBT)', async () => {
  allure.epic('Pricing Strategy');
  allure.feature('VIP Recognition');
  allure.tags('@invariant', '@pbt');

  const testName = 'VIP Discount Invariant';

  // Register test metadata (custom helper)
  registerInvariantMetadata(testName, {
    ruleReference: 'pricing-strategy.md §3',
    rule: '5% discount on subtotal for tenure > 2 years',
    tags: ['@pricing', '@vip', '@critical']
  });

  fc.assert(
    fc.property(userArb, cartArb, async (user, cart) => {
      await allure.step(`Run #${runCount}: tenure=${user.tenureYears}`, async () => {
        const result = PricingEngine.calculate(cart, user);

        // Trace evidence (sample for PBT)
        if (runCount % 10 === 0) {  // Sample 10% of runs
          allure.attachment(
            `Trace #${runCount}`,
            JSON.stringify({ user, cart, result }, null, 2),
            'application/json'
          );
        }

        const expectedDiscount = user.tenureYears > 2
          ? Math.floor(result.productTotal * 0.05)
          : 0;

        expect(result.vipDiscount).toBe(expectedDiscount);
        return true;
      });
    }),
    { numRuns: 100 }
  );
});
```

---

## GUI Test Configuration

### Installation

```bash
cd implementations/react-playwright
npm install -D @playwright/test allure-playwright
```

### Playwright Configuration

**File:** `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';
import reporter from 'allure-playwright';

export default defineConfig({
  reporter: [
    ['list'],
    [
      reporter(),
      {
        outputFolder: '../allure-results/gui',
        environmentInfo: {
          node: process.version,
          platform: process.platform,
          browserPath: process.env.PLAYWRIGHT_BROWSERS_PATH,
        },
        detail: true,  // Include step details
      }
    ]
  ],
  use: {
    // Capture screenshots on failure
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  }
});
```

### Test Metadata with Screenshots

```typescript
import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

test.describe('Epic: Pricing Strategy', () => {
  test.describe('Feature: VIP Recognition', () => {
    test('Story: VIP Badge Visible', async ({ page }) => {
      // Business hierarchy
      allure.epic('Pricing Strategy');
      allure.feature('VIP Recognition');
      allure.story('VIP Badge Visible');
      allure.tags('@gui', '@vip', '@visual');

      // Actor perspective
      allure.parameter('Actor', 'VIP Customer');
      allure.parameter('Tenure', '4 years');

      // Narrative with screenshot evidence
      await allure.step('GIVEN: a VIP customer with 4 years of tenure', async () => {
        const user = { email: 'vip@techhome.com', tenureYears: 4 };
        allure.attachment('User State', JSON.stringify(user, null, 2), 'application/json');

        // Navigate to debug route
        await page.goto('/debug/cart-view?tenureYears=4');

        // Screenshot after GIVEN
        const givenScreenshot = await page.screenshot({ fullPage: false });
        allure.attachment('State: User Logged In', Buffer.from(givenScreenshot), 'image/png');
      });

      await allure.step('WHEN: navigating to cart page', async () => {
        await page.goto('/cart');

        const whenScreenshot = await page.screenshot({ fullPage: false });
        allure.attachment('State: Cart Page Loaded', Buffer.from(whenScreenshot), 'image/png');
      });

      await allure.step('THEN: VIP badge is visible', async () => {
        const badge = page.getByTestId('vip-badge');
        await expect(badge).toBeVisible();

        // SUCCESS screenshot (visual evidence)
        const successScreenshot = await badge.screenshot();
        allure.attachment('Evidence: VIP Badge Visible', Buffer.from(successScreenshot), 'image/png');

        // Tag for baseline comparison
        allure.label('baselineHash', 'a3f9c2b1');
      });
    });

    test('Story: VIP Badge NOT Visible (Boundary)', async ({ page }) => {
      allure.epic('Pricing Strategy');
      allure.feature('VIP Recognition');
      allure.story('VIP Badge NOT Visible (Boundary)');
      allure.tags('@gui', '@vip', '@boundary');

      allure.parameter('Actor', 'Regular Customer');
      allure.parameter('Tenure', '1 year');

      await page.goto('/debug/cart-view?tenureYears=1');

      const badge = page.getByTestId('vip-badge');
      await expect(badge).toHaveCount(0);

      const notVisibleScreenshot = await page.screenshot({ fullPage: false });
      allure.attachment('Evidence: VIP Badge Absent', Buffer.from(notVisibleScreenshot), 'image/png');
    });
  });
});
```

---

## Business Hierarchy Mapping

### Mapping to `pricing-strategy.md`

| pricing-strategy.md Section | Allure Epic | Allure Feature | Allure Story |
|---------------------------|-------------|----------------|--------------|
| §1. Base/Currency/Tax | Pricing Strategy | Base Pricing | Currency Calculations |
| §2. Bulk Discounts | Pricing Strategy | Bulk Discounts | 15% Discount Applied |
| §3. VIP Tier | Pricing Strategy | VIP Recognition | VIP Badge Visible |
| §3. VIP Tier | Pricing Strategy | VIP Recognition | VIP Discount Applied |
| §4. Safety Valve | Pricing Strategy | Safety Valve | Discount Cap Enforced |
| §5.1 Base Shipping | Pricing Strategy | Shipping | Weight-Based Freight |
| §5.2 Free Shipping | Pricing Strategy | Shipping | Free Shipping Badge |
| §5.3 Expedited | Pricing Strategy | Shipping | Expedited Calculation |
| §5.4 Express | Pricing Strategy | Shipping | Express Fixed Rate |

### Tag Convention

```
@domain/@feature/@attribute

Examples:
  @pricing/vip/critical
  @gui/badge/visual
  @shipping/express/boundary
  @invariant/pbt/safety
```

---

## Evidence Attachments

### API Tests: JSON Evidence

```typescript
// In Vitest tests
allure.attachment(name, content, 'application/json');

// Examples:
allure.attachment('Input Cart', JSON.stringify(cart, null, 2), 'application/json');
allure.attachment('Pricing Result', JSON.stringify(result, null, 2), 'application/json');
allure.attachment('Error Details', JSON.stringify(error, null, 2), 'application/json');
```

### GUI Tests: Screenshots

```typescript
// In Playwright tests
allure.attachment(name, Buffer.from(imageData), 'image/png');

// Examples:
allure.attachment('State: Cart Page', Buffer.from(screenshot), 'image/png');
allure.attachment('Evidence: VIP Badge', Buffer.from(badgeScreenshot), 'image/png');
allure.attachment('Diff: Before/After', Buffer.from(diffImage), 'image/png');
```

### Other Attachment Types

| Type | MIME Type | Usage |
|------|-----------|-------|
| Text | `text/plain` | Step descriptions, URLs |
| JSON | `application/json` | Input/output traces |
| Screenshot | `image/png` | Visual evidence |
| Video | `video/webm` | Full test run recording |
| Logs | `text/plain` | Browser console logs |

---

## Report Structure

### View: Behaviors (Default)

Hierarchical view by Epic → Feature → Story:

```
Pricing Strategy (Epic)
├── VIP Recognition (Feature)
│   ├── VIP Badge Visible (Story)
│   │   ├── ✅ VIP Badge Visible
│   │   ├── ✅ VIP Badge NOT Visible (Boundary)
│   │   └── ✅ Badge Disappears on Logout
│   └── VIP Discount Applied (Story)
│       ├── ✅ 5% Discount Applied
│       └── ✅ No Discount at Boundary
├── Bulk Discounts (Feature)
│   └── ...
└── Shipping (Feature)
    └── ...
```

### View: Suites

Organized by test file/suite:

```
pricing.properties.test.ts
├── Invariant: VIP discount for tenure > 2 years
├── Invariant: Bulk discount for qty >= 3
└── Invariant: Safety valve never exceeds 30%

cart.ui.properties.test.ts
├── Invariant: VIP Badge Visible
├── Invariant: Bulk Discount Badge Visible
└── Invariant: Price Display Accuracy
```

### View: Timeline

Chronological view of test execution:

```
14:02:15 ── pricing.properties.test.ts ── 45.2s
14:02:15 │  ├─ Invariant: VIP discount ── 1.2s ── ✅
14:02:16 │  ├─ Invariant: Bulk discount ── 0.8s ── ✅
14:02:17 │  └─ Invariant: Safety valve ── 43.2s ── ✅
14:03:02 ── cart.ui.properties.test.ts ── 12.5s
14:03:02 │  └─ Invariant: VIP Badge Visible ── 12.5s ── ✅
```

### View: Graphs

| Graph | Description |
|-------|-------------|
| **Status** | Pass/fail ratio by Epic/Feature |
| **Duration** | Execution time distribution |
| **History** | Trend over time (last 20 runs) |
| **Severity** | Test distribution by severity level |

---

## CI Persistence Strategy

Allure's **Trends** and **History** features require access to previous test results. Since CI runners are ephemeral, we must explicitly manage history.

### The Logic
1. **Download History:** Fetch `allure-history/` from the *previous* run (e.g., S3, GitHub Artifacts, or `gh-pages` branch).
2. **Copy to Results:** Move `allure-history/` into `allure-results/history/`.
3. **Generate:** Run `allure generate`.
4. **Publish:** Upload the new report (including the new history) to the persistent store.

### GitHub Actions Implementation
We use the `gh-pages` branch to store history, as it's free and persistent.

```yaml
- name: Load History
  uses: actions/checkout@v3
  if: always()
  continue-on-error: true
  with:
    ref: gh-pages
    path: gh-pages

- name: Restore History
  run: |
    mkdir -p allure-results/history
    cp -R gh-pages/history/* allure-results/history/ || true

- name: Generate Report
  run: npx allure generate allure-results --clean -o allure-report

- name: Deploy to GitHub Pages
  uses: peaceiris/actions-gh-pages@v3
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    publish_dir: ./allure-report
    keep_files: true  # Key for preserving history
```

---

## File Structure

```
executable-specs-demo/
├── specs/
│   └── spec-test-reports.md      # This document
│
├── plans/
│   └── plan-allure-setup.md     # Implementation plan
│
├── allure-results/              # Generated by adapters
│   ├── api/                     # Vitest results
│   └── gui/                     # Playwright results
│
├── allure-report/               # Generated HTML (read-only)
│
├── implementations/
│   ├── shared/
│   │   └── fixtures/
│   │       └── allure-helpers.ts  # Helper functions
│   │
│   ├── typescript-vitest/
│   │   ├── vitest.config.ts      # ADD: VitestAllureReporter
│   │   └── test/
│   │       ├── *.test.ts        # MODIFY: add allure metadata
│   │
│   └── react-playwright/
│       ├── playwright.config.ts # ADD: allure-playwright reporter
│       └── src/test/
│           └── e2e/
│               └── *.test.ts   # MODIFY: add allure metadata
```

---

## Appendix A: Allure Helper Functions

**File:** `implementations/shared/fixtures/allure-helpers.ts`

```typescript
import { invariant } from 'allure-vitest';
import { InvariantMetadata } from '../types';

/**
 * Register invariant metadata for Allure reporting
 */
export function registerInvariantMetadata(
  testName: string,
  metadata: InvariantMetadata
) {
  // Map to Allure labels
  invariant.label('epic', 'Pricing Strategy');
  invariant.label('feature', extractFeature(metadata.ruleReference));
  invariant.label('story', extractStory(metadata.ruleReference));

  // Add tags
  metadata.tags.forEach(tag => {
    invariant.tag(tag);
  });

  // Add severity based on tags
  if (metadata.tags.some(t => t.includes('critical') || t.includes('safety'))) {
    invariant.severity('critical');
  } else if (metadata.tags.includes('boundary')) {
    invariant.severity('normal');
  } else {
    invariant.severity('minor');
  }

  // Store metadata for report generation
  invariant.parameter('ruleReference', metadata.ruleReference);
  invariant.parameter('ruleDescription', metadata.rule);
}

/**
 * Extract feature name from rule reference
 * "pricing-strategy.md §3 - VIP Tier" → "VIP Tier"
 */
function extractFeature(reference: string): string {
  const match = reference.match(/§\d+(?:\.\d+)?\s*-\s*(.+)/);
  return match ? match[1] : 'Pricing';
}

/**
 * Extract story name for API tests
 */
function extractStory(reference: string): string {
  // Returns story based on section number
  const section = reference.match(/§(\d+\.?\d*)/)?.[1];
  const stories: Record<string, string> = {
    '1': 'Base Currency Rules',
    '2': 'Bulk Discounts',
    '3': 'VIP Recognition',
    '4': 'Safety Valve',
    '5.1': 'Weight-Based Shipping',
    '5.2': 'Free Shipping',
    '5.3': 'Expedited Shipping',
    '5.4': 'Express Shipping',
  };
  return stories[section || ''] || 'General';
}
```

---

## Appendix B: Running Reports

### Run API Tests

```bash
cd implementations/typescript-vitest
npm test
```

Results go to: `allure-results/api/`

### Run GUI Tests

```bash
cd implementations/react-playwright
npm test
```

Results go to: `allure-results/gui/`

### Generate Combined Report

```bash
# From repository root
allure generate --clean allure-results/ --output allure-report/
```

### View Report

```bash
# Open in browser
allure open allure-report/

# Or start local server
allure serve allure-results/
```

### CI Integration

```yaml
# GitHub Actions example
- name: Run API Tests
  run: cd implementations/typescript-vitest && npm test

- name: Run GUI Tests
  run: cd implementations/react-playwright && npm test

- name: Generate Allure Report
  run: npx allure generate --clean allure-results/

- name: Upload Allure Artifacts
  uses: actions/upload-artifact@v3
  with:
    name: allure-report
    path: allure-report/

- name: Allure Report
  uses: simple-elf/allure-report-action@master
  if: always()
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    allure_history: allure-history
    allure_results: allure-results
```

---

## Appendix C: Visual Regression with Allure

### Baseline Comparison Pattern

```typescript
test('Invariant: VIP Badge Visual Regression', async ({ page }) => {
  // Expected baseline screenshot
  const baselinePath = '__snapshots__/vip-badge-baseline.png';
  const baseline = fs.readFileSync(baselinePath);

  // Actual screenshot
  const actual = await page.getByTestId('vip-badge').screenshot();

  // Attach both for diff
  allure.attachment('Expected (Baseline)', Buffer.from(baseline), 'image/png');
  allure.attachment('Actual', Buffer.from(actual), 'image/png');

  // Compare (playwright does this automatically with toHaveScreenshot)
  await expect(page.getByTestId('vip-badge')).toHaveScreenshot(baselinePath);

  // If it fails, Allure shows side-by-side diff
});
```

### Allure's Built-in Diff

When a test attaches multiple images (before/after or baseline/actual), Allure's report viewer automatically shows:
- Side-by-side comparison
- Diff highlighting (red pixels)
- Pixel difference percentage
- Image dimensions metadata

---

## Change History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-01-19 | 0.1 | Initial Allure-based specification | Claude |
