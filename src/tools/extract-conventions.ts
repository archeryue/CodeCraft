// src/tools/extract_conventions.ts

import { Tool, ToolContext, ToolResult } from '../types/tool';
import { SchemaType } from '@google/generative-ai';
import * as path from 'path';
import fg from 'fast-glob';

export const extractConventionsTool: Tool = {
  name: 'ExtractConventions',
  description: 'Extracts coding conventions from codebase (naming, indentation, quotes, semicolons, test patterns).',
  version: '1.0.0',

  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      path: { type: SchemaType.STRING, description: 'Project path (default: ".")' }
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

  validate(params: unknown): { valid: boolean; errors?: string[] } {
    const p = params as { path?: string };
    const errors: string[] = [];

    if (p.path !== undefined && typeof p.path !== 'string') {
      errors.push('path must be a string');
    }

    return { valid: errors.length === 0, errors };
  },

  async execute(params: unknown, context: ToolContext): Promise<ToolResult> {
    const startTime = Date.now();
    const p = params as { path?: string };
    const convPath = p.path || '.';

    if (!context.fs.existsSync(convPath)) {
      return {
        success: false,
        error: {
          code: 'DIR_NOT_FOUND',
          message: `Directory not found: ${convPath}`
        },
        metadata: { executionTimeMs: Date.now() - startTime }
      };
    }

    try {
      const conventions: any = {
        functionNaming: 'camelCase',
        classNaming: 'PascalCase',
        constantNaming: 'UPPER_SNAKE_CASE',
        indentStyle: 'spaces',
        indentSize: 2,
        quoteStyle: 'single',
        useSemicolons: true,
        testLocation: 'tests',
        testPattern: '.test.ts'
      };

      // Find TypeScript/JavaScript files
      const files = await fg('**/*.{ts,tsx,js,jsx}', {
        cwd: convPath,
        ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts'],
        onlyFiles: true
      });

      if (files.length === 0) {
        return {
          success: true,
          data: conventions,
          metadata: { executionTimeMs: Date.now() - startTime }
        };
      }

      // Analyze first few files
      let singleQuotes = 0;
      let doubleQuotes = 0;
      let semicolons = 0;
      let noSemicolons = 0;
      let twoSpaces = 0;
      let fourSpaces = 0;
      let tabs = 0;

      const filesToAnalyze = files.slice(0, 10);
      for (const file of filesToAnalyze) {
        const content = context.fs.readFileSync(path.join(convPath, file), 'utf-8');
        const lines = content.split('\n');

        // Check quotes
        const singleMatches = content.match(/'/g) || [];
        const doubleMatches = content.match(/"/g) || [];
        singleQuotes += singleMatches.length;
        doubleQuotes += doubleMatches.length;

        // Check semicolons (at end of statements)
        const semiLines = lines.filter(l => l.trim().endsWith(';')).length;
        const nonSemiLines = lines.filter(l => {
          const trimmed = l.trim();
          return trimmed.length > 0 &&
            !trimmed.endsWith('{') &&
            !trimmed.endsWith('}') &&
            !trimmed.endsWith(',') &&
            !trimmed.startsWith('//') &&
            !trimmed.startsWith('*') &&
            !trimmed.endsWith(';');
        }).length;
        semicolons += semiLines;
        noSemicolons += nonSemiLines;

        // Check indentation
        for (const line of lines) {
          if (line.startsWith('  ') && !line.startsWith('    ')) twoSpaces++;
          else if (line.startsWith('    ')) fourSpaces++;
          else if (line.startsWith('\t')) tabs++;
        }
      }

      // Determine conventions
      conventions.quoteStyle = singleQuotes > doubleQuotes ? 'single' : 'double';
      conventions.useSemicolons = semicolons > noSemicolons;

      if (tabs > twoSpaces && tabs > fourSpaces) {
        conventions.indentStyle = 'tabs';
        conventions.indentSize = 1;
      } else if (fourSpaces > twoSpaces) {
        conventions.indentSize = 4;
      } else {
        conventions.indentSize = 2;
      }

      // Detect test location
      if (context.fs.existsSync(path.join(convPath, 'tests'))) {
        conventions.testLocation = 'tests';
      } else if (context.fs.existsSync(path.join(convPath, '__tests__'))) {
        conventions.testLocation = '__tests__';
      } else if (context.fs.existsSync(path.join(convPath, 'test'))) {
        conventions.testLocation = 'test';
      }

      // Detect test pattern
      const testFiles = await fg('**/*.{test,spec}.{ts,tsx,js,jsx}', {
        cwd: convPath,
        ignore: ['**/node_modules/**'],
        onlyFiles: true
      });
      if (testFiles.length > 0) {
        if (testFiles[0].includes('.spec.')) {
          conventions.testPattern = '.spec.ts';
        } else {
          conventions.testPattern = '.test.ts';
        }
      }

      return {
        success: true,
        data: conventions,
        metadata: { executionTimeMs: Date.now() - startTime }
      };
    } catch (err: any) {
      return {
        success: false,
        error: {
          code: 'EXTRACT_ERROR',
          message: err.message
        },
        metadata: { executionTimeMs: Date.now() - startTime }
      };
    }
  }
};

export default extractConventionsTool;
