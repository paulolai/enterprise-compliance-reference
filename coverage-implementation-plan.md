# Coverage & Quality Platform Implementation Plan

**Objective:** Elevate the repository from a "working demo" to a "production-grade Quality Platform" that demonstrates principal engineer capability for the "Build & Lead Test Automation" role.

---

## Executive Summary

This plan implements a **dual-layered coverage strategy**:
1. **Traditional Code Coverage** - tracks which lines/branches of code are executed
2. **Domain Coverage** - tracks which business rules from pricing-strategy.md have test coverage

This demonstrates deep understanding beyond standard test automation - showing that true quality requires measuring **business rule coverage**, not just code coverage.

---

## Part 1: Traditional Code Coverage

### 1.1 Install Coverage Provider

Update `implementations/typescript-vitest/package.json`:

```bash
cd implementations/typescript-vitest
npm install --save-dev @vitest/coverage-v8
```

### 1.2 Configure Vitest for Coverage

Update `implementations/typescript-vitest/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    reporters: [
      'default',
      resolve(__dirname, './test/reporters/attestation-reporter.ts'),
      ['allure-vitest/reporter', { resultsDir: '../../allure-results/api' }]
    ],
    globals: true,
    setupFiles: ['allure-vitest/setup'],
  },
  coverage: {
    provider: 'v8',
    reporter: ['text', 'json', 'html', 'lcov'],
    all: true,
    include: [
      'src/**/*.ts',
      '../shared/src/**/*.ts'
    ],
    exclude: [
      'node_modules/**',
      'test/**',
      '**/*.test.ts',
      '**/*.spec.ts',
      '**/coverage/**',
      '**/dist/**'
    ],
    // Enforce quality gates
    statements: 85,
    branches: 75,
    functions: 85,
    lines: 85,
    // Ignore test helpers from coverage calculation
    ignoreClassMethods: ['^to'],
    branches: 75
  },
});
```

### 1.3 Update Package Scripts

Update `implementations/typescript-vitest/package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:allure": "vitest run --config vitest.config.allure.ts",
    "test:coverage": "vitest run --coverage",
    "coverage:open": "npx http-server coverage -o",
    "report:allure:generate": "allure generate allure-results --clean -o reports/allure-report",
    "report:allure:serve": "allure serve allure-results",
    "report:allure:view": "npx --yes http-server reports/allure-report -o -c-1"
  }
}
```

### 1.4 Root Package Scripts

Update root `package.json`:

```json
{
  "scripts": {
    "test": "cd implementations/typescript-vitest && npm test",
    "test:coverage": "cd implementations/typescript-vitest && npm run test:coverage",
    "test:allure": "cd implementations/typescript-vitest && npm run test:allure",
    "reports:allure": "allure generate allure-results/ --clean --output allure-report/",
    "reports:allure:open": "allure open allure-report/",
    "reports:attestation": "cd implementations/typescript-vitest && npm run report:attestation"
  }
}
```

---

## Part 2: Domain Coverage (Business Rule Tracking)

### 2.1 Shared Types

Create `implementations/shared/src/modules/domain-coverage.ts`:

```typescript
// Types for domain coverage tracking

export interface BusinessRule {
  section: string;           // e.g., "1", "2", "5.1"
  title: string;             // e.g., "Base Rules (Currency & Tax)"
  invariants: Invariant[];   // List of invariants in this section
}

export interface Invariant {
  id: string;                // e.g., "final-total-lte-original"
  description: string;       // e.g., "Final Total <= Original Total"
  required: boolean;         // Is this rule required for coverage?
}

export interface DomainCoverageResult {
  rules: RuleCoverage[];
  summary: {
    totalRules: number;
    coveredRules: number;
    coveragePercentage: number;
  };
}

export interface RuleCoverage {
  ruleReference: string;     // e.g., "pricing-strategy.md §1"
  title: string;
  covered: boolean;
  tests: TestReference[];
}

export interface TestReference {
  testName: string;
  filePath: string;
  layer: 'API' | 'GUI';      // API vs GUI test
}
```

### 2.2 Domain Coverage Parser

Create `implementations/typescript-vitest/test/coverage/domain-coverage-parser.ts`:

```typescript
import * as fs from 'fs';
import * as path from 'path';
import type { BusinessRule, DomainCoverageResult, RuleCoverage, TestReference } from '../../../../shared/src/modules/domain-coverage';

export class DomainCoverageParser {
  private strategyPath: string;
  private cachedRules: Map<string, BusinessRule> = new Map();

  constructor(strategyPath?: string) {
    this.strategyPath = strategyPath || path.resolve(__dirname, '../../../../../docs/pricing-strategy.md');
  }

  /**
   * Parse pricing-strategy.md to extract all business rules
   */
  parseBusinessRules(): BusinessRule[] {
    if (this.cachedRules.size > 0) {
      return Array.from(this.cachedRules.values());
    }

    const content = fs.readFileSync(this.strategyPath, 'utf-8');
    const lines = content.split('\n');

    const rules: BusinessRule[] = [];
    let currentSection: { section: string, title: string, invariants: string[], required: boolean } | null = null;

    for (const line of lines) {
      // Match section headers: "## 2. Bulk Discounts" or "### 5.1 Base Shipping"
      const sectionMatch = line.match(/^(#{2,3})\s+(\d+(?:\.\d+)?)\.\s+(.+)$/);
      if (sectionMatch) {
        if (currentSection) {
          rules.push({
            section: currentSection.section,
            title: currentSection.title,
            invariants: currentSection.invariants.map(desc => ({
              id: this.generateId(currentSection.section, desc),
              description: desc,
              required: !desc.toLowerCase().includes('example')
            }))
          });
        }
        currentSection = {
          section: sectionMatch[2],
          title: sectionMatch[3],
          invariants: [],
          required: true
        };
        continue;
      }

      // Match invariant lines starting with "- Invariant:" or "- **Invariant:**"
      const invariantMatch = line.match(/^\s*-\s*(?:\*\*)?Invariant:\s*(.+)$/i);
      if (invariantMatch && currentSection) {
        currentSection.invariants.push(invariantMatch[1].trim());
      }

      // Match rule lines for additional invariants
      const ruleMatch = line.match(/^\s*-\s*\*\*Rule:\*\*\s+(.+)$/);
      if (ruleMatch && currentSection) {
        currentSection.invariants.push(ruleMatch[1].trim());
      }
    }

    // Add the last section
    if (currentSection && currentSection.invariants.length > 0) {
      rules.push({
        section: currentSection.section,
        title: currentSection.title,
        invariants: currentSection.invariants.map(desc => ({
          id: this.generateId(currentSection.section, desc),
          description: desc,
          required: true
        }))
      });
    }

    // Cache for reuse
    rules.forEach(rule => this.cachedRules.set(rule.section, rule));

    return rules;
  }

  /**
   * Extract rule references from test metadata (ruleReference field)
   */
  extractRuleReferences(testFiles: string[]): Map<string, TestReference[]> {
    const ruleTests = new Map<string, TestReference[]>();

    for (const testFile of testFiles) {
      const content = fs.readFileSync(testFile, 'utf-8');

      const layer: 'API' | 'GUI' = testFile.includes('react-playwright') ? 'GUI' : 'API';

      let tests: { name: string, refs: string[] }[] = [];
      let currentTest: { name: string, refs: string[] } | null = null;

      const lines = content.split('\n');
      for (const line of lines) {
        const testMatch = line.match(/(?:it|test)\s*\(\s*['"`]([^'"`]+)['"`]/);
        if (testMatch) {
          if (currentTest) tests.push(currentTest);
          currentTest = { name: testMatch[1], refs: [] };
        }

        const refMatch = line.match(/ruleReference:\s*['"`]([^'"`]+)['"`]/);
        if (refMatch && currentTest) {
          currentTest.refs.push(refMatch[1]);
        }
      }
      if (currentTest) tests.push(currentTest);

      // Build the map
      for (const test of tests) {
        for (const ref of test.refs) {
          if (!ruleTests.has(ref)) {
            ruleTests.set(ref, []);
          }
          ruleTests.get(ref)!.push({
            testName: test.name,
            filePath: testFile,
            layer
          });
        }
      }
    }

    return ruleTests;
  }

  /**
   * Calculate domain coverage from parsed rules and test references
   */
  calculateCoverage(ruleReferences: Map<string, TestReference[]>): DomainCoverageResult {
    const rules = this.parseBusinessRules();
    const result: RuleCoverage[] = [];

    for (const rule of rules) {
      const ruleRef = `pricing-strategy.md §${rule.section}`;
      const tests = ruleReferences.get(ruleRef) || [];

      result.push({
        ruleReference: ruleRef,
        title: rule.title,
        covered: tests.length > 0,
        tests
      });
    }

    const coveredRules = result.filter(r => r.covered).length;

    return {
      rules: result,
      summary: {
        totalRules: result.length,
        coveredRules,
        coveragePercentage: (coveredRules / result.length) * 100
      }
    };
  }

  private generateId(section: string, description: string): string {
    return `§${section}-${description
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .substring(0, 50)}`;
  }
}
```

### 2.3 Coverage Reporter

Create `implementations/typescript-vitest/test/reporters/coverage-reporter.ts`:

```typescript
import { Reporter, File } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { DomainCoverageParser } from '../coverage/domain-coverage-parser';
import type { DomainCoverageResult } from '../../../../shared/src/modules/domain-coverage';

export default class CoverageReporter implements Reporter {
  private parser: DomainCoverageParser;
  private runDir?: string;

  constructor() {
    this.parser = new DomainCoverageParser();
  }

  onInit() {
    this.runDir = path.resolve(process.cwd(), '../../reports/coverage');
    if (!fs.existsSync(this.runDir)) {
      fs.mkdirSync(this.runDir, { recursive: true });
    }
  }

  onFinished(files: File[]) {
    // Get all test files
    const testFiles = files.map(f => f.filepath);

    // Extract rule references from tests
    const ruleReferences = this.parser.extractRuleReferences(testFiles);

    // Calculate domain coverage
    const coverage = this.parser.calculateCoverage(ruleReferences);

    // Save JSON and Markdown reports
    fs.writeFileSync(
      path.join(this.runDir!, 'domain-coverage.json'),
      JSON.stringify(coverage, null, 2)
    );

    fs.writeFileSync(
      path.join(this.runDir!, 'domain-coverage.md'),
      this.generateMarkdownReport(coverage)
    );

    console.log(`[Domain Coverage] ${coverage.summary.coveragePercentage.toFixed(1)}% - ${coverage.summary.coveredRules}/${coverage.summary.totalRules} rules covered`);
  }

  private generateMarkdownReport(coverage: DomainCoverageResult): string {
    let md = `# Domain Coverage Report\n\n`;
    md += `**Generated:** ${new Date().toISOString()}\n`;
    md += `**Total Rules:** ${coverage.summary.totalRules}\n`;
    md += `**Covered Rules:** ${coverage.summary.coveredRules}\n`;
    md += `**Coverage:** ${coverage.summary.coveragePercentage.toFixed(1)}%\n\n`;

    md += `| Rule | Covered | Tests |\n`;
    md += `|------|---------|-------|\n`;

    for (const rule of coverage.rules) {
      const status = rule.covered ? '✅' : '❌';
      const testList = rule.tests.map(t => `\`${t.testName}\``).join(', ');
      md += `| ${rule.ruleReference} | ${status} | ${testList} |\n`;
    }

    return md;
  }
}
```

### 2.4 Update attestation-reporter.ts

Modify `implementations/typescript-vitest/test/reporters/attestation-reporter.ts` to include domain and code coverage in the HTML report.

Add after the Executive Summary section:

```typescript
// Add coverage summary section
html += `
    <h2 style="margin-top: 40px;">Coverage Summary</h2>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
      <div style="background: #f6f8fa; padding: 20px; border-radius: 6px; border: 1px solid #e1e4e8;">
        <h3 style="margin-top: 0;">Code Coverage</h3>
        <div style="font-size: 2em; font-weight: bold; color: #22863a;">${codeCoveragePercentage}%</div>
        <div style="color: #586069; margin-top: 5px;">Lines / Statements</div>
        <div style="margin-top: 10px; font-size: 0.9em;">
          <div>Statements: ${statementsCoverage}%</div>
          <div>Branches: ${branchesCoverage}%</div>
          <div>Functions: ${functionsCoverage}%</div>
        </div>
      </div>
      <div style="background: #f6f8fa; padding: 20px; border-radius: 6px; border: 1px solid #e1e4e8;">
        <h3 style="margin-top: 0;">Domain Coverage</h3>
        <div style="font-size: 2em; font-weight: bold; color: ${domainCoveragePercentage >= 100 ? '#22863a' : '#e36209'};">${domainCoveragePercentage.toFixed(1)}%</div>
        <div style="color: #586069; margin-top: 5px;">Business Rules Covered</div>
        <div style="margin-top: 10px; font-size: 0.9em;">
          <div>${coveredRules} of ${totalRules} rules</div>
          <div>${uncoveredRules} rules need tests</div>
        </div>
      </div>
    </div>
`;
```

---

## Part 3: CI/CD Pipeline Enhancement

### 3.1 Update GitHub Actions Workflow

Update `.github/workflows/ci.yml`:

```yaml
name: Executable Specs CI

on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]

jobs:
  test-api:
    name: API Tests with Coverage
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./implementations/typescript-vitest

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: implementations/typescript-vitest/package-lock.json

      - name: Install Dependencies
        run: npm ci

      - name: Run Tests with Coverage
        run: npm run test:coverage

      - name: Generate Allure Report
        run: npm run test:allure && npm run report:allure:generate

      - name: Check Coverage Thresholds
        run: npm run test:coverage

      - name: Upload Coverage Report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: api-coverage
          path: implementations/typescript-vitest/coverage/
          retention-days: 30

      - name: Upload Allure Results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: allure-api
          path: allure-results/api/
          retention-days: 30

      - name: Display Attestation Summary
        if: always()
        run: |
          ATTESTATION=$(find reports -name "attestation-full.html" | tail -1)
          if [ -n "$ATTESTATION" ]; then
            echo "## Attestation Report" >> $GITHUB_STEP_SUMMARY
            echo "" >> $GITHUB_STEP_SUMMARY
            cat "$ATTESTATION" >> $GITHUB_STEP_SUMMARY
          fi

  test-gui:
    name: GUI Tests
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./implementations/react-playwright

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: implementations/react-playwright/package-lock.json

      - name: Install Dependencies
        run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps chromium

      - name: Type Check
        run: npx tsc --noEmit

      - name: Lint
        run: npm run lint

      - name: Run Playwright Tests
        run: npm test

      - name: Upload Playwright Report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: implementations/react-playwright/playwright-report/
          retention-days: 7

      - name: Upload Playwright Traces
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-traces
          path: implementations/react-playwright/test-results/
          retention-days: 7

      - name: Upload Allure GUI Results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: allure-gui
          path: allure-results/gui/
          retention-days: 30

  generate-reports:
    name: Generate Unified Reports
    runs-on: ubuntu-latest
    needs: [test-api, test-gui]
    if: always()

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Download All Outputs
        uses: actions/download-artifact@v4
        with:
          path: artifacts/

      - name: Merge Allure Results
        run: |
          mkdir -p merged-allure-results
          cp -r artifacts/allure-api/* merged-allure-results/ 2>/dev/null || true
          cp -r artifacts/allure-gui/* merged-allure-results/ 2>/dev/null || true

      - name: Generate Overall Allure Report
        run: |
          npm run reports:allure

      - name: Upload Unified Allure Report
        uses: actions/upload-artifact@v4
        with:
          name: allure-report
          path: allure-report/
          retention-days: 30
```

### 3.2 Coverage Threshold Configuration

Create `coverage.config.mjs` in root:

```javascript
export default {
  codeCoverage: {
    statements: 85,
    branches: 75,
    functions: 85,
    lines: 85,
  },
  domainCoverage: {
    minimum: 85,
    requiredRules: ['1', '2', '3', '4', '5.1', '5.2', '5.3', '5.4', '5.5'],
  },
};
```

---

## Part 4: GUI Coverage (Playwright)

### 4.1 Enable Coverage Collection

Update `implementations/react-playwright/playwright.config.ts` to add coverage collection:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src/test/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 10 * 1000,
  expect: {
    timeout: 2 * 1000,
  },
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  reporter: [
    ['html', { outputFolder: 'reports/html-report', open: 'never' }],
    ['list'],
    ['allure-playwright', { resultsDir: '../../allure-results/gui' }],
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

Note: Playwright doesn't natively collect JavaScript coverage like Istanbul. For GUI coverage, we add the tests to the domain coverage tracking via the `ruleReference` metadata already in the test files.

---

## Part 5: Optional Enhancements for "Principal Engineer" Polish

### 5.1 Visual Regression Testing

Add a visual regression test to `implementations/react-playwright/src/test/e2e/cart.ui.visual.test.ts`:

```typescript
import { test, expect } from '../../../node_modules/@playwright/test';

test.describe('Visual Regression - Cart', () => {
  test('cart displays correctly with items', async ({ page }) => {
    await page.goto('/');

    // Add items to cart
    await page.click('[data-testid="product-1"]');
    await page.click('[data-testid="product-2"]');

    // Navigate to cart
    await page.click('[data-testid="cart-button"]');

    // Snapshot the cart view
    await expect(page).toHaveScreenshot('cart-with-items.png');
  });

  test('cart displays badge for VIP user', async ({ page }) => {
    await page.goto('/');

    // Set user to VIP via API or localStorage
    await page.evaluate(() => {
      localStorage.setItem('user', JSON.stringify({ tenure: 3 }));
    });

    await page.reload();

    // Verify VIP badge is visible
    await expect(page.locator('[data-testid="vip-badge"]')).toBeVisible();
    await expect(page).toHaveScreenshot('vip-badge-display.png');
  });
});
```

### 5.2 Coverage Badges

Create `scripts/generate-badges.cjs`:

```javascript
const fs = require('fs');
const path = require('path');
// Simple SVG badge generation
const generateBadge = (label, value, color) => {
  const width = 100 + label.length * 8 + value.length * 8;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20">
    <linearGradient id="b" x2="0" y2="100%">
      <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
      <stop offset="1" stop-opacity=".1"/>
    </linearGradient>
    <mask id="a">
      <rect width="${width}" height="20" rx="3" fill="#fff"/>
    </mask>
    <g mask="url(#a)">
      <path fill="#555" d="M0 0h${60 + label.length * 8}v20H0z"/>
      <path fill="${color}" d="M${60 + label.length * 8} 0h${width - 60 - label.length * 8}v20H${60 + label.length * 8}z"/>
      <path fill="url(#b)" d="M0 0h${width}v20H0z"/>
    </g>
    <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
      <text x="${30 + label.length * 4}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
      <text x="${30 + label.length * 4}" y="14">${label}</text>
      <text x="${60 + label.length * 8 + (width - 60 - label.length * 8) / 2}" y="15" fill="#010101" fill-opacity=".3">${value}</text>
      <text x="${60 + label.length * 8 + (width - 60 - label.length * 8) / 2}" y="14">${value}</text>
    </g>
  </svg>`;
};

const summaryPath = path.join(__dirname, '../reports/coverage/domain-coverage.json');
if (fs.existsSync(summaryPath)) {
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
  const coverage = summary.summary.coveragePercentage;
  const color = coverage >= 85 ? '#4c1' : coverage >= 70 ? '#dfb317' : '#e05d44';

  fs.writeFileSync(
    path.join(__dirname, '../coverage-domain.svg'),
    generateBadge('Domain Coverage', `${coverage.toFixed(1)}%`, color)
  );
  console.log('Coverage badge generated');
}
```

---

## Critical Files to Modify

| File | Purpose |
|------|---------|
| `implementations/typescript-vitest/package.json` | Add coverage dependency |
| `implementations/typescript-vitest/vitest.config.ts` | Enable coverage config |
| `implementations/shared/src/modules/domain-coverage.ts` | New: coverage types |
| `implementations/typescript-vitest/test/coverage/domain-coverage-parser.ts` | New: parse business rules |
| `implementations/typescript-vitest/test/reporters/coverage-reporter.ts` | New: custom domain coverage reporter |
| `implementations/typescript-vitest/test/reporters/attestation-reporter.ts` | Update: embed coverage in HTML |
| `root/package.json` | Add coverage scripts |
| `.github/workflows/ci.yml` | Add coverage steps and GUI tests |
| `coverage.config.mjs` | New: threshold configuration |

---

## Verification Steps

### Local Testing

```bash
# 1. Install dependencies
cd implementations/typescript-vitest && npm ci
cd ../react-playwright && npm ci

# 2. Run API tests with coverage
cd implementations/typescript-vitest
npm run test:coverage

# 3. View coverage report
open coverage/index.html

# 4. Check domain coverage report
cat ../../reports/coverage/domain-coverage.md

# 5. Run GUI tests
cd implementations/react-playwright
npm test

# 6. Generate unified Allure report
cd ../..
npm run reports:allure
npm run reports:allure:open
```

### Expected Results

1. **Code Coverage** - HTML report in `implementations/typescript-vitest/coverage/`
2. **Domain Coverage** - Markdown report in `reports/coverage/domain-coverage.md`
3. **Attestation Report** - HTML report with coverage summary in `reports/latest/`
4. **Allure Report** - Unified report in `allure-report/`

---

## Why This Demonstrates "Principal Engineer" Capability

1. **Business Rule Coverage vs. Code Coverage** - Shows understanding that true quality comes from verifying business requirements, not just hitting code lines

2. **Dual-Layer Reporting** - Combines technical metrics with business metrics for stakeholder communication

3. **Property-Based Testing** - Fast-check invariants prove rules hold for ALL valid inputs, not just cherry-picked examples

4. **Traceability** - Every test back-traces to source document section (e.g., `pricing-strategy.md §3`)

5. **Enforcement Gating** - CI fails when coverage thresholds aren't met, showing leadership in setting standards

6. **Deep Observability** - Tracer captures inputs/outputs for compliance audits

This is not "just writing tests" - this is building a quality infrastructure that scales with the product and enables stakeholder confidence.
