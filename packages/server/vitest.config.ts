import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['test/**/*.spec.ts', 'test/**/*.test.ts'],
    exclude: [
      'test/api/**',
      'test/server-startup.integration.test.ts',
    ],
  },
});
