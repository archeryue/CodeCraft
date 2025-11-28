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
    // Explicit instruction to use the glob tool
    const result = await runCLIWithRetry(
      'Please use the glob tool to find all files matching "**/*.test.ts" in the tests directory. Call the glob tool now.'
    );

    expect(result.output).toContain('[Tool Call] glob');
    expect(result.output).toMatch(/\.test\.ts/);
  }, 120000);

  it('should search file contents with grep', async () => {
    // Explicit instruction to use the grep tool
    const result = await runCLIWithRetry(
      'Please use the grep tool to search for the pattern "SchemaType" in the file src/tool_setup.ts. Call the grep tool now.'
    );

    expect(result.output).toContain('[Tool Call] grep');
    expect(result.output).toMatch(/SchemaType|tool_setup\.ts/i);
  }, 120000);

  it('should list directory contents', async () => {
    // Explicit instruction to use the list_directory tool
    const result = await runCLIWithRetry(
      'Please use the list_directory tool to show the contents of the src folder. Call the list_directory tool now.'
    );

    expect(result.output).toContain('[Tool Call] list_directory');
    expect(result.output).toMatch(/agent\.ts|tool_setup\.ts/);
  }, 120000);
});
