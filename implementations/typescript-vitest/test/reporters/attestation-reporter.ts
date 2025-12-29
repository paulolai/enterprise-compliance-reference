import { Reporter, File, Suite, Task } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { tracer } from '../modules/tracer';

export default class AttestationReporter implements Reporter {
  private startTime: number = 0;

  onInit() {
    this.startTime = Date.now();
    // Don't clear - we want to preserve the run ID for workers
    // Only clear if starting fresh (no current run file)
    const currentRunFile = '/tmp/vitest-current-run-id.txt';
    if (!fs.existsSync(currentRunFile)) {
      tracer.clear();
    }
  }

  onFinished(files: File[]) {
    const endTime = Date.now();
    const duration = ((endTime - this.startTime) / 1000).toFixed(2);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    console.log(`[Attestation] Run directory: ${tracer.getRunDir()}`);

    // Load metadata from shared file (all workers wrote to this)
    tracer.loadMetadata();

    console.log(`[Attestation] Loaded ${tracer.getInvariantMetadata().size} invariants from metadata`);

    // Clean up run ID file so next run starts fresh
    const currentRunFile = '/tmp/vitest-current-run-id.txt';
    if (fs.existsSync(currentRunFile)) {
      fs.unlinkSync(currentRunFile);
    }

    // Create timestamped directory
    const reportsRoot = path.resolve(process.cwd(), '../../reports');
    const reportDir = path.join(reportsRoot, timestamp);
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    // Git Metadata
    const gitInfo = this.getGitInfo();

    // Generate Content
    const markdown = this.generateMarkdown(files, gitInfo, duration);
    const htmlLight = this.generateHtml(files, gitInfo, duration, false);
    const htmlFull = this.generateHtml(files, gitInfo, duration, true);

    // Write Files
    fs.writeFileSync(path.join(reportDir, 'attestation.md'), markdown);
    fs.writeFileSync(path.join(reportDir, 'attestation-light.html'), htmlLight);
    fs.writeFileSync(path.join(reportDir, 'attestation-full.html'), htmlFull);

    console.log(`
[Attestation] Reports generated in: ${reportDir}`);
    console.log(`  - Light: attestation-light.html`);
    console.log(`  - Full:  attestation-full.html`);
  }

  private getGitInfo() {
    try {
      const hash = execSync('git rev-parse --short HEAD').toString().trim();
      const dirtyFiles = execSync('git status --porcelain').toString().trim();
      return { hash, dirtyFiles };
    } catch (e) {
      return { hash: 'Unknown (Not a git repo?)', dirtyFiles: '' };
    }
  }

  private generateMarkdown(files: File[], gitInfo: { hash: string, dirtyFiles: string }, duration: string): string {
    let md = `# Pricing Engine: Quality Assurance Attestation\n\n`;
    md += `**Generated:** ${new Date().toLocaleString()}\n`;
    md += `**Git Hash:** 
${gitInfo.hash}

`;
    if (gitInfo.dirtyFiles) {
      md += `
**⚠️ Uncommitted Changes:**

${gitInfo.dirtyFiles}

`;
    }
    md += `
## 1. Executive Summary

`;
    md += `| Area | Passed | Failed | Status |\n`;
    md += `| :--- | :--- | :--- | :--- |\n`;

    let totalPass = 0;
    let totalFail = 0;

    files.forEach(file => {
      file.tasks.forEach(task => {
        if (task.type === 'suite') {
          const stats = this.getSuiteStats(task);
          totalPass += stats.passed;
          totalFail += stats.failed;
          const status = stats.failed === 0 ? '✅ PASS' : '❌ FAIL';
          md += `| ${task.name} | ${stats.passed} | ${stats.failed} | ${status} |\n`;
        }
      });
    });

    md += `
**Total Scenarios:** ${totalPass + totalFail} | **Pass Rate:** ${((totalPass / (totalPass + totalFail)) * 100).toFixed(1)}%\n`;
    md += `
## 2. Detailed Audit Log

`;

    files.forEach(file => {
      file.tasks.forEach(task => {
        md += this.renderTaskMd(task, 3);
      });
    });

    return md;
  }

  private generateHtml(files: File[], gitInfo: { hash: string, dirtyFiles: string }, duration: string, includeTraces: boolean): string {
    const matrix = this.generateTraceabilityMatrix(files);
    
    let html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>QA Attestation Report</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; color: #333; background-color: #fff; }
  h1 { border-bottom: 2px solid #eaeaea; padding-bottom: 10px; margin-bottom: 30px; }
  h2 { margin-top: 40px; margin-bottom: 20px; color: #24292e; border-bottom: 1px solid #eaeaea; padding-bottom: 5px; }
  h3 { margin-top: 25px; margin-bottom: 15px; color: #24292e; font-size: 1.1em; }
  
  /* Metadata Box */
  .metadata { background: #f6f8fa; padding: 20px; border-radius: 6px; margin-bottom: 30px; border: 1px solid #e1e4e8; display: flex; flex-wrap: wrap; gap: 20px; align-items: center; }
  .metadata-item { display: flex; flex-direction: column; }
  .metadata-label { font-size: 0.85em; color: #586069; font-weight: 600; margin-bottom: 4px; }
  .metadata-value { font-size: 1.1em; font-weight: 500; }
  .warning { width: 100%; color: #856404; background-color: #fff3cd; padding: 10px; border-radius: 4px; margin-top: 10px; border: 1px solid #ffeeba; }
  
  /* Tables */
  table { border-collapse: collapse; width: 100%; margin-bottom: 20px; border: 1px solid #e1e4e8; border-radius: 6px; overflow: hidden; }
  th, td { text-align: left; padding: 12px 15px; border-bottom: 1px solid #eaeaea; vertical-align: top; }
  th { background-color: #f6f8fa; font-weight: 600; color: #24292e; border-bottom: 2px solid #eaeaea; }
  tr:last-child td { border-bottom: none; }
  tr:hover { background-color: #fcfcfc; }
  
  /* Status Indicators */
  .status-pass { color: #22863a; font-weight: bold; display: flex; align-items: center; gap: 6px; }
  .status-fail { color: #cb2431; font-weight: bold; display: flex; align-items: center; gap: 6px; }
  
  /* Badges */
  .tag { display: inline-block; background: #e1f5ff; color: #0366d6; padding: 2px 8px; border-radius: 12px; font-size: 0.85em; margin-right: 4px; border: 1px solid #b4d9fa; }
  .tag-critical { background: #ffeef0; color: #cb2431; border-color: #f9c0c7; }
  
  /* Audit Log Styles */
  .suite-section { border: 1px solid #e1e4e8; border-radius: 6px; margin-bottom: 20px; padding: 0 20px 20px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
  .suite-header { background-color: #f6f8fa; padding: 12px 20px; margin: 0 -20px 20px -20px; border-bottom: 1px solid #e1e4e8; border-radius: 6px 6px 0 0; font-size: 1.1em; }
  
  /* Details & Traces */
  details { margin-top: 8px; }
  summary { cursor: pointer; color: #0366d6; font-size: 0.9em; outline: none; }
  summary:hover { text-decoration: underline; }
  .test-details { padding: 15px; background: #f8f9fa; border-radius: 4px; border: 1px solid #e1e4e8; margin-top: 10px; }
  .business-rule-box { background: #fff; padding: 10px; border-left: 3px solid #0366d6; margin-bottom: 10px; }
  .io-block { display: flex; gap: 20px; margin-top: 10px; }
  .io-section { flex: 1; min-width: 0; }
  .io-label { font-size: 0.8em; font-weight: 600; color: #586069; margin-bottom: 4px; text-transform: uppercase; }
  pre { background: #f6f8fa; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 0.85em; border: 1px solid #e1e4e8; margin: 0; }
  
  /* Traceability Matrix */
  .matrix-rule { font-weight: 600; color: #24292e; width: 30%; }
  .matrix-desc { color: #586069; font-size: 0.9em; margin-bottom: 4px; }
  .matrix-tests { list-style: none; padding: 0; margin: 0; }
  .matrix-tests li { margin-bottom: 4px; display: flex; align-items: center; justify-content: space-between; }
  .test-link { color: #0366d6; text-decoration: none; font-size: 0.9em; }
  .test-link:hover { text-decoration: underline; }
</style>
</head>
<body>
  <h1>Pricing Engine: QA Attestation</h1>
  
  <div class="metadata">
    <div class="metadata-item">
      <span class="metadata-label">Generated</span>
      <span class="metadata-value">${new Date().toLocaleString()}</span>
    </div>
    ${includeTraces ? `
    <div class="metadata-item">
      <span class="metadata-label">Duration</span>
      <span class="metadata-value">${duration}s</span>
    </div>` : ''}
    <div class="metadata-item">
      <span class="metadata-label">Git Hash</span>
      <span class="metadata-value"><code>${gitInfo.hash}</code></span>
    </div>
    ${gitInfo.dirtyFiles ? `<div class="warning"><strong>⚠️ Uncommitted Changes:</strong><pre>${gitInfo.dirtyFiles}</pre></div>` : ''}
  </div>

  <h2>1. Executive Summary</h2>
  <table>
    <tr><th>Test Suite</th><th>Passed</th><th>Failed</th><th>Status</th></tr>
`;

    files.forEach(file => {
      file.tasks.forEach(task => {
        if (task.type === 'suite') {
          const stats = this.getSuiteStats(task);
          const statusClass = stats.failed === 0 ? 'status-pass' : 'status-fail';
          const statusText = stats.failed === 0 ? '✅ PASS' : '❌ FAIL';
          html += `<tr><td>${task.name}</td><td>${stats.passed}</td><td>${stats.failed}</td><td class="${statusClass}">${statusText}</td></tr>`;
        }
      });
    });

    html += `</table>

    <h2>2. Requirement Traceability Matrix</h2>
    <p style="color: #586069; margin-bottom: 20px;">Mapping of Business Rules to Verification Tests.</p>
    <table>
      <tr><th>Business Rule</th><th>Verified By</th></tr>
      ${matrix}
    </table>

    <h2>3. Detailed Audit Log</h2>
    <div class="audit-log">
`;

    files.forEach(file => {
      file.tasks.forEach(task => {
        html += this.renderTaskHtml(task, 0, includeTraces);
      });
    });

    html += `</div></body></html>`;
    return html;
  }

  private sanitizeForId(str: string): string {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  private generateTraceabilityMatrix(files: File[]): string {
    const ruleMap = new Map<string, { desc: string, tests: Array<{name: string, fullName: string, status: string}> }>();
    const noRuleTests: Array<{name: string, fullName: string, status: string}> = [];

    files.forEach(file => {
      const traverse = (task: Task) => {
        if (task.type === 'test') {
          const testName = getFullTestName(task);
          const simpleName = task.name;
          // Try to find metadata
          let metadata = tracer.getInvariantMetadata().get(testName);
          if (!metadata) metadata = tracer.getInvariantMetadata().get(simpleName);
          // For property tests, they might be logged under their property name
          if (!metadata) {
             // Check if any registered invariant name matches the test name
             for (const [invName, meta] of tracer.getInvariantMetadata()) {
                if (testName.includes(invName) || simpleName.includes(invName)) {
                   metadata = meta;
                   break;
                }
             }
          }

          const status = task.result?.state === 'pass' ? '✅' : '❌';
          const displayName = simpleName.replace(/^Precondition: /, '');
          
          if (metadata && metadata.ruleReference) {
            if (!ruleMap.has(metadata.ruleReference)) {
              ruleMap.set(metadata.ruleReference, { desc: metadata.rule, tests: [] });
            }
            ruleMap.get(metadata.ruleReference)!.tests.push({ name: displayName, fullName: testName, status });
          } else {
            noRuleTests.push({ name: displayName, fullName: testName, status });
          }
        } else if (task.type === 'suite') {
          task.tasks.forEach(traverse);
        }
      };
      file.tasks.forEach(traverse);
    });

    // Sort rules
    const sortedRules = Array.from(ruleMap.keys()).sort();

    let html = '';
    for (const rule of sortedRules) {
      const data = ruleMap.get(rule)!;
      html += `<tr>
        <td class="matrix-rule">
          <div>${rule}</div>
          <div class="matrix-desc">${data.desc}</div>
        </td>
        <td>
          <ul class="matrix-tests">
            ${data.tests.map(t => `<li><a href="#${this.sanitizeForId(t.fullName)}" class="test-link">${t.name}</a> <span>${t.status}</span></li>`).join('')}
          </ul>
        </td>
      </tr>`;
    }

    // Add 'Other' category if needed
    if (noRuleTests.length > 0) {
       html += `<tr>
        <td class="matrix-rule">
          <div>Other / Documentation</div>
          <div class="matrix-desc">Tests without explicit rule mapping</div>
        </td>
        <td>
          <ul class="matrix-tests">
            ${noRuleTests.map(t => `<li><a href="#${this.sanitizeForId(t.fullName)}" class="test-link">${t.name}</a> <span>${t.status}</span></li>`).join('')}
          </ul>
        </td>
      </tr>`;
    }

    return html;
  }

  private getSuiteStats(suite: Suite): { passed: number; failed: number } {
    let passed = 0;
    let failed = 0;
    suite.tasks.forEach(task => {
      if (task.type === 'test') {
        if (task.result?.state === 'pass') passed++;
        else failed++;
      } else if (task.type === 'suite') {
        const nested = this.getSuiteStats(task);
        passed += nested.passed;
        failed += nested.failed;
      }
    });
    return { passed, failed };
  }

  private renderTaskMd(task: Task, level: number): string {
    const indent = '#'.repeat(level);
    let output = '';

    if (task.type === 'suite') {
      output += `
${indent} ${task.name}

`;
      const hasDirectTests = task.tasks.some(t => t.type === 'test');
      if (hasDirectTests) {
         output += `| Scenario | Result |\n`;
         output += `| :--- | :--- |\n`;
      }
      task.tasks.forEach(subTask => output += this.renderTaskMd(subTask, level + 1));
    } else if (task.type === 'test') {
      const status = task.result?.state === 'pass' ? '✅ PASS' : '❌ FAIL';
      output += `| ${task.name} | ${status} |\n`;
    }
    return output;
  }

  private renderTaskHtml(task: Task, level: number, includeTraces: boolean): string {
    let output = '';
    
    // Flatten hierarchy: Only render top-level suites as distinct sections
    if (task.type === 'suite') {
      const isTopLevel = level === 0;
      
      if (isTopLevel) {
        output += `<div class="suite-section"><h3 class="suite-header">${task.name}</h3>`;
      } else {
        // For nested suites, just add a sub-header row or indent
        if (task.name) {
           output += `<div style="padding: 10px 0; font-weight: 600; color: #666;">${task.name}</div>`;
        }
      }

      const hasDirectTests = task.tasks.some(t => t.type === 'test');
      if (hasDirectTests) {
         output += `<table><tr><th style="width: 70%">Scenario</th><th style="width: 15%">Status</th>${includeTraces ? '<th style="width: 15%">Duration</th>' : ''}</tr>`;
         
         task.tasks.forEach(subTask => {
             if (subTask.type === 'test') {
                 const testName = getFullTestName(subTask);
                 const displayName = subTask.name.replace(/^Precondition: /, '');
                 const testId = this.sanitizeForId(testName);
                 
                 let metadata = tracer.getInvariantMetadata().get(testName);
                 if (!metadata) metadata = tracer.getInvariantMetadata().get(subTask.name);
                 
                 // Fallback search
                 if (!metadata) {
                    for (const [invName, meta] of tracer.getInvariantMetadata()) {
                      if (testName.includes(invName)) {
                         metadata = meta;
                         break;
                      }
                    }
                 }

                 const statusText = subTask.result?.state === 'pass' ? 'PASS' : 'FAIL';
                 const statusClass = subTask.result?.state === 'pass' ? 'status-pass' : 'status-fail';
                 const icon = subTask.result?.state === 'pass' ? '✅' : '❌';

                 // Tags
                 let tagsHtml = '';
                 if (metadata && metadata.tags) {
                   tagsHtml = metadata.tags.map(t => {
                     const isCrit = t.includes('critical') || t.includes('safety');
                     return `<span class="tag ${isCrit ? 'tag-critical' : ''}">${t}</span>`;
                   }).join('');
                 }

                 // Details Content
                 let detailsContent = '';
                 
                 // Business Rule Info
                 if (metadata) {
                   detailsContent += `
                     <div class="business-rule-box">
                       <div style="font-weight: 600; color: #24292e;">${metadata.ruleReference}</div>
                       <div style="color: #586069;">${metadata.rule}</div>
                     </div>`;
                 }

                 // Traces
                 if (includeTraces) {
                    let interactions = tracer.get(getFullTestName(subTask));
                    if (interactions.length === 0 && metadata) interactions = tracer.get(metadata.name);
                    
                    if (interactions.length > 0) {
                      interactions.forEach((interaction, idx) => {
                        detailsContent += `
                          <div style="margin-top: 15px; border-top: 1px solid #eee; padding-top: 10px;">
                            <div style="font-size: 0.8em; color: #999; margin-bottom: 5px;">Trace #${idx + 1}</div>
                            <div class="io-block">
                              <div class="io-section">
                                <div class="io-label">Input</div>
                                <pre>${JSON.stringify(interaction.input, null, 2)}</pre>
                              </div>
                              <div class="io-section">
                                <div class="io-label">Output</div>
                                <pre>${JSON.stringify(interaction.output, null, 2)}</pre>
                              </div>
                            </div>
                          </div>`;
                      });
                    }
                 }

                 // Combine into details block
                 let detailsHtml = '';
                 if (detailsContent) {
                   detailsHtml = `<details><summary>View Details</summary><div class="test-details">${detailsContent}</div></details>`;
                 }

                 const durationCell = includeTraces ? `<td>${subTask.result?.duration ? `${subTask.result.duration}ms` : '-'}</td>` : '';
                 
                 output += `<tr id="${testId}">
                   <td>
                     <div style="display: flex; align-items: center; justify-content: space-between;">
                       <strong>${displayName}</strong>
                       <div>${tagsHtml}</div>
                     </div>
                     ${detailsHtml}
                   </td>
                   <td class="${statusClass}">${icon} ${statusText}</td>
                   ${durationCell}
                 </tr>`;
             }
         });
         output += `</table>`;
      }
      
      task.tasks.forEach(subTask => {
          if (subTask.type === 'suite') {
              output += this.renderTaskHtml(subTask, level + 1, includeTraces);
          }
      });
      
      if (isTopLevel) {
        output += `</div>`;
      }
    }
    return output;
  }
}

function getFullTestName(task: Task): string {
  let name = task.name;
  let parent = task.suite;
  while (parent && parent.name) {
    name = `${parent.name} > ${name}`;
    parent = parent.suite;
  }
  return name;
}
