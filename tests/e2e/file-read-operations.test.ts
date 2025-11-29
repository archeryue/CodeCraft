// E2E Tests for File Reading Operations
// Tests: read_file, bash (for directory listing)

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

  it('should list directory contents with Bash', async () => {
    const result = await runCLIWithRetry(
      'list files in the src directory'
    );

    // Uses Bash (ls) or Glob for directory listing
    expect(result.output).toMatch(/Tool Call.*(Bash|Glob)/i);
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
