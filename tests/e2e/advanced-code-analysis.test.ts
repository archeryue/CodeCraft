// E2E Tests for Advanced Code Analysis
// Tests: GetCodebaseMap, SearchCode, GetImportsExports, InspectSymbol

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { runCLIWithRetry, cleanupProcesses, skipIfNoAPIKey } from './helper';

describe('E2E: Advanced Code Analysis', () => {
  beforeAll(() => {
    skipIfNoAPIKey();
  });

  afterAll(() => {
    cleanupProcesses();
  });

  it('should get codebase map', async () => {
    const result = await runCLIWithRetry(
      'show me the codebase structure using GetCodebaseMap'
    );

    expect(result.output).toMatch(/Tool Call.*GetCodebaseMap/i);
    // Model should respond about the codebase (test functionality, not LLM quality)
    expect(result.output).toMatch(/codebase|structure|src|rust_engine/i);
  }, 90000);

  it('should search code symbols', async () => {
    const result = await runCLIWithRetry(
      'use SearchCode to find the Agent class'
    );

    expect(result.output).toMatch(/Tool Call.*(SearchCode|InspectSymbol)/i);
    expect(result.output).toMatch(/Agent|class/i);
  }, 90000);

  it('should choose SearchCode for code search', async () => {
    const result = await runCLIWithRetry(
      'find all class definitions'
    );

    expect(result.output).toMatch(/Tool Call.*(SearchCode|GetCodebaseMap)/i);
  }, 90000);

  it('should choose GetImportsExports for dependency analysis', async () => {
    const result = await runCLIWithRetry(
      'what does agent.ts import?'
    );

    expect(result.output).toMatch(/Tool Call.*GetImportsExports/i);
    expect(result.output).toMatch(/import|@google|tool-setup/i);
  }, 90000);
});
