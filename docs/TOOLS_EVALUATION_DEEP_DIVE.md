# Tools Evaluation System - Deep Dive

This document expands on the evaluation system with detailed designs for advanced features.

---

## Table of Contents

1. [Fixture Management](#1-fixture-management)
2. [Golden Dataset Creation](#2-golden-dataset-creation)
3. [Scoring Algorithms](#3-scoring-algorithms)
4. [LLM Evaluation Methodology](#4-llm-evaluation-methodology)
5. [Statistical Analysis](#5-statistical-analysis)
6. [A/B Testing Framework](#6-ab-testing-framework)
7. [Continuous Evaluation Pipeline](#7-continuous-evaluation-pipeline)
8. [Edge Case Generation](#8-edge-case-generation)
9. [Coverage Analysis](#9-coverage-analysis)
10. [Regression Detection](#10-regression-detection)

---

## 1. Fixture Management

### 1.1 Fixture Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Fixture Manager                               │
│  - Creates isolated test environments                                │
│  - Manages fixture lifecycle                                         │
│  - Handles cleanup                                                   │
└─────────────────────────────────────────────────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        ▼                         ▼                         ▼
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│  In-Memory    │         │   Temp Dir    │         │   Snapshot    │
│   Fixtures    │         │   Fixtures    │         │   Fixtures    │
│ (MockFileSystem)│        │ (Real FS)     │         │ (Git worktree)│
└───────────────┘         └───────────────┘         └───────────────┘
```

### 1.2 Fixture Types

```typescript
// src/eval/fixtures/types.ts

/**
 * Base fixture specification
 */
export interface FixtureSpec {
  type: 'inline' | 'directory' | 'preset' | 'snapshot' | 'generated';
}

/**
 * Inline fixtures - files defined in the eval case
 */
export interface InlineFixture extends FixtureSpec {
  type: 'inline';
  files: Record<string, string | FileContent>;
  directories?: string[];
}

/**
 * File content with metadata
 */
export interface FileContent {
  content: string;
  encoding?: 'utf-8' | 'base64';
  mode?: number; // Unix file mode
}

/**
 * Directory fixture - copy from existing directory
 */
export interface DirectoryFixture extends FixtureSpec {
  type: 'directory';
  sourcePath: string;
  include?: string[]; // Glob patterns to include
  exclude?: string[]; // Glob patterns to exclude
}

/**
 * Preset fixture - use pre-built fixture by name
 */
export interface PresetFixture extends FixtureSpec {
  type: 'preset';
  name: string;
  overrides?: Record<string, string>; // Override specific files
}

/**
 * Snapshot fixture - use git snapshot
 */
export interface SnapshotFixture extends FixtureSpec {
  type: 'snapshot';
  repository: string;
  commit?: string;
  branch?: string;
  sparse?: string[]; // Sparse checkout paths
}

/**
 * Generated fixture - programmatically generated
 */
export interface GeneratedFixture extends FixtureSpec {
  type: 'generated';
  generator: string; // Name of registered generator
  config?: Record<string, unknown>;
}

export type AnyFixture =
  | InlineFixture
  | DirectoryFixture
  | PresetFixture
  | SnapshotFixture
  | GeneratedFixture;
```

### 1.3 Fixture Manager Implementation

```typescript
// src/eval/fixtures/manager.ts

export interface FixtureContext {
  rootPath: string;
  fs: FileSystemAbstraction;
  cleanup: () => Promise<void>;
}

export class FixtureManager {
  private presets: Map<string, AnyFixture> = new Map();
  private generators: Map<string, FixtureGenerator> = new Map();
  private tempDirs: Set<string> = new Set();

  /**
   * Register a preset fixture
   */
  registerPreset(name: string, fixture: AnyFixture): void {
    this.presets.set(name, fixture);
  }

  /**
   * Register a fixture generator
   */
  registerGenerator(name: string, generator: FixtureGenerator): void {
    this.generators.set(name, generator);
  }

  /**
   * Setup fixtures for an eval case
   */
  async setup(spec?: AnyFixture): Promise<FixtureContext> {
    if (!spec) {
      // No fixtures - use empty in-memory fs
      return {
        rootPath: '/virtual',
        fs: new MockFileSystem({}),
        cleanup: async () => {}
      };
    }

    switch (spec.type) {
      case 'inline':
        return this.setupInline(spec);
      case 'directory':
        return this.setupDirectory(spec);
      case 'preset':
        return this.setupPreset(spec);
      case 'snapshot':
        return this.setupSnapshot(spec);
      case 'generated':
        return this.setupGenerated(spec);
      default:
        throw new Error(`Unknown fixture type: ${(spec as any).type}`);
    }
  }

  /**
   * Setup inline fixtures (in-memory)
   */
  private async setupInline(spec: InlineFixture): Promise<FixtureContext> {
    const files: Record<string, string> = {};

    for (const [path, content] of Object.entries(spec.files)) {
      if (typeof content === 'string') {
        files[path] = content;
      } else {
        files[path] = content.encoding === 'base64'
          ? Buffer.from(content.content, 'base64').toString('utf-8')
          : content.content;
      }
    }

    const mockFs = new MockFileSystem(files);

    // Create directories
    if (spec.directories) {
      for (const dir of spec.directories) {
        mockFs.mkdirSync(dir, { recursive: true });
      }
    }

    return {
      rootPath: '.',
      fs: mockFs,
      cleanup: async () => {}
    };
  }

  /**
   * Setup directory fixtures (temp directory with real fs)
   */
  private async setupDirectory(spec: DirectoryFixture): Promise<FixtureContext> {
    const tempDir = await this.createTempDir();

    // Copy files from source
    await this.copyDirectory(
      spec.sourcePath,
      tempDir,
      spec.include,
      spec.exclude
    );

    return {
      rootPath: tempDir,
      fs: new RealFileSystem(),
      cleanup: async () => {
        await this.removeTempDir(tempDir);
      }
    };
  }

  /**
   * Setup preset fixtures
   */
  private async setupPreset(spec: PresetFixture): Promise<FixtureContext> {
    const preset = this.presets.get(spec.name);
    if (!preset) {
      throw new Error(`Unknown preset: ${spec.name}`);
    }

    // Setup the preset
    const context = await this.setup(preset);

    // Apply overrides
    if (spec.overrides) {
      for (const [path, content] of Object.entries(spec.overrides)) {
        await context.fs.writeFile(
          context.fs.join(context.rootPath, path),
          content
        );
      }
    }

    return context;
  }

  /**
   * Setup snapshot fixtures (git worktree)
   */
  private async setupSnapshot(spec: SnapshotFixture): Promise<FixtureContext> {
    const tempDir = await this.createTempDir();

    // Clone repository
    const ref = spec.commit || spec.branch || 'HEAD';

    if (spec.sparse && spec.sparse.length > 0) {
      // Sparse checkout
      await execAsync(`git clone --no-checkout --depth 1 ${spec.repository} ${tempDir}`);
      await execAsync(`cd ${tempDir} && git sparse-checkout init --cone`);
      await execAsync(`cd ${tempDir} && git sparse-checkout set ${spec.sparse.join(' ')}`);
      await execAsync(`cd ${tempDir} && git checkout ${ref}`);
    } else {
      // Full clone
      await execAsync(`git clone --depth 1 ${spec.repository} ${tempDir}`);
      if (spec.commit) {
        await execAsync(`cd ${tempDir} && git checkout ${spec.commit}`);
      }
    }

    return {
      rootPath: tempDir,
      fs: new RealFileSystem(),
      cleanup: async () => {
        await this.removeTempDir(tempDir);
      }
    };
  }

  /**
   * Setup generated fixtures
   */
  private async setupGenerated(spec: GeneratedFixture): Promise<FixtureContext> {
    const generator = this.generators.get(spec.generator);
    if (!generator) {
      throw new Error(`Unknown generator: ${spec.generator}`);
    }

    const files = await generator.generate(spec.config || {});
    const mockFs = new MockFileSystem(files);

    return {
      rootPath: '.',
      fs: mockFs,
      cleanup: async () => {}
    };
  }

  /**
   * Cleanup all temp directories
   */
  async cleanupAll(): Promise<void> {
    for (const dir of this.tempDirs) {
      await this.removeTempDir(dir);
    }
  }

  private async createTempDir(): Promise<string> {
    const tempDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'codecraft-eval-')
    );
    this.tempDirs.add(tempDir);
    return tempDir;
  }

  private async removeTempDir(dir: string): Promise<void> {
    await fs.promises.rm(dir, { recursive: true, force: true });
    this.tempDirs.delete(dir);
  }

  private async copyDirectory(
    src: string,
    dest: string,
    include?: string[],
    exclude?: string[]
  ): Promise<void> {
    const files = await fg('**/*', {
      cwd: src,
      ignore: exclude || [],
      onlyFiles: true
    });

    const filtered = include
      ? files.filter(f => include.some(p => minimatch(f, p)))
      : files;

    for (const file of filtered) {
      const srcPath = path.join(src, file);
      const destPath = path.join(dest, file);

      await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
      await fs.promises.copyFile(srcPath, destPath);
    }
  }
}

export interface FixtureGenerator {
  generate(config: Record<string, unknown>): Promise<Record<string, string>>;
}
```

### 1.4 Built-in Fixture Generators

```typescript
// src/eval/fixtures/generators.ts

/**
 * Generate a TypeScript project fixture
 */
export const typescriptProjectGenerator: FixtureGenerator = {
  async generate(config: {
    name?: string;
    files?: number;
    functions?: number;
    classes?: number;
    imports?: boolean;
  }): Promise<Record<string, string>> {
    const {
      name = 'test-project',
      files = 5,
      functions = 10,
      classes = 3,
      imports = true
    } = config;

    const result: Record<string, string> = {};

    // package.json
    result['package.json'] = JSON.stringify({
      name,
      version: '1.0.0',
      type: 'module',
      dependencies: {},
      devDependencies: {
        typescript: '^5.0.0'
      }
    }, null, 2);

    // tsconfig.json
    result['tsconfig.json'] = JSON.stringify({
      compilerOptions: {
        target: 'ES2020',
        module: 'ESNext',
        strict: true,
        outDir: './dist'
      },
      include: ['src/**/*']
    }, null, 2);

    // Generate source files
    for (let i = 0; i < files; i++) {
      const fileName = `src/module${i}.ts`;
      let content = '';

      // Add imports
      if (imports && i > 0) {
        content += `import { func${i-1}_0 } from './module${i-1}';\n\n`;
      }

      // Add functions
      const funcsPerFile = Math.ceil(functions / files);
      for (let j = 0; j < funcsPerFile; j++) {
        content += `export function func${i}_${j}(x: number): number {\n`;
        content += `  return x * ${i + j + 1};\n`;
        content += `}\n\n`;
      }

      // Add classes
      if (i < classes) {
        content += `export class Class${i} {\n`;
        content += `  private value: number;\n\n`;
        content += `  constructor(value: number) {\n`;
        content += `    this.value = value;\n`;
        content += `  }\n\n`;
        content += `  getValue(): number {\n`;
        content += `    return this.value;\n`;
        content += `  }\n`;
        content += `}\n`;
      }

      result[fileName] = content;
    }

    // Index file
    let indexContent = '';
    for (let i = 0; i < files; i++) {
      indexContent += `export * from './module${i}';\n`;
    }
    result['src/index.ts'] = indexContent;

    return result;
  }
};

/**
 * Generate a codebase with specific patterns for testing
 */
export const patternCodebaseGenerator: FixtureGenerator = {
  async generate(config: {
    patterns: ('async' | 'class' | 'interface' | 'type' | 'enum' | 'decorator')[];
    count?: number;
  }): Promise<Record<string, string>> {
    const { patterns, count = 5 } = config;
    const result: Record<string, string> = {};

    for (const pattern of patterns) {
      let content = '';

      for (let i = 0; i < count; i++) {
        switch (pattern) {
          case 'async':
            content += `export async function asyncFunc${i}(): Promise<void> {\n`;
            content += `  await new Promise(r => setTimeout(r, 100));\n`;
            content += `}\n\n`;
            break;

          case 'class':
            content += `export class MyClass${i} {\n`;
            content += `  constructor(public value: number) {}\n`;
            content += `}\n\n`;
            break;

          case 'interface':
            content += `export interface IEntity${i} {\n`;
            content += `  id: string;\n`;
            content += `  name: string;\n`;
            content += `}\n\n`;
            break;

          case 'type':
            content += `export type Type${i} = {\n`;
            content += `  field${i}: string;\n`;
            content += `  count: number;\n`;
            content += `};\n\n`;
            break;

          case 'enum':
            content += `export enum Status${i} {\n`;
            content += `  Active = 'ACTIVE',\n`;
            content += `  Inactive = 'INACTIVE',\n`;
            content += `}\n\n`;
            break;

          case 'decorator':
            content += `function decorator${i}(target: any) {\n`;
            content += `  return target;\n`;
            content += `}\n\n`;
            content += `@decorator${i}\n`;
            content += `export class Decorated${i} {}\n\n`;
            break;
        }
      }

      result[`src/${pattern}s.ts`] = content;
    }

    return result;
  }
};

/**
 * Generate error-prone code for error handling tests
 */
export const errorProneCodeGenerator: FixtureGenerator = {
  async generate(config: {
    errorTypes: ('syntax' | 'runtime' | 'type' | 'import')[];
  }): Promise<Record<string, string>> {
    const { errorTypes } = config;
    const result: Record<string, string> = {};

    if (errorTypes.includes('syntax')) {
      // Invalid syntax
      result['src/syntax_error.ts'] = `
        export function broken( {
          return 42
        }
      `;
    }

    if (errorTypes.includes('runtime')) {
      // Runtime errors
      result['src/runtime_error.ts'] = `
        export function willThrow(): never {
          throw new Error('Runtime error');
        }

        export function nullAccess(): string {
          const obj: any = null;
          return obj.property; // Will throw
        }
      `;
    }

    if (errorTypes.includes('type')) {
      // Type errors (would fail tsc)
      result['src/type_error.ts'] = `
        export function typeError(): string {
          const num: number = 42;
          return num; // Type error: number not assignable to string
        }
      `;
    }

    if (errorTypes.includes('import')) {
      // Missing imports
      result['src/import_error.ts'] = `
        import { NonExistent } from './missing_module';

        export function useImport(): void {
          console.log(NonExistent);
        }
      `;
    }

    return result;
  }
};
```

### 1.5 Preset Fixtures

```typescript
// src/eval/fixtures/presets.ts

export const FIXTURE_PRESETS: Record<string, AnyFixture> = {
  // Simple TypeScript project
  'typescript_simple': {
    type: 'inline',
    files: {
      'package.json': JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        devDependencies: { typescript: '^5.0.0' }
      }),
      'tsconfig.json': JSON.stringify({
        compilerOptions: { target: 'ES2020', module: 'ESNext', strict: true }
      }),
      'src/index.ts': `
        export function greet(name: string): string {
          return \`Hello, \${name}!\`;
        }

        export function add(a: number, b: number): number {
          return a + b;
        }
      `,
      'src/utils.ts': `
        export function capitalize(str: string): string {
          return str.charAt(0).toUpperCase() + str.slice(1);
        }
      `
    }
  },

  // Node.js project with tests
  'nodejs_with_tests': {
    type: 'inline',
    files: {
      'package.json': JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        scripts: {
          test: 'vitest',
          build: 'tsc'
        },
        devDependencies: {
          typescript: '^5.0.0',
          vitest: '^1.0.0'
        }
      }),
      'src/calculator.ts': `
        export class Calculator {
          add(a: number, b: number): number {
            return a + b;
          }

          subtract(a: number, b: number): number {
            return a - b;
          }

          multiply(a: number, b: number): number {
            return a * b;
          }

          divide(a: number, b: number): number {
            if (b === 0) throw new Error('Division by zero');
            return a / b;
          }
        }
      `,
      'tests/calculator.test.ts': `
        import { describe, it, expect } from 'vitest';
        import { Calculator } from '../src/calculator';

        describe('Calculator', () => {
          it('should add numbers', () => {
            const calc = new Calculator();
            expect(calc.add(2, 3)).toBe(5);
          });
        });
      `
    }
  },

  // Large codebase simulation
  'large_codebase': {
    type: 'generated',
    generator: 'typescript_project',
    config: {
      files: 50,
      functions: 200,
      classes: 30,
      imports: true
    }
  },

  // React project
  'react_project': {
    type: 'inline',
    files: {
      'package.json': JSON.stringify({
        name: 'react-app',
        version: '1.0.0',
        dependencies: {
          react: '^18.0.0',
          'react-dom': '^18.0.0'
        },
        devDependencies: {
          typescript: '^5.0.0',
          '@types/react': '^18.0.0'
        }
      }),
      'src/App.tsx': `
        import React from 'react';
        import { Button } from './components/Button';

        export function App(): JSX.Element {
          return (
            <div>
              <h1>Hello World</h1>
              <Button label="Click me" onClick={() => alert('clicked')} />
            </div>
          );
        }
      `,
      'src/components/Button.tsx': `
        import React from 'react';

        interface ButtonProps {
          label: string;
          onClick: () => void;
          disabled?: boolean;
        }

        export function Button({ label, onClick, disabled }: ButtonProps): JSX.Element {
          return (
            <button onClick={onClick} disabled={disabled}>
              {label}
            </button>
          );
        }
      `,
      'src/hooks/useCounter.ts': `
        import { useState, useCallback } from 'react';

        export function useCounter(initial: number = 0) {
          const [count, setCount] = useState(initial);

          const increment = useCallback(() => setCount(c => c + 1), []);
          const decrement = useCallback(() => setCount(c => c - 1), []);
          const reset = useCallback(() => setCount(initial), [initial]);

          return { count, increment, decrement, reset };
        }
      `
    }
  }
};
```

---

## 2. Golden Dataset Creation

### 2.1 Dataset Design Methodology

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Golden Dataset Pipeline                          │
└─────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  1. Define Tool Behavior                                             │
│     - Input types and ranges                                         │
│     - Expected outputs                                               │
│     - Edge cases and boundaries                                      │
│     - Error conditions                                               │
└─────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  2. Generate Test Cases                                              │
│     - Happy path cases                                               │
│     - Edge cases                                                     │
│     - Error cases                                                    │
│     - Performance cases                                              │
│     - Security cases                                                 │
└─────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  3. Validate & Label                                                 │
│     - Human review                                                   │
│     - Automated validation                                           │
│     - Difficulty labeling                                            │
│     - Category tagging                                               │
└─────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  4. Version & Maintain                                               │
│     - Semantic versioning                                            │
│     - Change tracking                                                │
│     - Deprecation policy                                             │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Dataset Specification

```typescript
// src/eval/dataset/types.ts

/**
 * A versioned dataset of eval cases
 */
export interface EvalDataset {
  // Metadata
  id: string;
  name: string;
  version: string;
  description: string;
  tool: string;
  createdAt: string;
  updatedAt: string;
  author?: string;

  // Configuration
  config: {
    // Default fixture for all cases
    defaultFixture?: AnyFixture;

    // Default timeout
    defaultTimeoutMs?: number;

    // Required tool version
    toolVersion?: string;
  };

  // Categories in this dataset
  categories: {
    id: string;
    name: string;
    description: string;
    weight: number; // Importance weight for overall score
  }[];

  // The test cases
  cases: EvalCase[];

  // Statistics
  stats: {
    totalCases: number;
    byCategory: Record<string, number>;
    byDifficulty: Record<number, number>;
  };
}

/**
 * Case template for generating multiple similar cases
 */
export interface CaseTemplate {
  id: string;
  description: string;
  category: string;
  tags: string[];
  difficulty: number;

  // Template with placeholders
  inputTemplate: Record<string, unknown>;

  // Variables to substitute
  variables: {
    name: string;
    values: unknown[];
  }[];

  // Expected output template
  expectedTemplate: EvalExpectation;

  // Generator function (alternative to templates)
  generator?: (vars: Record<string, unknown>) => {
    input: EvalInput;
    expected: EvalExpectation;
  };
}
```

### 2.3 Dataset Generator

```typescript
// src/eval/dataset/generator.ts

export class DatasetGenerator {
  /**
   * Generate cases from a template
   */
  generateFromTemplate(template: CaseTemplate): EvalCase[] {
    const cases: EvalCase[] = [];

    // Generate all combinations of variables
    const combinations = this.getCombinations(template.variables);

    for (let i = 0; i < combinations.length; i++) {
      const vars = combinations[i];

      let input: EvalInput;
      let expected: EvalExpectation;

      if (template.generator) {
        const generated = template.generator(vars);
        input = generated.input;
        expected = generated.expected;
      } else {
        input = { params: this.substitute(template.inputTemplate, vars) };
        expected = this.substitute(template.expectedTemplate, vars) as EvalExpectation;
      }

      cases.push({
        id: `${template.id}-${i}`,
        description: this.substitute(template.description, vars) as string,
        tool: '', // Set by parent
        category: template.category as EvalCategory,
        tags: template.tags,
        difficulty: template.difficulty,
        input,
        expected
      });
    }

    return cases;
  }

  /**
   * Generate boundary test cases automatically
   */
  generateBoundaryTests(
    tool: string,
    paramSpec: {
      name: string;
      type: 'string' | 'number' | 'array';
      min?: number;
      max?: number;
    }[]
  ): EvalCase[] {
    const cases: EvalCase[] = [];

    for (const param of paramSpec) {
      // Minimum boundary
      if (param.min !== undefined) {
        cases.push({
          id: `${tool}-boundary-${param.name}-min`,
          description: `${param.name} at minimum value`,
          tool,
          category: 'edge_case',
          tags: ['boundary', 'min'],
          difficulty: 2,
          input: {
            params: { [param.name]: param.min }
          },
          expected: { success: true }
        });

        // Below minimum
        cases.push({
          id: `${tool}-boundary-${param.name}-below-min`,
          description: `${param.name} below minimum value`,
          tool,
          category: 'error_handling',
          tags: ['boundary', 'error'],
          difficulty: 2,
          input: {
            params: { [param.name]: param.min - 1 }
          },
          expected: { success: false }
        });
      }

      // Maximum boundary
      if (param.max !== undefined) {
        cases.push({
          id: `${tool}-boundary-${param.name}-max`,
          description: `${param.name} at maximum value`,
          tool,
          category: 'edge_case',
          tags: ['boundary', 'max'],
          difficulty: 2,
          input: {
            params: { [param.name]: param.max }
          },
          expected: { success: true }
        });

        // Above maximum
        cases.push({
          id: `${tool}-boundary-${param.name}-above-max`,
          description: `${param.name} above maximum value`,
          tool,
          category: 'error_handling',
          tags: ['boundary', 'error'],
          difficulty: 2,
          input: {
            params: { [param.name]: param.max + 1 }
          },
          expected: { success: false }
        });
      }

      // Type-specific edge cases
      if (param.type === 'string') {
        cases.push({
          id: `${tool}-boundary-${param.name}-empty`,
          description: `${param.name} as empty string`,
          tool,
          category: 'edge_case',
          tags: ['boundary', 'empty'],
          difficulty: 1,
          input: {
            params: { [param.name]: '' }
          },
          expected: { success: false }
        });

        cases.push({
          id: `${tool}-boundary-${param.name}-whitespace`,
          description: `${param.name} as whitespace only`,
          tool,
          category: 'edge_case',
          tags: ['boundary', 'whitespace'],
          difficulty: 2,
          input: {
            params: { [param.name]: '   ' }
          },
          expected: { success: false }
        });
      }

      if (param.type === 'array') {
        cases.push({
          id: `${tool}-boundary-${param.name}-empty-array`,
          description: `${param.name} as empty array`,
          tool,
          category: 'edge_case',
          tags: ['boundary', 'empty'],
          difficulty: 1,
          input: {
            params: { [param.name]: [] }
          },
          expected: { success: true }
        });
      }
    }

    return cases;
  }

  /**
   * Generate fuzz test cases
   */
  generateFuzzTests(tool: string, count: number = 100): EvalCase[] {
    const cases: EvalCase[] = [];
    const fuzzValues = [
      null,
      undefined,
      '',
      0,
      -1,
      NaN,
      Infinity,
      -Infinity,
      [],
      {},
      true,
      false,
      '../../etc/passwd',
      '../'.repeat(10),
      'a'.repeat(10000),
      '<script>alert(1)</script>',
      '${process.env.SECRET}',
      '\x00\x01\x02',
      '日本語',
      '🎉🎊🎁'
    ];

    for (let i = 0; i < count; i++) {
      const fuzzValue = fuzzValues[i % fuzzValues.length];

      cases.push({
        id: `${tool}-fuzz-${i}`,
        description: `Fuzz test with ${typeof fuzzValue} value`,
        tool,
        category: 'security',
        tags: ['fuzz', 'security'],
        difficulty: 3,
        input: {
          params: { input: fuzzValue }
        },
        expected: {
          // Should not crash, may succeed or fail gracefully
          scorer: 'no_crash'
        }
      });
    }

    return cases;
  }

  private getCombinations(
    variables: { name: string; values: unknown[] }[]
  ): Record<string, unknown>[] {
    if (variables.length === 0) return [{}];

    const [first, ...rest] = variables;
    const restCombinations = this.getCombinations(rest);

    const combinations: Record<string, unknown>[] = [];
    for (const value of first.values) {
      for (const restCombo of restCombinations) {
        combinations.push({ [first.name]: value, ...restCombo });
      }
    }

    return combinations;
  }

  private substitute(template: unknown, vars: Record<string, unknown>): unknown {
    if (typeof template === 'string') {
      return template.replace(/\{\{(\w+)\}\}/g, (_, name) =>
        String(vars[name] ?? '')
      );
    }

    if (Array.isArray(template)) {
      return template.map(item => this.substitute(item, vars));
    }

    if (typeof template === 'object' && template !== null) {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(template)) {
        result[key] = this.substitute(value, vars);
      }
      return result;
    }

    return template;
  }
}
```

### 2.4 Human Labeling Interface

```typescript
// src/eval/dataset/labeler.ts

export interface LabelingTask {
  caseId: string;
  input: EvalInput;
  actualOutput: unknown;
  questions: LabelingQuestion[];
}

export interface LabelingQuestion {
  id: string;
  question: string;
  type: 'binary' | 'scale' | 'category' | 'text';
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
}

export interface LabelingResult {
  caseId: string;
  labeler: string;
  timestamp: Date;
  answers: Record<string, unknown>;
  notes?: string;
}

export class HumanLabeler {
  private tasks: Map<string, LabelingTask> = new Map();
  private results: Map<string, LabelingResult[]> = new Map();

  /**
   * Standard labeling questions
   */
  static readonly STANDARD_QUESTIONS: LabelingQuestion[] = [
    {
      id: 'correct',
      question: 'Is the output correct?',
      type: 'binary'
    },
    {
      id: 'quality',
      question: 'Rate the output quality',
      type: 'scale',
      scaleMin: 1,
      scaleMax: 5
    },
    {
      id: 'difficulty',
      question: 'How difficult is this case?',
      type: 'scale',
      scaleMin: 1,
      scaleMax: 5
    },
    {
      id: 'category',
      question: 'What category best describes this case?',
      type: 'category',
      options: ['happy_path', 'edge_case', 'error_handling', 'performance', 'security']
    },
    {
      id: 'notes',
      question: 'Any additional notes?',
      type: 'text'
    }
  ];

  /**
   * Create labeling tasks from eval results
   */
  createTasks(results: EvalResult[], questions?: LabelingQuestion[]): LabelingTask[] {
    const tasks: LabelingTask[] = [];

    for (const result of results) {
      const task: LabelingTask = {
        caseId: result.caseId,
        input: {} as EvalInput, // Would need to look up from case
        actualOutput: result.actual,
        questions: questions || HumanLabeler.STANDARD_QUESTIONS
      };

      tasks.push(task);
      this.tasks.set(result.caseId, task);
    }

    return tasks;
  }

  /**
   * Submit a labeling result
   */
  submitResult(result: LabelingResult): void {
    if (!this.results.has(result.caseId)) {
      this.results.set(result.caseId, []);
    }
    this.results.get(result.caseId)!.push(result);
  }

  /**
   * Calculate inter-annotator agreement
   */
  calculateAgreement(): AgreementMetrics {
    const caseIds = Array.from(this.results.keys());
    const agreements: number[] = [];

    for (const caseId of caseIds) {
      const labels = this.results.get(caseId)!;
      if (labels.length < 2) continue;

      // Calculate pairwise agreement
      for (let i = 0; i < labels.length; i++) {
        for (let j = i + 1; j < labels.length; j++) {
          const agreement = this.compareLabels(labels[i], labels[j]);
          agreements.push(agreement);
        }
      }
    }

    return {
      averageAgreement: agreements.reduce((a, b) => a + b, 0) / agreements.length,
      casesLabeled: caseIds.length,
      totalLabels: Array.from(this.results.values()).flat().length
    };
  }

  /**
   * Get consensus label for a case
   */
  getConsensus(caseId: string): Record<string, unknown> | null {
    const labels = this.results.get(caseId);
    if (!labels || labels.length === 0) return null;

    const consensus: Record<string, unknown> = {};

    // Get first label's keys
    const keys = Object.keys(labels[0].answers);

    for (const key of keys) {
      const values = labels.map(l => l.answers[key]);

      // Majority vote for categorical, average for numeric
      if (typeof values[0] === 'number') {
        consensus[key] = values.reduce((a, b) => (a as number) + (b as number), 0) / values.length;
      } else {
        const counts = new Map<unknown, number>();
        for (const v of values) {
          counts.set(v, (counts.get(v) || 0) + 1);
        }
        let maxCount = 0;
        let maxValue: unknown;
        for (const [v, c] of counts) {
          if (c > maxCount) {
            maxCount = c;
            maxValue = v;
          }
        }
        consensus[key] = maxValue;
      }
    }

    return consensus;
  }

  private compareLabels(a: LabelingResult, b: LabelingResult): number {
    const keys = Object.keys(a.answers);
    let matches = 0;

    for (const key of keys) {
      if (a.answers[key] === b.answers[key]) {
        matches++;
      }
    }

    return matches / keys.length;
  }
}

export interface AgreementMetrics {
  averageAgreement: number;
  casesLabeled: number;
  totalLabels: number;
}
```

---

## 3. Scoring Algorithms

### 3.1 Scorer Interface

```typescript
// src/eval/scorers/types.ts

/**
 * Scorer function signature
 */
export type Scorer = (
  actual: unknown,
  expected: EvalExpectation,
  context: ScoringContext
) => ScoringResult;

/**
 * Context available to scorers
 */
export interface ScoringContext {
  evalCase: EvalCase;
  toolResult: ToolResult;
  executionTimeMs: number;
  metadata?: Record<string, unknown>;
}

/**
 * Result from a scorer
 */
export interface ScoringResult {
  // Score from 0 to 1
  score: number;

  // Did it pass the threshold?
  passed: boolean;

  // Detailed breakdown
  breakdown?: {
    criterion: string;
    score: number;
    weight: number;
    details?: string;
  }[];

  // Additional metadata
  metadata?: Record<string, unknown>;
}
```

### 3.2 Built-in Scorers

```typescript
// src/eval/scorers/builtin.ts

/**
 * Exact match scorer - binary pass/fail
 */
export const exactMatchScorer: Scorer = (actual, expected, context) => {
  if (expected.exact === undefined) {
    return { score: 1, passed: true };
  }

  const matches = JSON.stringify(actual) === JSON.stringify(expected.exact);

  return {
    score: matches ? 1 : 0,
    passed: matches,
    metadata: {
      actualLength: JSON.stringify(actual).length,
      expectedLength: JSON.stringify(expected.exact).length
    }
  };
};

/**
 * Partial match scorer - checks if actual contains expected
 */
export const containsScorer: Scorer = (actual, expected, context) => {
  if (expected.contains === undefined) {
    return { score: 1, passed: true };
  }

  const score = calculateContainmentScore(actual, expected.contains);

  return {
    score,
    passed: score >= 0.8
  };
};

function calculateContainmentScore(actual: unknown, expected: unknown): number {
  if (typeof expected === 'object' && expected !== null) {
    if (Array.isArray(expected)) {
      // Check if all expected items are in actual
      if (!Array.isArray(actual)) return 0;
      let matches = 0;
      for (const item of expected) {
        if (actual.some(a => JSON.stringify(a) === JSON.stringify(item))) {
          matches++;
        }
      }
      return matches / expected.length;
    } else {
      // Check if all expected keys exist with matching values
      if (typeof actual !== 'object' || actual === null) return 0;
      const expectedEntries = Object.entries(expected);
      let matches = 0;
      for (const [key, value] of expectedEntries) {
        if (key in (actual as any)) {
          if (JSON.stringify((actual as any)[key]) === JSON.stringify(value)) {
            matches++;
          }
        }
      }
      return matches / expectedEntries.length;
    }
  }

  // Primitive comparison
  return actual === expected ? 1 : 0;
}

/**
 * String similarity scorer using Levenshtein distance
 */
export const stringSimilarityScorer: Scorer = (actual, expected, context) => {
  if (typeof actual !== 'string' || expected.exact === undefined) {
    return { score: 0, passed: false };
  }

  const expectedStr = String(expected.exact);
  const distance = levenshteinDistance(actual, expectedStr);
  const maxLen = Math.max(actual.length, expectedStr.length);
  const similarity = maxLen > 0 ? 1 - distance / maxLen : 1;

  return {
    score: similarity,
    passed: similarity >= 0.9,
    metadata: {
      distance,
      actualLength: actual.length,
      expectedLength: expectedStr.length
    }
  };
};

/**
 * JSON structure scorer - checks structural similarity
 */
export const structuralSimilarityScorer: Scorer = (actual, expected, context) => {
  const actualKeys = getNestedKeys(actual);
  const expectedKeys = getNestedKeys(expected.exact);

  const intersection = actualKeys.filter(k => expectedKeys.includes(k));
  const union = [...new Set([...actualKeys, ...expectedKeys])];

  const jaccardSimilarity = union.length > 0
    ? intersection.length / union.length
    : 1;

  return {
    score: jaccardSimilarity,
    passed: jaccardSimilarity >= 0.8,
    breakdown: [
      { criterion: 'key_overlap', score: jaccardSimilarity, weight: 1 }
    ],
    metadata: {
      actualKeyCount: actualKeys.length,
      expectedKeyCount: expectedKeys.length,
      commonKeys: intersection.length
    }
  };
};

/**
 * Regex pattern scorer
 */
export const patternScorer: Scorer = (actual, expected, context) => {
  if (expected.pattern === undefined) {
    return { score: 1, passed: true };
  }

  const str = typeof actual === 'string' ? actual : JSON.stringify(actual);
  const regex = new RegExp(expected.pattern);
  const matches = regex.test(str);

  return {
    score: matches ? 1 : 0,
    passed: matches,
    metadata: {
      pattern: expected.pattern,
      testedString: str.substring(0, 100)
    }
  };
};

/**
 * Performance scorer - checks execution time
 */
export const performanceScorer: Scorer = (actual, expected, context) => {
  if (!expected.performance?.maxTimeMs) {
    return { score: 1, passed: true };
  }

  const actualTime = context.executionTimeMs;
  const maxTime = expected.performance.maxTimeMs;

  // Score decreases linearly from 1 to 0 as time increases from 0 to 2x max
  let score = 1 - (actualTime / (2 * maxTime));
  score = Math.max(0, Math.min(1, score));

  return {
    score,
    passed: actualTime <= maxTime,
    metadata: {
      actualTimeMs: actualTime,
      maxTimeMs: maxTime,
      ratio: actualTime / maxTime
    }
  };
};

/**
 * No crash scorer - for fuzz testing
 */
export const noCrashScorer: Scorer = (actual, expected, context) => {
  // If we got here, the tool didn't crash
  const toolResult = context.toolResult;

  // Full score if successful, partial if failed gracefully
  const score = toolResult.success ? 1 : 0.5;

  return {
    score,
    passed: true, // Not crashing is always a pass
    metadata: {
      success: toolResult.success,
      errorCode: toolResult.error?.code
    }
  };
};

/**
 * Semantic code similarity scorer
 */
export const codeSemanticScorer: Scorer = (actual, expected, context) => {
  if (typeof actual !== 'string' || typeof expected.exact !== 'string') {
    return { score: 0, passed: false };
  }

  const breakdown: { criterion: string; score: number; weight: number }[] = [];

  // 1. Normalize whitespace and compare
  const normalizedActual = actual.replace(/\s+/g, ' ').trim();
  const normalizedExpected = (expected.exact as string).replace(/\s+/g, ' ').trim();
  const whitespaceNormScore = normalizedActual === normalizedExpected ? 1 : 0;
  breakdown.push({ criterion: 'whitespace_normalized', score: whitespaceNormScore, weight: 0.3 });

  // 2. Token-based similarity
  const actualTokens = tokenize(actual);
  const expectedTokens = tokenize(expected.exact as string);
  const tokenScore = calculateTokenSimilarity(actualTokens, expectedTokens);
  breakdown.push({ criterion: 'token_similarity', score: tokenScore, weight: 0.4 });

  // 3. Structure similarity (brackets, braces)
  const structureScore = calculateStructureSimilarity(actual, expected.exact as string);
  breakdown.push({ criterion: 'structure', score: structureScore, weight: 0.3 });

  const totalWeight = breakdown.reduce((sum, b) => sum + b.weight, 0);
  const weightedScore = breakdown.reduce((sum, b) => sum + b.score * b.weight, 0) / totalWeight;

  return {
    score: weightedScore,
    passed: weightedScore >= 0.8,
    breakdown
  };
};

// Helper functions
function tokenize(code: string): string[] {
  return code.match(/\w+|[^\s\w]/g) || [];
}

function calculateTokenSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

function calculateStructureSimilarity(a: string, b: string): number {
  const structureChars = /[{}()\[\];]/g;
  const structureA = (a.match(structureChars) || []).join('');
  const structureB = (b.match(structureChars) || []).join('');

  if (structureA === structureB) return 1;

  const distance = levenshteinDistance(structureA, structureB);
  const maxLen = Math.max(structureA.length, structureB.length);
  return maxLen > 0 ? 1 - distance / maxLen : 1;
}

function getNestedKeys(obj: unknown, prefix = ''): string[] {
  if (typeof obj !== 'object' || obj === null) {
    return prefix ? [prefix] : [];
  }

  const keys: string[] = [];
  for (const key of Object.keys(obj)) {
    const newPrefix = prefix ? `${prefix}.${key}` : key;
    keys.push(...getNestedKeys((obj as any)[key], newPrefix));
  }
  return keys;
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}
```

### 3.3 Composite Scorer

```typescript
// src/eval/scorers/composite.ts

/**
 * Combines multiple scorers with weights
 */
export class CompositeScorer {
  private scorers: { scorer: Scorer; weight: number; name: string }[] = [];

  addScorer(name: string, scorer: Scorer, weight: number = 1): CompositeScorer {
    this.scorers.push({ name, scorer, weight });
    return this;
  }

  score(actual: unknown, expected: EvalExpectation, context: ScoringContext): ScoringResult {
    const breakdown: { criterion: string; score: number; weight: number; details?: string }[] = [];

    let totalWeight = 0;
    let weightedSum = 0;
    let allPassed = true;

    for (const { name, scorer, weight } of this.scorers) {
      const result = scorer(actual, expected, context);

      breakdown.push({
        criterion: name,
        score: result.score,
        weight,
        details: result.metadata ? JSON.stringify(result.metadata) : undefined
      });

      weightedSum += result.score * weight;
      totalWeight += weight;
      allPassed = allPassed && result.passed;
    }

    const finalScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

    return {
      score: finalScore,
      passed: allPassed && finalScore >= 0.5,
      breakdown
    };
  }
}

/**
 * Factory for common scorer combinations
 */
export const ScorerFactory = {
  /**
   * Default scorer for most tools
   */
  default(): CompositeScorer {
    return new CompositeScorer()
      .addScorer('exact_match', exactMatchScorer, 0.5)
      .addScorer('structure', structuralSimilarityScorer, 0.3)
      .addScorer('performance', performanceScorer, 0.2);
  },

  /**
   * Scorer for code generation
   */
  codeGeneration(): CompositeScorer {
    return new CompositeScorer()
      .addScorer('semantic', codeSemanticScorer, 0.6)
      .addScorer('structure', structuralSimilarityScorer, 0.3)
      .addScorer('performance', performanceScorer, 0.1);
  },

  /**
   * Scorer for search results
   */
  searchResults(): CompositeScorer {
    return new CompositeScorer()
      .addScorer('contains', containsScorer, 0.6)
      .addScorer('structure', structuralSimilarityScorer, 0.2)
      .addScorer('performance', performanceScorer, 0.2);
  },

  /**
   * Strict scorer for exact output
   */
  strict(): CompositeScorer {
    return new CompositeScorer()
      .addScorer('exact_match', exactMatchScorer, 1.0);
  }
};
```

---

## 4. LLM Evaluation Methodology

### 4.1 Tool Selection Evaluation

```typescript
// src/eval/llm/tool-selection.ts

/**
 * Evaluates LLM's ability to select the correct tool for a task
 */
export class ToolSelectionEvaluator {
  private llmClient: any;
  private toolDeclarations: any[];

  constructor(llmClient: any, toolDeclarations: any[]) {
    this.llmClient = llmClient;
    this.toolDeclarations = toolDeclarations;
  }

  /**
   * Run tool selection evaluation
   */
  async evaluate(cases: ToolSelectionCase[]): Promise<ToolSelectionResult[]> {
    const results: ToolSelectionResult[] = [];

    for (const evalCase of cases) {
      const result = await this.evaluateCase(evalCase);
      results.push(result);
    }

    return results;
  }

  private async evaluateCase(evalCase: ToolSelectionCase): Promise<ToolSelectionResult> {
    const startTime = Date.now();

    // Send query to LLM
    const response = await this.llmClient.generateContent({
      contents: this.buildPrompt(evalCase),
      tools: this.toolDeclarations
    });

    const executionTimeMs = Date.now() - startTime;

    // Extract tool selection
    const selection = this.extractToolSelection(response);

    // Score the selection
    const scoring = this.scoreSelection(selection, evalCase.expected);

    return {
      caseId: evalCase.id,
      query: evalCase.query,
      selectedTool: selection?.tool,
      selectedParams: selection?.params,
      expectedTool: evalCase.expected.tool,
      expectedParams: evalCase.expected.params,
      scoring,
      executionTimeMs,
      rawResponse: response
    };
  }

  private buildPrompt(evalCase: ToolSelectionCase): any[] {
    const messages: any[] = [];

    // Add context if provided
    if (evalCase.context) {
      messages.push({
        role: 'user',
        parts: [{ text: `Context:\n${JSON.stringify(evalCase.context, null, 2)}` }]
      });
      messages.push({
        role: 'model',
        parts: [{ text: 'I understand the context. How can I help?' }]
      });
    }

    // Add conversation history
    if (evalCase.history) {
      for (const turn of evalCase.history) {
        messages.push({
          role: turn.role === 'user' ? 'user' : 'model',
          parts: [{ text: turn.content }]
        });
      }
    }

    // Add the main query
    messages.push({
      role: 'user',
      parts: [{ text: evalCase.query }]
    });

    return messages;
  }

  private extractToolSelection(response: any): { tool: string; params: any } | null {
    const candidate = response.response?.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    for (const part of parts) {
      if (part.functionCall) {
        return {
          tool: part.functionCall.name,
          params: part.functionCall.args
        };
      }
    }

    return null;
  }

  private scoreSelection(
    actual: { tool: string; params: any } | null,
    expected: ToolSelectionExpectation
  ): ToolSelectionScoring {
    const breakdown: { criterion: string; score: number; weight: number }[] = [];

    // 1. Tool selection score
    let toolScore = 0;
    if (actual?.tool === expected.tool) {
      toolScore = 1;
    } else if (expected.acceptableTools?.includes(actual?.tool || '')) {
      toolScore = 0.8;
    } else if (expected.forbiddenTools?.includes(actual?.tool || '')) {
      toolScore = 0;
    }
    breakdown.push({ criterion: 'tool_selection', score: toolScore, weight: 0.5 });

    // 2. Parameter accuracy score
    let paramScore = 0;
    if (actual?.params && expected.params) {
      paramScore = this.scoreParameters(actual.params, expected.params);
    } else if (!expected.params) {
      paramScore = 1; // No param expectations
    }
    breakdown.push({ criterion: 'param_accuracy', score: paramScore, weight: 0.3 });

    // 3. Response quality (did it make a selection at all)
    const responseScore = actual ? 1 : 0;
    breakdown.push({ criterion: 'made_selection', score: responseScore, weight: 0.2 });

    // Calculate weighted total
    const totalWeight = breakdown.reduce((sum, b) => sum + b.weight, 0);
    const totalScore = breakdown.reduce((sum, b) => sum + b.score * b.weight, 0) / totalWeight;

    return {
      totalScore,
      passed: toolScore >= 0.8 && totalScore >= 0.7,
      breakdown
    };
  }

  private scoreParameters(actual: any, expected: ParameterExpectation): number {
    let score = 0;
    let count = 0;

    for (const [key, expectation] of Object.entries(expected)) {
      count++;
      const actualValue = actual[key];

      if (expectation.exact !== undefined) {
        score += actualValue === expectation.exact ? 1 : 0;
      } else if (expectation.pattern) {
        score += new RegExp(expectation.pattern).test(String(actualValue)) ? 1 : 0;
      } else if (expectation.contains) {
        score += String(actualValue).includes(expectation.contains) ? 1 : 0;
      } else if (expectation.type) {
        score += typeof actualValue === expectation.type ? 1 : 0;
      } else {
        score += actualValue !== undefined ? 1 : 0;
      }
    }

    return count > 0 ? score / count : 1;
  }

  /**
   * Calculate aggregate metrics
   */
  calculateMetrics(results: ToolSelectionResult[]): ToolSelectionMetrics {
    const totalCases = results.length;
    const correctSelections = results.filter(r =>
      r.selectedTool === r.expectedTool
    ).length;

    const acceptableSelections = results.filter(r =>
      r.scoring.passed
    ).length;

    // Group by expected tool
    const byTool: Record<string, { correct: number; total: number }> = {};
    for (const result of results) {
      const tool = result.expectedTool;
      if (!byTool[tool]) {
        byTool[tool] = { correct: 0, total: 0 };
      }
      byTool[tool].total++;
      if (result.selectedTool === tool) {
        byTool[tool].correct++;
      }
    }

    // Calculate confusion matrix
    const confusionMatrix = this.buildConfusionMatrix(results);

    return {
      totalCases,
      exactMatchRate: correctSelections / totalCases,
      acceptableRate: acceptableSelections / totalCases,
      averageScore: results.reduce((sum, r) => sum + r.scoring.totalScore, 0) / totalCases,
      byTool: Object.entries(byTool).map(([tool, stats]) => ({
        tool,
        accuracy: stats.correct / stats.total,
        total: stats.total
      })),
      confusionMatrix
    };
  }

  private buildConfusionMatrix(results: ToolSelectionResult[]): ConfusionMatrix {
    const tools = [...new Set(results.flatMap(r => [r.expectedTool, r.selectedTool || 'none']))];
    const matrix: Record<string, Record<string, number>> = {};

    for (const expected of tools) {
      matrix[expected] = {};
      for (const actual of tools) {
        matrix[expected][actual] = 0;
      }
    }

    for (const result of results) {
      const expected = result.expectedTool;
      const actual = result.selectedTool || 'none';
      matrix[expected][actual]++;
    }

    return { tools, matrix };
  }
}

// Types
export interface ToolSelectionCase {
  id: string;
  query: string;
  context?: Record<string, unknown>;
  history?: { role: 'user' | 'assistant'; content: string }[];
  expected: ToolSelectionExpectation;
}

export interface ToolSelectionExpectation {
  tool: string;
  acceptableTools?: string[];
  forbiddenTools?: string[];
  params?: ParameterExpectation;
}

export interface ParameterExpectation {
  [key: string]: {
    exact?: unknown;
    pattern?: string;
    contains?: string;
    type?: string;
  };
}

export interface ToolSelectionResult {
  caseId: string;
  query: string;
  selectedTool: string | undefined;
  selectedParams: any;
  expectedTool: string;
  expectedParams: any;
  scoring: ToolSelectionScoring;
  executionTimeMs: number;
  rawResponse: any;
}

export interface ToolSelectionScoring {
  totalScore: number;
  passed: boolean;
  breakdown: { criterion: string; score: number; weight: number }[];
}

export interface ToolSelectionMetrics {
  totalCases: number;
  exactMatchRate: number;
  acceptableRate: number;
  averageScore: number;
  byTool: { tool: string; accuracy: number; total: number }[];
  confusionMatrix: ConfusionMatrix;
}

export interface ConfusionMatrix {
  tools: string[];
  matrix: Record<string, Record<string, number>>;
}
```

### 4.2 Parameter Quality Evaluation

```typescript
// src/eval/llm/param-quality.ts

/**
 * Evaluates the quality of parameters generated by the LLM
 */
export class ParameterQualityEvaluator {
  /**
   * Evaluate parameter quality across multiple dimensions
   */
  evaluate(
    actual: Record<string, unknown>,
    schema: ToolParameterSchema,
    context: ParameterContext
  ): ParameterQualityResult {
    const dimensions: QualityDimension[] = [];

    // 1. Schema compliance
    dimensions.push(this.evaluateSchemaCompliance(actual, schema));

    // 2. Value appropriateness
    dimensions.push(this.evaluateValueAppropriateness(actual, context));

    // 3. Completeness
    dimensions.push(this.evaluateCompleteness(actual, schema));

    // 4. Specificity
    dimensions.push(this.evaluateSpecificity(actual, context));

    // Calculate overall score
    const totalWeight = dimensions.reduce((sum, d) => sum + d.weight, 0);
    const overallScore = dimensions.reduce((sum, d) => sum + d.score * d.weight, 0) / totalWeight;

    return {
      overallScore,
      passed: overallScore >= 0.7,
      dimensions,
      recommendations: this.generateRecommendations(dimensions)
    };
  }

  private evaluateSchemaCompliance(
    actual: Record<string, unknown>,
    schema: ToolParameterSchema
  ): QualityDimension {
    const issues: string[] = [];

    // Check required fields
    const required = schema.required || [];
    for (const field of required) {
      if (!(field in actual)) {
        issues.push(`Missing required field: ${field}`);
      }
    }

    // Check types
    const properties = schema.properties || {};
    for (const [key, value] of Object.entries(actual)) {
      const propSchema = properties[key];
      if (propSchema && !this.checkType(value, propSchema.type)) {
        issues.push(`Type mismatch for ${key}: expected ${propSchema.type}`);
      }
    }

    const score = issues.length === 0 ? 1 : Math.max(0, 1 - issues.length * 0.2);

    return {
      name: 'schema_compliance',
      score,
      weight: 0.4,
      issues
    };
  }

  private evaluateValueAppropriateness(
    actual: Record<string, unknown>,
    context: ParameterContext
  ): QualityDimension {
    const issues: string[] = [];

    // Check paths look like real paths
    for (const [key, value] of Object.entries(actual)) {
      if (key.toLowerCase().includes('path') && typeof value === 'string') {
        if (!this.looksLikePath(value)) {
          issues.push(`${key} doesn't look like a valid path: ${value}`);
        }
      }

      // Check patterns are valid regex
      if (key.toLowerCase().includes('pattern') && typeof value === 'string') {
        try {
          new RegExp(value);
        } catch {
          issues.push(`${key} is not a valid regex: ${value}`);
        }
      }
    }

    // Context-specific checks
    if (context.currentFile && actual.path === context.currentFile) {
      // Good - using context
    }

    const score = issues.length === 0 ? 1 : Math.max(0, 1 - issues.length * 0.3);

    return {
      name: 'value_appropriateness',
      score,
      weight: 0.3,
      issues
    };
  }

  private evaluateCompleteness(
    actual: Record<string, unknown>,
    schema: ToolParameterSchema
  ): QualityDimension {
    const properties = schema.properties || {};
    const total = Object.keys(properties).length;
    const provided = Object.keys(actual).length;

    // Penalize both missing useful params and excessive params
    const required = (schema.required || []).length;
    const useful = Math.min(provided, total);
    const completeness = total > 0 ? useful / total : 1;

    return {
      name: 'completeness',
      score: completeness,
      weight: 0.15,
      issues: []
    };
  }

  private evaluateSpecificity(
    actual: Record<string, unknown>,
    context: ParameterContext
  ): QualityDimension {
    const issues: string[] = [];

    // Check for overly generic values
    const genericPatterns = ['*', '**/*', '.', '.*'];
    for (const [key, value] of Object.entries(actual)) {
      if (typeof value === 'string' && genericPatterns.includes(value)) {
        issues.push(`${key} is too generic: ${value}`);
      }
    }

    const score = issues.length === 0 ? 1 : Math.max(0, 1 - issues.length * 0.25);

    return {
      name: 'specificity',
      score,
      weight: 0.15,
      issues
    };
  }

  private checkType(value: unknown, expectedType: any): boolean {
    switch (expectedType) {
      case 'STRING':
      case 'string':
        return typeof value === 'string';
      case 'NUMBER':
      case 'number':
        return typeof value === 'number';
      case 'BOOLEAN':
      case 'boolean':
        return typeof value === 'boolean';
      case 'ARRAY':
      case 'array':
        return Array.isArray(value);
      case 'OBJECT':
      case 'object':
        return typeof value === 'object' && !Array.isArray(value);
      default:
        return true;
    }
  }

  private looksLikePath(value: string): boolean {
    return /^[./]|^\w+[/\\]/.test(value);
  }

  private generateRecommendations(dimensions: QualityDimension[]): string[] {
    const recommendations: string[] = [];

    for (const dim of dimensions) {
      if (dim.score < 0.7) {
        switch (dim.name) {
          case 'schema_compliance':
            recommendations.push('Ensure all required parameters are provided with correct types');
            break;
          case 'value_appropriateness':
            recommendations.push('Check that parameter values are valid (paths exist, patterns compile)');
            break;
          case 'completeness':
            recommendations.push('Consider providing optional parameters for better results');
            break;
          case 'specificity':
            recommendations.push('Use more specific values instead of wildcards');
            break;
        }
      }
    }

    return recommendations;
  }
}

export interface ParameterContext {
  currentFile?: string;
  recentFiles?: string[];
  projectType?: string;
  query?: string;
}

export interface ParameterQualityResult {
  overallScore: number;
  passed: boolean;
  dimensions: QualityDimension[];
  recommendations: string[];
}

export interface QualityDimension {
  name: string;
  score: number;
  weight: number;
  issues: string[];
}
```

---

## 5. Statistical Analysis

### 5.1 Statistical Functions

```typescript
// src/eval/stats/functions.ts

export class StatisticalAnalyzer {
  /**
   * Calculate descriptive statistics
   */
  descriptive(values: number[]): DescriptiveStats {
    if (values.length === 0) {
      return {
        count: 0,
        mean: NaN,
        median: NaN,
        stdDev: NaN,
        min: NaN,
        max: NaN,
        p25: NaN,
        p75: NaN,
        p90: NaN,
        p95: NaN,
        p99: NaN
      };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const count = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / count;

    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / count;
    const stdDev = Math.sqrt(variance);

    return {
      count,
      mean,
      median: this.percentile(sorted, 50),
      stdDev,
      min: sorted[0],
      max: sorted[count - 1],
      p25: this.percentile(sorted, 25),
      p75: this.percentile(sorted, 75),
      p90: this.percentile(sorted, 90),
      p95: this.percentile(sorted, 95),
      p99: this.percentile(sorted, 99)
    };
  }

  /**
   * Calculate percentile
   */
  percentile(sortedValues: number[], p: number): number {
    const index = (p / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (upper >= sortedValues.length) return sortedValues[sortedValues.length - 1];
    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }

  /**
   * Two-sample t-test
   */
  tTest(sample1: number[], sample2: number[]): TTestResult {
    const stats1 = this.descriptive(sample1);
    const stats2 = this.descriptive(sample2);

    const n1 = sample1.length;
    const n2 = sample2.length;

    // Pooled standard error
    const se = Math.sqrt(
      (Math.pow(stats1.stdDev, 2) / n1) + (Math.pow(stats2.stdDev, 2) / n2)
    );

    // t-statistic
    const t = (stats1.mean - stats2.mean) / se;

    // Degrees of freedom (Welch's approximation)
    const df = Math.pow(
      Math.pow(stats1.stdDev, 2) / n1 + Math.pow(stats2.stdDev, 2) / n2,
      2
    ) / (
      Math.pow(Math.pow(stats1.stdDev, 2) / n1, 2) / (n1 - 1) +
      Math.pow(Math.pow(stats2.stdDev, 2) / n2, 2) / (n2 - 1)
    );

    // p-value (two-tailed, using approximation)
    const pValue = this.tDistributionPValue(Math.abs(t), df) * 2;

    return {
      tStatistic: t,
      degreesOfFreedom: df,
      pValue,
      significant: pValue < 0.05,
      meanDifference: stats1.mean - stats2.mean,
      effectSize: this.cohensD(sample1, sample2)
    };
  }

  /**
   * Cohen's d effect size
   */
  cohensD(sample1: number[], sample2: number[]): number {
    const stats1 = this.descriptive(sample1);
    const stats2 = this.descriptive(sample2);

    const pooledStd = Math.sqrt(
      (Math.pow(stats1.stdDev, 2) + Math.pow(stats2.stdDev, 2)) / 2
    );

    return (stats1.mean - stats2.mean) / pooledStd;
  }

  /**
   * Confidence interval
   */
  confidenceInterval(values: number[], confidence: number = 0.95): [number, number] {
    const stats = this.descriptive(values);
    const n = values.length;

    // Z-score for confidence level
    const z = this.zScore(confidence);

    const margin = z * (stats.stdDev / Math.sqrt(n));

    return [stats.mean - margin, stats.mean + margin];
  }

  /**
   * Bootstrap confidence interval
   */
  bootstrapCI(
    values: number[],
    statFn: (v: number[]) => number,
    iterations: number = 1000,
    confidence: number = 0.95
  ): [number, number] {
    const bootstrapStats: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const sample = this.bootstrapSample(values);
      bootstrapStats.push(statFn(sample));
    }

    const sorted = bootstrapStats.sort((a, b) => a - b);
    const alpha = 1 - confidence;
    const lower = this.percentile(sorted, (alpha / 2) * 100);
    const upper = this.percentile(sorted, (1 - alpha / 2) * 100);

    return [lower, upper];
  }

  private bootstrapSample(values: number[]): number[] {
    const sample: number[] = [];
    for (let i = 0; i < values.length; i++) {
      const index = Math.floor(Math.random() * values.length);
      sample.push(values[index]);
    }
    return sample;
  }

  private zScore(confidence: number): number {
    // Common z-scores
    const zScores: Record<number, number> = {
      0.90: 1.645,
      0.95: 1.96,
      0.99: 2.576
    };
    return zScores[confidence] || 1.96;
  }

  private tDistributionPValue(t: number, df: number): number {
    // Approximation using normal distribution for large df
    if (df > 30) {
      return 1 - this.normalCDF(t);
    }

    // Simple approximation for smaller df
    const x = df / (df + t * t);
    return 0.5 * this.incompleteBeta(df / 2, 0.5, x);
  }

  private normalCDF(x: number): number {
    // Approximation of standard normal CDF
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
  }

  private incompleteBeta(a: number, b: number, x: number): number {
    // Simple approximation
    if (x === 0) return 0;
    if (x === 1) return 1;

    // Use continued fraction approximation
    return x;
  }
}

export interface DescriptiveStats {
  count: number;
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  p25: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
}

export interface TTestResult {
  tStatistic: number;
  degreesOfFreedom: number;
  pValue: number;
  significant: boolean;
  meanDifference: number;
  effectSize: number;
}
```

### 5.2 Results Analyzer

```typescript
// src/eval/stats/analyzer.ts

export class ResultsAnalyzer {
  private stats = new StatisticalAnalyzer();

  /**
   * Analyze eval results comprehensively
   */
  analyze(results: EvalResult[]): ComprehensiveAnalysis {
    return {
      overall: this.analyzeOverall(results),
      byCategory: this.analyzeByCategory(results),
      byDifficulty: this.analyzeByDifficulty(results),
      performance: this.analyzePerformance(results),
      trends: this.analyzeTrends(results),
      outliers: this.findOutliers(results)
    };
  }

  private analyzeOverall(results: EvalResult[]): OverallAnalysis {
    const scores = results.map(r => r.score);
    const times = results.map(r => r.executionTimeMs);

    return {
      totalCases: results.length,
      passRate: results.filter(r => r.passed).length / results.length,
      scoreStats: this.stats.descriptive(scores),
      timeStats: this.stats.descriptive(times),
      scoreCI: this.stats.confidenceInterval(scores),
      passRateCI: this.stats.bootstrapCI(
        results.map(r => r.passed ? 1 : 0),
        v => v.reduce((a, b) => a + b, 0) / v.length
      )
    };
  }

  private analyzeByCategory(results: EvalResult[]): CategoryAnalysis[] {
    const byCategory = new Map<string, EvalResult[]>();

    for (const result of results) {
      const category = (result as any).category || 'unknown';
      if (!byCategory.has(category)) {
        byCategory.set(category, []);
      }
      byCategory.get(category)!.push(result);
    }

    return Array.from(byCategory.entries()).map(([category, categoryResults]) => ({
      category,
      count: categoryResults.length,
      passRate: categoryResults.filter(r => r.passed).length / categoryResults.length,
      avgScore: categoryResults.reduce((sum, r) => sum + r.score, 0) / categoryResults.length,
      avgTime: categoryResults.reduce((sum, r) => sum + r.executionTimeMs, 0) / categoryResults.length
    }));
  }

  private analyzeByDifficulty(results: EvalResult[]): DifficultyAnalysis[] {
    const byDifficulty = new Map<number, EvalResult[]>();

    for (const result of results) {
      const difficulty = (result as any).difficulty || 1;
      if (!byDifficulty.has(difficulty)) {
        byDifficulty.set(difficulty, []);
      }
      byDifficulty.get(difficulty)!.push(result);
    }

    return Array.from(byDifficulty.entries())
      .sort(([a], [b]) => a - b)
      .map(([difficulty, diffResults]) => ({
        difficulty,
        count: diffResults.length,
        passRate: diffResults.filter(r => r.passed).length / diffResults.length,
        avgScore: diffResults.reduce((sum, r) => sum + r.score, 0) / diffResults.length
      }));
  }

  private analyzePerformance(results: EvalResult[]): PerformanceAnalysis {
    const times = results.map(r => r.executionTimeMs);
    const stats = this.stats.descriptive(times);

    // Categorize by speed
    const fast = results.filter(r => r.executionTimeMs < stats.p25).length;
    const medium = results.filter(r =>
      r.executionTimeMs >= stats.p25 && r.executionTimeMs <= stats.p75
    ).length;
    const slow = results.filter(r => r.executionTimeMs > stats.p75).length;

    return {
      stats,
      distribution: { fast, medium, slow },
      slowestCases: results
        .sort((a, b) => b.executionTimeMs - a.executionTimeMs)
        .slice(0, 5)
        .map(r => ({ caseId: r.caseId, timeMs: r.executionTimeMs }))
    };
  }

  private analyzeTrends(results: EvalResult[]): TrendAnalysis {
    // Analyze if there's a trend in results over time
    const sortedByTime = [...results].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    // Calculate rolling average
    const windowSize = Math.min(10, Math.floor(results.length / 3));
    const rollingAvg: number[] = [];

    for (let i = windowSize - 1; i < sortedByTime.length; i++) {
      const window = sortedByTime.slice(i - windowSize + 1, i + 1);
      const avg = window.reduce((sum, r) => sum + r.score, 0) / window.length;
      rollingAvg.push(avg);
    }

    // Simple trend detection
    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (rollingAvg.length >= 2) {
      const firstHalf = rollingAvg.slice(0, Math.floor(rollingAvg.length / 2));
      const secondHalf = rollingAvg.slice(Math.floor(rollingAvg.length / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      const diff = secondAvg - firstAvg;
      if (diff > 0.05) trend = 'improving';
      else if (diff < -0.05) trend = 'declining';
    }

    return {
      trend,
      rollingAverage: rollingAvg,
      windowSize
    };
  }

  private findOutliers(results: EvalResult[]): OutlierAnalysis {
    const scores = results.map(r => r.score);
    const times = results.map(r => r.executionTimeMs);

    const scoreStats = this.stats.descriptive(scores);
    const timeStats = this.stats.descriptive(times);

    // IQR method for outliers
    const scoreIQR = scoreStats.p75 - scoreStats.p25;
    const timeIQR = timeStats.p75 - timeStats.p25;

    const scoreLowerBound = scoreStats.p25 - 1.5 * scoreIQR;
    const scoreUpperBound = scoreStats.p75 + 1.5 * scoreIQR;
    const timeLowerBound = timeStats.p25 - 1.5 * timeIQR;
    const timeUpperBound = timeStats.p75 + 1.5 * timeIQR;

    return {
      lowScoreOutliers: results
        .filter(r => r.score < scoreLowerBound)
        .map(r => ({ caseId: r.caseId, score: r.score })),
      highTimeOutliers: results
        .filter(r => r.executionTimeMs > timeUpperBound)
        .map(r => ({ caseId: r.caseId, timeMs: r.executionTimeMs }))
    };
  }
}

// Types
export interface ComprehensiveAnalysis {
  overall: OverallAnalysis;
  byCategory: CategoryAnalysis[];
  byDifficulty: DifficultyAnalysis[];
  performance: PerformanceAnalysis;
  trends: TrendAnalysis;
  outliers: OutlierAnalysis;
}

export interface OverallAnalysis {
  totalCases: number;
  passRate: number;
  scoreStats: DescriptiveStats;
  timeStats: DescriptiveStats;
  scoreCI: [number, number];
  passRateCI: [number, number];
}

export interface CategoryAnalysis {
  category: string;
  count: number;
  passRate: number;
  avgScore: number;
  avgTime: number;
}

export interface DifficultyAnalysis {
  difficulty: number;
  count: number;
  passRate: number;
  avgScore: number;
}

export interface PerformanceAnalysis {
  stats: DescriptiveStats;
  distribution: { fast: number; medium: number; slow: number };
  slowestCases: { caseId: string; timeMs: number }[];
}

export interface TrendAnalysis {
  trend: 'improving' | 'declining' | 'stable';
  rollingAverage: number[];
  windowSize: number;
}

export interface OutlierAnalysis {
  lowScoreOutliers: { caseId: string; score: number }[];
  highTimeOutliers: { caseId: string; timeMs: number }[];
}
```

---

## 6. A/B Testing Framework

```typescript
// src/eval/ab/framework.ts

/**
 * Framework for A/B testing tool implementations
 */
export class ABTestFramework {
  private analyzer = new ResultsAnalyzer();
  private stats = new StatisticalAnalyzer();

  /**
   * Run an A/B test comparing two tool implementations
   */
  async runTest(config: ABTestConfig): Promise<ABTestResult> {
    const { controlTool, treatmentTool, cases, options } = config;

    // Run evaluations for both variants
    const controlResults = await this.runVariant('control', controlTool, cases);
    const treatmentResults = await this.runVariant('treatment', treatmentTool, cases);

    // Perform statistical analysis
    const comparison = this.compareVariants(controlResults, treatmentResults);

    // Determine winner
    const winner = this.determineWinner(comparison, options.significanceLevel || 0.05);

    return {
      config,
      controlResults,
      treatmentResults,
      comparison,
      winner,
      recommendation: this.generateRecommendation(comparison, winner)
    };
  }

  private async runVariant(
    name: string,
    tool: Tool,
    cases: EvalCase[]
  ): Promise<VariantResults> {
    const results: EvalResult[] = [];

    for (const evalCase of cases) {
      // Create isolated context
      const context = ContextFactory.createMockContext({});

      const startTime = Date.now();
      const toolResult = await tool.execute(evalCase.input.params, context);
      const executionTimeMs = Date.now() - startTime;

      // Score result
      const scoring = this.scoreResult(toolResult, evalCase.expected);

      results.push({
        caseId: evalCase.id,
        passed: scoring.passed,
        score: scoring.score,
        actual: toolResult.data,
        expected: evalCase.expected,
        executionTimeMs,
        timestamp: new Date()
      });
    }

    return {
      variant: name,
      results,
      summary: {
        totalCases: results.length,
        passRate: results.filter(r => r.passed).length / results.length,
        avgScore: results.reduce((sum, r) => sum + r.score, 0) / results.length,
        avgTime: results.reduce((sum, r) => sum + r.executionTimeMs, 0) / results.length
      }
    };
  }

  private compareVariants(
    control: VariantResults,
    treatment: VariantResults
  ): VariantComparison {
    const controlScores = control.results.map(r => r.score);
    const treatmentScores = treatment.results.map(r => r.score);

    const controlTimes = control.results.map(r => r.executionTimeMs);
    const treatmentTimes = treatment.results.map(r => r.executionTimeMs);

    // Statistical tests
    const scoreTTest = this.stats.tTest(controlScores, treatmentScores);
    const timeTTest = this.stats.tTest(controlTimes, treatmentTimes);

    // Per-case comparison
    const caseComparisons: CaseComparison[] = [];
    for (let i = 0; i < control.results.length; i++) {
      caseComparisons.push({
        caseId: control.results[i].caseId,
        controlScore: control.results[i].score,
        treatmentScore: treatment.results[i].score,
        controlTime: control.results[i].executionTimeMs,
        treatmentTime: treatment.results[i].executionTimeMs,
        scoreDiff: treatment.results[i].score - control.results[i].score,
        timeDiff: treatment.results[i].executionTimeMs - control.results[i].executionTimeMs
      });
    }

    return {
      scoreTTest,
      timeTTest,
      scoreImprovement: treatment.summary.avgScore - control.summary.avgScore,
      timeImprovement: control.summary.avgTime - treatment.summary.avgTime,
      passRateDiff: treatment.summary.passRate - control.summary.passRate,
      caseComparisons,
      betterCases: caseComparisons.filter(c => c.scoreDiff > 0).length,
      worseCases: caseComparisons.filter(c => c.scoreDiff < 0).length,
      sameCases: caseComparisons.filter(c => c.scoreDiff === 0).length
    };
  }

  private determineWinner(
    comparison: VariantComparison,
    significanceLevel: number
  ): ABTestWinner {
    // Check statistical significance
    if (comparison.scoreTTest.pValue >= significanceLevel) {
      return {
        variant: 'none',
        reason: 'No statistically significant difference',
        confidence: 1 - comparison.scoreTTest.pValue
      };
    }

    // Determine direction
    if (comparison.scoreImprovement > 0) {
      return {
        variant: 'treatment',
        reason: `Treatment improves score by ${(comparison.scoreImprovement * 100).toFixed(2)}%`,
        confidence: 1 - comparison.scoreTTest.pValue,
        effectSize: comparison.scoreTTest.effectSize
      };
    } else {
      return {
        variant: 'control',
        reason: `Control is better by ${(Math.abs(comparison.scoreImprovement) * 100).toFixed(2)}%`,
        confidence: 1 - comparison.scoreTTest.pValue,
        effectSize: comparison.scoreTTest.effectSize
      };
    }
  }

  private generateRecommendation(
    comparison: VariantComparison,
    winner: ABTestWinner
  ): string {
    const lines: string[] = [];

    if (winner.variant === 'none') {
      lines.push('No significant difference between variants.');
      lines.push('Consider running more test cases or examining specific categories.');
    } else {
      lines.push(`Recommend adopting ${winner.variant} variant.`);
      lines.push(`Confidence: ${(winner.confidence * 100).toFixed(1)}%`);

      if (winner.effectSize !== undefined) {
        const effectMagnitude =
          Math.abs(winner.effectSize) < 0.2 ? 'small' :
          Math.abs(winner.effectSize) < 0.5 ? 'medium' : 'large';
        lines.push(`Effect size: ${effectMagnitude} (${winner.effectSize.toFixed(3)})`);
      }
    }

    // Additional insights
    if (comparison.betterCases > comparison.worseCases) {
      lines.push(`Treatment is better in ${comparison.betterCases}/${comparison.caseComparisons.length} cases.`);
    }

    if (comparison.timeImprovement > 0) {
      lines.push(`Treatment is ${comparison.timeImprovement.toFixed(0)}ms faster on average.`);
    } else if (comparison.timeImprovement < 0) {
      lines.push(`Treatment is ${Math.abs(comparison.timeImprovement).toFixed(0)}ms slower on average.`);
    }

    return lines.join('\n');
  }

  private scoreResult(toolResult: ToolResult, expected: EvalExpectation): { passed: boolean; score: number } {
    // Simplified scoring
    if (expected.exact !== undefined) {
      const matches = JSON.stringify(toolResult.data) === JSON.stringify(expected.exact);
      return { passed: matches, score: matches ? 1 : 0 };
    }
    return { passed: toolResult.success, score: toolResult.success ? 1 : 0 };
  }
}

// Types
export interface ABTestConfig {
  name: string;
  controlTool: Tool;
  treatmentTool: Tool;
  cases: EvalCase[];
  options: {
    significanceLevel?: number;
    minSampleSize?: number;
  };
}

export interface VariantResults {
  variant: string;
  results: EvalResult[];
  summary: {
    totalCases: number;
    passRate: number;
    avgScore: number;
    avgTime: number;
  };
}

export interface VariantComparison {
  scoreTTest: TTestResult;
  timeTTest: TTestResult;
  scoreImprovement: number;
  timeImprovement: number;
  passRateDiff: number;
  caseComparisons: CaseComparison[];
  betterCases: number;
  worseCases: number;
  sameCases: number;
}

export interface CaseComparison {
  caseId: string;
  controlScore: number;
  treatmentScore: number;
  controlTime: number;
  treatmentTime: number;
  scoreDiff: number;
  timeDiff: number;
}

export interface ABTestWinner {
  variant: 'control' | 'treatment' | 'none';
  reason: string;
  confidence: number;
  effectSize?: number;
}

export interface ABTestResult {
  config: ABTestConfig;
  controlResults: VariantResults;
  treatmentResults: VariantResults;
  comparison: VariantComparison;
  winner: ABTestWinner;
  recommendation: string;
}
```

---

## 7-10. Additional Sections

Due to length, I'll provide summaries for the remaining sections:

### 7. Continuous Evaluation Pipeline

- **Scheduled Runs**: Cron-based evaluation runs
- **Incremental Evaluation**: Only run affected tests on code changes
- **Result Storage**: Time-series database for metrics
- **Alerting**: Slack/email alerts on regressions
- **Dashboard Integration**: Grafana/DataDog integration

### 8. Edge Case Generation

- **Mutation-Based**: Modify valid inputs to find boundaries
- **Grammar-Based**: Generate inputs from grammar definitions
- **Coverage-Guided**: Focus on untested code paths
- **Adversarial**: Generate inputs likely to cause failures

### 9. Coverage Analysis

- **Input Coverage**: What parameter combinations are tested?
- **Path Coverage**: What code paths are exercised?
- **Scenario Coverage**: What real-world scenarios are covered?
- **Gap Detection**: Identify missing test cases

### 10. Regression Detection

- **Baseline Comparison**: Compare against previous release
- **Threshold Alerts**: Alert when metrics drop below threshold
- **Trend Analysis**: Detect gradual degradation
- **Root Cause Analysis**: Identify which changes caused regressions

---

## Summary

This deep dive covered:

1. **Fixture Management**: In-memory, temp directory, and snapshot fixtures
2. **Golden Dataset Creation**: Templates, generators, and human labeling
3. **Scoring Algorithms**: Exact match, similarity, semantic, and composite scorers
4. **LLM Evaluation**: Tool selection and parameter quality evaluation
5. **Statistical Analysis**: Descriptive stats, t-tests, confidence intervals
6. **A/B Testing**: Compare tool implementations with statistical rigor

These components work together to create a comprehensive evaluation system that can measure, track, and improve tool quality over time.
