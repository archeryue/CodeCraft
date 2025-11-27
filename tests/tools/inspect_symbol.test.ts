// tests/tools/inspect_symbol.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { inspectSymbolTool } from '../../src/tools/inspect_symbol';
import { createDefaultContext } from '../../src/tool-context';

describe('inspect_symbol tool', () => {
  let mockContext: any;

  beforeEach(() => {
    mockContext = createDefaultContext(null);
    mockContext.rustEngine = {
      getSymbolInfo: vi.fn(),
      resolveSymbol: vi.fn()
    };
  });

  // Happy Path Tests
  describe('Happy Path', () => {
    it('should get symbol info in default mode (no mode specified)', async () => {
      const mockInfo = { type: 'class', signature: 'class Agent {...}', location: 'src/agent.ts:29' };
      mockContext.rustEngine.getSymbolInfo.mockReturnValue(mockInfo);

      const result = await inspectSymbolTool.execute(
        { symbol: 'Agent', file: 'src/agent.ts' },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockInfo);
      expect(result.metadata?.mode).toBe('info');
      expect(mockContext.rustEngine.getSymbolInfo).toHaveBeenCalledWith('src/agent.ts', 'Agent');
    });

    it('should get symbol info in explicit "info" mode', async () => {
      const mockInfo = { type: 'function', signature: 'function start() {...}' };
      mockContext.rustEngine.getSymbolInfo.mockReturnValue(mockInfo);

      const result = await inspectSymbolTool.execute(
        { symbol: 'start', file: 'src/agent.ts', mode: 'info' },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockInfo);
      expect(result.metadata?.mode).toBe('info');
      expect(mockContext.rustEngine.getSymbolInfo).toHaveBeenCalledWith('src/agent.ts', 'start');
    });

    it('should resolve symbol definition in "resolve" mode', async () => {
      const mockLocation = { file: 'src/agent.ts', line: 29, column: 13 };
      mockContext.rustEngine.resolveSymbol.mockReturnValue(mockLocation);

      const result = await inspectSymbolTool.execute(
        { symbol: 'Agent', file: 'index.ts', mode: 'resolve' },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockLocation);
      expect(result.metadata?.mode).toBe('resolve');
      // Note: resolveSymbol has different argument order!
      expect(mockContext.rustEngine.resolveSymbol).toHaveBeenCalledWith('Agent', 'index.ts');
    });
  });

  // Edge Cases
  describe('Edge Cases', () => {
    it('should handle symbol not found in "info" mode', async () => {
      mockContext.rustEngine.getSymbolInfo.mockReturnValue(null);

      const result = await inspectSymbolTool.execute(
        { symbol: 'NonExistent', file: 'src/agent.ts', mode: 'info' },
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SYMBOL_NOT_FOUND');
      expect(result.error?.message).toContain('NonExistent');
      expect(result.error?.message).toContain('src/agent.ts');
      expect(result.metadata?.mode).toBe('info');
    });

    it('should handle symbol not found in "resolve" mode', async () => {
      mockContext.rustEngine.resolveSymbol.mockReturnValue(null);

      const result = await inspectSymbolTool.execute(
        { symbol: 'NonExistent', file: 'index.ts', mode: 'resolve' },
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SYMBOL_NOT_FOUND');
      expect(result.error?.message).toContain('NonExistent');
      expect(result.error?.message).toContain('index.ts');
      expect(result.metadata?.mode).toBe('resolve');
    });

    it('should handle invalid mode by defaulting to "info"', async () => {
      const mockInfo = { type: 'class', signature: 'class Agent {...}' };
      mockContext.rustEngine.getSymbolInfo.mockReturnValue(mockInfo);

      const result = await inspectSymbolTool.execute(
        { symbol: 'Agent', file: 'src/agent.ts', mode: 'invalid' as any },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockInfo);
      expect(result.metadata?.mode).toBe('info');
      expect(mockContext.rustEngine.getSymbolInfo).toHaveBeenCalled();
    });
  });

  // Error Handling
  describe('Error Handling', () => {
    it('should handle Rust engine not available in "info" mode', async () => {
      mockContext.rustEngine = null;

      const result = await inspectSymbolTool.execute(
        { symbol: 'Agent', file: 'src/agent.ts', mode: 'info' },
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('ENGINE_NOT_AVAILABLE');
      expect(result.error?.message).toContain('Rust engine not available');
    });

    it('should handle Rust engine not available in "resolve" mode', async () => {
      mockContext.rustEngine = null;

      const result = await inspectSymbolTool.execute(
        { symbol: 'Agent', file: 'index.ts', mode: 'resolve' },
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('ENGINE_NOT_AVAILABLE');
      expect(result.error?.message).toContain('Rust engine not available');
    });

    it('should handle Rust engine error in "info" mode', async () => {
      mockContext.rustEngine.getSymbolInfo.mockImplementation(() => {
        throw new Error('Rust engine crashed');
      });

      const result = await inspectSymbolTool.execute(
        { symbol: 'Agent', file: 'src/agent.ts', mode: 'info' },
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INSPECT_ERROR');
      expect(result.error?.message).toContain('Rust engine crashed');
      expect(result.metadata?.mode).toBe('info');
    });

    it('should handle Rust engine error in "resolve" mode', async () => {
      mockContext.rustEngine.resolveSymbol.mockImplementation(() => {
        throw new Error('Rust engine crashed');
      });

      const result = await inspectSymbolTool.execute(
        { symbol: 'Agent', file: 'index.ts', mode: 'resolve' },
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INSPECT_ERROR');
      expect(result.error?.message).toContain('Rust engine crashed');
      expect(result.metadata?.mode).toBe('resolve');
    });
  });

  // Integration Tests
  describe('Integration', () => {
    it('should default to "info" mode when mode parameter is omitted', async () => {
      const mockInfo = { type: 'class' };
      mockContext.rustEngine.getSymbolInfo.mockReturnValue(mockInfo);

      const result1 = await inspectSymbolTool.execute(
        { symbol: 'Agent', file: 'src/agent.ts' },
        mockContext
      );

      const result2 = await inspectSymbolTool.execute(
        { symbol: 'Agent', file: 'src/agent.ts', mode: 'info' },
        mockContext
      );

      expect(result1).toEqual(result2);
      expect(result1.metadata?.mode).toBe('info');
    });

    it('should include mode in metadata for both success and error', async () => {
      const mockInfo = { type: 'class' };
      mockContext.rustEngine.getSymbolInfo.mockReturnValue(mockInfo);

      const successResult = await inspectSymbolTool.execute(
        { symbol: 'Agent', file: 'src/agent.ts', mode: 'info' },
        mockContext
      );

      expect(successResult.metadata?.mode).toBe('info');

      mockContext.rustEngine.resolveSymbol.mockReturnValue(null);

      const errorResult = await inspectSymbolTool.execute(
        { symbol: 'NonExistent', file: 'index.ts', mode: 'resolve' },
        mockContext
      );

      expect(errorResult.metadata?.mode).toBe('resolve');
    });

    it('should use correct argument order for each Rust engine method', async () => {
      const mockInfo = { type: 'class' };
      const mockLocation = { file: 'src/agent.ts', line: 29 };

      mockContext.rustEngine.getSymbolInfo.mockReturnValue(mockInfo);
      mockContext.rustEngine.resolveSymbol.mockReturnValue(mockLocation);

      // Test info mode: getSymbolInfo(file, symbol)
      await inspectSymbolTool.execute(
        { symbol: 'Agent', file: 'src/agent.ts', mode: 'info' },
        mockContext
      );
      expect(mockContext.rustEngine.getSymbolInfo).toHaveBeenCalledWith('src/agent.ts', 'Agent');

      // Test resolve mode: resolveSymbol(symbol, file) - different order!
      await inspectSymbolTool.execute(
        { symbol: 'Agent', file: 'index.ts', mode: 'resolve' },
        mockContext
      );
      expect(mockContext.rustEngine.resolveSymbol).toHaveBeenCalledWith('Agent', 'index.ts');
    });
  });

  // Metadata Tests
  describe('Metadata', () => {
    it('should include execution time in metadata', async () => {
      const mockInfo = { type: 'class' };
      mockContext.rustEngine.getSymbolInfo.mockReturnValue(mockInfo);

      const result = await inspectSymbolTool.execute(
        { symbol: 'Agent', file: 'src/agent.ts', mode: 'info' },
        mockContext
      );

      expect(result.metadata?.executionTimeMs).toBeGreaterThanOrEqual(0);
    });
  });
});
