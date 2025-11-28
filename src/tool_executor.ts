// src/tool-executor.ts

import { ToolContext, ToolResult } from './types/tool';
import { ToolExecutor, ExecutionOptions } from './types/executor';
import { ToolRegistry } from './types/registry';

export class DefaultToolExecutor implements ToolExecutor {
  private registry: ToolRegistry;
  private defaultContext: ToolContext;
  private stats = {
    totalExecutions: 0,
    successCount: 0,
    errorCount: 0,
    totalExecutionTimeMs: 0,
    executionsByTool: {} as Record<string, number>
  };

  constructor(registry: ToolRegistry, context: ToolContext) {
    this.registry = registry;
    this.defaultContext = context;
  }

  async execute(
    name: string,
    params: unknown,
    options?: ExecutionOptions
  ): Promise<ToolResult> {
    return this.executeWithContext(name, params, this.defaultContext, options);
  }

  async executeWithContext(
    name: string,
    params: unknown,
    context: ToolContext,
    options?: ExecutionOptions
  ): Promise<ToolResult> {
    const tool = this.registry.get(name);

    if (!tool) {
      return {
        success: false,
        error: {
          code: 'TOOL_NOT_FOUND',
          message: `Unknown tool: ${name}`
        }
      };
    }

    // Validate parameters
    if (!options?.skipValidation && tool.validate) {
      const validation = tool.validate(params);
      if (!validation.valid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid parameters',
            details: validation.errors
          }
        };
      }
    }

    // Execute with timeout
    const timeout = options?.timeout ?? 30000;
    const startTime = Date.now();

    try {
      const result = await Promise.race([
        tool.execute(params, context),
        new Promise<ToolResult>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), timeout)
        )
      ]);

      // Update stats
      this.stats.totalExecutions++;
      this.stats.executionsByTool[name] = (this.stats.executionsByTool[name] || 0) + 1;
      this.stats.totalExecutionTimeMs += Date.now() - startTime;

      if (result.success) {
        this.stats.successCount++;
      } else {
        this.stats.errorCount++;
      }

      return result;
    } catch (err: any) {
      this.stats.totalExecutions++;
      this.stats.errorCount++;
      this.stats.executionsByTool[name] = (this.stats.executionsByTool[name] || 0) + 1;

      return {
        success: false,
        error: {
          code: err.message === 'Timeout' ? 'TIMEOUT' : 'EXECUTION_ERROR',
          message: err.message
        },
        metadata: {
          executionTimeMs: Date.now() - startTime
        }
      };
    }
  }

  validate(name: string, params: unknown): { valid: boolean; errors?: string[] } {
    const tool = this.registry.get(name);

    if (!tool) {
      return { valid: false, errors: [`Unknown tool: ${name}`] };
    }

    if (!tool.validate) {
      return { valid: true };
    }

    return tool.validate(params);
  }

  getStats() {
    return {
      ...this.stats,
      averageExecutionTimeMs: this.stats.totalExecutions > 0
        ? this.stats.totalExecutionTimeMs / this.stats.totalExecutions
        : 0
    };
  }
}
