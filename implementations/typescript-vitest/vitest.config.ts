import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    reporters: [
      'default',
      resolve(__dirname, './test/reporters/attestation-reporter.ts'),
      resolve(__dirname, './test/reporters/coverage-reporter.ts'),
      ['allure-vitest/reporter', { resultsDir: '../../allure-results/api' }]
    ],
    globals: true,
    setupFiles: ['allure-vitest/setup'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'html', 'lcov'],
      all: true,
      include: [
        resolve(__dirname, 'src/**/*.ts'),
        resolve(__dirname, '../shared/src/**/*.ts')
      ],
      exclude: [
        'node_modules/**',
        'test/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/coverage/**',
        '**/dist/**'
      ],
      // Enforce quality gates
      statements: 85,
      branches: 75,
      functions: 85,
      lines: 85,
      // Ignore test helpers from coverage calculation
      ignoreClassMethods: ['^to'],
    },
  },
});