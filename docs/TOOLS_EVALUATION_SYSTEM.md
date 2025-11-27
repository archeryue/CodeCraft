# Tools Evaluation System

## Executive Summary

This document describes a comprehensive evaluation system for CodeCraft's tools. The system enables systematic testing of tools in isolation, in combination, and with LLM integration. It provides metrics, identifies weaknesses, and guides tool improvement.

## Goals

1. **Measure Tool Quality**: Quantify how well each tool performs its intended function
2. **Identify Weaknesses**: Find edge cases, failure modes, and performance issues
3. **Guide Improvements**: Provide actionable data for tool enhancement
4. **Prevent Regressions**: Detect when changes break existing functionality
5. **Benchmark LLM Integration**: Measure how effectively the LLM uses tools

---

## Evaluation Levels

The evaluation system operates at four levels:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Level 4: End-to-End Eval                          │
│        User query → Agent → Multiple tools → Final answer            │
│        Measures: Task completion, user satisfaction                  │
└─────────────────────────────────────────────────────────────────────┘
                                  ▲
┌─────────────────────────────────────────────────────────────────────┐
│                    Level 3: LLM + Tool Eval                          │
│        LLM selects tool → LLM provides params → Tool executes        │
│        Measures: Tool selection accuracy, parameter quality          │
└─────────────────────────────────────────────────────────────────────┘
                                  ▲
┌─────────────────────────────────────────────────────────────────────┐
│                    Level 2: Tool Chain Eval                          │
│        Tool A output → Tool B input → Tool C input                   │
│        Measures: Composability, data flow correctness                │
└─────────────────────────────────────────────────────────────────────┘
                                  ▲
┌─────────────────────────────────────────────────────────────────────┐
│                    Level 1: Unit Tool Eval                           │
│        Input → Single Tool → Output                                  │
│        Measures: Correctness, performance, edge cases                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Core Data Structures

### Eval Case

```typescript
// src/eval/types.ts

/**
 * A single evaluation test case
 */
export interface EvalCase {
  // Unique identifier
  id: string;

  // Human-readable description
  description: string;

  // Tool being tested (or 'chain' for multi-tool, 'e2e' for end-to-end)
  tool: string;

  // Category for grouping
  category: EvalCategory;

  // Tags for filtering
  tags: string[];

  // Difficulty rating (1-5)
  difficulty: number;

  // Input specification
  input: EvalInput;

  // Expected output specification
  expected: EvalExpectation;

  // Optional fixture setup
  fixtures?: FixtureSpec;

  // Optional metadata
  metadata?: Record<string, unknown>;
}

export type EvalCategory =
  | 'happy_path'      // Normal, expected use cases
  | 'edge_case'       // Boundary conditions
  | 'error_handling'  // Error scenarios
  | 'performance'     // Speed/resource tests
  | 'security'        // Security-sensitive scenarios
  | 'llm_selection'   // LLM tool selection tests
  | 'llm_params'      // LLM parameter generation tests
  | 'chain'           // Multi-tool sequences
  | 'e2e';            // End-to-end user scenarios

/**
 * Input specification for an eval case
 */
export interface EvalInput {
  // For unit evals: direct tool parameters
  params?: Record<string, unknown>;

  // For LLM evals: natural language query
  query?: string;

  // For chain evals: sequence of operations
  chain?: ChainStep[];

  // Context to provide
  context?: {
    files?: Record<string, string>;
    cwd?: string;
    env?: Record<string, string>;
  };
}

export interface ChainStep {
  tool: string;
  params: Record<string, unknown> | 'from_previous';
  extractOutput?: string; // JSONPath to extract for next step
}

/**
 * Expected output specification
 */
export interface EvalExpectation {
  // Exact match (for deterministic outputs)
  exact?: unknown;

  // Partial match (output contains these values)
  contains?: unknown;

  // Pattern match (regex for string outputs)
  pattern?: string;

  // JSON Schema validation
  schema?: object;

  // Custom scorer function (returns 0-1)
  scorer?: string; // Name of registered scorer

  // For LLM evals: expected tool to be called
  expectedTool?: string;

  // For LLM evals: expected parameter patterns
  expectedParams?: Record<string, unknown>;

  // Should the operation succeed?
  success?: boolean;

  // Expected error code (if success: false)
  errorCode?: string;

  // Performance constraints
  performance?: {
    maxTimeMs?: number;
    maxMemoryMb?: number;
  };
}

/**
 * Fixture specification for test setup
 */
export interface FixtureSpec {
  // Files to create in temp directory
  files?: Record<string, string>;

  // Directories to create
  directories?: string[];

  // Use a pre-built fixture by name
  preset?: string;

  // Copy from existing directory
  copyFrom?: string;
}
```

### Eval Result

```typescript
/**
 * Result of running an eval case
 */
export interface EvalResult {
  // Case that was evaluated
  caseId: string;

  // Did it pass?
  passed: boolean;

  // Score (0-1) for partial credit
  score: number;

  // Actual output from tool
  actual: unknown;

  // Expected output
  expected: unknown;

  // Execution time in ms
  executionTimeMs: number;

  // Memory usage in bytes
  memoryUsageBytes?: number;

  // For LLM evals: what tool was selected
  selectedTool?: string;

  // For LLM evals: what params were generated
  generatedParams?: Record<string, unknown>;

  // Error if failed
  error?: {
    code: string;
    message: string;
    stack?: string;
  };

  // Detailed breakdown for complex evals
  breakdown?: {
    criterion: string;
    passed: boolean;
    score: number;
    details?: string;
  }[];

  // Timestamp
  timestamp: Date;
}

/**
 * Aggregated results for a tool or suite
 */
export interface EvalSummary {
  // What was evaluated
  subject: string;

  // Overall metrics
  totalCases: number;
  passedCases: number;
  failedCases: number;
  passRate: number;
  averageScore: number;

  // Breakdown by category
  byCategory: Record<EvalCategory, {
    total: number;
    passed: number;
    passRate: number;
    avgScore: number;
  }>;

  // Performance metrics
  performance: {
    avgExecutionTimeMs: number;
    p50ExecutionTimeMs: number;
    p95ExecutionTimeMs: number;
    p99ExecutionTimeMs: number;
    maxExecutionTimeMs: number;
  };

  // Failed cases for investigation
  failures: {
    caseId: string;
    description: string;
    error?: string;
  }[];

  // Timestamp
  timestamp: Date;
}
```

---

## Eval Dataset Structure

### Directory Layout

```
evals/
├── datasets/
│   ├── read_file/
│   │   ├── happy_path.json
│   │   ├── edge_cases.json
│   │   └── errors.json
│   ├── write_file/
│   │   ├── happy_path.json
│   │   ├── edge_cases.json
│   │   └── errors.json
│   ├── grep/
│   │   ├── happy_path.json
│   │   ├── regex_patterns.json
│   │   ├── large_files.json
│   │   └── errors.json
│   ├── search_code/
│   │   ├── functions.json
│   │   ├── classes.json
│   │   ├── fuzzy_matching.json
│   │   └── edge_cases.json
│   ├── chains/
│   │   ├── read_edit_write.json
│   │   ├── search_then_read.json
│   │   └── analyze_refactor.json
│   ├── llm_selection/
│   │   ├── file_operations.json
│   │   ├── search_queries.json
│   │   └── analysis_tasks.json
│   └── e2e/
│       ├── bug_fixes.json
│       ├── feature_additions.json
│       └── refactoring.json
├── fixtures/
│   ├── simple_project/
│   │   ├── src/
│   │   ├── tests/
│   │   └── package.json
│   ├── typescript_project/
│   │   ├── src/
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── rust_project/
│       ├── src/
│       └── Cargo.toml
├── scorers/
│   ├── semantic_similarity.ts
│   ├── code_correctness.ts
│   └── output_format.ts
└── config.json
```

### Dataset File Format

```json
{
  "tool": "grep",
  "version": "1.0",
  "description": "Evaluation cases for grep tool - regex patterns",
  "cases": [
    {
      "id": "grep-regex-001",
      "description": "Find function declarations with async keyword",
      "category": "happy_path",
      "tags": ["regex", "functions", "async"],
      "difficulty": 2,
      "input": {
        "params": {
          "pattern": "async\\s+function\\s+\\w+",
          "path": ".",
          "include": "*.ts"
        }
      },
      "fixtures": {
        "preset": "typescript_project"
      },
      "expected": {
        "success": true,
        "contains": {
          "length": { "$gte": 1 }
        },
        "schema": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["file", "line", "content"]
          }
        }
      }
    },
    {
      "id": "grep-regex-002",
      "description": "Handle invalid regex gracefully",
      "category": "error_handling",
      "tags": ["regex", "error"],
      "difficulty": 1,
      "input": {
        "params": {
          "pattern": "[invalid regex",
          "path": "."
        }
      },
      "expected": {
        "success": false,
        "errorCode": "INVALID_REGEX"
      }
    },
    {
      "id": "grep-regex-003",
      "description": "Case insensitive search",
      "category": "happy_path",
      "tags": ["regex", "case-insensitive"],
      "difficulty": 1,
      "input": {
        "params": {
          "pattern": "error",
          "path": ".",
          "ignoreCase": true
        },
        "context": {
          "files": {
            "test.txt": "Error on line 1\nERROR on line 2\nerror on line 3"
          }
        }
      },
      "expected": {
        "success": true,
        "exact": [
          { "file": "test.txt", "line": 1, "content": "Error on line 1" },
          { "file": "test.txt", "line": 2, "content": "ERROR on line 2" },
          { "file": "test.txt", "line": 3, "content": "error on line 3" }
        ]
      }
    }
  ]
}
```

---

## Eval Runner Implementation

### Core Runner

```typescript
// src/eval/runner.ts

import { EvalCase, EvalResult, EvalSummary, EvalExpectation } from './types';
import { Tool, ToolContext, ToolResult } from '../types/tool';
import { ToolRegistry } from '../types/registry';
import { ToolExecutor } from '../types/executor';
import { FixtureManager } from './fixtures';
import { ScorerRegistry } from './scorers';

export interface EvalRunnerOptions {
  // Run cases in parallel
  parallel?: boolean;

  // Max concurrent cases
  concurrency?: number;

  // Timeout per case
  timeoutMs?: number;

  // Filter by tags
  tags?: string[];

  // Filter by category
  categories?: string[];

  // Stop on first failure
  failFast?: boolean;

  // Verbose output
  verbose?: boolean;
}

export class EvalRunner {
  private registry: ToolRegistry;
  private executor: ToolExecutor;
  private fixtures: FixtureManager;
  private scorers: ScorerRegistry;

  constructor(
    registry: ToolRegistry,
    executor: ToolExecutor,
    fixtures: FixtureManager,
    scorers: ScorerRegistry
  ) {
    this.registry = registry;
    this.executor = executor;
    this.fixtures = fixtures;
    this.scorers = scorers;
  }

  /**
   * Run a single eval case
   */
  async runCase(evalCase: EvalCase): Promise<EvalResult> {
    const startTime = Date.now();

    try {
      // Setup fixtures
      const fixtureContext = await this.fixtures.setup(evalCase.fixtures);

      // Create context with fixtures
      const context = this.createContext(evalCase.input.context, fixtureContext);

      // Execute tool
      const toolResult = await this.executor.executeWithContext(
        evalCase.tool,
        evalCase.input.params,
        context
      );

      // Evaluate result
      const evaluation = this.evaluateResult(
        toolResult,
        evalCase.expected,
        evalCase
      );

      // Cleanup fixtures
      await this.fixtures.cleanup(fixtureContext);

      return {
        caseId: evalCase.id,
        passed: evaluation.passed,
        score: evaluation.score,
        actual: toolResult.data,
        expected: evalCase.expected,
        executionTimeMs: Date.now() - startTime,
        breakdown: evaluation.breakdown,
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        caseId: evalCase.id,
        passed: false,
        score: 0,
        actual: null,
        expected: evalCase.expected,
        executionTimeMs: Date.now() - startTime,
        error: {
          code: 'EXECUTION_ERROR',
          message: error.message,
          stack: error.stack
        },
        timestamp: new Date()
      };
    }
  }

  /**
   * Run all cases in a dataset
   */
  async runDataset(
    cases: EvalCase[],
    options: EvalRunnerOptions = {}
  ): Promise<EvalResult[]> {
    // Filter cases
    let filtered = cases;

    if (options.tags?.length) {
      filtered = filtered.filter(c =>
        options.tags!.some(t => c.tags.includes(t))
      );
    }

    if (options.categories?.length) {
      filtered = filtered.filter(c =>
        options.categories!.includes(c.category)
      );
    }

    // Run cases
    const results: EvalResult[] = [];

    if (options.parallel) {
      // Parallel execution with concurrency limit
      const concurrency = options.concurrency ?? 5;
      const chunks = this.chunkArray(filtered, concurrency);

      for (const chunk of chunks) {
        const chunkResults = await Promise.all(
          chunk.map(c => this.runCase(c))
        );
        results.push(...chunkResults);

        if (options.failFast && chunkResults.some(r => !r.passed)) {
          break;
        }
      }
    } else {
      // Sequential execution
      for (const evalCase of filtered) {
        const result = await this.runCase(evalCase);
        results.push(result);

        if (options.verbose) {
          console.log(
            `${result.passed ? '✓' : '✗'} ${evalCase.id}: ${evalCase.description}`
          );
        }

        if (options.failFast && !result.passed) {
          break;
        }
      }
    }

    return results;
  }

  /**
   * Generate summary from results
   */
  summarize(results: EvalResult[], subject: string): EvalSummary {
    const passed = results.filter(r => r.passed);
    const failed = results.filter(r => !r.passed);

    // Group by category
    const byCategory: Record<string, EvalResult[]> = {};
    // (would need category info from cases)

    // Calculate performance percentiles
    const times = results.map(r => r.executionTimeMs).sort((a, b) => a - b);

    return {
      subject,
      totalCases: results.length,
      passedCases: passed.length,
      failedCases: failed.length,
      passRate: passed.length / results.length,
      averageScore: results.reduce((sum, r) => sum + r.score, 0) / results.length,
      byCategory: {}, // Would populate from cases
      performance: {
        avgExecutionTimeMs: times.reduce((a, b) => a + b, 0) / times.length,
        p50ExecutionTimeMs: this.percentile(times, 50),
        p95ExecutionTimeMs: this.percentile(times, 95),
        p99ExecutionTimeMs: this.percentile(times, 99),
        maxExecutionTimeMs: Math.max(...times)
      },
      failures: failed.map(r => ({
        caseId: r.caseId,
        description: '', // Would need from case
        error: r.error?.message
      })),
      timestamp: new Date()
    };
  }

  /**
   * Evaluate a tool result against expectations
   */
  private evaluateResult(
    result: ToolResult,
    expected: EvalExpectation,
    evalCase: EvalCase
  ): { passed: boolean; score: number; breakdown: any[] } {
    const breakdown: any[] = [];
    let totalScore = 0;
    let totalCriteria = 0;

    // Check success/failure
    if (expected.success !== undefined) {
      const successMatch = result.success === expected.success;
      breakdown.push({
        criterion: 'success',
        passed: successMatch,
        score: successMatch ? 1 : 0,
        details: `Expected success=${expected.success}, got ${result.success}`
      });
      totalScore += successMatch ? 1 : 0;
      totalCriteria++;
    }

    // Check exact match
    if (expected.exact !== undefined) {
      const exactMatch = this.deepEqual(result.data, expected.exact);
      breakdown.push({
        criterion: 'exact_match',
        passed: exactMatch,
        score: exactMatch ? 1 : 0,
        details: exactMatch ? 'Exact match' : 'Output differs from expected'
      });
      totalScore += exactMatch ? 1 : 0;
      totalCriteria++;
    }

    // Check contains
    if (expected.contains !== undefined) {
      const containsMatch = this.checkContains(result.data, expected.contains);
      breakdown.push({
        criterion: 'contains',
        passed: containsMatch,
        score: containsMatch ? 1 : 0
      });
      totalScore += containsMatch ? 1 : 0;
      totalCriteria++;
    }

    // Check pattern
    if (expected.pattern !== undefined) {
      const regex = new RegExp(expected.pattern);
      const patternMatch = typeof result.data === 'string' && regex.test(result.data);
      breakdown.push({
        criterion: 'pattern',
        passed: patternMatch,
        score: patternMatch ? 1 : 0
      });
      totalScore += patternMatch ? 1 : 0;
      totalCriteria++;
    }

    // Check error code
    if (expected.errorCode !== undefined) {
      const errorMatch = result.error?.code === expected.errorCode;
      breakdown.push({
        criterion: 'error_code',
        passed: errorMatch,
        score: errorMatch ? 1 : 0,
        details: `Expected error=${expected.errorCode}, got ${result.error?.code}`
      });
      totalScore += errorMatch ? 1 : 0;
      totalCriteria++;
    }

    // Check performance
    if (expected.performance?.maxTimeMs !== undefined) {
      const timeOk = (result.metadata?.executionTimeMs ?? 0) <= expected.performance.maxTimeMs;
      breakdown.push({
        criterion: 'performance_time',
        passed: timeOk,
        score: timeOk ? 1 : 0
      });
      totalScore += timeOk ? 1 : 0;
      totalCriteria++;
    }

    // Use custom scorer
    if (expected.scorer) {
      const scorer = this.scorers.get(expected.scorer);
      if (scorer) {
        const customScore = scorer(result, expected, evalCase);
        breakdown.push({
          criterion: 'custom_scorer',
          passed: customScore >= 0.5,
          score: customScore
        });
        totalScore += customScore;
        totalCriteria++;
      }
    }

    const avgScore = totalCriteria > 0 ? totalScore / totalCriteria : 1;
    const passed = breakdown.every(b => b.passed);

    return { passed, score: avgScore, breakdown };
  }

  private deepEqual(a: unknown, b: unknown): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  private checkContains(actual: unknown, expected: unknown): boolean {
    // Simplified contains check
    if (typeof expected === 'object' && expected !== null) {
      for (const [key, value] of Object.entries(expected)) {
        if (key === '$gte') {
          return (actual as any).length >= value;
        }
        // Add more operators as needed
      }
    }
    return JSON.stringify(actual).includes(JSON.stringify(expected));
  }

  private percentile(arr: number[], p: number): number {
    const index = Math.ceil((p / 100) * arr.length) - 1;
    return arr[Math.max(0, index)];
  }

  private chunkArray<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }

  private createContext(
    inputContext?: EvalInput['context'],
    fixtureContext?: any
  ): ToolContext {
    // Create merged context from input and fixtures
    // Implementation details...
    return {} as ToolContext;
  }
}
```

---

## LLM Evaluation

### LLM Tool Selection Eval

```typescript
// src/eval/llm-eval.ts

import { EvalCase, EvalResult } from './types';

export interface LLMEvalCase extends EvalCase {
  input: {
    // Natural language query
    query: string;

    // Optional conversation history
    history?: { role: 'user' | 'assistant'; content: string }[];

    // Context about current state
    context?: {
      currentFile?: string;
      recentFiles?: string[];
      projectType?: string;
    };
  };

  expected: {
    // Which tool should be selected
    expectedTool: string;

    // Alternative acceptable tools
    acceptableTools?: string[];

    // Expected parameter patterns (not exact values)
    expectedParams?: {
      [key: string]: {
        type?: 'string' | 'number' | 'boolean';
        pattern?: string;
        contains?: string;
        equals?: unknown;
      };
    };

    // Should not select these tools
    forbiddenTools?: string[];
  };
}

export class LLMEvalRunner {
  private llmClient: any; // Gemini client

  /**
   * Run LLM tool selection eval
   */
  async runToolSelectionEval(evalCase: LLMEvalCase): Promise<EvalResult> {
    const startTime = Date.now();

    // Send query to LLM with tool definitions
    const response = await this.llmClient.generateContent({
      contents: [{ role: 'user', parts: [{ text: evalCase.input.query }] }],
      tools: this.getToolDeclarations()
    });

    // Extract function call from response
    const functionCall = this.extractFunctionCall(response);

    if (!functionCall) {
      return {
        caseId: evalCase.id,
        passed: false,
        score: 0,
        actual: { selectedTool: null },
        expected: evalCase.expected,
        executionTimeMs: Date.now() - startTime,
        error: { code: 'NO_TOOL_SELECTED', message: 'LLM did not select any tool' },
        timestamp: new Date()
      };
    }

    // Evaluate tool selection
    const breakdown: any[] = [];

    // Check primary tool
    const primaryMatch = functionCall.name === evalCase.expected.expectedTool;
    const acceptableMatch = evalCase.expected.acceptableTools?.includes(functionCall.name);
    const toolCorrect = primaryMatch || acceptableMatch;

    breakdown.push({
      criterion: 'tool_selection',
      passed: toolCorrect,
      score: primaryMatch ? 1 : (acceptableMatch ? 0.8 : 0),
      details: `Selected: ${functionCall.name}, Expected: ${evalCase.expected.expectedTool}`
    });

    // Check forbidden tools
    if (evalCase.expected.forbiddenTools?.includes(functionCall.name)) {
      breakdown.push({
        criterion: 'forbidden_tool',
        passed: false,
        score: 0,
        details: `Selected forbidden tool: ${functionCall.name}`
      });
    }

    // Check parameters
    if (evalCase.expected.expectedParams && toolCorrect) {
      for (const [param, expectation] of Object.entries(evalCase.expected.expectedParams)) {
        const actualValue = functionCall.args[param];
        let paramMatch = true;

        if (expectation.type && typeof actualValue !== expectation.type) {
          paramMatch = false;
        }
        if (expectation.pattern && !new RegExp(expectation.pattern).test(String(actualValue))) {
          paramMatch = false;
        }
        if (expectation.contains && !String(actualValue).includes(expectation.contains)) {
          paramMatch = false;
        }
        if (expectation.equals !== undefined && actualValue !== expectation.equals) {
          paramMatch = false;
        }

        breakdown.push({
          criterion: `param_${param}`,
          passed: paramMatch,
          score: paramMatch ? 1 : 0,
          details: `${param}: ${JSON.stringify(actualValue)}`
        });
      }
    }

    const avgScore = breakdown.reduce((sum, b) => sum + b.score, 0) / breakdown.length;

    return {
      caseId: evalCase.id,
      passed: breakdown.every(b => b.passed),
      score: avgScore,
      actual: {
        selectedTool: functionCall.name,
        generatedParams: functionCall.args
      },
      expected: evalCase.expected,
      executionTimeMs: Date.now() - startTime,
      selectedTool: functionCall.name,
      generatedParams: functionCall.args,
      breakdown,
      timestamp: new Date()
    };
  }

  private extractFunctionCall(response: any): { name: string; args: any } | null {
    // Extract function call from Gemini response
    const candidate = response.response?.candidates?.[0];
    const functionCall = candidate?.content?.parts?.find((p: any) => p.functionCall);
    if (functionCall) {
      return {
        name: functionCall.functionCall.name,
        args: functionCall.functionCall.args
      };
    }
    return null;
  }

  private getToolDeclarations(): any[] {
    // Return tool declarations for LLM
    return [];
  }
}
```

### LLM Eval Dataset Example

```json
{
  "tool": "llm_selection",
  "version": "1.0",
  "description": "LLM tool selection evaluation - file operations",
  "cases": [
    {
      "id": "llm-file-001",
      "description": "Read a specific file",
      "category": "llm_selection",
      "tags": ["read", "file", "basic"],
      "difficulty": 1,
      "input": {
        "query": "Show me the contents of package.json"
      },
      "expected": {
        "expectedTool": "read_file",
        "expectedParams": {
          "path": {
            "type": "string",
            "contains": "package.json"
          }
        }
      }
    },
    {
      "id": "llm-file-002",
      "description": "Find files matching pattern",
      "category": "llm_selection",
      "tags": ["glob", "search", "pattern"],
      "difficulty": 2,
      "input": {
        "query": "Find all TypeScript files in the src directory"
      },
      "expected": {
        "expectedTool": "glob",
        "acceptableTools": ["list_directory"],
        "expectedParams": {
          "pattern": {
            "type": "string",
            "pattern": "\\*\\*?\\/\\*\\.ts"
          }
        },
        "forbiddenTools": ["run_command"]
      }
    },
    {
      "id": "llm-file-003",
      "description": "Search for code pattern",
      "category": "llm_selection",
      "tags": ["search", "code", "semantic"],
      "difficulty": 3,
      "input": {
        "query": "Find where the User class is defined"
      },
      "expected": {
        "expectedTool": "search_code",
        "acceptableTools": ["grep"],
        "expectedParams": {
          "query": {
            "type": "string",
            "pattern": "[Uu]ser|class"
          }
        }
      }
    },
    {
      "id": "llm-file-004",
      "description": "Distinguish grep vs search_code",
      "category": "llm_selection",
      "tags": ["grep", "error_message", "text"],
      "difficulty": 3,
      "input": {
        "query": "Find all occurrences of the error message 'Connection refused'"
      },
      "expected": {
        "expectedTool": "grep",
        "forbiddenTools": ["search_code"],
        "expectedParams": {
          "pattern": {
            "type": "string",
            "contains": "Connection refused"
          }
        }
      }
    }
  ]
}
```

---

## Tool Chain Evaluation

### Chain Eval Runner

```typescript
// src/eval/chain-eval.ts

import { EvalCase, EvalResult, ChainStep } from './types';
import { ToolExecutor } from '../types/executor';
import { ToolContext } from '../types/tool';

export interface ChainEvalCase extends EvalCase {
  input: {
    chain: ChainStep[];
    context?: any;
  };

  expected: {
    // Final output expectation
    finalOutput?: any;

    // Per-step expectations
    steps?: {
      tool: string;
      success: boolean;
      outputContains?: any;
    }[];

    // Overall success
    success: boolean;
  };
}

export class ChainEvalRunner {
  private executor: ToolExecutor;

  async runChainEval(evalCase: ChainEvalCase, context: ToolContext): Promise<EvalResult> {
    const startTime = Date.now();
    const stepResults: any[] = [];
    let previousOutput: any = null;

    for (const step of evalCase.input.chain) {
      // Resolve params (may reference previous output)
      const params = step.params === 'from_previous'
        ? this.extractFromPrevious(previousOutput, step.extractOutput)
        : step.params;

      // Execute step
      const result = await this.executor.executeWithContext(
        step.tool,
        params,
        context
      );

      stepResults.push({
        tool: step.tool,
        params,
        result
      });

      if (!result.success) {
        // Chain broken
        return {
          caseId: evalCase.id,
          passed: false,
          score: stepResults.length / evalCase.input.chain.length * 0.5,
          actual: { steps: stepResults, finalOutput: null },
          expected: evalCase.expected,
          executionTimeMs: Date.now() - startTime,
          error: {
            code: 'CHAIN_BROKEN',
            message: `Chain failed at step ${stepResults.length}: ${step.tool}`
          },
          timestamp: new Date()
        };
      }

      previousOutput = result.data;
    }

    // Evaluate final result
    const breakdown: any[] = [];

    // Check overall success
    breakdown.push({
      criterion: 'chain_complete',
      passed: true,
      score: 1
    });

    // Check final output
    if (evalCase.expected.finalOutput) {
      const outputMatch = this.checkOutput(previousOutput, evalCase.expected.finalOutput);
      breakdown.push({
        criterion: 'final_output',
        passed: outputMatch,
        score: outputMatch ? 1 : 0
      });
    }

    // Check per-step expectations
    if (evalCase.expected.steps) {
      for (let i = 0; i < evalCase.expected.steps.length; i++) {
        const expected = evalCase.expected.steps[i];
        const actual = stepResults[i];

        if (actual) {
          const stepMatch = actual.result.success === expected.success;
          breakdown.push({
            criterion: `step_${i}_${expected.tool}`,
            passed: stepMatch,
            score: stepMatch ? 1 : 0
          });
        }
      }
    }

    const avgScore = breakdown.reduce((sum, b) => sum + b.score, 0) / breakdown.length;

    return {
      caseId: evalCase.id,
      passed: breakdown.every(b => b.passed),
      score: avgScore,
      actual: { steps: stepResults, finalOutput: previousOutput },
      expected: evalCase.expected,
      executionTimeMs: Date.now() - startTime,
      breakdown,
      timestamp: new Date()
    };
  }

  private extractFromPrevious(output: any, path?: string): any {
    if (!path) return output;
    // Simple JSONPath extraction
    const parts = path.split('.');
    let value = output;
    for (const part of parts) {
      value = value?.[part];
    }
    return value;
  }

  private checkOutput(actual: any, expected: any): boolean {
    return JSON.stringify(actual).includes(JSON.stringify(expected));
  }
}
```

---

## Custom Scorers

```typescript
// src/eval/scorers/index.ts

import { ToolResult, EvalExpectation, EvalCase } from '../types';

export type Scorer = (
  result: ToolResult,
  expected: EvalExpectation,
  evalCase: EvalCase
) => number;

export class ScorerRegistry {
  private scorers: Map<string, Scorer> = new Map();

  register(name: string, scorer: Scorer): void {
    this.scorers.set(name, scorer);
  }

  get(name: string): Scorer | undefined {
    return this.scorers.get(name);
  }
}

// Built-in scorers

/**
 * Semantic similarity using Levenshtein distance
 */
export const semanticSimilarityScorer: Scorer = (result, expected) => {
  if (typeof result.data !== 'string' || typeof expected.exact !== 'string') {
    return 0;
  }

  const distance = levenshteinDistance(result.data, expected.exact);
  const maxLen = Math.max(result.data.length, expected.exact.length);

  return 1 - (distance / maxLen);
};

/**
 * JSON structure similarity
 */
export const structureSimilarityScorer: Scorer = (result, expected) => {
  const actualKeys = getNestedKeys(result.data);
  const expectedKeys = getNestedKeys(expected.exact);

  const intersection = actualKeys.filter(k => expectedKeys.includes(k));
  const union = [...new Set([...actualKeys, ...expectedKeys])];

  return intersection.length / union.length;
};

/**
 * Code correctness (for generated code)
 */
export const codeCorrectnessScorer: Scorer = (result, expected, evalCase) => {
  // Would integrate with AST parsing or execution
  // Placeholder implementation
  return typeof result.data === 'string' && result.data.length > 0 ? 0.5 : 0;
};

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

function getNestedKeys(obj: any, prefix = ''): string[] {
  if (typeof obj !== 'object' || obj === null) {
    return prefix ? [prefix] : [];
  }

  const keys: string[] = [];
  for (const key of Object.keys(obj)) {
    const newPrefix = prefix ? `${prefix}.${key}` : key;
    keys.push(...getNestedKeys(obj[key], newPrefix));
  }
  return keys;
}
```

---

## CLI Interface

```typescript
// src/eval/cli.ts

import { program } from 'commander';
import { EvalRunner } from './runner';
import { loadDataset } from './loader';

program
  .name('codecraft-eval')
  .description('CodeCraft tool evaluation system');

program
  .command('run')
  .description('Run evaluations')
  .option('-t, --tool <tool>', 'Evaluate specific tool')
  .option('-d, --dataset <path>', 'Path to dataset file or directory')
  .option('-c, --category <category>', 'Filter by category')
  .option('--tags <tags>', 'Filter by tags (comma-separated)')
  .option('--parallel', 'Run in parallel')
  .option('--fail-fast', 'Stop on first failure')
  .option('-v, --verbose', 'Verbose output')
  .option('-o, --output <path>', 'Output results to file')
  .action(async (options) => {
    const runner = createRunner();
    const cases = await loadDataset(options.dataset || 'evals/datasets');

    const results = await runner.runDataset(cases, {
      parallel: options.parallel,
      failFast: options.failFast,
      verbose: options.verbose,
      categories: options.category ? [options.category] : undefined,
      tags: options.tags?.split(',')
    });

    const summary = runner.summarize(results, options.tool || 'all');

    console.log('\n=== Evaluation Summary ===');
    console.log(`Total: ${summary.totalCases}`);
    console.log(`Passed: ${summary.passedCases} (${(summary.passRate * 100).toFixed(1)}%)`);
    console.log(`Failed: ${summary.failedCases}`);
    console.log(`Avg Score: ${(summary.averageScore * 100).toFixed(1)}%`);
    console.log(`Avg Time: ${summary.performance.avgExecutionTimeMs.toFixed(0)}ms`);

    if (summary.failures.length > 0) {
      console.log('\n=== Failures ===');
      for (const failure of summary.failures) {
        console.log(`  ✗ ${failure.caseId}: ${failure.error || 'Failed'}`);
      }
    }

    if (options.output) {
      await writeResults(options.output, { results, summary });
    }

    process.exit(summary.failedCases > 0 ? 1 : 0);
  });

program
  .command('report')
  .description('Generate evaluation report')
  .option('-i, --input <path>', 'Input results file')
  .option('-f, --format <format>', 'Output format (html, json, markdown)', 'markdown')
  .option('-o, --output <path>', 'Output file')
  .action(async (options) => {
    // Generate report from saved results
  });

program
  .command('compare')
  .description('Compare two evaluation runs')
  .argument('<baseline>', 'Baseline results file')
  .argument('<current>', 'Current results file')
  .action(async (baseline, current) => {
    // Compare results and show diff
  });

program.parse();
```

---

## Reporting

### Report Generator

```typescript
// src/eval/report.ts

import { EvalResult, EvalSummary } from './types';

export interface ReportOptions {
  format: 'html' | 'json' | 'markdown';
  includeDetails: boolean;
  includeBreakdown: boolean;
}

export function generateReport(
  summary: EvalSummary,
  results: EvalResult[],
  options: ReportOptions
): string {
  switch (options.format) {
    case 'markdown':
      return generateMarkdownReport(summary, results, options);
    case 'html':
      return generateHtmlReport(summary, results, options);
    case 'json':
      return JSON.stringify({ summary, results }, null, 2);
    default:
      throw new Error(`Unknown format: ${options.format}`);
  }
}

function generateMarkdownReport(
  summary: EvalSummary,
  results: EvalResult[],
  options: ReportOptions
): string {
  let md = `# Evaluation Report: ${summary.subject}\n\n`;
  md += `**Generated:** ${summary.timestamp.toISOString()}\n\n`;

  md += `## Summary\n\n`;
  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| Total Cases | ${summary.totalCases} |\n`;
  md += `| Passed | ${summary.passedCases} (${(summary.passRate * 100).toFixed(1)}%) |\n`;
  md += `| Failed | ${summary.failedCases} |\n`;
  md += `| Average Score | ${(summary.averageScore * 100).toFixed(1)}% |\n`;
  md += `| Avg Execution Time | ${summary.performance.avgExecutionTimeMs.toFixed(0)}ms |\n`;
  md += `| P95 Execution Time | ${summary.performance.p95ExecutionTimeMs.toFixed(0)}ms |\n\n`;

  if (summary.failures.length > 0) {
    md += `## Failures\n\n`;
    for (const failure of summary.failures) {
      md += `### ${failure.caseId}\n`;
      md += `${failure.description}\n`;
      if (failure.error) {
        md += `\`\`\`\n${failure.error}\n\`\`\`\n`;
      }
      md += '\n';
    }
  }

  if (options.includeDetails) {
    md += `## All Results\n\n`;
    for (const result of results) {
      const status = result.passed ? '✓' : '✗';
      md += `- ${status} **${result.caseId}** - Score: ${(result.score * 100).toFixed(0)}% (${result.executionTimeMs}ms)\n`;
    }
  }

  return md;
}
```

---

## Integration with CI

### GitHub Actions Workflow

```yaml
# .github/workflows/eval.yml
name: Tool Evaluation

on:
  push:
    paths:
      - 'src/tools/**'
      - 'evals/**'
  pull_request:
    paths:
      - 'src/tools/**'
      - 'evals/**'
  workflow_dispatch:
    inputs:
      tool:
        description: 'Specific tool to evaluate'
        required: false
      full:
        description: 'Run full evaluation suite'
        type: boolean
        default: false

jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Build Rust engine
        run: npm run build

      - name: Run evaluations
        run: |
          if [ "${{ github.event.inputs.tool }}" != "" ]; then
            npx tsx src/eval/cli.ts run --tool ${{ github.event.inputs.tool }} -v
          elif [ "${{ github.event.inputs.full }}" == "true" ]; then
            npx tsx src/eval/cli.ts run --parallel -o eval-results.json
          else
            npx tsx src/eval/cli.ts run --category happy_path --parallel
          fi

      - name: Generate report
        if: always()
        run: |
          npx tsx src/eval/cli.ts report -i eval-results.json -f markdown -o eval-report.md

      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: eval-results
          path: |
            eval-results.json
            eval-report.md

      - name: Comment on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('eval-report.md', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: report
            });
```

---

## Metrics Dashboard

### Tracked Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| **Pass Rate** | % of cases passing | > 95% |
| **Avg Score** | Average partial credit score | > 0.9 |
| **P95 Latency** | 95th percentile execution time | < 500ms |
| **LLM Selection Accuracy** | Correct tool selection rate | > 90% |
| **LLM Param Accuracy** | Correct parameter generation | > 85% |
| **Chain Success Rate** | Multi-tool sequences completing | > 90% |
| **E2E Task Completion** | End-to-end task success | > 80% |

### Tracking Over Time

```typescript
// src/eval/metrics.ts

export interface MetricSnapshot {
  timestamp: Date;
  gitCommit: string;
  metrics: {
    passRate: number;
    avgScore: number;
    p95Latency: number;
    llmSelectionAccuracy?: number;
    llmParamAccuracy?: number;
    chainSuccessRate?: number;
    e2eCompletion?: number;
  };
  byTool: Record<string, {
    passRate: number;
    avgScore: number;
    avgLatency: number;
  }>;
}

export class MetricsTracker {
  private history: MetricSnapshot[] = [];

  record(summary: EvalSummary): void {
    const snapshot: MetricSnapshot = {
      timestamp: new Date(),
      gitCommit: process.env.GIT_COMMIT || 'unknown',
      metrics: {
        passRate: summary.passRate,
        avgScore: summary.averageScore,
        p95Latency: summary.performance.p95ExecutionTimeMs
      },
      byTool: {}
    };

    this.history.push(snapshot);
    this.persist();
  }

  detectRegression(threshold = 0.05): string[] {
    if (this.history.length < 2) return [];

    const current = this.history[this.history.length - 1];
    const previous = this.history[this.history.length - 2];

    const regressions: string[] = [];

    if (previous.metrics.passRate - current.metrics.passRate > threshold) {
      regressions.push(
        `Pass rate dropped: ${(previous.metrics.passRate * 100).toFixed(1)}% → ${(current.metrics.passRate * 100).toFixed(1)}%`
      );
    }

    if (previous.metrics.avgScore - current.metrics.avgScore > threshold) {
      regressions.push(
        `Avg score dropped: ${(previous.metrics.avgScore * 100).toFixed(1)}% → ${(current.metrics.avgScore * 100).toFixed(1)}%`
      );
    }

    return regressions;
  }

  private persist(): void {
    // Save to file or database
  }
}
```

---

## Next Steps

1. **Phase 1**: Implement core eval infrastructure
   - EvalCase and EvalResult types
   - Basic EvalRunner
   - Dataset loader

2. **Phase 2**: Create initial datasets
   - 10-20 cases per tool for happy paths
   - Edge cases and error handling
   - At least 50 LLM selection cases

3. **Phase 3**: LLM evaluation
   - LLM eval runner
   - Tool selection accuracy tracking
   - Parameter quality scoring

4. **Phase 4**: Chain and E2E evaluation
   - Multi-tool sequence testing
   - Real-world task scenarios
   - User satisfaction proxy metrics

5. **Phase 5**: CI integration and dashboards
   - GitHub Actions workflow
   - Regression detection
   - Historical metrics tracking
