// E2E Tests for Multi-Step Workflows
// Tests: Multiple tool calls, TodoWrite

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { runCLIWithRetry, cleanupProcesses, skipIfNoAPIKey } from './helper';

describe('E2E: Multi-Step Workflows', () => {
  beforeAll(() => {
    skipIfNoAPIKey();
  });

  afterAll(() => {
    cleanupProcesses();
  });

  it('should handle multiple tool calls in sequence', async () => {
    const result = await runCLIWithRetry(
      'first list files in src, then read agent.ts'
    );

    // Should call both tools
    expect(result.output).toMatch(/Tool Call.*ListDirectory/i);
    expect(result.output).toMatch(/Tool Call.*ReadFile/i);
    expect(result.output).toMatch(/agent\.ts/i);
  }, 90000);

  it('should maintain context across turns', async () => {
    const result = await runCLIWithRetry(
      'read package.json, then tell me the project name'
    );

    expect(result.output).toMatch(/Tool Call.*ReadFile/i);
    expect(result.output).toMatch(/codecraft|project.*name/i);
  }, 90000);
});
