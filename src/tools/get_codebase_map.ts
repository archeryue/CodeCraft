// src/tools/get_codebase_map.ts

import { Tool, ToolContext, ToolResult } from '../types/tool';
import { SchemaType } from '@google/generative-ai';

export const getCodebaseMapTool: Tool = {
  name: 'get_codebase_map',
  description: 'Generates AST-based skeleton of codebase. Shows function/class signatures.',
  version: '1.0.0',

  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      path: { type: SchemaType.STRING, description: 'Directory path (default: ".")' }
    },
    required: []
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
    const p = params as { path?: string };

    if (!context.rustEngine?.generateRepoMap) {
      return { success: false, error: { code: 'ENGINE_NOT_AVAILABLE', message: 'Rust engine not available' } };
    }

    try {
      const map = context.rustEngine.generateRepoMap(p.path || '.');
      return {
        success: true,
        data: map,
        metadata: { executionTimeMs: Date.now() - startTime }
      };
    } catch (err: any) {
      return { success: false, error: { code: 'MAP_ERROR', message: err.message }, metadata: { executionTimeMs: Date.now() - startTime } };
    }
  }
};

export default getCodebaseMapTool;
