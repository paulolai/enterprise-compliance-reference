import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    reporters: [
      'default',
      resolve(__dirname, './test/reporters/attestation-reporter.ts'),
      ['allure-vitest/reporter', { resultsDir: '../../allure-results/api' }]
    ],
    globals: true,
    setupFiles: ['allure-vitest/setup'],
  },
});
