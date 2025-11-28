// src/tools/search_code.ts

import { Tool, ToolContext, ToolResult } from '../types/tool';
import { SchemaType } from '@google/generative-ai';

export const searchCodeTool: Tool = {
  name: 'SearchCode',
  description: 'AST-based fuzzy search for code symbols. Fast symbol discovery.',
  version: '1.0.0',

  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: { type: SchemaType.STRING, description: 'Symbol to search for' },
      path: { type: SchemaType.STRING, description: 'Search directory (default: ".")' }
    },
    required: ['query']
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
    const p = params as { query: string; path?: string };

    if (!context.rustEngine?.search) {
      return { success: false, error: { code: 'ENGINE_NOT_AVAILABLE', message: 'Rust engine not available' } };
    }

    try {
      // Resolve path relative to context.cwd to support fixture isolation
      const searchPath = p.path || '.';
      const absolutePath = searchPath.startsWith('/')
        ? searchPath
        : `${context.cwd}/${searchPath}`.replace(/\/\.$/, '');

      const results = context.rustEngine.search(absolutePath, p.query);
      return {
        success: true,
        data: results,
        metadata: { executionTimeMs: Date.now() - startTime }
      };
    } catch (err: any) {
      return { success: false, error: { code: 'SEARCH_ERROR', message: err.message }, metadata: { executionTimeMs: Date.now() - startTime } };
    }
  }
};

export default searchCodeTool;
