import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import * as os from 'node:os';
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@/lib': resolve(__dirname, './src/lib'),
      '@/components': resolve(__dirname, './src/components'),
      '@executable-specs/shared': resolve(__dirname, '../shared/src'),
      '@executable-specs/shared/fixtures': resolve(__dirname, '../shared/fixtures'),
      '@executable-specs/domain': resolve(__dirname, '../domain/src'),
      '@executable-specs/server': resolve(__dirname, '../server/src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ["allure-vitest/setup"],
    reporters: [
      'default',
      [
        'allure-vitest/reporter',
        {
          resultsDir: process.env.ALLURE_RESULTS_DIR 
            ? resolve(process.env.ALLURE_RESULTS_DIR, 'gui') 
            : 'allure-results',
          environmentInfo: {
            os_platform: os.platform(),
            os_release: os.release(),
            os_version: os.version(),
            node_version: process.version,
          }
        }
      ]
    ],
    globals: true,
  },
});
