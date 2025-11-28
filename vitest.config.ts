import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Set timeout for test teardown - after this, force exit
    teardownTimeout: 1000,

    // Hook timeout
    hookTimeout: 30000,

    // Ensure tests don't hang indefinitely
    testTimeout: 60000,

    // Reporters
    reporters: ['default'],

    // Global setup for force exit
    globalSetup: './vitest.setup.ts',

    // Exclude E2E tests directory (run separately with npm run test:e2e)
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/tests/e2e/**',
    ],
  },
});
