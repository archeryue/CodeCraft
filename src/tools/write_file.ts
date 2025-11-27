// src/tools/write_file.ts

import { Tool, ToolContext, ToolResult } from '../types/tool';
import { SchemaType } from '@google/generative-ai';
import { createTwoFilesPatch } from 'diff';

export const writeFileTool: Tool = {
  name: 'write_file',

  description: 'Writes content to a file. Overwrites existing content. Shows diff for confirmation if file exists.',

  version: '1.0.0',

  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for writing a file',
    properties: {
      path: {
        type: SchemaType.STRING,
        description: 'The relative path to the file'
      },
      content: {
        type: SchemaType.STRING,
        description: 'The content to write'
      }
    },
    required: ['path', 'content']
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

    if (p.content === undefined || typeof p.content !== 'string') {
      errors.push('content is required and must be a string');
    }

    return { valid: errors.length === 0, errors };
  },

  async execute(params: unknown, context: ToolContext): Promise<ToolResult> {
    const startTime = Date.now();
    const p = params as { path: string; content: string };

    try {
      // Check if file exists and if we need confirmation
      if (context.confirm && context.fs.existsSync(p.path)) {
        const oldContent = context.fs.readFileSync(p.path, 'utf-8');
        const diff = createTwoFilesPatch(p.path, p.path, oldContent, p.content);

        const allowed = await context.confirm(diff);
        if (!allowed) {
          return {
            success: false,
            error: {
              code: 'USER_CANCELLED',
              message: 'User cancelled the operation.',
              details: { path: p.path }
            },
            metadata: {
              executionTimeMs: Date.now() - startTime
            }
          };
        }
      }

      // Write the file
      context.fs.writeFileSync(p.path, p.content);

      return {
        success: true,
        data: `Successfully wrote to ${p.path}`,
        metadata: {
          executionTimeMs: Date.now() - startTime,
          bytesWritten: Buffer.byteLength(p.content, 'utf-8'),
          filesAccessed: [p.path]
        }
      };
    } catch (err: any) {
      return {
        success: false,
        error: {
          code: 'WRITE_ERROR',
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

export default writeFileTool;
