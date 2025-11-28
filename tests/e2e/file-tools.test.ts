// E2E Tests for File Operation Tools
// Tests: glob, grep, list_directory, read_file

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { runCLIWithRetry, cleanupProcesses, skipIfNoAPIKey } from './helper';

describe('E2E: File Tools', () => {
  beforeAll(() => {
    skipIfNoAPIKey();
  });

  afterAll(() => {
    cleanupProcesses();
  });

  it('should find test files with glob', async () => {
    // Explicit instruction to use the Glob tool
    const result = await runCLIWithRetry(
      'Please use the Glob tool to find all files matching "**/*.test.ts" in the tests directory. Call the Glob tool now.'
    );

    expect(result.output).toContain('[Tool Call] Glob');
    expect(result.output).toMatch(/\.test\.ts/);
  }, 90000);

  it('should search file contents with grep', async () => {
    // Explicit instruction to use the Grep tool
    const result = await runCLIWithRetry(
      'Please use the Grep tool to search for the pattern "SchemaType" in the file src/tool-setup.ts. Call the Grep tool now.'
    );

    expect(result.output).toContain('[Tool Call] Grep');
    expect(result.output).toMatch(/SchemaType|tool-setup\.ts/i);
  }, 90000);

  it('should list directory contents', async () => {
    // Explicit instruction to use the ListDirectory tool
    const result = await runCLIWithRetry(
      'Please use the ListDirectory tool to show the contents of the src folder. Call the ListDirectory tool now.'
    );

    expect(result.output).toContain('[Tool Call] ListDirectory');
    expect(result.output).toMatch(/agent\.ts|tool-setup\.ts/);
  }, 90000);
});
