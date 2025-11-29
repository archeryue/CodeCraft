// src/analysis/get-project-overview.ts
// Generates comprehensive project overview from metadata files

import * as fs from 'fs';
import * as path from 'path';

export interface ProjectOverview {
  purpose?: string;
  techStack?: {
    name?: string;
    version?: string;
    description?: string;
    languages: string[];
    packageManager?: string;
  };
  architecture?: {
    type?: string;
    details?: string;
    notes?: string;
  };
  entryPoints: string[];
  usage?: {
    instructions: string;
  };
  sources: string[];
}

export function getProjectOverview(projectPath: string = '.'): ProjectOverview {
  const overview: ProjectOverview = {
    entryPoints: [],
    sources: []
  };

  // 1. Read package.json for metadata
  const packageJsonPath = path.join(projectPath, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    overview.techStack = {
      name: pkg.name,
      version: pkg.version,
      description: pkg.description,
      languages: []
    };
    overview.purpose = pkg.description || '';
    overview.sources.push('package.json');

    // Detect languages from dependencies
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (allDeps.typescript || pkg.devDependencies?.typescript) {
      overview.techStack.languages.push('TypeScript');
    }
    if (allDeps['@types/node']) {
      overview.techStack.languages.push('Node.js');
    }
  }

  // 2. Read README.md for project overview
  const readmePath = path.join(projectPath, 'README.md');
  if (fs.existsSync(readmePath)) {
    const readme = fs.readFileSync(readmePath, 'utf-8');
    const lines = readme.split('\n').slice(0, 50);

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
  const claudeMdPath = path.join(projectPath, 'CLAUDE.md');
  if (fs.existsSync(claudeMdPath)) {
    const claudeMd = fs.readFileSync(claudeMdPath, 'utf-8');

    overview.architecture = {
      details: 'See CLAUDE.md for comprehensive architecture documentation'
    };

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
  const commonEntryPoints = ['index.ts', 'index.js', 'main.ts', 'main.js', 'src/index.ts', 'src/main.ts'];
  for (const entry of commonEntryPoints) {
    if (fs.existsSync(path.join(projectPath, entry))) {
      overview.entryPoints.push(entry);
    }
  }

  // 5. Check for usage instructions
  if (fs.existsSync(readmePath)) {
    const readme = fs.readFileSync(readmePath, 'utf-8');
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
  if (fs.existsSync(path.join(projectPath, 'package-lock.json'))) {
    if (!overview.techStack) overview.techStack = { languages: [] };
    overview.techStack.packageManager = 'npm';
  } else if (fs.existsSync(path.join(projectPath, 'yarn.lock'))) {
    if (!overview.techStack) overview.techStack = { languages: [] };
    overview.techStack.packageManager = 'yarn';
  } else if (fs.existsSync(path.join(projectPath, 'pnpm-lock.yaml'))) {
    if (!overview.techStack) overview.techStack = { languages: [] };
    overview.techStack.packageManager = 'pnpm';
  }

  return overview;
}
