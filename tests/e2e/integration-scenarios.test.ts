// E2E Tests for Integration Scenarios
// Tests: Complex queries that use multiple tools

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { runCLIWithRetry, cleanupProcesses, skipIfNoAPIKey } from './helper';

describe('E2E: Integration Scenarios', () => {
  beforeAll(() => {
    skipIfNoAPIKey();
  });

  afterAll(() => {
    cleanupProcesses();
  });

  it('should answer questions about the codebase', async () => {
    const result = await runCLIWithRetry(
      'what is the Agent class and where is it defined?'
    );

    // Should use CodeSearch or Grep to find information
    expect(result.output).toMatch(/Tool Call.*(CodeSearch|Grep)/i);
    expect(result.output).toMatch(/Agent.*class|src\/agent\.ts/i);
  }, 90000);

  it('should help with refactoring tasks', async () => {
    const result = await runCLIWithRetry(
      'I want to refactor the executor - show me where it is used'
    );

    // Should use CodeSearch (references mode) or Grep to find usages
    expect(result.output).toMatch(/Tool Call.*(CodeSearch|Grep)/i);
    expect(result.output).toMatch(/executor|agent\.ts/i);
  }, 90000);

  it('should handle conversational queries', async () => {
    const result = await runCLIWithRetry(
      'hello, can you help me understand this codebase?'
    );

    // Should respond conversationally and offer to help
    expect(result.output).toMatch(/hello|hi|help|assist|codebase/i);
  }, 90000);
});
