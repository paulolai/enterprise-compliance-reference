import { Reporter, TestRunEndReason } from 'vitest/reporters';
import { SerializedError } from '@vitest/utils';
import type { RunnerTestSuite, RunnerTask } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { tracer } from '../modules/tracer';

// Type alias for the old-style File type used in the implementation
interface File {
  filepath: string;
  tasks: RunnerTask[];
}

// Vitest and TestModule are not directly exported in v4, use any
interface TestModule {
  moduleId: string;
}

// Helper type for accessing result state safely
type TaskResultState = 'passed' | 'failed' | 'skipped' | 'pending';

// Helper to safely get task result state
function getTaskState(task: RunnerTask): TaskResultState | undefined {
  const result = (task as any).result;
  return result?.state as TaskResultState | undefined;
}

// Helper to safely get task result duration
function getTaskDuration(task: RunnerTask): number | undefined {
  const result = (task as any).result;
  return result?.duration as number | undefined;
}

// Helper to get suite with parent property
function getTaskParent(task: RunnerTask): RunnerTask | null | undefined {
  return (task as any).parent;
}

// Helper to get task type as string
function getTaskType(task: RunnerTask): string {
  return (task as any).type as string;
}

export default class AttestationReporter implements Reporter {
  private startTime: number = 0;
  private testModules: TestModule[] = [];

  onInit(_vitest: unknown) {
    this.startTime = Date.now();
    const currentRunFile = '/tmp/vitest-current-run-id.txt';
    if (!fs.existsSync(currentRunFile)) {
      tracer.clear();
    }
  }

  onTestModuleCollected(module: unknown) {
    this.testModules.push(module as TestModule);
  }

  onTestRunEnd(_modules: ReadonlyArray<unknown>, _unhandledErrors: readonly SerializedError[], _reason: TestRunEndReason) {
    // Convert new TestModule[] to old File[] format using the collected modules
    const files: File[] = this.testModules.map(m => ({
      filepath: m.moduleId,
      tasks: this.flattenTasks(m)
    }));

    const endTime = Date.now();
    const duration = ((endTime - this.startTime) / 1000).toFixed(2);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    console.log(`[Attestation] Run directory: ${tracer.getRunDir()}`);
    tracer.loadMetadata();
    console.log(`[Attestation] Loaded ${tracer.getInvariantMetadata().size} invariants from metadata`);

    const currentRunFile = '/tmp/vitest-current-run-id.txt';
    if (fs.existsSync(currentRunFile)) {
      fs.unlinkSync(currentRunFile);
    }

    const reportsRoot = process.env.ATTESTATION_REPORT_DIR
      ? path.resolve(process.env.ATTESTATION_REPORT_DIR)
      : path.resolve(process.cwd(), '../../reports');
    const reportDir = path.join(reportsRoot, timestamp);

    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const gitInfo = this.getGitInfo();
    const markdown = this.generateMarkdown(files, gitInfo, duration);
    const htmlLight = this.generateHtml(files, gitInfo, duration, false);
    const htmlFull = this.generateHtml(files, gitInfo, duration, true);

    fs.writeFileSync(path.join(reportDir, 'attestation.md'), markdown);
    fs.writeFileSync(path.join(reportDir, 'attestation-light.html'), htmlLight);
    fs.writeFileSync(path.join(reportDir, 'attestation-full.html'), htmlFull);

    console.log(`
[Attestation] Reports generated in: ${reportDir}`);
    console.log(`  - Light: attestation-light.html`);
    console.log(`  - Full:  attestation-full.html`);
  }

  // Helper to flatten new Task structure to old File.tasks array
  private flattenTasks(module: TestModule): RunnerTask[] {
    const tasks: RunnerTask[] = [];
    const traverse = (task: RunnerTask) => {
      const taskType = getTaskType(task);
      if (taskType === 'suite' || taskType === 'module') {
        const suite = task as RunnerTestSuite;
        tasks.push(suite);
        suite.tasks?.forEach(traverse);
      } else if (taskType === 'test') {
        tasks.push(task);
      }
    };
    traverse(module as unknown as RunnerTask);
    return tasks;
  }

  private getGitInfo() {
    try {
      const hash = execSync('git rev-parse --short HEAD').toString().trim();
      const dirtyFiles = execSync('git status --porcelain').toString().trim();
      return { hash, dirtyFiles };
    } catch (e) {
      return { hash: 'Unknown', dirtyFiles: '' };
    }
  }

  private getCoverageStats() {
    let stats = {
      code: 0,
      domain: 0,
      coveredRules: 0,
      totalRules: 0,
      statements: 0,
      branches: 0,
      functions: 0
    };

    try {
      const rootDir = path.resolve(__dirname, '../../../../');

      const domainPath = path.join(rootDir, 'reports/coverage/domain-coverage.json');
      if (fs.existsSync(domainPath)) {
        const domain = JSON.parse(fs.readFileSync(domainPath, 'utf-8'));
        stats.domain = domain.summary.coveragePercentage;
        stats.coveredRules = domain.summary.coveredRules;
        stats.totalRules = domain.summary.totalRules;
      }

      const codePath = path.resolve(__dirname, '../../coverage/coverage-summary.json');
      if (fs.existsSync(codePath)) {
        const code = JSON.parse(fs.readFileSync(codePath, 'utf-8'));
        stats.code = code.total.lines.pct;
        stats.statements = code.total.statements.pct;
        stats.branches = code.total.branches.pct;
        stats.functions = code.total.functions.pct;
      }
    } catch (e) {
      // Silent fail
    }
    return stats;
  }

  private generateMarkdown(files: File[], gitInfo: { hash: string, dirtyFiles: string }, duration: string): string {
    let md = `# Pricing Engine: Quality Assurance Attestation\n\n**Generated:** ${new Date().toLocaleString()}\n**Git Hash:** ${gitInfo.hash}\n\n`;
    if (gitInfo.dirtyFiles) md += `**⚠️ Uncommitted Changes:**\n${gitInfo.dirtyFiles}\n\n`;

    md += `## 1. Executive Summary\n\n| Area | Passed | Failed | Status |\n| :--- | :--- | :--- | :--- |\n`;

    let totalPass = 0, totalFail = 0;
    files.forEach(file => {
      file.tasks.forEach(task => {
        const taskType = getTaskType(task);
        if (taskType === 'suite') {
          const stats = this.getSuiteStats(task as RunnerTestSuite);
          totalPass += stats.passed;
          totalFail += stats.failed;
          const status = stats.failed === 0 ? '✅ PASS' : '❌ FAIL';
          md += `| ${task.name} | ${stats.passed} | ${stats.failed} | ${status} |\n`;
        }
      });
    });

    md += `\n**Total Scenarios:** ${totalPass + totalFail} | **Pass Rate:** ${((totalPass / (totalPass + totalFail || 1)) * 100).toFixed(1)}%\n\n## 2. Detailed Audit Log\n\n`;
    files.forEach(file => file.tasks.forEach(task => md += this.renderTaskMd(task, 3)));
    return md;
  }

  private generateHtml(files: File[], gitInfo: { hash: string, dirtyFiles: string }, duration: string, includeTraces: boolean): string {
    const matrix = this.generateTraceabilityMatrix(files);
    const coverage = this.getCoverageStats();

    let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>QA Attestation Report</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; color: #333; background-color: #fff; }
  h1 { border-bottom: 2px solid #eaeaea; padding-bottom: 10px; margin-bottom: 30px; }
  h2 { margin-top: 40px; margin-bottom: 20px; color: #24292e; border-bottom: 1px solid #eaeaea; padding-bottom: 5px; }
  .metadata { background: #f6f8fa; padding: 20px; border-radius: 6px; margin-bottom: 30px; border: 1px solid #e1e4e8; display: flex; flex-wrap: wrap; gap: 20px; align-items: center; }
  .metadata-item { display: flex; flex-direction: column; }
  .metadata-label { font-size: 0.85em; color: #586069; font-weight: 600; margin-bottom: 4px; }
  .metadata-value { font-size: 1.1em; font-weight: 500; }
  .warning { width: 100%; color: #856404; background-color: #fff3cd; padding: 10px; border-radius: 4px; margin-top: 10px; border: 1px solid #ffeeba; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 20px; border: 1px solid #e1e4e8; border-radius: 6px; overflow: hidden; }
  th, td { text-align: left; padding: 12px 15px; border-bottom: 1px solid #eaeaea; vertical-align: top; }
  th { background-color: #f6f8fa; font-weight: 600; color: #24292e; border-bottom: 2px solid #eaeaea; }
  .status-pass { color: #22863a; font-weight: bold; }
  .status-fail { color: #cb2431; font-weight: bold; }
  .tag { display: inline-block; background: #e1f5ff; color: #0366d6; padding: 2px 8px; border-radius: 12px; font-size: 0.85em; margin-right: 4px; border: 1px solid #b4d9fa; }
  .tag-critical { background: #ffeef0; color: #cb2431; border-color: #f9c0c7; }
  .business-rule-box { background: #fff; padding: 10px; border-left: 3px solid #0366d6; margin-bottom: 10px; }
  details { margin-top: 8px; }
  summary { cursor: pointer; color: #0366d6; font-size: 0.9em; outline: none; }
  .test-details { padding: 15px; background: #f8f9fa; border-radius: 4px; border: 1px solid #e1e4e8; margin-top: 10px; }
  .io-block { display: flex; gap: 20px; margin-top: 10px; }
  .io-section { flex: 1; min-width: 0; }
  .io-label { font-size: 0.8em; font-weight: 600; color: #586069; margin-bottom: 4px; text-transform: uppercase; }
  pre { background: #f6f8fa; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 0.85em; border: 1px solid #e1e4e8; margin: 0; }
  .matrix-rule { font-weight: 600; color: #24292e; width: 30%; }
  .matrix-desc { color: #586069; font-size: 0.9em; margin-bottom: 4px; }
  .matrix-tests { list-style: none; padding: 0; margin: 0; }
  .matrix-tests li { margin-bottom: 4px; display: flex; align-items: center; justify-content: space-between; }
  .test-link { color: #0366d6; text-decoration: none; font-size: 0.9em; }
</style>
</head><body>
  <h1>Pricing Engine: QA Attestation</h1>
  <div class="metadata">
    <div class="metadata-item"><span class="metadata-label">Generated</span><span class="metadata-value">${new Date().toLocaleString()}</span></div>
    ${includeTraces ? `<div class="metadata-item"><span class="metadata-label">Duration</span><span class="metadata-value">${duration}s</span></div>` : ''}
    <div class="metadata-item"><span class="metadata-label">Git Hash</span><span class="metadata-value"><code>${gitInfo.hash}</code></span></div>
    ${gitInfo.dirtyFiles ? `<div class="warning"><strong>⚠️ Uncommitted Changes:</strong><pre>${gitInfo.dirtyFiles}</pre></div>` : ''}
  </div>

  <h2>1. Executive Summary</h2>
  <table><tr><th>Test Suite</th><th>Passed</th><th>Failed</th><th>Status</th></tr>
`;
    files.forEach(file => {
      file.tasks.forEach(task => {
        const taskType = getTaskType(task);
        if (taskType === 'suite') {
          const stats = this.getSuiteStats(task as RunnerTestSuite);
          const statusClass = stats.failed === 0 ? 'status-pass' : 'status-fail';
          const statusText = stats.failed === 0 ? '✅ PASS' : '❌ FAIL';
          html += `<tr><td>${task.name}</td><td>${stats.passed}</td><td>${stats.failed}</td><td class="${statusClass}">${statusText}</td></tr>`;
        }
      });
    });
    html += `</table>`;

    html += `
    <h2 style="margin-top: 40px;">Coverage Summary</h2>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
      <div style="background: #f6f8fa; padding: 20px; border-radius: 6px; border: 1px solid #e1e4e8;">
        <h3 style="margin-top: 0;">Code Coverage</h3>
        <div style="font-size: 2em; font-weight: bold; color: ${coverage.code >= 80 ? '#22863a' : '#d73a49'};">${coverage.code}%</div>
        <div style="color: #586069; margin-top: 5px;">Lines / Statements</div>
        <div style="margin-top: 10px; font-size: 0.9em;">
          <div>Statements: ${coverage.statements}%</div>
          <div>Branches: ${coverage.branches}%</div>
          <div>Functions: ${coverage.functions}%</div>
        </div>
      </div>
      <div style="background: #f6f8fa; padding: 20px; border-radius: 6px; border: 1px solid #e1e4e8;">
        <h3 style="margin-top: 0;">Domain Coverage</h3>
        <div style="font-size: 2em; font-weight: bold; color: ${coverage.domain >= 100 ? '#22863a' : '#e36209'};">${coverage.domain.toFixed(1)}%</div>
        <div style="color: #586069; margin-top: 5px;">Business Rules Covered</div>
        <div style="margin-top: 10px; font-size: 0.9em;">
          <div>${coverage.coveredRules} of ${coverage.totalRules} rules</div>
          <div style="color: ${coverage.coveredRules < coverage.totalRules ? '#d73a49' : '#22863a'}">${coverage.totalRules - coverage.coveredRules} rules need tests</div>
        </div>
      </div>
    </div>`;

    html += `<h2>2. Requirement Traceability Matrix</h2>
    <p style="color: #586069; margin-bottom: 20px;">Mapping of Business Rules to Verification Tests.</p>
    <table><tr><th>Business Rule</th><th>Verified By</th></tr>${matrix}</table>

    <h2>3. Detailed Audit Log</h2><div class="audit-log">`;
    files.forEach(file => file.tasks.forEach(task => html += this.renderTaskHtml(task, 0, includeTraces)));
    html += `</div></body></html>`;
    return html;
  }

  private sanitizeForId(str: string): string { return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

  private generateTraceabilityMatrix(files: File[]): string {
    const ruleMap = new Map<string, { desc: string, tests: Array<{name: string, fullName: string, status: string}> }>();
    const noRuleTests: Array<{name: string, fullName: string, status: string}> = [];

    files.forEach(file => {
      const traverse = (task: RunnerTask) => {
        const taskType = getTaskType(task);
        if (taskType === 'test') {
          const testName = getFullTestName(task);
          const simpleName = task.name.replace(/^Precondition: /, '');
          let metadata = tracer.getInvariantMetadata().get(testName) || tracer.getInvariantMetadata().get(task.name);
          if (!metadata) {
             for (const [invName, meta] of tracer.getInvariantMetadata()) {
                if (testName.includes(invName)) { metadata = meta; break; }
             }
          }
          const taskState = getTaskState(task);
          const status = taskState === 'passed' ? '✅' : '❌';
          if (metadata && metadata.ruleReference) {
            if (!ruleMap.has(metadata.ruleReference)) ruleMap.set(metadata.ruleReference, { desc: metadata.rule, tests: [] });
            ruleMap.get(metadata.ruleReference)!.tests.push({ name: simpleName, fullName: testName, status });
          } else {
            noRuleTests.push({ name: simpleName, fullName: testName, status });
          }
        } else if (taskType === 'suite') {
          const suite = task as RunnerTestSuite;
          suite.tasks?.forEach(traverse);
        }
      };
      file.tasks.forEach(traverse);
    });

    const sortedRules = Array.from(ruleMap.keys()).sort();
    let html = '';
    for (const rule of sortedRules) {
      const data = ruleMap.get(rule)!;
      html += `<tr><td class="matrix-rule"><div>${rule}</div><div class="matrix-desc">${data.desc}</div></td><td><ul class="matrix-tests">${data.tests.map(t => `<li><a href="#${this.sanitizeForId(t.fullName)}" class="test-link">${t.name}</a> <span>${t.status}</span></li>`).join('')}</ul></td></tr>`;
    }
    return html;
  }

  private getSuiteStats(suite: RunnerTestSuite): { passed: number; failed: number } {
    let passed = 0, failed = 0;
    suite.tasks?.forEach(task => {
      const taskType = getTaskType(task);
      const taskState = getTaskState(task);
      if (taskType === 'test') {
        if (taskState === 'passed') passed++; else failed++;
      } else if (taskType === 'suite') {
        const nested = this.getSuiteStats(task as RunnerTestSuite);
        passed += nested.passed;
        failed += nested.failed;
      }
    });
    return { passed, failed };
  }

  private renderTaskMd(task: RunnerTask, level: number): string {
    const taskType = getTaskType(task);
    const indent = '#'.repeat(level);
    if (taskType === 'suite') {
      let output = `\n${indent} ${task.name}\n\n`;
      const suite = task as RunnerTestSuite;
      if (suite.tasks?.some(t => getTaskType(t) === 'test')) output += `| Scenario | Result |\n| :--- | :--- |\n`;
      suite.tasks?.forEach(subTask => output += this.renderTaskMd(subTask, level + 1));
      return output;
    } else if (taskType === 'test') {
      const taskState = getTaskState(task);
      return `| ${task.name} | ${taskState === 'passed' ? '✅ PASS' : '❌ FAIL'} |\n`;
    }
    return '';
  }

  private renderTaskHtml(task: RunnerTask, level: number, includeTraces: boolean): string {
    const taskType = getTaskType(task);
    let output = '';
    if (taskType === 'suite') {
      if (level === 0) output += `<div class="suite-section"><h3 class="suite-header">${task.name}</h3>`;
      else if (task.name) output += `<div style="padding: 10px 0; font-weight: 600; color: #666;">${task.name}</div>`;

      const suite = task as RunnerTestSuite;
      if (suite.tasks?.some(t => getTaskType(t) === 'test')) {
         output += `<table><tr><th style="width: 70%">Scenario</th><th style="width: 15%">Status</th>${includeTraces ? '<th style="width: 15%">Duration</th>' : ''}</tr>`;
         suite.tasks?.forEach(subTask => {
             const subTaskType = getTaskType(subTask);
             if (subTaskType === 'test') {
                 const testName = getFullTestName(subTask);
                 const displayName = subTask.name.replace(/^Precondition: /, '');
                 const testId = this.sanitizeForId(testName);
                 let metadata = tracer.getInvariantMetadata().get(testName) || tracer.getInvariantMetadata().get(subTask.name);
                 if (!metadata) { for (const [invName, meta] of tracer.getInvariantMetadata()) { if (testName.includes(invName)) { metadata = meta; break; } } }
                 const subTaskState = getTaskState(subTask);
                 const statusClass = subTaskState === 'passed' ? 'status-pass' : 'status-fail';

                 let tagsHtml = '';
                 if (metadata && metadata.tags) tagsHtml = metadata.tags.map(t => `<span class="tag ${t.includes('critical') ? 'tag-critical' : ''}">${t}</span>`).join('');

                 let detailsContent = '';
                 if (metadata) detailsContent += `<div class="business-rule-box"><div style="font-weight: 600; color: #24292e;">${metadata.ruleReference}</div><div style="color: #586069;">${metadata.rule}</div></div>`;

                 if (includeTraces) {
                    let interactions = tracer.get(testName);
                    if (interactions.length === 0 && metadata?.name) interactions = tracer.get(metadata.name);
                    interactions.forEach((interaction, idx) => {
                        detailsContent += `<div style="margin-top: 15px; border-top: 1px solid #eee; padding-top: 10px;"><div style="font-size: 0.8em; color: #999; margin-bottom: 5px;">Trace #${idx + 1}</div><div class="io-block"><div class="io-section"><div class="io-label">Input</div><pre>${this.escapeHtml(JSON.stringify(interaction.input, null, 2))}</pre></div><div class="io-section"><div class="io-label">Output</div><pre>${this.escapeHtml(JSON.stringify(interaction.output, null, 2))}</pre></div></div></div>`;
                    });
                 }

                 const detailsHtml = detailsContent ? `<details><summary>View Details</summary><div class="test-details">${detailsContent}</div></details>` : '';
                 const stateLabel = subTaskState === 'passed' ? '✅ PASS' : '❌ FAIL';
                 const duration = getTaskDuration(subTask) || '-';
                 output += `<tr id="${testId}"><td><div style="display: flex; align-items: center; justify-content: space-between;"><strong>${this.escapeHtml(displayName)}</strong><div>${tagsHtml}</div></div>${detailsHtml}</td><td class="${statusClass}">${stateLabel}</td>${includeTraces ? `<td>${duration}ms</td>` : ''}</tr>`;
             }
         });
         output += `</table>`;
      }
      suite.tasks?.forEach(subTask => {
        const subTaskType = getTaskType(subTask);
        if (subTaskType === 'suite') output += this.renderTaskHtml(subTask, level + 1, includeTraces);
      });
      if (level === 0) output += `</div>`;
    }
    return output;
  }

  private escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
  }
}

function getFullTestName(task: RunnerTask): string {
  let name = task.name;
  const parent = getTaskParent(task);
  if (parent && parent !== task) {
    const parentType = getTaskType(parent);
    if (parentType !== 'module' && parentType !== 'file') {
      name = `${getFullTestName(parent)} > ${name}`;
    }
  }
  return name;
}
