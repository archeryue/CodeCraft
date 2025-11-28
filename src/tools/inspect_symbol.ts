// src/tools/inspect_symbol.ts

import { Tool, ToolContext, ToolResult } from '../types/tool';
import { SchemaType } from '@google/generative-ai';

export const inspectSymbolTool: Tool = {
  name: 'inspect_symbol',
  description: 'Inspect a symbol: get detailed info (type, signature) or resolve its definition location. Defaults to "info" mode.',
  version: '1.0.0',

  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      symbol: { type: SchemaType.STRING, description: 'Symbol name to inspect' },
      file: { type: SchemaType.STRING, description: 'File path containing the symbol' },
      mode: {
        type: SchemaType.STRING,
        description: 'Mode: "info" (default, get details) or "resolve" (find definition location)',
        enum: ['info', 'resolve']
      }
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
    const p = params as { symbol: string; file: string; mode?: string };

    // Default to 'info' mode, handle invalid modes
    const mode = (p.mode === 'resolve') ? 'resolve' : 'info';

    // Check if Rust engine is available
    if (!context.rustEngine?.getSymbolInfo || !context.rustEngine?.resolveSymbol) {
      return {
        success: false,
        error: { code: 'ENGINE_NOT_AVAILABLE', message: 'Rust engine not available' }
      };
    }

    try {
      const filePath = p.file.startsWith('/') ? p.file : `${context.cwd}/${p.file}`;
      let result;

      if (mode === 'resolve') {
        // Resolve mode: find where symbol is defined
        // Note: resolveSymbol uses (symbol, file) order
        result = context.rustEngine.resolveSymbol(p.symbol, filePath);

        if (!result) {
          return {
            success: false,
            error: {
              code: 'SYMBOL_NOT_FOUND',
              message: `Cannot resolve symbol '${p.symbol}' from ${p.file}`
            },
            metadata: { executionTimeMs: Date.now() - startTime, mode }
          };
        }
      } else {
        // Info mode: get symbol details (default)
        // Note: getSymbolInfo uses (file, symbol) order
        result = context.rustEngine.getSymbolInfo(filePath, p.symbol);

        if (!result) {
          return {
            success: false,
            error: {
              code: 'SYMBOL_NOT_FOUND',
              message: `Symbol '${p.symbol}' not found in ${p.file}`
            },
            metadata: { executionTimeMs: Date.now() - startTime, mode }
          };
        }
      }

      return {
        success: true,
        data: result,
        metadata: { executionTimeMs: Date.now() - startTime, mode }
      };
    } catch (err: any) {
      return {
        success: false,
        error: { code: 'INSPECT_ERROR', message: err.message },
        metadata: { executionTimeMs: Date.now() - startTime, mode }
      };
    }
  }
};

export default inspectSymbolTool;
