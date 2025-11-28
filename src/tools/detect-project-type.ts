// src/tools/detect_project_type.ts

import { Tool, ToolContext, ToolResult } from '../types/tool';
import { SchemaType } from '@google/generative-ai';
import * as path from 'path';

export const detectProjectTypeTool: Tool = {
  name: 'DetectProjectType',
  description: 'Detects project type, languages, frameworks, and tooling (node/rust/python, TypeScript, test frameworks, linters).',
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
    const detectPath = p.path || '.';

    if (!context.fs.existsSync(detectPath)) {
      return {
        success: false,
        error: {
          code: 'DIR_NOT_FOUND',
          message: `Directory not found: ${detectPath}`
        },
        metadata: { executionTimeMs: Date.now() - startTime }
      };
    }

    try {
      const projectInfo: any = {
        type: 'unknown',
        typescript: false,
        testFramework: null,
        linter: null,
        packageManager: null
      };

      // Check for Node.js project
      const packageJsonPath = path.join(detectPath, 'package.json');
      if (context.fs.existsSync(packageJsonPath)) {
        projectInfo.type = 'node';
        const packageJson = JSON.parse(context.fs.readFileSync(packageJsonPath, 'utf-8'));

        // Check for TypeScript
        if (packageJson.devDependencies?.typescript || packageJson.dependencies?.typescript) {
          projectInfo.typescript = true;
        }
        // Check tsconfig.json
        if (context.fs.existsSync(path.join(detectPath, 'tsconfig.json'))) {
          projectInfo.typescript = true;
        }

        // Detect test framework
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
        if (deps.vitest) projectInfo.testFramework = 'vitest';
        else if (deps.jest) projectInfo.testFramework = 'jest';
        else if (deps.mocha) projectInfo.testFramework = 'mocha';

        // Detect linter
        if (deps.eslint) projectInfo.linter = 'eslint';
        else if (deps.prettier) projectInfo.linter = 'prettier';

        // Detect package manager
        if (context.fs.existsSync(path.join(detectPath, 'yarn.lock'))) {
          projectInfo.packageManager = 'yarn';
        } else if (context.fs.existsSync(path.join(detectPath, 'pnpm-lock.yaml'))) {
          projectInfo.packageManager = 'pnpm';
        } else if (context.fs.existsSync(path.join(detectPath, 'package-lock.json'))) {
          projectInfo.packageManager = 'npm';
        }
      }

      // Check for Rust project
      const cargoPath = path.join(detectPath, 'Cargo.toml');
      if (context.fs.existsSync(cargoPath)) {
        if (projectInfo.type === 'node') {
          projectInfo.type = 'node+rust';
        } else {
          projectInfo.type = 'rust';
        }
        projectInfo.testFramework = projectInfo.testFramework || 'cargo test';
      }

      // Check for Python project
      const pythonIndicators = ['setup.py', 'pyproject.toml', 'requirements.txt'];
      for (const indicator of pythonIndicators) {
        if (context.fs.existsSync(path.join(detectPath, indicator))) {
          if (projectInfo.type === 'unknown') {
            projectInfo.type = 'python';
          }
          break;
        }
      }

      return {
        success: true,
        data: projectInfo,
        metadata: { executionTimeMs: Date.now() - startTime }
      };
    } catch (err: any) {
      return {
        success: false,
        error: {
          code: 'DETECT_ERROR',
          message: err.message
        },
        metadata: { executionTimeMs: Date.now() - startTime }
      };
    }
  }
};

export default detectProjectTypeTool;
