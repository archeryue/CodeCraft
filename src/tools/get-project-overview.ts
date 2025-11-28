// src/tools/get_project_overview.ts

import { Tool, ToolContext, ToolResult } from '../types/tool';
import { SchemaType } from '@google/generative-ai';
import * as path from 'path';

export const getProjectOverviewTool: Tool = {
  name: 'GetProjectOverview',
  description: 'Generates comprehensive project overview from package.json, README.md, and CLAUDE.md.',
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
    const projPath = p.path || '.';

    if (!context.fs.existsSync(projPath)) {
      return {
        success: false,
        error: {
          code: 'DIR_NOT_FOUND',
          message: `Directory not found: ${projPath}`
        },
        metadata: { executionTimeMs: Date.now() - startTime }
      };
    }

    try {
      const overview: any = {
        sources: []
      };

      // 1. Read package.json for metadata
      const packageJsonPath = path.join(projPath, 'package.json');
      if (context.fs.existsSync(packageJsonPath)) {
        const pkg = JSON.parse(context.fs.readFileSync(packageJsonPath, 'utf-8'));
        overview.techStack = {
          name: pkg.name,
          version: pkg.version,
          description: pkg.description,
          languages: []
        };
        overview.purpose = pkg.description || '';
        overview.sources.push('package.json');

        // Detect languages from dependencies
        const allDeps = {
          ...pkg.dependencies,
          ...pkg.devDependencies
        };
        if (allDeps.typescript || pkg.devDependencies?.typescript) {
          overview.techStack.languages.push('TypeScript');
        }
        if (allDeps['@types/node']) {
          overview.techStack.languages.push('Node.js');
        }
      }

      // 2. Read README.md for project overview
      const readmePath = path.join(projPath, 'README.md');
      if (context.fs.existsSync(readmePath)) {
        const readme = context.fs.readFileSync(readmePath, 'utf-8');
        const lines = readme.split('\n').slice(0, 50); // First 50 lines

        // Extract first paragraph as purpose if not already set
        if (!overview.purpose || overview.purpose.length < 20) {
          const firstPara = lines.find(line => line.trim().length > 20 && !line.startsWith('#'));
          if (firstPara) {
            overview.purpose = firstPara.trim();
          }
        }

        overview.sources.push('README.md');
      }

      // 3. Read CLAUDE.md for architecture details
      const claudeMdPath = path.join(projPath, 'CLAUDE.md');
      if (context.fs.existsSync(claudeMdPath)) {
        const claudeMd = context.fs.readFileSync(claudeMdPath, 'utf-8');

        // Extract architecture section
        overview.architecture = {
          details: 'See CLAUDE.md for comprehensive architecture documentation'
        };

        // Look for key architecture terms
        if (claudeMd.toLowerCase().includes('hybrid')) {
          overview.architecture.type = 'Hybrid';
        }
        if (claudeMd.toLowerCase().includes('rust')) {
          if (!overview.techStack) overview.techStack = { languages: [] };
          if (!overview.techStack.languages.includes('Rust')) {
            overview.techStack.languages.push('Rust');
          }
          if (claudeMd.toLowerCase().includes('napi')) {
            overview.architecture.notes = 'Uses Rust engine via NAPI-RS bindings';
          }
        }

        overview.sources.push('CLAUDE.md');
      }

      // 4. Detect entry points
      overview.entryPoints = [];
      const commonEntryPoints = ['index.ts', 'index.js', 'main.ts', 'main.js', 'src/index.ts', 'src/main.ts'];
      for (const entry of commonEntryPoints) {
        if (context.fs.existsSync(path.join(projPath, entry))) {
          overview.entryPoints.push(entry);
        }
      }

      // 5. Check for usage instructions
      if (context.fs.existsSync(readmePath)) {
        const readme = context.fs.readFileSync(readmePath, 'utf-8');
        const usageMatch = readme.match(/##\s*Usage[\s\S]{0,500}/i) ||
                          readme.match(/##\s*Getting Started[\s\S]{0,500}/i) ||
                          readme.match(/##\s*Quick Start[\s\S]{0,500}/i);
        if (usageMatch) {
          overview.usage = {
            instructions: usageMatch[0].split('\n').slice(0, 10).join('\n')
          };
        }
      }

      // 6. Detect package manager
      if (context.fs.existsSync(path.join(projPath, 'package-lock.json'))) {
        if (!overview.techStack) overview.techStack = {};
        overview.techStack.packageManager = 'npm';
      } else if (context.fs.existsSync(path.join(projPath, 'yarn.lock'))) {
        if (!overview.techStack) overview.techStack = {};
        overview.techStack.packageManager = 'yarn';
      } else if (context.fs.existsSync(path.join(projPath, 'pnpm-lock.yaml'))) {
        if (!overview.techStack) overview.techStack = {};
        overview.techStack.packageManager = 'pnpm';
      }

      return {
        success: true,
        data: overview,
        metadata: { executionTimeMs: Date.now() - startTime }
      };
    } catch (err: any) {
      return {
        success: false,
        error: {
          code: 'OVERVIEW_ERROR',
          message: err.message
        },
        metadata: { executionTimeMs: Date.now() - startTime }
      };
    }
  }
};

export default getProjectOverviewTool;
