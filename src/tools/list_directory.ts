// src/tools/list_directory.ts

import { Tool, ToolContext, ToolResult } from '../types/tool';
import { SchemaType } from '@google/generative-ai';

export const listDirectoryTool: Tool = {
  name: 'list_directory',
  description: 'Lists files and directories in a given path. Filters hidden files.',
  version: '1.0.0',

  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for listing directory',
    properties: {
      path: { type: SchemaType.STRING, description: 'Directory path (default: ".")' }
    },
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

  async execute(params: unknown, context: ToolContext): Promise<ToolResult> {
    const startTime = Date.now();
    const p = params as { path?: string };
    const dirPath = p.path || '.';

    try {
      if (!context.fs.existsSync(dirPath)) {
        return {
          success: false,
          error: { code: 'DIR_NOT_FOUND', message: `Directory not found: ${dirPath}` }
        };
      }

      const entries = context.fs.readdirSync(dirPath, { withFileTypes: true });

      const result = entries
        .filter((entry: any) => !entry.name.startsWith('.'))
        .map((entry: any) => ({
          name: entry.name,
          type: entry.isDirectory() ? 'directory' : 'file'
        }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name));

      return {
        success: true,
        data: result,
        metadata: { executionTimeMs: Date.now() - startTime }
      };
    } catch (err: any) {
      return {
        success: false,
        error: { code: 'LIST_ERROR', message: err.message },
        metadata: { executionTimeMs: Date.now() - startTime }
      };
    }
  }
};

export default listDirectoryTool;
