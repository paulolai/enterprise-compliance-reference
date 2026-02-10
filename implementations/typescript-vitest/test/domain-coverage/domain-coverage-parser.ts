import * as fs from 'fs';
import * as path from 'path';
import type { BusinessRule, DomainCoverageResult, RuleCoverage, TestReference } from '../../../shared/src/modules/domain-coverage';

export class DomainCoverageParser {
  private strategyPath: string;
  private cachedRules: Map<string, BusinessRule> = new Map();

  constructor(strategyPath?: string) {
    this.strategyPath = strategyPath || this.findStrategyPath();
  }

  /**
   * Find pricing-strategy.md by searching up the directory tree.
   * This handles both local dev and CI environments where directory nesting may vary.
   */
  private findStrategyPath(): string {
    let currentDir = __dirname;
    const maxDepth = 10; // Safety limit to prevent infinite loops

    for (let i = 0; i < maxDepth; i++) {
      const candidate = path.resolve(currentDir, 'docs/pricing-strategy.md');
      if (fs.existsSync(candidate)) {
        return candidate;
      }
      const parent = path.dirname(currentDir);
      if (parent === currentDir) {
        break; // Reached the root
      }
      currentDir = parent;
    }

    // Fallback to the original relative path for backward compatibility
    return path.resolve(__dirname, '../../../../../../docs/pricing-strategy.md');
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
              id: this.generateId(sectionMatch[2], desc),
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
