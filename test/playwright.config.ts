import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '../',
  testMatch: [
    'test/e2e/**/*.test.ts',
    'test/e2e/**/*.spec.ts',
    'packages/server/test/api/**/*.spec.ts'
  ],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 10 * 1000,
  expect: {
    timeout: 10 * 1000,
  },
  reporter: [
    ['html', { outputFolder: 'reports/html-report', open: 'never' }],
    ['list'],
    ['allure-playwright', { resultsDir: process.env.ALLURE_RESULTS_DIR ? `${process.env.ALLURE_RESULTS_DIR}/gui` : './allure-results/gui' }],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  // TypeScript type check temporarily disabled for restructure
  // Re-enable after full migration: globalSetup: './playwright.global-setup.ts',

  webServer: {
    command: 'pnpm --filter @executable-specs/client run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    retries: 2,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      MOCK_STRIPE: 'true',
      ...(process.env.DEBUG_HONO ? { DEBUG_HONO: 'true', DEBUG_ROUTES: 'true' } : {}),
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
