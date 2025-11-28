// tests/tool_registry.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DefaultToolRegistry } from '../src/tool-registry';
import { Tool, ToolContext, ToolResult, ToolCapabilities } from '../src/types/tool';
import { SchemaType } from '@google/generative-ai';

// Mock tool for testing
const createMockTool = (name: string, hasOptionalMethods = false): Tool => {
  const tool: Tool = {
    name,
    description: `Test tool: ${name}`,
    version: '1.0.0',
    parameters: {
      type: SchemaType.OBJECT,
      description: 'Test parameters',
      properties: {},
      required: []
    },
    capabilities: {
      writesFiles: false,
      executesCommands: false,
      requiresRustEngine: false,
      accessesNetwork: false,
      idempotent: true,
      retryable: true
    },
    execute: async () => ({ success: true, data: 'test' })
  };

  if (hasOptionalMethods) {
    tool.validate = (params: unknown) => ({ valid: true });
    tool.initialize = async () => {};
    tool.shutdown = async () => {};
  }

  return tool;
};

describe('ToolRegistry', () => {
  let registry: DefaultToolRegistry;

  beforeEach(() => {
    registry = new DefaultToolRegistry();
  });

  describe('Registration', () => {
    it('should register a tool successfully', () => {
      const tool = createMockTool('test_tool');
      registry.register(tool);

      expect(registry.has('test_tool')).toBe(true);
      expect(registry.get('test_tool')).toBe(tool);
    });

    it('should throw error when registering duplicate tool name', () => {
      const tool1 = createMockTool('duplicate');
      const tool2 = createMockTool('duplicate');

      registry.register(tool1);

      expect(() => registry.register(tool2)).toThrow('Tool "duplicate" is already registered');
    });

    it('should unregister a tool and return true', () => {
      const tool = createMockTool('test_tool');
      registry.register(tool);

      const result = registry.unregister('test_tool');

      expect(result).toBe(true);
      expect(registry.has('test_tool')).toBe(false);
    });

    it('should return false when unregistering non-existent tool', () => {
      const result = registry.unregister('nonexistent');

      expect(result).toBe(false);
    });

    it('should check if tool exists with has()', () => {
      const tool = createMockTool('test_tool');

      expect(registry.has('test_tool')).toBe(false);

      registry.register(tool);

      expect(registry.has('test_tool')).toBe(true);
    });

    it('should get tool by name with get()', () => {
      const tool = createMockTool('test_tool');
      registry.register(tool);

      const retrieved = registry.get('test_tool');

      expect(retrieved).toBe(tool);
      expect(retrieved?.name).toBe('test_tool');
    });

    it('should return undefined for non-existent tool', () => {
      const retrieved = registry.get('nonexistent');

      expect(retrieved).toBeUndefined();
    });
  });

  describe('Bulk Operations', () => {
    it('should return all registered tools with getAll()', () => {
      const tool1 = createMockTool('tool1');
      const tool2 = createMockTool('tool2');
      const tool3 = createMockTool('tool3');

      registry.register(tool1);
      registry.register(tool2);
      registry.register(tool3);

      const all = registry.getAll();

      expect(all).toHaveLength(3);
      expect(all).toContain(tool1);
      expect(all).toContain(tool2);
      expect(all).toContain(tool3);
    });

    it('should return all tool names with getNames()', () => {
      registry.register(createMockTool('tool1'));
      registry.register(createMockTool('tool2'));
      registry.register(createMockTool('tool3'));

      const names = registry.getNames();

      expect(names).toEqual(['tool1', 'tool2', 'tool3']);
    });

    it('should return empty array when no tools registered', () => {
      expect(registry.getAll()).toEqual([]);
      expect(registry.getNames()).toEqual([]);
    });
  });

  describe('LLM Declaration Generation', () => {
    it('should generate Gemini-compatible declarations', () => {
      const tool = createMockTool('test_tool');
      registry.register(tool);

      const declarations = registry.getDeclarations();

      expect(declarations).toHaveLength(1);
      expect(declarations[0]).toHaveProperty('functionDeclarations');
      expect(declarations[0].functionDeclarations).toBeInstanceOf(Array);
    });

    it('should include name, description, and parameters for each tool', () => {
      const tool = createMockTool('test_tool');
      registry.register(tool);

      const declarations = registry.getDeclarations();
      const funcDecl = declarations[0].functionDeclarations[0];

      expect(funcDecl).toHaveProperty('name', 'test_tool');
      expect(funcDecl).toHaveProperty('description');
      expect(funcDecl).toHaveProperty('parameters');
    });

    it('should wrap declarations in functionDeclarations array', () => {
      const tool1 = createMockTool('tool1');
      const tool2 = createMockTool('tool2');
      registry.register(tool1);
      registry.register(tool2);

      const declarations = registry.getDeclarations();

      expect(declarations[0].functionDeclarations).toHaveLength(2);
    });

    it('should handle empty registry (return empty declarations)', () => {
      const declarations = registry.getDeclarations();

      expect(declarations).toHaveLength(1);
      expect(declarations[0].functionDeclarations).toEqual([]);
    });
  });

  describe('Lifecycle Management', () => {
    it('should call initialize on all tools with initializeAll()', async () => {
      const tool1 = createMockTool('tool1', true);
      const tool2 = createMockTool('tool2', true);

      tool1.initialize = vi.fn().mockResolvedValue(undefined);
      tool2.initialize = vi.fn().mockResolvedValue(undefined);

      registry.register(tool1);
      registry.register(tool2);

      const mockContext: ToolContext = {
        fs: {} as any,
        cwd: '/test'
      };

      await registry.initializeAll(mockContext);

      expect(tool1.initialize).toHaveBeenCalledWith(mockContext);
      expect(tool2.initialize).toHaveBeenCalledWith(mockContext);
    });

    it('should skip tools without initialize method', async () => {
      const tool1 = createMockTool('tool1'); // No initialize
      const tool2 = createMockTool('tool2', true);

      tool2.initialize = vi.fn().mockResolvedValue(undefined);

      registry.register(tool1);
      registry.register(tool2);

      const mockContext: ToolContext = {
        fs: {} as any,
        cwd: '/test'
      };

      await expect(registry.initializeAll(mockContext)).resolves.not.toThrow();
      expect(tool2.initialize).toHaveBeenCalled();
    });

    it('should call shutdown on all tools with shutdownAll()', async () => {
      const tool1 = createMockTool('tool1', true);
      const tool2 = createMockTool('tool2', true);

      tool1.shutdown = vi.fn().mockResolvedValue(undefined);
      tool2.shutdown = vi.fn().mockResolvedValue(undefined);

      registry.register(tool1);
      registry.register(tool2);

      await registry.shutdownAll();

      expect(tool1.shutdown).toHaveBeenCalled();
      expect(tool2.shutdown).toHaveBeenCalled();
    });

    it('should handle errors in initialize gracefully', async () => {
      const tool1 = createMockTool('tool1', true);
      const tool2 = createMockTool('tool2', true);

      tool1.initialize = vi.fn().mockRejectedValue(new Error('Init failed'));
      tool2.initialize = vi.fn().mockResolvedValue(undefined);

      registry.register(tool1);
      registry.register(tool2);

      const mockContext: ToolContext = {
        fs: {} as any,
        cwd: '/test'
      };

      // Should not throw, should continue to initialize tool2
      await expect(registry.initializeAll(mockContext)).resolves.not.toThrow();
      expect(tool2.initialize).toHaveBeenCalled();
    });

    it('should handle errors in shutdown gracefully', async () => {
      const tool1 = createMockTool('tool1', true);
      const tool2 = createMockTool('tool2', true);

      tool1.shutdown = vi.fn().mockRejectedValue(new Error('Shutdown failed'));
      tool2.shutdown = vi.fn().mockResolvedValue(undefined);

      registry.register(tool1);
      registry.register(tool2);

      // Should not throw, should continue to shutdown tool2
      await expect(registry.shutdownAll()).resolves.not.toThrow();
      expect(tool2.shutdown).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle tool with all optional methods undefined', () => {
      const tool = createMockTool('minimal_tool');

      expect(() => registry.register(tool)).not.toThrow();
      expect(registry.get('minimal_tool')).toBe(tool);
    });

    it('should preserve tool order in getAll()', () => {
      const tool1 = createMockTool('a_tool');
      const tool2 = createMockTool('b_tool');
      const tool3 = createMockTool('c_tool');

      registry.register(tool1);
      registry.register(tool2);
      registry.register(tool3);

      const all = registry.getAll();

      // Should preserve insertion order
      expect(all[0]).toBe(tool1);
      expect(all[1]).toBe(tool2);
      expect(all[2]).toBe(tool3);
    });
  });
});
