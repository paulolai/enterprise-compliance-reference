import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// 1. Setup Run Directory
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const runId = `run-${timestamp}`;
const reportBaseDir = path.join(ROOT_DIR, 'reports', runId);
const rawResultsDir = path.join(reportBaseDir, 'raw-results');
const reportOutputDir = path.join(reportBaseDir, 'attestation');

console.log(`[Test Runner] Starting Run: ${runId}`);
console.log(`[Test Runner] Results: ${rawResultsDir}`);

fs.mkdirSync(rawResultsDir, { recursive: true });
// Subdirectories created by runners, but good to have base

// 2. Set Env Vars
const env = { 
  ...process.env, 
  ALLURE_RESULTS_DIR: rawResultsDir,
  REPORT_OUTPUT_DIR: reportOutputDir
};

try {
  // 3. Run Unit Tests (Vitest)
  console.log('\n[Test Runner] 🧪 Running Unit Tests (Vitest)...');
  // Use 'test:allure' because it uses the config that respects our env var and has the reporter
  execSync('pnpm run test:allure', { 
    cwd: path.join(ROOT_DIR, 'packages/domain'), 
    stdio: 'inherit', 
    env 
  });

  // 4. Run E2E Tests (Playwright)
  console.log('\n[Test Runner] 🎭 Running E2E Tests (Playwright)...');
  execSync('pnpm test', { 
    cwd: path.join(ROOT_DIR, 'test'), 
    stdio: 'inherit', 
    env 
  });

} catch (error) {
  console.error('\n[Test Runner] ⚠️ Tests failed (continuing to report generation)');
  // We continue to generate report even if tests fail
}

// 5. Generate Attestation Report
console.log('\n[Test Runner] 📝 Generating Attestation Report...');
try {
  execSync('node packages/domain/scripts/generate-attestation.js', { 
    cwd: ROOT_DIR, 
    stdio: 'inherit', 
    env 
  });
  console.log(`\n[Test Runner] ✅ Run Complete.`);
  console.log(`[Test Runner] Report: ${path.join(reportOutputDir, 'attestation-full.html')}`);
} catch (e) {
  console.error('[Test Runner] ❌ Report generation failed:', e);
  process.exit(1);
}
