// src/tools/edit_file.ts

import { Tool, ToolContext, ToolResult } from '../types/tool';
import { SchemaType } from '@google/generative-ai';

export const editFileTool: Tool = {
  name: 'EditFile',
  description: 'Edits a file by replacing old_string with new_string. Replaces only the first occurrence.',
  version: '1.0.0',

  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for editing a file',
    properties: {
      path: { type: SchemaType.STRING, description: 'File path' },
      old_string: { type: SchemaType.STRING, description: 'String to replace' },
      new_string: { type: SchemaType.STRING, description: 'Replacement string' }
    },
    required: ['path', 'old_string', 'new_string']
  },

  capabilities: {
    writesFiles: true,
    executesCommands: false,
    requiresRustEngine: false,
    accessesNetwork: false,
    idempotent: false,
    retryable: true
  },

  validate(params: unknown): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];
    const p = params as any;

    if (!p.path || typeof p.path !== 'string') errors.push('path required');
    if (!p.old_string || typeof p.old_string !== 'string') errors.push('old_string required');
    if (p.new_string === undefined || typeof p.new_string !== 'string') errors.push('new_string required');
    if (p.old_string && p.new_string !== undefined && p.old_string === p.new_string) {
      errors.push('old_string and new_string must be different');
    }

    return { valid: errors.length === 0, errors };
  },

  async execute(params: unknown, context: ToolContext): Promise<ToolResult> {
    const startTime = Date.now();
    const p = params as { path: string; old_string: string; new_string: string };

    try {
      if (!context.fs.existsSync(p.path)) {
        return {
          success: false,
          error: { code: 'FILE_NOT_FOUND', message: `File not found: ${p.path}` }
        };
      }

      const content = context.fs.readFileSync(p.path, 'utf-8');
      if (!content.includes(p.old_string)) {
        return {
          success: false,
          error: { code: 'STRING_NOT_FOUND', message: `old_string not found in ${p.path}` }
        };
      }

      const newContent = content.replace(p.old_string, p.new_string);
      context.fs.writeFileSync(p.path, newContent);

      return {
        success: true,
        data: `Edited ${p.path}`,
        metadata: { executionTimeMs: Date.now() - startTime, filesAccessed: [p.path] }
      };
    } catch (err: any) {
      return {
        success: false,
        error: { code: 'EDIT_ERROR', message: err.message },
        metadata: { executionTimeMs: Date.now() - startTime }
      };
    }
  }
};

export default editFileTool;
