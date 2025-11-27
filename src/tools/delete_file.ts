// src/tools/delete_file.ts

import { Tool, ToolContext, ToolResult } from '../types/tool';
import { SchemaType } from '@google/generative-ai';

export const deleteFileTool: Tool = {
  name: 'delete_file',
  description: 'Deletes a file. Cannot delete directories.',
  version: '1.0.0',

  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for deleting a file',
    properties: {
      path: {
        type: SchemaType.STRING,
        description: 'The relative path to the file to delete'
      }
    },
    required: ['path']
  },

  capabilities: {
    writesFiles: true,
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

    // Security check: prevent path traversal
    if (p.path && p.path.includes('..')) {
      errors.push('Path traversal not allowed');
    }

    return { valid: errors.length === 0, errors };
  },

  async execute(params: unknown, context: ToolContext): Promise<ToolResult> {
    const startTime = Date.now();
    const p = params as { path: string };

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

      // Check if it's a directory
      const stats = context.fs.statSync(p.path);
      if (stats.isDirectory()) {
        return {
          success: false,
          error: {
            code: 'IS_DIRECTORY',
            message: `Cannot delete directory with delete_file: ${p.path}`,
            details: { path: p.path }
          }
        };
      }

      // Delete the file
      context.fs.unlinkSync(p.path);

      return {
        success: true,
        data: `Successfully deleted file: ${p.path}`,
        metadata: {
          executionTimeMs: Date.now() - startTime,
          filesAccessed: [p.path]
        }
      };
    } catch (err: any) {
      return {
        success: false,
        error: {
          code: 'DELETE_ERROR',
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

export default deleteFileTool;
