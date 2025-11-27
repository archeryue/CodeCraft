// src/types/executor.ts

import { ToolContext, ToolResult } from './tool';

export interface ExecutionOptions {
  // Timeout in milliseconds
  timeout?: number;

  // Skip validation
  skipValidation?: boolean;

  // Retry configuration
  retry?: {
    maxAttempts: number;
    delayMs: number;
    backoffMultiplier?: number;
  };
}

export interface ToolExecutor {
  // Execute a tool by name
  execute(
    name: string,
    params: unknown,
    options?: ExecutionOptions
  ): Promise<ToolResult>;

  // Execute with custom context
  executeWithContext(
    name: string,
    params: unknown,
    context: ToolContext,
    options?: ExecutionOptions
  ): Promise<ToolResult>;

  // Validate parameters without executing
  validate(name: string, params: unknown): { valid: boolean; errors?: string[] };

  // Get execution statistics
  getStats(): {
    totalExecutions: number;
    successCount: number;
    errorCount: number;
    averageExecutionTimeMs: number;
    executionsByTool: Record<string, number>;
  };
}
