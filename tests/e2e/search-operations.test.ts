// E2E Tests for Search Operations
// Tests: glob, grep

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { runCLIWithRetry, cleanupProcesses, skipIfNoAPIKey } from './helper';

describe('E2E: Search Operations', () => {
  beforeAll(() => {
    skipIfNoAPIKey();
  });

  afterAll(() => {
    cleanupProcesses();
  });

  it('should search with glob patterns', async () => {
    const result = await runCLIWithRetry(
      'find all TypeScript files in tests using glob'
    );

    expect(result.output).toMatch(/Tool Call.*Glob/i);
    expect(result.output).toMatch(/\.test\.ts/i);
  }, 90000);

  it('should search file contents with grep', async () => {
    const result = await runCLIWithRetry(
      'search for the word "Agent" in src files using grep'
    );

    expect(result.output).toMatch(/Tool Call.*Grep/i);
    expect(result.output).toMatch(/Agent|src/i);
  }, 90000);

  it('should choose grep for text search', async () => {
    const result = await runCLIWithRetry(
      'find error messages containing "not found"'
    );

    expect(result.output).toMatch(/Tool Call.*Grep/i);
  }, 90000);
});
