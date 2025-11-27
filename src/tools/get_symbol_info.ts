// src/tools/get_symbol_info.ts

import { Tool, ToolContext, ToolResult } from '../types/tool';
import { SchemaType } from '@google/generative-ai';

export const getSymbolInfoTool: Tool = {
  name: 'get_symbol_info',
  description: 'Gets detailed information about a symbol (type, signature, location).',
  version: '1.0.0',

  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      symbol: { type: SchemaType.STRING, description: 'Symbol name' },
      file: { type: SchemaType.STRING, description: 'File path' }
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

    if (!context.rustEngine?.getSymbolInfo) {
      return { success: false, error: { code: 'ENGINE_NOT_AVAILABLE', message: 'Rust engine not available' } };
    }

    try {
      const info = context.rustEngine.getSymbolInfo(p.file, p.symbol);
      if (!info) {
        return {
          success: false,
          error: { code: 'SYMBOL_NOT_FOUND', message: `Symbol '${p.symbol}' not found in ${p.file}` },
          metadata: { executionTimeMs: Date.now() - startTime }
        };
      }
      return {
        success: true,
        data: info,
        metadata: { executionTimeMs: Date.now() - startTime }
      };
    } catch (err: any) {
      return { success: false, error: { code: 'SYMBOL_ERROR', message: err.message }, metadata: { executionTimeMs: Date.now() - startTime } };
    }
  }
};

export default getSymbolInfoTool;
