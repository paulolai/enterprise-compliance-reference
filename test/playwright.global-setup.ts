/**
 * Global Setup for Playwright Tests
 *
 * This file runs before any Playwright tests start.
 * It runs TypeScript type checking to catch import/typing errors early,
 * which is much faster than discovering errors during Playwright execution (~1s vs ~6s).
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { setupPlaywrightOtel, shutdownPlaywrightOtel } from './e2e/fixtures/otel-playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default async function globalSetup() {
  console.log('🔍 Initializing OpenTelemetry for Playwright tests...');

  // Initialize OTel before any tests run
  setupPlaywrightOtel({ serviceName: 'executable-specs-e2e', mode: 'test' });
  console.log('✅ OpenTelemetry initialized');

  console.log('🔍 Running TypeScript type check before Playwright tests...');

  try {
    // Run TypeScript type check
    const typeCheckOutput = execSync('npx tsc --noEmit', {
      cwd: __dirname,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 30000, // 30 second timeout
    });

    if (typeCheckOutput.trim()) {
      console.log(typeCheckOutput);
    }

    console.log('✅ TypeScript type check passed');
  } catch (error) {
    console.error('❌ TypeScript type check failed:');
    const err = error as { stdout?: string; stderr?: string; message?: string };
    console.error(err.stdout || err.stderr || err.message);

    // Shutdown OTel before throwing
    await shutdownPlaywrightOtel();

    // Rethrow to prevent tests from running
    throw new Error(
      'TypeScript type check failed. Fix the type errors above before running Playwright tests. ' +
      'You can run manually with: npx tsc --noEmit'
    );
  }

  // Return teardown function to be called after all tests complete
  return async () => {
    console.log('🧹 Shutting down OpenTelemetry...');
    await shutdownPlaywrightOtel();
    console.log('✅ OpenTelemetry shutdown complete');
  };
}
