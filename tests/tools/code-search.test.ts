// tests/tools/code-search.test.ts
// Unit tests for the consolidated CodeSearch tool

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { codeSearchTool } from '../../src/tools/code-search';
import { createDefaultContext } from '../../src/tool-context';
import * as path from 'path';

describe('code_search tool', () => {
  let mockContext: any;
  const cwd = process.cwd();

  // Helper to get expected absolute path
  const absPath = (relativePath: string) => path.join(cwd, relativePath);

  beforeEach(() => {
    mockContext = createDefaultContext(null);
    mockContext.rustEngine = {
      search: vi.fn(),
      getSymbolInfo: vi.fn(),
      findReferences: vi.fn()
    };
  });

  // ====================================
  // Mode: 'search' (default) - Fuzzy symbol search
  // ====================================
  describe('Mode: search (default)', () => {
    it('should fuzzy search for symbols with default mode', async () => {
      const mockResults = [
        { symbol: 'Agent', file: 'src/agent.ts', line: 29, score: 100 },
        { symbol: 'AgentOptions', file: 'src/types.ts', line: 15, score: 85 }
      ];
      mockContext.rustEngine.search.mockReturnValue(mockResults);

      const result = await codeSearchTool.execute(
        { query: 'Agent' },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResults);
      expect(result.metadata?.mode).toBe('search');
      expect(mockContext.rustEngine.search).toHaveBeenCalledWith(cwd, 'Agent');
    });

    it('should fuzzy search with explicit search mode', async () => {
      const mockResults = [{ symbol: 'Tool', file: 'src/tools.ts', line: 10, score: 95 }];
      mockContext.rustEngine.search.mockReturnValue(mockResults);

      const result = await codeSearchTool.execute(
        { query: 'Tool', mode: 'search' },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResults);
      expect(result.metadata?.mode).toBe('search');
    });

    it('should search in custom path', async () => {
      const mockResults = [{ symbol: 'TestHelper', file: 'tests/helper.ts', line: 5, score: 90 }];
      mockContext.rustEngine.search.mockReturnValue(mockResults);

      const result = await codeSearchTool.execute(
        { query: 'TestHelper', path: 'tests' },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(mockContext.rustEngine.search).toHaveBeenCalledWith(absPath('tests'), 'TestHelper');
    });

    it('should handle empty search results', async () => {
      mockContext.rustEngine.search.mockReturnValue([]);

      const result = await codeSearchTool.execute(
        { query: 'NonExistentSymbol' },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  // ====================================
  // Mode: 'definition' - Get symbol definition info
  // ====================================
  describe('Mode: definition', () => {
    it('should get symbol definition info', async () => {
      const mockInfo = {
        type: 'class',
        signature: 'class Agent {...}',
        location: 'src/agent.ts:29'
      };
      mockContext.rustEngine.getSymbolInfo.mockReturnValue(mockInfo);

      const result = await codeSearchTool.execute(
        { query: 'Agent', mode: 'definition', file: 'src/agent.ts' },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockInfo);
      expect(result.metadata?.mode).toBe('definition');
      expect(mockContext.rustEngine.getSymbolInfo).toHaveBeenCalledWith(absPath('src/agent.ts'), 'Agent');
    });

    it('should require file parameter for definition mode', async () => {
      const result = await codeSearchTool.execute(
        { query: 'Agent', mode: 'definition' },
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('MISSING_FILE');
      expect(result.error?.message).toContain('file');
    });

    it('should handle symbol not found in definition mode', async () => {
      mockContext.rustEngine.getSymbolInfo.mockReturnValue(null);

      const result = await codeSearchTool.execute(
        { query: 'NonExistent', mode: 'definition', file: 'src/agent.ts' },
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SYMBOL_NOT_FOUND');
      expect(result.error?.message).toContain('NonExistent');
    });

    it('should handle function definition', async () => {
      const mockInfo = {
        type: 'function',
        signature: 'function executeTool(name: string, args: any): Promise<string>'
      };
      mockContext.rustEngine.getSymbolInfo.mockReturnValue(mockInfo);

      const result = await codeSearchTool.execute(
        { query: 'executeTool', mode: 'definition', file: 'src/tool-setup.ts' },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.type).toBe('function');
    });
  });

  // ====================================
  // Mode: 'references' - Find all usages
  // ====================================
  describe('Mode: references', () => {
    it('should find all references to a symbol', async () => {
      const mockRefs = [
        { file: 'src/agent.ts', line: 29, context: 'class Agent {' },
        { file: 'index.ts', line: 5, context: 'import { Agent } from' },
        { file: 'tests/agent.test.ts', line: 10, context: 'new Agent()' }
      ];
      mockContext.rustEngine.findReferences.mockReturnValue(mockRefs);

      const result = await codeSearchTool.execute(
        { query: 'Agent', mode: 'references' },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRefs);
      expect(result.metadata?.mode).toBe('references');
      expect(mockContext.rustEngine.findReferences).toHaveBeenCalledWith('Agent', cwd);
    });

    it('should search references in custom path', async () => {
      const mockRefs = [{ file: 'src/tools/read-file.ts', line: 10, context: 'ToolResult' }];
      mockContext.rustEngine.findReferences.mockReturnValue(mockRefs);

      const result = await codeSearchTool.execute(
        { query: 'ToolResult', mode: 'references', path: 'src' },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(mockContext.rustEngine.findReferences).toHaveBeenCalledWith('ToolResult', absPath('src'));
    });

    it('should handle no references found', async () => {
      mockContext.rustEngine.findReferences.mockReturnValue([]);

      const result = await codeSearchTool.execute(
        { query: 'UnusedSymbol', mode: 'references' },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  // ====================================
  // Edge Cases
  // ====================================
  describe('Edge Cases', () => {
    it('should handle invalid mode by defaulting to search', async () => {
      const mockResults = [{ symbol: 'Agent', file: 'src/agent.ts', line: 29 }];
      mockContext.rustEngine.search.mockReturnValue(mockResults);

      const result = await codeSearchTool.execute(
        { query: 'Agent', mode: 'invalid' as any },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.metadata?.mode).toBe('search');
      expect(mockContext.rustEngine.search).toHaveBeenCalled();
    });

    it('should handle absolute paths', async () => {
      const mockResults = [{ symbol: 'Test', file: '/absolute/path/test.ts', line: 1 }];
      mockContext.rustEngine.search.mockReturnValue(mockResults);

      const result = await codeSearchTool.execute(
        { query: 'Test', path: '/absolute/path' },
        mockContext
      );

      expect(mockContext.rustEngine.search).toHaveBeenCalledWith('/absolute/path', 'Test');
    });

    it('should handle "." path correctly', async () => {
      mockContext.rustEngine.search.mockReturnValue([]);

      const result = await codeSearchTool.execute(
        { query: 'Test', path: '.' },
        mockContext
      );

      // Should normalize '.' to cwd without trailing '/.'
      expect(mockContext.rustEngine.search).toHaveBeenCalledWith(cwd, 'Test');
    });
  });

  // ====================================
  // Error Handling
  // ====================================
  describe('Error Handling', () => {
    it('should handle Rust engine not available', async () => {
      mockContext.rustEngine = null;

      const result = await codeSearchTool.execute(
        { query: 'Agent' },
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('ENGINE_NOT_AVAILABLE');
    });

    it('should handle Rust engine error in search mode', async () => {
      mockContext.rustEngine.search.mockImplementation(() => {
        throw new Error('Rust engine crashed');
      });

      const result = await codeSearchTool.execute(
        { query: 'Agent', mode: 'search' },
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SEARCH_ERROR');
      expect(result.error?.message).toContain('Rust engine crashed');
    });

    it('should handle Rust engine error in definition mode', async () => {
      mockContext.rustEngine.getSymbolInfo.mockImplementation(() => {
        throw new Error('Parse error');
      });

      const result = await codeSearchTool.execute(
        { query: 'Agent', mode: 'definition', file: 'src/agent.ts' },
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SEARCH_ERROR');
    });

    it('should handle Rust engine error in references mode', async () => {
      mockContext.rustEngine.findReferences.mockImplementation(() => {
        throw new Error('Index error');
      });

      const result = await codeSearchTool.execute(
        { query: 'Agent', mode: 'references' },
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SEARCH_ERROR');
    });
  });

  // ====================================
  // Metadata
  // ====================================
  describe('Metadata', () => {
    it('should include execution time in metadata', async () => {
      mockContext.rustEngine.search.mockReturnValue([]);

      const result = await codeSearchTool.execute(
        { query: 'Agent' },
        mockContext
      );

      expect(result.metadata?.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should include mode in metadata for all modes', async () => {
      mockContext.rustEngine.search.mockReturnValue([]);
      mockContext.rustEngine.getSymbolInfo.mockReturnValue({ type: 'class' });
      mockContext.rustEngine.findReferences.mockReturnValue([]);

      const searchResult = await codeSearchTool.execute({ query: 'X' }, mockContext);
      const defResult = await codeSearchTool.execute({ query: 'X', mode: 'definition', file: 'x.ts' }, mockContext);
      const refResult = await codeSearchTool.execute({ query: 'X', mode: 'references' }, mockContext);

      expect(searchResult.metadata?.mode).toBe('search');
      expect(defResult.metadata?.mode).toBe('definition');
      expect(refResult.metadata?.mode).toBe('references');
    });
  });

  // ====================================
  // Tool Properties
  // ====================================
  describe('Tool Properties', () => {
    it('should have correct name', () => {
      expect(codeSearchTool.name).toBe('CodeSearch');
    });

    it('should have correct capabilities', () => {
      expect(codeSearchTool.capabilities.writesFiles).toBe(false);
      expect(codeSearchTool.capabilities.executesCommands).toBe(false);
      expect(codeSearchTool.capabilities.requiresRustEngine).toBe(true);
      expect(codeSearchTool.capabilities.idempotent).toBe(true);
      expect(codeSearchTool.capabilities.retryable).toBe(true);
    });

    it('should require query parameter', () => {
      expect(codeSearchTool.parameters.required).toContain('query');
    });
  });
});
