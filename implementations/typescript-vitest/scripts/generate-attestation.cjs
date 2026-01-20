const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const ROOT_DIR = path.resolve(__dirname, '../../../');
const REPORT_DIR = path.join(ROOT_DIR, 'reports');
const ALLURE_DIRS = [
  path.join(ROOT_DIR, 'allure-results/api'),
  path.join(ROOT_DIR, 'allure-results/gui')
];

function main() {
  console.log('[Attestation] Generating report from Allure results...');
  
  // 1. Load Allure Data
  const tasks = loadAllureData();
  console.log(`[Attestation] Loaded ${tasks.length} test results.`);

  // 2. Prepare Output Directory
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = path.join(REPORT_DIR, timestamp);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // 3. Get Git Info
  const gitInfo = getGitInfo();

  // 4. Generate Reports
  const duration = calculateDuration(tasks);
  const htmlFull = generateHtml(tasks, gitInfo, duration, true);
  const htmlLight = generateHtml(tasks, gitInfo, duration, false);
  const markdown = generateMarkdown(tasks, gitInfo);

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
        
        // Extract metadata
        const labels = content.labels || [];
        const getLabel = (name) => labels.find(l => l.name === name)?.value;
        
        const suite = getLabel('feature') || getLabel('parentSuite') || 'General';
        const subSuite = getLabel('story') || getLabel('suite') || 'Other';
        const tags = labels.filter(l => l.name === 'tag').map(l => l.value);
        
        // Extract Rule Info from Description or Labels
        // In helper we set description like "**Business Rule:** ... 

        // **Reference:** ..."
        const description = content.description || '';
        const ruleMatch = description.match(/\*\*Business Rule:\*\* (.*?)\n/);
        const refMatch = description.match(/\*\*Reference:\*\* (.*?)$/m) || description.match(/\*\*Reference:\*\* (.*)/);
        
        const rule = ruleMatch ? ruleMatch[1].trim() : 'See details';
        const ruleReference = refMatch ? refMatch[1].trim() : (getLabel('story') || 'Unknown Reference');

        // Extract Traces from Attachments (recursively through steps)
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
              } catch (e) {
                // ignore
              }
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

        allTasks.push({
          name: content.name,
          suite,
          subSuite,
          status: content.status === 'passed' ? 'pass' : 'fail',
          duration: content.stop - content.start,
          metadata: {
            rule,
            ruleReference,
            tags
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

// --- HTML Generation (Simplified Port) ---

function generateHtml(tasks, gitInfo, duration, includeTraces) {
  // Group tasks by Suite -> SubSuite
  const suites = {};
  tasks.forEach(task => {
    if (!suites[task.suite]) suites[task.suite] = [];
    suites[task.suite].push(task);
  });

  const matrix = generateTraceabilityMatrix(tasks);

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
  .metadata { background: #f6f8fa; padding: 20px; border-radius: 6px; margin-bottom: 30px; border: 1px solid #e1e4e8; display: flex; flex-wrap: wrap; gap: 20px; align-items: center; }
  .metadata-item { display: flex; flex-direction: column; }
  .metadata-label { font-size: 0.85em; color: #586069; font-weight: 600; margin-bottom: 4px; }
  .metadata-value { font-size: 1.1em; font-weight: 500; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 20px; border: 1px solid #e1e4e8; border-radius: 6px; overflow: hidden; }
  th, td { text-align: left; padding: 12px 15px; border-bottom: 1px solid #eaeaea; vertical-align: top; }
  th { background-color: #f6f8fa; font-weight: 600; color: #24292e; border-bottom: 2px solid #eaeaea; }
  .status-pass { color: #22863a; font-weight: bold; }
  .status-fail { color: #cb2431; font-weight: bold; }
  .tag { display: inline-block; background: #e1f5ff; color: #0366d6; padding: 2px 8px; border-radius: 12px; font-size: 0.85em; margin-right: 4px; border: 1px solid #b4d9fa; }
  .tag-critical { background: #ffeef0; color: #cb2431; border-color: #f9c0c7; }
  .suite-section { border: 1px solid #e1e4e8; border-radius: 6px; margin-bottom: 20px; padding: 0 20px 20px 20px; }
  .suite-header { background-color: #f6f8fa; padding: 12px 20px; margin: 0 -20px 20px -20px; border-bottom: 1px solid #e1e4e8; }
  details { margin-top: 8px; }
  summary { cursor: pointer; color: #0366d6; font-size: 0.9em; outline: none; }
  .test-details { padding: 15px; background: #f8f9fa; border-radius: 4px; border: 1px solid #e1e4e8; margin-top: 10px; }
  .business-rule-box { background: #fff; padding: 10px; border-left: 3px solid #0366d6; margin-bottom: 10px; }
  .io-block { display: flex; gap: 20px; margin-top: 10px; }
  .io-section { flex: 1; min-width: 0; }
  pre { background: #f6f8fa; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 0.85em; border: 1px solid #e1e4e8; margin: 0; }
</style>
</head>
<body>
  <h1>Pricing Engine: QA Attestation</h1>
  
  <div class="metadata">
    <div class="metadata-item"><span class="metadata-label">Generated</span><span class="metadata-value">${new Date().toLocaleString()}</span></div>
    <div class="metadata-item"><span class="metadata-label">Git Hash</span><span class="metadata-value"><code>${gitInfo.hash}</code></span></div>
    ${gitInfo.dirtyFiles ? `<div style="color:red">⚠️ Uncommitted Changes</div>` : ''}
  </div>

  <h2>1. Executive Summary</h2>
  <table>
    <tr><th>Test Suite</th><th>Passed</th><th>Failed</th><th>Status</th></tr>
    ${Object.keys(suites).map(suiteName => {
      const suiteTasks = suites[suiteName];
      const passed = suiteTasks.filter(t => t.status === 'pass').length;
      const failed = suiteTasks.filter(t => t.status === 'fail').length;
      const statusClass = failed === 0 ? 'status-pass' : 'status-fail';
      const statusText = failed === 0 ? '✅ PASS' : '❌ FAIL';
      return `<tr><td>${suiteName}</td><td>${passed}</td><td>${failed}</td><td class="${statusClass}">${statusText}</td></tr>`;
    }).join('')}
  </table>

  <h2>2. Requirement Traceability Matrix</h2>
  <table>
    <tr><th>Business Rule</th><th>Verified By</th></tr>
    ${matrix}
  </table>

  <h2>3. Detailed Audit Log</h2>
  ${Object.keys(suites).map(suiteName => {
    const suiteTasks = suites[suiteName];
    let html = `<div class="suite-section"><h3 class="suite-header">${suiteName}</h3>`;
    html += `<table><tr><th style="width: 70%">Scenario</th><th style="width: 15%">Status</th>${includeTraces ? '<th>Duration</th>' : ''}</tr>`;
    
    suiteTasks.forEach(task => {
      const statusClass = task.status === 'pass' ? 'status-pass' : 'status-fail';
      const icon = task.status === 'pass' ? '✅' : '❌';
      const tagsHtml = task.metadata.tags.map(t => {
        const isCrit = t.includes('critical');
        return `<span class="tag ${isCrit ? 'tag-critical' : ''}">${t}</span>`;
      }).join('');
      
      let details = '';
      if (task.metadata.rule) {
        details += `<div class="business-rule-box"><strong>${task.metadata.ruleReference}</strong><br>${task.metadata.rule}</div>`;
      }
      
      if (includeTraces && task.traces.length > 0) {
        task.traces.forEach((trace, idx) => {
          if (trace.type === 'image') {
              // Copy image to relative path if needed, but for now assuming browser can reach it or we embed base64?
              // Browsers can't read local files usually. 
              // TODO: Copy images to report dir.
              // For simplicity, we'll just link it.
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

      const detailsHtml = details ? `<details><summary>View Details</summary><div class="test-details">${details}</div></details>` : '';

      html += `<tr>
        <td>
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <strong>${task.name}</strong>
            <div>${tagsHtml}</div>
          </div>
          ${detailsHtml}
        </td>
        <td class="${statusClass}">${icon} ${task.status.toUpperCase()}</td>
        ${includeTraces ? `<td>${task.duration}ms</td>` : ''}
      </tr>`;
    });
    html += `</table></div>`;
    return html;
  }).join('')}

</body></html>`;
  return html;
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
      `<li>${t.name} <span style="font-size:0.8em">${t.status === 'pass' ? '✅' : '❌'}</span></li>`
    ).join('');
    return `<tr><td class="matrix-rule">${ref}</td><td><ul class="matrix-tests" style="list-style:none;padding:0;margin:0">${testsHtml}</ul></td></tr>`;
  }).join('');
}

function generateMarkdown(tasks, gitInfo) {
  return `# QA Attestation

Generated: ${new Date().toLocaleString()}
Git: ${gitInfo.hash}

## Results

Total Tests: ${tasks.length}`;
}

main();
