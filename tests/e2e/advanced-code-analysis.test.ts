// E2E Tests for Advanced Code Analysis
// Tests: CodeSearch (consolidated tool with all modes)

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { runCLIWithRetry, cleanupProcesses, skipIfNoAPIKey } from './helper';

describe('E2E: Advanced Code Analysis', () => {
  beforeAll(() => {
    skipIfNoAPIKey();
  });

  afterAll(() => {
    cleanupProcesses();
  });

  it('should search code symbols with CodeSearch', async () => {
    const result = await runCLIWithRetry(
      'use CodeSearch to find the Agent class'
    );

    expect(result.output).toMatch(/Tool Call.*CodeSearch/i);
    expect(result.output).toMatch(/Agent|class/i);
  }, 90000);

  it('should find symbol references', async () => {
    const result = await runCLIWithRetry(
      'use CodeSearch with mode="references" to find all usages of ToolResult'
    );

    expect(result.output).toMatch(/Tool Call.*CodeSearch/i);
    expect(result.output).toMatch(/ToolResult|reference|usage/i);
  }, 90000);

  it('should get symbol definition', async () => {
    const result = await runCLIWithRetry(
      'use CodeSearch with mode="definition" to get info about the Agent class in src/agent.ts'
    );

    expect(result.output).toMatch(/Tool Call.*CodeSearch/i);
    expect(result.output).toMatch(/Agent|class|signature/i);
  }, 90000);

  it('should choose CodeSearch for code analysis', async () => {
    const result = await runCLIWithRetry(
      'find all class definitions in the codebase'
    );

    // Should use CodeSearch or Grep for this task
    expect(result.output).toMatch(/Tool Call.*(CodeSearch|Grep)/i);
  }, 90000);
});
