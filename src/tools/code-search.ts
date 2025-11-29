// src/tools/code-search.ts
// Unified code search tool consolidating SearchCode, InspectSymbol, and FindReferences

import { Tool, ToolContext, ToolResult } from '../types/tool';
import { SchemaType } from '@google/generative-ai';

type CodeSearchMode = 'search' | 'definition' | 'references';

interface CodeSearchParams {
  query: string;
  mode?: CodeSearchMode;
  file?: string;
  path?: string;
}

export const codeSearchTool: Tool = {
  name: 'CodeSearch',
  description: `Unified AST-based code search. Modes:
- search (default): Fuzzy symbol search across codebase
- definition: Get symbol type/signature (requires file parameter)
- references: Find all usages of a symbol`,
  version: '1.0.0',

  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: {
        type: SchemaType.STRING,
        description: 'Symbol name to search for'
      },
      mode: {
        type: SchemaType.STRING,
        description: 'Search mode: "search" (default), "definition", or "references"',
        enum: ['search', 'definition', 'references']
      },
      file: {
        type: SchemaType.STRING,
        description: 'File path (required for "definition" mode)'
      },
      path: {
        type: SchemaType.STRING,
        description: 'Search directory (default: current directory)'
      }
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
    const p = params as CodeSearchParams;

    // Validate mode, default to 'search'
    const validModes: CodeSearchMode[] = ['search', 'definition', 'references'];
    const mode: CodeSearchMode = validModes.includes(p.mode as CodeSearchMode)
      ? (p.mode as CodeSearchMode)
      : 'search';

    // Check if Rust engine is available
    if (!context.rustEngine) {
      return {
        success: false,
        error: { code: 'ENGINE_NOT_AVAILABLE', message: 'Rust engine not available' },
        metadata: { executionTimeMs: Date.now() - startTime, mode }
      };
    }

    // Definition mode requires file parameter
    if (mode === 'definition' && !p.file) {
      return {
        success: false,
        error: {
          code: 'MISSING_FILE',
          message: 'The "file" parameter is required for definition mode'
        },
        metadata: { executionTimeMs: Date.now() - startTime, mode }
      };
    }

    try {
      let result: any;

      switch (mode) {
        case 'search': {
          // Fuzzy symbol search
          if (!context.rustEngine.search) {
            return {
              success: false,
              error: { code: 'ENGINE_NOT_AVAILABLE', message: 'Search function not available' },
              metadata: { executionTimeMs: Date.now() - startTime, mode }
            };
          }
          const searchPath = resolvePath(p.path, context.cwd);
          result = context.rustEngine.search(searchPath, p.query);
          break;
        }

        case 'definition': {
          // Get symbol definition info
          if (!context.rustEngine.getSymbolInfo) {
            return {
              success: false,
              error: { code: 'ENGINE_NOT_AVAILABLE', message: 'Symbol info function not available' },
              metadata: { executionTimeMs: Date.now() - startTime, mode }
            };
          }
          const filePath = p.file!.startsWith('/') ? p.file! : `${context.cwd}/${p.file}`;
          result = context.rustEngine.getSymbolInfo(filePath, p.query);

          if (!result) {
            return {
              success: false,
              error: {
                code: 'SYMBOL_NOT_FOUND',
                message: `Symbol '${p.query}' not found in ${p.file}`
              },
              metadata: { executionTimeMs: Date.now() - startTime, mode }
            };
          }
          break;
        }

        case 'references': {
          // Find all references
          if (!context.rustEngine.findReferences) {
            return {
              success: false,
              error: { code: 'ENGINE_NOT_AVAILABLE', message: 'Find references function not available' },
              metadata: { executionTimeMs: Date.now() - startTime, mode }
            };
          }
          const refsPath = resolvePath(p.path, context.cwd);
          result = context.rustEngine.findReferences(p.query, refsPath);
          break;
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
        error: { code: 'SEARCH_ERROR', message: err.message },
        metadata: { executionTimeMs: Date.now() - startTime, mode }
      };
    }
  }
};

/**
 * Resolve a path relative to cwd, handling special cases
 */
function resolvePath(inputPath: string | undefined, cwd: string): string {
  if (!inputPath || inputPath === '.') {
    return cwd;
  }
  if (inputPath.startsWith('/')) {
    return inputPath;
  }
  return `${cwd}/${inputPath}`;
}

export default codeSearchTool;
