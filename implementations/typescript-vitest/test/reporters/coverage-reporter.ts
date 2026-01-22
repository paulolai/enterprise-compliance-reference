import { Reporter, File } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { DomainCoverageParser } from '../domain-coverage/domain-coverage-parser';
import type { DomainCoverageResult } from '../../../shared/src/modules/domain-coverage';

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
    try {
      console.log('[CoverageReporter] Starting domain coverage calculation...');
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
    } catch (e) {
      console.error('[CoverageReporter] Error generating domain coverage:', e);
    }
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
