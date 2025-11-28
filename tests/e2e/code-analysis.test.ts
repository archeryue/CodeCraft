// E2E Tests for Code Analysis Tools
// Tests: inspect_symbol, get_imports_exports

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { runCLIWithRetry, cleanupProcesses, skipIfNoAPIKey } from './helper';

describe('E2E: Code Analysis Tools', () => {
  beforeAll(() => {
    skipIfNoAPIKey();
  });

  afterAll(() => {
    cleanupProcesses();
  });

  it('should inspect symbol information', async () => {
    // Explicit instruction to use the inspect_symbol tool
    const result = await runCLIWithRetry(
      'Please use the inspect_symbol tool to look up the symbol "TOOLS" in the file src/tool_setup.ts. Call the inspect_symbol tool now.'
    );

    expect(result.output).toContain('[Tool Call] inspect_symbol');
    expect(result.output).toMatch(/TOOLS|variable|tool_setup\.ts/i);
  }, 120000);

  it('should analyze imports and exports', async () => {
    // Explicit instruction to use the get_imports_exports tool
    const result = await runCLIWithRetry(
      'Please use the get_imports_exports tool to analyze the file src/agent.ts. Call the get_imports_exports tool now.'
    );

    expect(result.output).toContain('[Tool Call] get_imports_exports');
    expect(result.output).toMatch(/import|export|tool_setup|executor/i);
  }, 120000);
});
