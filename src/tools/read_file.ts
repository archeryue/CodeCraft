// src/tools/read_file.ts

import { Tool, ToolContext, ToolResult, ToolCapabilities, ToolParameterSchema } from '../types/tool';
import { SchemaType } from '@google/generative-ai';

export const readFileTool: Tool = {
  name: 'read_file',

  description: 'Reads the content of a file. Use this to examine code. Supports offset/limit for large files.',

  version: '1.0.0',

  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for reading a file',
    properties: {
      path: {
        type: SchemaType.STRING,
        description: 'The relative path to the file'
      },
      offset: {
        type: SchemaType.NUMBER,
        description: 'Line number to start reading from (0-based, optional)'
      },
      limit: {
        type: SchemaType.NUMBER,
        description: 'Number of lines to read (optional)'
      }
    },
    required: ['path']
  },

  capabilities: {
    writesFiles: false,
    executesCommands: false,
    requiresRustEngine: false,
    accessesNetwork: false,
    idempotent: true,
    retryable: true
  },

  validate(params: unknown): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];
    const p = params as any;

    if (!p.path || typeof p.path !== 'string') {
      errors.push('path is required and must be a string');
    }

    if (p.offset !== undefined && typeof p.offset !== 'number') {
      errors.push('offset must be a number');
    }

    if (p.limit !== undefined && typeof p.limit !== 'number') {
      errors.push('limit must be a number');
    }

    if (p.offset !== undefined && p.offset < 0) {
      errors.push('offset must be non-negative');
    }

    if (p.limit !== undefined && p.limit <= 0) {
      errors.push('limit must be positive');
    }

    return { valid: errors.length === 0, errors };
  },

  async execute(params: unknown, context: ToolContext): Promise<ToolResult> {
    const startTime = Date.now();
    const p = params as { path: string; offset?: number; limit?: number };

    try {
      // Check if file exists
      if (!context.fs.existsSync(p.path)) {
        return {
          success: false,
          error: {
            code: 'FILE_NOT_FOUND',
            message: `File not found: ${p.path}`,
            details: { path: p.path }
          }
        };
      }

      // Read file content
      const content = context.fs.readFileSync(p.path, 'utf-8');
      const lines = content.split('\n');

      // Apply offset and limit
      let selectedLines: string[];
      const offset = p.offset ?? 0;

      if (p.limit !== undefined) {
        selectedLines = lines.slice(offset, offset + p.limit);
      } else {
        selectedLines = lines.slice(offset);
      }

      const result = selectedLines.join('\n');

      return {
        success: true,
        data: result,
        metadata: {
          executionTimeMs: Date.now() - startTime,
          bytesRead: Buffer.byteLength(result, 'utf-8'),
          filesAccessed: [p.path]
        }
      };
    } catch (err: any) {
      return {
        success: false,
        error: {
          code: 'READ_ERROR',
          message: err.message,
          details: { path: p.path }
        },
        metadata: {
          executionTimeMs: Date.now() - startTime
        }
      };
    }
  }
};

export default readFileTool;
