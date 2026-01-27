import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src/test',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 30 * 1000,
  expect: {
    timeout: 5 * 1000,
  },
  reporter: [
    ['html', { outputFolder: 'reports/html-report', open: 'never' }],
    ['list'],
    ['allure-playwright', { resultsDir: process.env.ALLURE_RESULTS_DIR ? `${process.env.ALLURE_RESULTS_DIR}/gui` : '../../allure-results/gui' }],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  // Run TypeScript type check before tests to catch import/typing errors early
  // This is much faster than discovering errors during Playwright execution
  globalSetup: './playwright.global-setup.ts',

  webServer: {
    command: 'pnpm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
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
