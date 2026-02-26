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

// 2. Set Env Vars
const env = { 
  ...process.env, 
  ALLURE_RESULTS_DIR: rawResultsDir,
  REPORT_OUTPUT_DIR: reportOutputDir
};

const runSuite = (name: string, command: string, cwd: string) => {
  console.log(`\n[Test Runner] ${name}...`);
  try {
    execSync(command, { cwd, stdio: 'inherit', env });
    console.log(`[Test Runner] ✅ ${name} passed.`);
  } catch (error) {
    console.error(`\n[Test Runner] ⚠️ ${name} failed.`);
  }
};

// 3. Run Unit Tests (Vitest)
runSuite('🧪 Unit Tests (Domain)', 'pnpm run test:allure', path.join(ROOT_DIR, 'packages/domain'));

// 4. Run Client Component Tests (Vitest)
runSuite('⚛️ Client Component Tests', 'pnpm exec vitest run --config vitest.config.allure.ts', path.join(ROOT_DIR, 'packages/client'));

// 5. Run E2E & API Tests (Playwright)
runSuite('🎭 E2E & API Tests (Playwright)', 'pnpm test', path.join(ROOT_DIR, 'test'));

// 6. Generate Attestation Report
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
