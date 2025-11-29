// src/tools/grep.ts

import { Tool, ToolContext, ToolResult } from '../types/tool';
import { SchemaType } from '@google/generative-ai';
import fg from 'fast-glob';
import * as path from 'path';

export const grepTool: Tool = {
  name: 'Grep',
  description: 'Searches file contents using regex. Returns matches with line numbers.',
  version: '1.0.0',

  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      pattern: { type: SchemaType.STRING, description: 'Regex pattern to search' },
      path: { type: SchemaType.STRING, description: 'Directory (default: ".")' },
      include: { type: SchemaType.STRING, description: 'File pattern to include (e.g., *.ts)' },
      ignoreCase: { type: SchemaType.BOOLEAN, description: 'Case insensitive search' },
      contextLines: { type: SchemaType.NUMBER, description: 'Number of context lines (before and after)' },
      beforeContext: { type: SchemaType.NUMBER, description: 'Number of lines to show before match' },
      afterContext: { type: SchemaType.NUMBER, description: 'Number of lines to show after match' }
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
    const p = params as {
      pattern: string;
      path?: string;
      include?: string;
      ignoreCase?: boolean;
      contextLines?: number;
      beforeContext?: number;
      afterContext?: number;
    };
    const relativePath = p.path || '.';

    // Resolve path relative to context.cwd for fixture support
    const searchPath = path.isAbsolute(relativePath)
      ? relativePath
      : path.join(context.cwd, relativePath);

    // Validate path exists
    if (!context.fs.existsSync(searchPath)) {
      return {
        success: false,
        error: { code: 'PATH_NOT_FOUND', message: `Path not found: ${relativePath}` },
        metadata: { executionTimeMs: Date.now() - startTime }
      };
    }

    try {
      const globPattern = p.include || '**/*';
      const files = await fg(globPattern, {
        cwd: searchPath,
        ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/*.node'],
        onlyFiles: true
      });

      const regex = new RegExp(p.pattern, p.ignoreCase ? 'i' : '');
      const matches: any[] = [];

      // Determine context line counts
      let beforeLines = 0;
      let afterLines = 0;
      if (p.contextLines !== undefined) {
        beforeLines = afterLines = p.contextLines;
      }
      if (p.beforeContext !== undefined) {
        beforeLines = p.beforeContext;
      }
      if (p.afterContext !== undefined) {
        afterLines = p.afterContext;
      }

      for (const file of files) {
        try {
          const fullPath = path.join(searchPath, file);
          const content = context.fs.readFileSync(fullPath, 'utf-8');
          const lines = content.split('\n');

          lines.forEach((line, idx) => {
            if (regex.test(line)) {
              const match: any = { file, line: idx + 1, content: line.trim() };

              // Add context lines if requested
              if (beforeLines > 0 || afterLines > 0) {
                if (beforeLines > 0) {
                  const start = Math.max(0, idx - beforeLines);
                  match.contextBefore = lines.slice(start, idx).map((content, i) => ({
                    line: start + i + 1,
                    content
                  }));
                }
                if (afterLines > 0) {
                  const end = Math.min(lines.length, idx + afterLines + 1);
                  match.contextAfter = lines.slice(idx + 1, end).map((content, i) => ({
                    line: idx + i + 2,
                    content
                  }));
                }
              }

              matches.push(match);
            }
          });
        } catch {}
      }

      return {
        success: true,
        data: matches,
        metadata: { executionTimeMs: Date.now() - startTime }
      };
    } catch (err: any) {
      return { success: false, error: { code: 'GREP_ERROR', message: err.message }, metadata: { executionTimeMs: Date.now() - startTime } };
    }
  }
};

export default grepTool;
