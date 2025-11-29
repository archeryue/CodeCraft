// src/analysis/extract-conventions.ts
// Extracts coding conventions from codebase

import * as fs from 'fs';
import * as path from 'path';
import fg from 'fast-glob';

export interface CodeConventions {
  functionNaming: string;
  classNaming: string;
  constantNaming: string;
  indentStyle: 'spaces' | 'tabs';
  indentSize: number;
  quoteStyle: 'single' | 'double';
  useSemicolons: boolean;
  testLocation: string;
  testPattern: string;
}

export async function extractConventions(projectPath: string = '.'): Promise<CodeConventions> {
  const conventions: CodeConventions = {
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
    cwd: projectPath,
    ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts'],
    onlyFiles: true
  });

  if (files.length === 0) {
    return conventions;
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
    const content = fs.readFileSync(path.join(projectPath, file), 'utf-8');
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
  if (fs.existsSync(path.join(projectPath, 'tests'))) {
    conventions.testLocation = 'tests';
  } else if (fs.existsSync(path.join(projectPath, '__tests__'))) {
    conventions.testLocation = '__tests__';
  } else if (fs.existsSync(path.join(projectPath, 'test'))) {
    conventions.testLocation = 'test';
  }

  // Detect test pattern
  const testFiles = await fg('**/*.{test,spec}.{ts,tsx,js,jsx}', {
    cwd: projectPath,
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

  return conventions;
}
