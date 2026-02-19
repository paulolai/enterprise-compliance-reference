import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const ROOT_DIR = path.resolve(__dirname, '../../../');
const REPORT_DIR = path.join(ROOT_DIR, 'reports');

// Allow overriding input/output via env vars for the "Clean Room" runner
const ENV_RESULTS_DIR = process.env.ALLURE_RESULTS_DIR;
const ENV_REPORT_DIR = process.env.REPORT_OUTPUT_DIR;

const ALLURE_DIRS = ENV_RESULTS_DIR
  ? [path.join(ENV_RESULTS_DIR, 'api'), path.join(ENV_RESULTS_DIR, 'gui')]
  : [
      path.join(ROOT_DIR, 'allure-results/api'),
      path.join(ROOT_DIR, 'allure-results/gui')
    ];

function main() {
  console.log('[Attestation] Generating report from Allure results...');
  if (ENV_RESULTS_DIR) console.log(`[Attestation] Reading results from: ${ENV_RESULTS_DIR}`);

  // 1. Load Allure Data
  const tasks = loadAllureData();
  console.log(`[Attestation] Loaded ${tasks.length} test results.`);
  
  if (tasks.length === 0) {
    console.warn('[Attestation] ⚠️ No test results found. Generating empty report with warning.');
  }

  // 2. Prepare Output Directory
  let outDir;
  if (ENV_REPORT_DIR) {
    outDir = ENV_REPORT_DIR;
  } else {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    outDir = path.join(REPORT_DIR, timestamp);
  }
  
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // 3. Get Git Info
  const gitInfo = getGitInfo();

  // 4. Generate Reports
  const duration = calculateDuration(tasks);
  const htmlFull = generateHtml(tasks, gitInfo, duration, true);
  const htmlLight = generateHtml(tasks, gitInfo, duration, false);
  const markdown = generateMarkdown(tasks, gitInfo, duration);

  // 5. Write Files
  fs.writeFileSync(path.join(outDir, 'attestation-full.html'), htmlFull);
  fs.writeFileSync(path.join(outDir, 'attestation-light.html'), htmlLight);
  fs.writeFileSync(path.join(outDir, 'attestation.md'), markdown);

  console.log(`[Attestation] Reports generated in: ${outDir}`);
}

function loadAllureData() {
  const allTasks = [];

  ALLURE_DIRS.forEach(dir => {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir).filter(f => f.endsWith('-result.json'));

    files.forEach(file => {
      try {
        const content = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'));

        // Extract metadata from labels
        const labels = content.labels || [];
        const getLabel = (name) => labels.find(l => l.name === name)?.value;

        // Technical Hierarchy
        const parentSuite = getLabel('parentSuite') || 'Uncategorized';
        const suite = getLabel('suite') || 'General';
        const subSuite = getLabel('subSuite') || '';

        // Business Hierarchy
        const epic = getLabel('epic') || 'General Logic';
        const feature = getLabel('feature') || suite; // Fallback to Suite
        const story = getLabel('story') || getLabel('subSuite') || 'Other';

        const tags = labels.filter(l => l.name === 'tag').map(l => l.value);

        // Extract Rule Info
        const description = content.description || '';
        const ruleMatch = description.match(/\*\*Business Rule:\*\* (.*?)\n/);
        const refMatch = description.match(/\*\*Reference:\*\* (.*?)$/m) || description.match(/\*\*Reference:\*\* (.*)/);

        const rule = ruleMatch ? ruleMatch[1].trim() : (content.name || 'See details');
        const ruleReference = refMatch ? refMatch[1].trim() : (story || 'Unknown Reference');

        // Extract Traces
        const traces = [];
        const processAttachments = (attachments) => {
          if (!attachments) return;
          attachments.forEach(att => {
            if (att.type === 'application/json' || att.name.includes('Trace')) {
              try {
                const attPath = path.join(dir, att.source);
                if (fs.existsSync(attPath)) {
                  const attContent = fs.readFileSync(attPath, 'utf-8');
                  traces.push(JSON.parse(attContent));
                }
              } catch (e) { /* ignore */ }
            } else if (att.type.startsWith('image/')) {
               traces.push({ type: 'image', name: att.name, source: path.join(dir, att.source) });
            }
          });
        };

        const processSteps = (steps) => {
          if (!steps) return;
          steps.forEach(step => {
            processAttachments(step.attachments);
            processSteps(step.steps);
          });
        };

        processAttachments(content.attachments);
        processSteps(content.steps);

      const safeId = content.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();

      allTasks.push({
        id: safeId,
        name: content.name,
        status: content.status === 'passed' ? 'pass' : 'fail',
        duration: content.stop - content.start,
        metadata: {
          rule,
          ruleReference,
          tags,
          // Hierarchies
          technical: { parentSuite, suite, subSuite },
          business: { epic, feature, story }
        },
        traces
      });

      } catch (e) {
        console.error(`Error parsing ${file}:`, e.message);
      }
    });
  });

  return allTasks;
}

function getGitInfo() {
  try {
    const hash = execSync('git rev-parse --short HEAD').toString().trim();
    const dirtyFiles = execSync('git status --porcelain').toString().trim();
    return { hash, dirtyFiles };
  } catch (e) {
    return { hash: 'Unknown', dirtyFiles: '' };
  }
}

function calculateDuration(tasks) {
  const total = tasks.reduce((sum, t) => sum + (t.duration || 0), 0);
  return (total / 1000).toFixed(2);
}

function buildTechnicalTree(tasks) {
  // Technical Tree: ParentSuite (Layer) -> Suite (Domain) -> Tests
  const tree = {};
  tasks.forEach(task => {
    const layer = task.metadata.technical.parentSuite;
    const domain = task.metadata.technical.suite;
    if (!tree[layer]) tree[layer] = {};
    if (!tree[layer][domain]) tree[layer][domain] = [];
    tree[layer][domain].push(task);
  });
  return tree;
}

function buildBusinessTree(tasks) {
  // Business Tree: Epic (Business Goal) -> Feature (Domain) -> Tests
  const tree = {};
  tasks.forEach(task => {
    const goal = task.metadata.business.epic;
    const feature = task.metadata.business.feature;
    if (!tree[goal]) tree[goal] = {};
    if (!tree[goal][feature]) tree[goal][feature] = [];
    tree[goal][feature].push(task);
  });
  return tree;
}

function calculateSummaryStats(tasks) {
  const total = tasks.length;
  const passed = tasks.filter(t => t.status === 'pass').length;
  const failed = tasks.filter(t => t.status === 'fail').length;
  const duration = tasks.reduce((sum, t) => sum + (t.duration || 0), 0);
  return { total, passed, failed, duration: (duration / 1000).toFixed(2) };
}

function generateHtml(tasks, gitInfo, duration, includeTraces) {
  // Build Hierarchies using shared helpers
  const technicalTree = buildTechnicalTree(tasks);
  const businessTree = buildBusinessTree(tasks);
  const summaryStats = calculateSummaryStats(tasks);

  const matrix = generateTraceabilityMatrix(tasks);
  const tagStats = calculateTagStats(tasks);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Attestation Report</title>
<style>
  :root { --primary: #0366d6; --bg: #fff; --text: #24292e; --border: #e1e4e8; --pass: #22863a; --fail: #cb2431; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; max-width: 1280px; margin: 0 auto; padding: 20px; color: var(--text); background-color: var(--bg); }
  h1 { border-bottom: 2px solid #eaeaea; padding-bottom: 10px; margin-bottom: 20px; }

  /* Tabs */
  .tabs { display: flex; border-bottom: 1px solid var(--border); margin-bottom: 20px; }
  .tab-btn { padding: 10px 20px; cursor: pointer; border: 1px solid transparent; border-bottom: none; background: none; font-weight: 500; color: #586069; }
  .tab-btn.active { border-color: var(--border); border-radius: 6px 6px 0 0; background: #fff; color: var(--primary); border-bottom: 1px solid #fff; margin-bottom: -1px; }
  .tab-content { display: none; }
  .tab-content.active { display: block; }

  /* Metadata */
  .metadata { background: #f6f8fa; padding: 15px; border-radius: 6px; margin-bottom: 20px; border: 1px solid var(--border); display: flex; gap: 30px; }
  .metadata-item { display: flex; flex-direction: column; }
  .metadata-label { font-size: 0.8em; color: #586069; font-weight: 600; text-transform: uppercase; }
  .metadata-value { font-size: 1.1em; font-weight: 500; }

  /* Tables */
  table { border-collapse: collapse; width: 100%; margin-bottom: 20px; border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
  th, td { text-align: left; padding: 12px 15px; border-bottom: 1px solid #eaeaea; vertical-align: top; }
  th { background-color: #f6f8fa; font-weight: 600; }

  /* Sections */
  .section-header { margin-top: 30px; margin-bottom: 15px; padding-bottom: 5px; border-bottom: 2px solid var(--primary); color: var(--primary); font-size: 1.4em; }
  .group-header { background: #f1f8ff; padding: 10px 15px; border: 1px solid var(--border); font-weight: 600; margin-top: 20px; border-radius: 6px 6px 0 0; border-bottom: none; display: flex; justify-content: space-between; }
  .test-table { margin-top: 0; border-radius: 0 0 6px 6px; border-top: 1px solid var(--border); }

  /* Status & Tags */
  .status-pass { color: var(--pass); font-weight: bold; }
  .status-fail { color: var(--fail); font-weight: bold; }
  .tag { display: inline-block; background: #e1f5ff; color: var(--primary); padding: 2px 8px; border-radius: 12px; font-size: 0.85em; margin-right: 4px; border: 1px solid #b4d9fa; }
  .tag-critical { background: #ffeef0; color: var(--fail); border-color: #f9c0c7; }

  /* Details */
  details { margin-top: 5px; }
  summary { cursor: pointer; color: var(--primary); font-size: 0.9em; outline: none; }
  .test-details { padding: 15px; background: #f8f9fa; border: 1px solid var(--border); border-radius: 4px; margin-top: 5px; }
  .io-block { display: flex; gap: 20px; margin-top: 10px; }
  .io-section { flex: 1; min-width: 0; }
  pre { background: #fff; padding: 10px; border: 1px solid var(--border); border-radius: 4px; overflow-x: auto; font-size: 0.85em; }
</style>
<script>
function openTab(evt, tabName) {
  var i, content, links;
  content = document.getElementsByClassName("tab-content");
  for (i = 0; i < content.length; i++) { content[i].className = content[i].className.replace(" active", ""); }
  links = document.getElementsByClassName("tab-btn");
  for (i = 0; i < links.length; i++) { links[i].className = links[i].className.replace(" active", ""); }
  document.getElementById(tabName).className += " active";
  evt.currentTarget.className += " active";
}
</script>
</head>
<body>
  <h1>Attestation Report</h1>

  <div class="metadata">
    <div class="metadata-item"><span class="metadata-label">Generated</span><span class="metadata-value">${new Date().toLocaleString()}</span></div>
    <div class="metadata-item"><span class="metadata-label">Git Commit</span><span class="metadata-value"><code>${gitInfo.hash}</code></span></div>
    <div class="metadata-item"><span class="metadata-label">Tests</span><span class="metadata-value">${tasks.length}</span></div>
    ${gitInfo.dirtyFiles ? `<div class="metadata-item"><span class="metadata-label" style="color:red">⚠️ Warning</span><span class="metadata-value" style="color:red">Uncommitted Changes</span></div>` : ''}
  </div>

  <div class="tabs">
    <button class="tab-btn active" onclick="openTab(event, 'view-technical')">Technical View (Architecture)</button>
    <button class="tab-btn" onclick="openTab(event, 'view-business')">Business View (Goals)</button>
    <button class="tab-btn" onclick="openTab(event, 'view-matrix')">Traceability Matrix</button>
  </div>

  <!-- VIEW 1: TECHNICAL -->
  <div id="view-technical" class="tab-content active">
    ${renderTree(technicalTree, includeTraces, 'Layer', 'Domain')}
  </div>

  <!-- VIEW 2: BUSINESS -->
  <div id="view-business" class="tab-content">
    ${renderTree(businessTree, includeTraces, 'Business Goal', 'Feature')}
  </div>

  <!-- VIEW 3: MATRIX -->
  <div id="view-matrix" class="tab-content">
    <table>
      <tr><th>Business Rule (Story)</th><th>Verified By</th></tr>
      ${matrix}
    </table>
    <h3>Tag Statistics</h3>
    <table>
      <tr><th>Tag</th><th>Total</th><th>Pass</th><th>Fail</th><th>Pass %</th></tr>
      ${tagStats}
    </table>
  </div>

</body></html>`;
}

function renderTree(tree, includeTraces, groupLabel, subGroupLabel) {
  if (Object.keys(tree).length === 0) return '<p>No data available.</p>';

  return Object.keys(tree).sort().map(group => {
    const subGroups = tree[group];
    const groupHtml = Object.keys(subGroups).sort().map(subGroup => {
      const tasks = subGroups[subGroup];
      const passCount = tasks.filter(t => t.status === 'pass').length;
      const failCount = tasks.filter(t => t.status === 'fail').length;

      let html = `<div class="group-header">
        <span>${group} <span style="color:#999">/</span> ${subGroup}</span>
        <span>
          <span style="color:${passCount > 0 ? '#22863a' : '#ccc'}">✔ ${passCount}</span>
          <span style="color:${failCount > 0 ? '#cb2431' : '#ccc'}; margin-left:10px">✖ ${failCount}</span>
        </span>
      </div>`;

      html += `<table class="test-table">
        ${tasks.map(task => renderTaskRow(task, includeTraces)).join('')}
      </table>`;
      return html;
    }).join('');

    return `<div style="margin-bottom: 30px">${groupHtml}</div>`;
  }).join('');
}

function renderTaskRow(task, includeTraces) {
  const statusClass = task.status === 'pass' ? 'status-pass' : 'status-fail';
  const icon = task.status === 'pass' ? '✅' : '❌';
  const tagsHtml = (task.metadata.tags || []).map(t => {
    const isCrit = t.includes('critical');
    return `<span class="tag ${isCrit ? 'tag-critical' : ''}">${t}</span>`;
  }).join('');

  // Traceability Link
  const ruleRef = task.metadata.ruleReference;
  const fileRef = ruleRef.split(' ')[0]; // Take first part "pricing-strategy.md"
  const link = fileRef.endsWith('.md')
    ? `<a href="https://github.com/paulolai/executable-specs-demo/blob/main/docs/${fileRef}" target="_blank" style="font-size:0.85em; color:#0366d6; margin-left:10px;">📄 ${ruleRef}</a>`
    : `<span style="font-size:0.85em; color:#666; margin-left:10px;">${ruleRef}</span>`;

  let details = '';
  if (includeTraces && task.traces.length > 0) {
    task.traces.forEach((trace, idx) => {
      if (trace.type === 'image') {
          details += `<div>[Image Attachment: ${trace.name}]</div>`;
      } else {
         details += `<div style="margin-top: 15px; border-top: 1px solid #eee; padding-top: 10px;">
          <div style="font-size: 0.8em; color: #999;">Trace #${idx + 1}</div>
          <div class="io-block">
            <div class="io-section"><div class="io-label">Input</div><pre>${JSON.stringify(trace.input || trace.items || '?', null, 2)}</pre></div>
            <div class="io-section"><div class="io-label">Output</div><pre>${JSON.stringify(trace.output || trace.result || '?', null, 2)}</pre></div>
          </div></div>`;
      }
    });
  }

  const detailsHtml = details ? `<details><summary>View Execution Trace</summary><div class="test-details">${details}</div></details>` : '';

  return `<tr>
    <td style="width: 70%">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <span style="font-weight:500">${task.name}</span>
        <div>${tagsHtml}</div>
      </div>
      <div style="margin-top:4px; font-size:0.9em; color:#586069;">
        ${task.metadata.rule} ${link}
      </div>
      ${detailsHtml}
    </td>
    <td style="width: 15%" class="${statusClass}">${icon} ${task.status.toUpperCase()}</td>
  </tr>`;
}

function calculateTagStats(tasks) {
  const tagStats = {};
  tasks.forEach(task => {
    (task.metadata.tags || []).forEach(tag => {
      if (!tagStats[tag]) tagStats[tag] = { total: 0, passed: 0, failed: 0 };
      tagStats[tag].total++;
      if (task.status === 'pass') tagStats[tag].passed++;
      else tagStats[tag].failed++;
    });
  });

  return Object.keys(tagStats).sort().map(tag => {
    const stats = tagStats[tag];
    const passRate = Math.round((stats.passed / stats.total) * 100);
    const barColor = passRate === 100 ? '#22863a' : (passRate >= 80 ? '#dbab09' : '#cb2431');
    return `<tr>
      <td><span class="tag">${tag}</span></td>
      <td>${stats.total}</td>
      <td style="color:#22863a">${stats.passed}</td>
      <td style="color:#cb2431">${stats.failed}</td>
      <td>
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="width:100px; height:6px; background:#eee; border-radius:3px; overflow:hidden;">
            <div style="width:${passRate}%; height:100%; background:${barColor};"></div>
          </div>
          <span style="font-size:0.85em; font-weight:bold; color:${barColor}">${passRate}%</span>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function generateTraceabilityMatrix(tasks) {
  const ruleMap = new Map();
  tasks.forEach(task => {
    const ref = task.metadata.ruleReference;
    if (ref && ref !== 'Unknown Reference') {
      if (!ruleMap.has(ref)) ruleMap.set(ref, []);
      ruleMap.get(ref).push(task);
    }
  });

  return Array.from(ruleMap.keys()).sort().map(ref => {
    const relevantTasks = ruleMap.get(ref);
    const testsHtml = relevantTasks.map(t =>
      `<li><span style="font-size:0.9em">${t.name}</span> <span style="font-size:0.8em">${t.status === 'pass' ? '✅' : '❌'}</span></li>`
    ).join('');
    return `<tr><td style="width:30%; font-weight:500">${ref}</td><td><ul style="list-style:none;padding:0;margin:0">${testsHtml}</ul></td></tr>`;
  }).join('');
}

function renderTreeMarkdown(tree, groupLabel, subGroupLabel) {
  if (Object.keys(tree).length === 0) return 'No data available.';

  return Object.keys(tree).sort().map(group => {
    const subGroups = tree[group];
    return Object.keys(subGroups).sort().map(subGroup => {
      const tasks = subGroups[subGroup];
      const passCount = tasks.filter(t => t.status === 'pass').length;
      const failCount = tasks.filter(t => t.status === 'fail').length;
      const total = tasks.length;

      // Sort: failed tests first, then alphabetically by name within each status
      const sortedTasks = [...tasks].sort((a, b) => {
        // Failed tests first
        if (a.status !== b.status) {
          return a.status === 'fail' ? -1 : 1;
        }
        // Then alphabetically by name
        return a.name.localeCompare(b.name);
      });

      let md = `<details>
<summary><b>${group} / ${subGroup}</b> (${passCount}/${total} passed)</summary>

| Test | Rule Reference | Status |
|------|----------------|--------|
`;

      sortedTasks.forEach(task => {
        const icon = task.status === 'pass' ? '✅' : '❌';
        const ruleRef = task.metadata.ruleReference;
        const tags = (task.metadata.tags || []).map(t => `\`${t}\``).join(' ');
        md += `| **${task.name}**<br>${tags || ''} | ${ruleRef} | ${icon} ${task.status.toUpperCase()} |\n`;
      });

      md += `</details>`;
      return md + '\n';
    }).join('');
  }).join('');
}

function generateMarkdown(tasks, gitInfo, duration) {
  // Build data using shared helpers
  const summaryStats = calculateSummaryStats(tasks);
  const technicalTree = buildTechnicalTree(tasks);
  const businessTree = buildBusinessTree(tasks);
  const matrixData = buildTraceabilityMatrixData(tasks);
  const tagStatsData = buildTagStatsData(tasks);

  // Render sections
  const technicalView = renderTreeMarkdown(technicalTree, 'Layer', 'Domain');
  const businessView = renderTreeMarkdown(businessTree, 'Business Goal', 'Feature');
  const matrixSection = renderTraceabilityMatrixMarkdown(matrixData);
  const tagStatsSection = renderTagStatsMarkdown(tagStatsData);

  const hasResults = tasks.length > 0;
  
  return `# Attestation

Generated: ${new Date().toLocaleString()}
Git: \`${gitInfo.hash}\`
${gitInfo.dirtyFiles ? '\n⚠️ **Warning**: Uncommitted changes detected in working directory.' : ''}

${!hasResults ? '## ⚠️ Warning: No Test Results\n\nNo test results were found. This may indicate a test runner failure or misconfiguration.\n\n---\n\n' : ''}## Executive Summary

| Metric | Value |
|--------|-------|
| Total Tests | ${summaryStats.total} |
| Passed | ${summaryStats.passed} |
| Failed | ${summaryStats.failed} |
| Pass Rate | ${summaryStats.total > 0 ? Math.round((summaryStats.passed / summaryStats.total) * 100) : 0}% |
| Duration | ${summaryStats.duration}s |

---

## Technical View (Architecture)

${technicalView}

---

## Business View (Goals)

${businessView}

---

## Traceability Matrix

${matrixSection}

---

## Tag Statistics

| Tag | Total | Pass | Fail | Pass % |
|-----|-------|------|------|--------|
${tagStatsSection}
`;
}

// Shared data builders for markdown rendering (avoid duplicating HTML logic)
function buildTraceabilityMatrixData(tasks) {
  const ruleMap = new Map();
  tasks.forEach(task => {
    const ref = task.metadata.ruleReference;
    if (ref && ref !== 'Unknown Reference') {
      if (!ruleMap.has(ref)) ruleMap.set(ref, []);
      ruleMap.get(ref).push(task);
    }
  });
  return Array.from(ruleMap.keys()).sort().map(ref => ({
    ref,
    tasks: ruleMap.get(ref)
  }));
}

function buildTagStatsData(tasks) {
  const tagStats = {};
  tasks.forEach(task => {
    (task.metadata.tags || []).forEach(tag => {
      if (!tagStats[tag]) tagStats[tag] = { total: 0, passed: 0, failed: 0 };
      tagStats[tag].total++;
      if (task.status === 'pass') tagStats[tag].passed++;
      else tagStats[tag].failed++;
    });
  });
  return tagStats;
}

function renderTraceabilityMatrixMarkdown(matrixData) {
  // Use collapsible details for each business rule reference
  return matrixData.map(entry => {
    const passCount = entry.tasks.filter(t => t.status === 'pass').length;
    const total = entry.tasks.length;

    // Sort: failed tests first, then alphabetically by name within each status
    const sortedTasks = [...entry.tasks].sort((a, b) => {
      // Failed tests first
      if (a.status !== b.status) {
        return a.status === 'fail' ? -1 : 1;
      }
      // Then alphabetically by name
      return a.name.localeCompare(b.name);
    });

    // Build table of tests for this rule
    const rows = sortedTasks.map(task => {
      const icon = task.status === 'pass' ? '✅' : '❌';
      return `| ${task.name} | ${icon} |`;
    }).join('\n');

    return `<details>
<summary><b>${entry.ref}</b> (${passCount}/${total} passed)</summary>

| Test | Status |
|------|--------|
${rows}
</details>`;
  }).join('\n\n');
}

function renderTagStatsMarkdown(tagStatsData) {
  return Object.keys(tagStatsData).sort().map(tag => {
    const stats = tagStatsData[tag];
    const passRate = Math.round((stats.passed / stats.total) * 100);
    return `| \`${tag}\` | ${stats.total} | ${stats.passed} | ${stats.failed} | ${passRate}% |`;
  }).join('\n');
}

main();
