// src/tools/resolve_symbol.ts

import { Tool, ToolContext, ToolResult } from '../types/tool';
import { SchemaType } from '@google/generative-ai';

export const resolveSymbolTool: Tool = {
  name: 'resolve_symbol',
  description: 'Finds where a symbol is defined. Follows imports to locate definition.',
  version: '1.0.0',

  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      symbol: { type: SchemaType.STRING, description: 'Symbol name' },
      file: { type: SchemaType.STRING, description: 'File where symbol is used' }
    },
    required: ['symbol', 'file']
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
    const p = params as { symbol: string; file: string };

    if (!context.rustEngine?.resolveSymbol) {
      return { success: false, error: { code: 'ENGINE_NOT_AVAILABLE', message: 'Rust engine not available' } };
    }

    try {
      const location = context.rustEngine.resolveSymbol(p.symbol, p.file);
      if (!location) {
        return {
          success: false,
          error: { code: 'SYMBOL_NOT_FOUND', message: `Symbol '${p.symbol}' not found in ${p.file}` },
          metadata: { executionTimeMs: Date.now() - startTime }
        };
      }
      return {
        success: true,
        data: location,
        metadata: { executionTimeMs: Date.now() - startTime }
      };
    } catch (err: any) {
      return { success: false, error: { code: 'RESOLVE_ERROR', message: err.message }, metadata: { executionTimeMs: Date.now() - startTime } };
    }
  }
};

export default resolveSymbolTool;
