import { DomainCoverageParser } from '../test/domain-coverage/domain-coverage-parser.js';
import { globSync } from 'glob';
import * as path from 'path';

const THRESHOLD = parseInt(process.env.DOMAIN_COVERAGE_THRESHOLD || '80', 10);
const ROOT_DIR = path.resolve(import.meta.dirname, '../../..');

function findTestFiles(): string[] {
  const patterns = [
    'implementations/**/*.test.ts',
    'implementations/**/*.spec.ts'
  ];

  const files: string[] = [];
  for (const pattern of patterns) {
    const matches = globSync(pattern, { cwd: ROOT_DIR, absolute: true });
    files.push(...matches);
  }
  return [...new Set(files)];
}

function main() {
  console.log('[Domain Coverage] Checking business rule coverage...\n');

  const parser = new DomainCoverageParser();
  const testFiles = findTestFiles();

  console.log(`[Domain Coverage] Found ${testFiles.length} test files`);

  const ruleReferences = parser.extractRuleReferences(testFiles);
  const result = parser.calculateCoverage(ruleReferences);

  console.log('\n' + '='.repeat(60));
  console.log('DOMAIN COVERAGE REPORT');
  console.log('='.repeat(60));

  for (const rule of result.rules) {
    const status = rule.covered ? '✅' : '❌';
    const testCount = rule.tests.length;
    console.log(`${status} ${rule.ruleReference} - ${rule.title} (${testCount} tests)`);
  }

  console.log('\n' + '-'.repeat(60));
  console.log(`Total Rules: ${result.summary.totalRules}`);
  console.log(`Covered Rules: ${result.summary.coveredRules}`);
  console.log(`Coverage: ${result.summary.coveragePercentage.toFixed(1)}%`);
  console.log(`Threshold: ${THRESHOLD}%`);
  console.log('-'.repeat(60));

  const uncoveredRules = result.rules.filter(r => !r.covered);
  if (uncoveredRules.length > 0) {
    console.log('\n⚠️  UNCOVERED RULES:');
    for (const rule of uncoveredRules) {
      console.log(`  - ${rule.ruleReference}: ${rule.title}`);
    }
  }

  if (result.summary.coveragePercentage < THRESHOLD) {
    console.error(`\n❌ FAILED: Coverage ${result.summary.coveragePercentage.toFixed(1)}% is below threshold ${THRESHOLD}%`);
    process.exit(1);
  }

  console.log('\n✅ PASSED: Domain coverage meets threshold');
  process.exit(0);
}

main();
