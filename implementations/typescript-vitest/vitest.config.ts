import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    reporters: ['default', resolve(__dirname, './test/reporters/attestation-reporter.ts')],
    globals: true,
  },
});
