// tests/tool_executor.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DefaultToolExecutor } from '../src/tool-executor';
import { DefaultToolRegistry } from '../src/tool-registry';
import { Tool, ToolContext, ToolResult } from '../src/types/tool';
import { SchemaType } from '@google/generative-ai';

// Mock tool that succeeds
const successTool: Tool = {
  name: 'success_tool',
  description: 'Always succeeds',
  version: '1.0.0',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Test params',
    properties: {
      value: { type: SchemaType.STRING, description: 'A value' }
    },
    required: ['value']
  },
  capabilities: {
    writesFiles: false,
    executesCommands: false,
    requiresRustEngine: false,
    accessesNetwork: false,
    idempotent: true,
    retryable: true
  },
  execute: async (params: unknown) => ({
    success: true,
    data: `Executed with: ${JSON.stringify(params)}`,
    metadata: { executionTimeMs: 10 }
  })
};

// Mock tool with validation
const validatingTool: Tool = {
  name: 'validating_tool',
  description: 'Validates params',
  version: '1.0.0',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Test params',
    properties: {
      required_field: { type: SchemaType.STRING, description: 'Required' }
    },
    required: ['required_field']
  },
  capabilities: {
    writesFiles: false,
    executesCommands: false,
    requiresRustEngine: false,
    accessesNetwork: false,
    idempotent: true,
    retryable: true
  },
  validate: (params: any) => {
    if (!params.required_field) {
      return { valid: false, errors: ['required_field is missing'] };
    }
    return { valid: true };
  },
  execute: async (params: unknown) => ({
    success: true,
    data: 'validated and executed'
  })
};

// Mock tool that throws error
const errorTool: Tool = {
  name: 'error_tool',
  description: 'Throws error',
  version: '1.0.0',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Test params',
    properties: {}
  },
  capabilities: {
    writesFiles: false,
    executesCommands: false,
    requiresRustEngine: false,
    accessesNetwork: false,
    idempotent: true,
    retryable: true
  },
  execute: async () => {
    throw new Error('Tool execution failed');
  }
};

// Mock tool that times out
const slowTool: Tool = {
  name: 'slow_tool',
  description: 'Takes too long',
  version: '1.0.0',
  parameters: {
    type: SchemaType.OBJECT,
    description: 'Test params',
    properties: {}
  },
  capabilities: {
    writesFiles: false,
    executesCommands: false,
    requiresRustEngine: false,
    accessesNetwork: false,
    idempotent: true,
    retryable: true
  },
  execute: async () => {
    await new Promise(resolve => setTimeout(resolve, 100000)); // 100 seconds
    return { success: true };
  }
};

describe('ToolExecutor', () => {
  let registry: DefaultToolRegistry;
  let executor: DefaultToolExecutor;
  let mockContext: ToolContext;

  beforeEach(() => {
    registry = new DefaultToolRegistry();
    mockContext = {
      fs: {
        readFileSync: vi.fn(),
        writeFileSync: vi.fn(),
        existsSync: vi.fn(),
        unlinkSync: vi.fn(),
        readdirSync: vi.fn(),
        statSync: vi.fn()
      },
      cwd: '/test'
    };
    executor = new DefaultToolExecutor(registry, mockContext);
  });

  describe('Basic Execution', () => {
    it('should execute tool by name with valid params', async () => {
      registry.register(successTool);

      const result = await executor.execute('success_tool', { value: 'test' });

      expect(result.success).toBe(true);
      expect(result.data).toContain('test');
    });

    it('should return ToolResult with success true', async () => {
      registry.register(successTool);

      const result = await executor.execute('success_tool', { value: 'test' });

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
    });

    it('should include execution metadata', async () => {
      registry.register(successTool);

      const result = await executor.execute('success_tool', { value: 'test' });

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should return error if tool not found', async () => {
      const result = await executor.execute('nonexistent_tool', {});

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('TOOL_NOT_FOUND');
      expect(result.error?.message).toContain('nonexistent_tool');
    });

    it('should pass context to tool.execute()', async () => {
      const executeSpy = vi.fn().mockResolvedValue({ success: true });
      const spyTool: Tool = {
        ...successTool,
        name: 'spy_tool',
        execute: executeSpy
      };

      registry.register(spyTool);

      await executor.execute('spy_tool', { value: 'test' });

      expect(executeSpy).toHaveBeenCalledWith(
        { value: 'test' },
        expect.objectContaining({ cwd: '/test' })
      );
    });
  });

  describe('Validation', () => {
    it('should validate params before execution (if tool has validate)', async () => {
      registry.register(validatingTool);

      const result = await executor.execute('validating_tool', {});

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(result.error?.details).toContain('required_field is missing');
    });

    it('should skip validation if skipValidation option true', async () => {
      registry.register(validatingTool);

      const result = await executor.execute(
        'validating_tool',
        {},
        { skipValidation: true }
      );

      expect(result.success).toBe(true);
    });

    it('should return validation error if params invalid', async () => {
      registry.register(validatingTool);

      const result = await executor.execute('validating_tool', { wrong_field: 'value' });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('should execute if validation passes', async () => {
      registry.register(validatingTool);

      const result = await executor.execute('validating_tool', { required_field: 'value' });

      expect(result.success).toBe(true);
      expect(result.data).toBe('validated and executed');
    });

    it('should handle tools without validate method', async () => {
      registry.register(successTool);

      const result = await executor.execute('success_tool', { value: 'test' });

      expect(result.success).toBe(true);
    });
  });

  describe('Timeout Handling', () => {
    it('should timeout after default 30 seconds', async () => {
      registry.register(slowTool);

      const result = await executor.execute('slow_tool', {}, { timeout: 100 });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('TIMEOUT');
    }, 10000);

    it('should respect custom timeout option', async () => {
      registry.register(slowTool);

      const result = await executor.execute('slow_tool', {}, { timeout: 50 });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('TIMEOUT');
    });

    it('should return TIMEOUT error code', async () => {
      registry.register(slowTool);

      const result = await executor.execute('slow_tool', {}, { timeout: 50 });

      expect(result.error?.code).toBe('TIMEOUT');
      expect(result.error?.message).toContain('Timeout');
    });

    it('should still record execution time on timeout', async () => {
      registry.register(slowTool);

      const result = await executor.execute('slow_tool', {}, { timeout: 50 });

      expect(result.metadata?.executionTimeMs).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should catch errors from tool.execute()', async () => {
      registry.register(errorTool);

      const result = await executor.execute('error_tool', {});

      expect(result.success).toBe(false);
    });

    it('should return EXECUTION_ERROR code', async () => {
      registry.register(errorTool);

      const result = await executor.execute('error_tool', {});

      expect(result.error?.code).toBe('EXECUTION_ERROR');
    });

    it('should include error message in result', async () => {
      registry.register(errorTool);

      const result = await executor.execute('error_tool', {});

      expect(result.error?.message).toBe('Tool execution failed');
    });

    it('should record execution time even on error', async () => {
      registry.register(errorTool);

      const result = await executor.execute('error_tool', {});

      expect(result.metadata?.executionTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Statistics Tracking', () => {
    it('should track totalExecutions count', async () => {
      registry.register(successTool);

      await executor.execute('success_tool', { value: 'test1' });
      await executor.execute('success_tool', { value: 'test2' });

      const stats = executor.getStats();

      expect(stats.totalExecutions).toBe(2);
    });

    it('should track successCount', async () => {
      registry.register(successTool);
      registry.register(errorTool);

      await executor.execute('success_tool', { value: 'test' });
      await executor.execute('error_tool', {});

      const stats = executor.getStats();

      expect(stats.successCount).toBe(1);
    });

    it('should track errorCount', async () => {
      registry.register(successTool);
      registry.register(errorTool);

      await executor.execute('success_tool', { value: 'test' });
      await executor.execute('error_tool', {});

      const stats = executor.getStats();

      expect(stats.errorCount).toBe(1);
    });

    it('should track executionsByTool per tool', async () => {
      registry.register(successTool);
      registry.register(errorTool);

      await executor.execute('success_tool', { value: 'test1' });
      await executor.execute('success_tool', { value: 'test2' });
      await executor.execute('error_tool', {});

      const stats = executor.getStats();

      expect(stats.executionsByTool['success_tool']).toBe(2);
      expect(stats.executionsByTool['error_tool']).toBe(1);
    });

    it('should calculate averageExecutionTimeMs', async () => {
      registry.register(successTool);

      await executor.execute('success_tool', { value: 'test1' });
      await executor.execute('success_tool', { value: 'test2' });

      const stats = executor.getStats();

      expect(stats.averageExecutionTimeMs).toBeGreaterThanOrEqual(0);
      expect(stats.totalExecutions).toBe(2);
    });

    it('should initialize stats to zero', () => {
      const stats = executor.getStats();

      expect(stats.totalExecutions).toBe(0);
      expect(stats.successCount).toBe(0);
      expect(stats.errorCount).toBe(0);
      expect(stats.averageExecutionTimeMs).toBe(0);
      expect(stats.executionsByTool).toEqual({});
    });
  });

  describe('Context Management', () => {
    it('should use default context if not provided', async () => {
      registry.register(successTool);

      const result = await executor.execute('success_tool', { value: 'test' });

      expect(result.success).toBe(true);
    });

    it('should use custom context with executeWithContext()', async () => {
      const customContext: ToolContext = {
        fs: {
          readFileSync: vi.fn(),
          writeFileSync: vi.fn(),
          existsSync: vi.fn(),
          unlinkSync: vi.fn(),
          readdirSync: vi.fn(),
          statSync: vi.fn()
        },
        cwd: '/custom'
      };

      const executeSpy = vi.fn().mockResolvedValue({ success: true });
      const spyTool: Tool = {
        ...successTool,
        name: 'spy_tool',
        execute: executeSpy
      };

      registry.register(spyTool);

      await executor.executeWithContext('spy_tool', { value: 'test' }, customContext);

      expect(executeSpy).toHaveBeenCalledWith(
        { value: 'test' },
        expect.objectContaining({ cwd: '/custom' })
      );
    });

    it('should merge context options properly', async () => {
      const customContext: ToolContext = {
        ...mockContext,
        confirm: vi.fn().mockResolvedValue(true)
      };

      const executeSpy = vi.fn().mockResolvedValue({ success: true });
      const spyTool: Tool = {
        ...successTool,
        name: 'spy_tool',
        execute: executeSpy
      };

      registry.register(spyTool);

      await executor.executeWithContext('spy_tool', { value: 'test' }, customContext);

      expect(executeSpy).toHaveBeenCalledWith(
        { value: 'test' },
        expect.objectContaining({ confirm: expect.any(Function) })
      );
    });
  });

  describe('Validation-Only', () => {
    it('should validate without executing using validate()', () => {
      registry.register(validatingTool);

      const result = executor.validate('validating_tool', {});

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('required_field is missing');
    });

    it('should return error for unknown tool in validate()', () => {
      const result = executor.validate('nonexistent_tool', {});

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Unknown tool: nonexistent_tool');
    });

    it('should return valid:true for tools without validate method', () => {
      registry.register(successTool);

      const result = executor.validate('success_tool', { value: 'test' });

      expect(result.valid).toBe(true);
    });
  });
});
