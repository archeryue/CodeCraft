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
    // Explicit instruction to use the InspectSymbol tool
    const result = await runCLIWithRetry(
      'Please use the InspectSymbol tool to look up the symbol "TOOLS" in the file src/tool-setup.ts. Call the InspectSymbol tool now.'
    );

    expect(result.output).toContain('[Tool Call] InspectSymbol');
    expect(result.output).toMatch(/TOOLS|variable|tool-setup\.ts/i);
  }, 90000);

  it('should analyze imports and exports', async () => {
    // Explicit instruction to use the GetImportsExports tool
    const result = await runCLIWithRetry(
      'Please use the GetImportsExports tool to analyze the file src/agent.ts. Call the GetImportsExports tool now.'
    );

    expect(result.output).toContain('[Tool Call] GetImportsExports');
    expect(result.output).toMatch(/import|export|tool-setup|executor/i);
  }, 90000);
});
