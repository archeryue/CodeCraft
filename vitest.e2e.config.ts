import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // E2E tests need longer timeouts since they spawn CLI processes
    testTimeout: 120000,
    hookTimeout: 60000,
    teardownTimeout: 10000,

    // Run E2E tests sequentially to avoid port/resource conflicts
    fileParallelism: false,

    // Only include E2E test files from tests/e2e directory
    include: ['tests/e2e/**/*.test.ts'],

    // Reporters
    reporters: ['default'],
  },
});
