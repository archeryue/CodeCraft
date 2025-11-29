// src/analysis/detect-project-type.ts
// Detects project type, languages, frameworks, and tooling

import * as fs from 'fs';
import * as path from 'path';

export interface ProjectTypeInfo {
  type: 'unknown' | 'node' | 'rust' | 'python' | 'node+rust';
  typescript: boolean;
  testFramework: string | null;
  linter: string | null;
  packageManager: string | null;
}

export function detectProjectType(projectPath: string = '.'): ProjectTypeInfo {
  const projectInfo: ProjectTypeInfo = {
    type: 'unknown',
    typescript: false,
    testFramework: null,
    linter: null,
    packageManager: null
  };

  // Check for Node.js project
  const packageJsonPath = path.join(projectPath, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    projectInfo.type = 'node';
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

    // Check for TypeScript
    if (packageJson.devDependencies?.typescript || packageJson.dependencies?.typescript) {
      projectInfo.typescript = true;
    }
    if (fs.existsSync(path.join(projectPath, 'tsconfig.json'))) {
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
    if (fs.existsSync(path.join(projectPath, 'yarn.lock'))) {
      projectInfo.packageManager = 'yarn';
    } else if (fs.existsSync(path.join(projectPath, 'pnpm-lock.yaml'))) {
      projectInfo.packageManager = 'pnpm';
    } else if (fs.existsSync(path.join(projectPath, 'package-lock.json'))) {
      projectInfo.packageManager = 'npm';
    }
  }

  // Check for Rust project
  const cargoPath = path.join(projectPath, 'Cargo.toml');
  if (fs.existsSync(cargoPath)) {
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
    if (fs.existsSync(path.join(projectPath, indicator))) {
      if (projectInfo.type === 'unknown') {
        projectInfo.type = 'python';
      }
      break;
    }
  }

  return projectInfo;
}
