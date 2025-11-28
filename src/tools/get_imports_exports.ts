// src/tools/get_imports_exports.ts

import { Tool, ToolContext, ToolResult } from '../types/tool';
import { SchemaType } from '@google/generative-ai';

export const getImportsExportsTool: Tool = {
  name: 'get_imports_exports',
  description: 'Shows what a file imports and exports. AST-based dependency analysis.',
  version: '1.0.0',

  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      file: { type: SchemaType.STRING, description: 'File path' }
    },
    required: ['file']
  },

  capabilities: {
    writesFiles: false,
    executesCommands: false,
    requiresRustEngine: true,
    accessesNetwork: false,
    idempotent: true,
    retryable: true
  },

  async execute(params: unknown, context: ToolContext): Promise<ToolResult> {
    const startTime = Date.now();
    const p = params as { file: string };

    if (!context.rustEngine?.getImportsExports) {
      return { success: false, error: { code: 'ENGINE_NOT_AVAILABLE', message: 'Rust engine not available' } };
    }

    try {
      const filePath = p.file.startsWith('/') ? p.file : `${context.cwd}/${p.file}`;
      const info = context.rustEngine.getImportsExports(filePath);
      if (!info) {
        return {
          success: false,
          error: { code: 'FILE_NOT_FOUND', message: `Could not analyze imports/exports for ${p.file}. File may not exist or is not a supported type.` },
          metadata: { executionTimeMs: Date.now() - startTime }
        };
      }
      return {
        success: true,
        data: info,
        metadata: { executionTimeMs: Date.now() - startTime }
      };
    } catch (err: any) {
      return { success: false, error: { code: 'IMPORTS_ERROR', message: err.message }, metadata: { executionTimeMs: Date.now() - startTime } };
    }
  }
};

export default getImportsExportsTool;
