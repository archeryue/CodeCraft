// src/tools/find_references.ts

import { Tool, ToolContext, ToolResult } from '../types/tool';
import { SchemaType } from '@google/generative-ai';

export const findReferencesTool: Tool = {
  name: 'find_references',
  description: 'Finds all usages of a symbol across the codebase. Critical for refactoring.',
  version: '1.0.0',

  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      symbol: { type: SchemaType.STRING, description: 'Symbol name' },
      path: { type: SchemaType.STRING, description: 'Search path (default: ".")' }
    },
    required: ['symbol']
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
    const p = params as { symbol: string; path?: string };

    if (!context.rustEngine?.findReferences) {
      return { success: false, error: { code: 'ENGINE_NOT_AVAILABLE', message: 'Rust engine not available' } };
    }

    try {
      const refs = context.rustEngine.findReferences(p.symbol, p.path || '.');
      return {
        success: true,
        data: refs,
        metadata: { executionTimeMs: Date.now() - startTime }
      };
    } catch (err: any) {
      return { success: false, error: { code: 'REFERENCES_ERROR', message: err.message }, metadata: { executionTimeMs: Date.now() - startTime } };
    }
  }
};

export default findReferencesTool;
