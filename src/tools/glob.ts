// src/tools/glob.ts

import { Tool, ToolContext, ToolResult } from '../types/tool';
import { SchemaType } from '@google/generative-ai';
import fg from 'fast-glob';
import * as path from 'path';

export const globTool: Tool = {
  name: 'Glob',
  description: 'Finds files matching a glob pattern (e.g., **/*.ts). Fast file discovery.',
  version: '1.0.0',

  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      pattern: { type: SchemaType.STRING, description: 'Glob pattern (e.g., **/*.ts)' },
      path: { type: SchemaType.STRING, description: 'Search directory (default: ".")' }
    },
    required: ['pattern']
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
    const p = params as { pattern: string; path?: string };
    const relativePath = p.path || '.';

    // Resolve path relative to context.cwd for fixture support
    const searchPath = path.isAbsolute(relativePath)
      ? relativePath
      : path.join(context.cwd, relativePath);

    try {
      if (!context.fs.existsSync(searchPath)) {
        return { success: false, error: { code: 'DIR_NOT_FOUND', message: `Directory not found: ${relativePath}` } };
      }

      const files = await fg(p.pattern, {
        cwd: searchPath,
        ignore: ['**/node_modules/**', '**/.*/**', '**/.git/**'],
        dot: false,
        onlyFiles: true
      });

      return {
        success: true,
        data: files,
        metadata: { executionTimeMs: Date.now() - startTime }
      };
    } catch (err: any) {
      return { success: false, error: { code: 'GLOB_ERROR', message: err.message }, metadata: { executionTimeMs: Date.now() - startTime } };
    }
  }
};

export default globTool;
