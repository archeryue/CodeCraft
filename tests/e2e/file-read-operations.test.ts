// E2E Tests for File Reading Operations
// Tests: read_file, list_directory

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { runCLIWithRetry, cleanupProcesses, skipIfNoAPIKey } from './helper';

describe('E2E: File Reading Operations', () => {
  beforeAll(() => {
    skipIfNoAPIKey();
  });

  afterAll(() => {
    cleanupProcesses();
  });

  it('should read files with ReadFile tool', async () => {
    const result = await runCLIWithRetry(
      'read the package.json file'
    );

    expect(result.output).toMatch(/Tool Call.*ReadFile/i);
    expect(result.output).toMatch(/package\.json|codecraft|name/i);
  }, 90000);

  it('should list directory contents with ListDirectory', async () => {
    const result = await runCLIWithRetry(
      'list files in the src directory'
    );

    expect(result.output).toMatch(/Tool Call.*ListDirectory/i);
    expect(result.output).toMatch(/agent\.ts|tool-setup\.ts/i);
  }, 90000);

  it('should handle non-existent files gracefully', async () => {
    const result = await runCLIWithRetry(
      'read the file that-does-not-exist.txt'
    );

    expect(result.output).toMatch(/Tool Call.*ReadFile/i);
    expect(result.output).toMatch(/not found|error|does not exist|doesn't exist/i);
  }, 90000);
});
