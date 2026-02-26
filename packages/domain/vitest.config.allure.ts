import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import * as os from 'node:os';

export default defineConfig({
  test: {
    // Allure requires this setup file for integration
    // Since package.json has "type": "module", we use the module string directly
    setupFiles: ["allure-vitest/setup"],  // Critical requirement for Allure

    // Dual reporter setup: Allure + Custom Attestation
    reporters: [
      'default',  // Console output
      [
        'allure-vitest/reporter',  // Allure reporter for historical trends/dashboards
        {
          resultsDir: process.env.ALLURE_RESULTS_DIR 
            ? resolve(process.env.ALLURE_RESULTS_DIR, 'api') 
            : 'allure-results',
          environmentInfo: {
            os_platform: os.platform(),
            os_release: os.release(),
            os_version: os.version(),
            node_version: process.version,
          }
        }
      ],
      resolve(__dirname, './test/reporters/attestation-reporter.ts')  // Custom compliance reporter
    ],

    globals: true,
    testTimeout: 30000,
  },
});
