// E2E Tests for Code Analysis Tools
// Tests: CodeSearch (consolidated tool)

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { runCLIWithRetry, cleanupProcesses, skipIfNoAPIKey } from './helper';

describe('E2E: Code Analysis Tools', () => {
  beforeAll(() => {
    skipIfNoAPIKey();
  });

  afterAll(() => {
    cleanupProcesses();
  });

  it('should search for symbol definition', async () => {
    // Use CodeSearch with definition mode
    const result = await runCLIWithRetry(
      'Use the CodeSearch tool with mode="definition" to look up the symbol "TOOLS" in the file src/tool-setup.ts'
    );

    expect(result.output).toContain('[Tool Call] CodeSearch');
    expect(result.output).toMatch(/TOOLS|variable|tool-setup\.ts/i);
  }, 90000);

  it('should search for symbols in codebase', async () => {
    // Use CodeSearch in default search mode
    const result = await runCLIWithRetry(
      'Use the CodeSearch tool to find symbols matching "Agent"'
    );

    expect(result.output).toContain('[Tool Call] CodeSearch');
    expect(result.output).toMatch(/Agent|class|src\/agent\.ts/i);
  }, 90000);
});
