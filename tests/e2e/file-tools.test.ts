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

  it('should find test files', async () => {
    const result = await runCLIWithRetry(
      'Find all test files in the tests directory'
    );

    // Just verify we got test file results, don't care which tool was used
    expect(result.output).toMatch(/\.test\.ts/);
  }, 90000);

  it('should search file contents', async () => {
    const result = await runCLIWithRetry(
      'Search for "SchemaType" in src/tool-setup.ts'
    );

    // Verify we got relevant results
    expect(result.output).toMatch(/SchemaType|tool-setup/i);
  }, 90000);

  it('should list directory contents', async () => {
    const result = await runCLIWithRetry(
      'Show me what files are in the src directory'
    );

    // Verify we got directory listing with expected files
    expect(result.output).toMatch(/agent\.ts|tool-setup\.ts/);
  }, 90000);
});
