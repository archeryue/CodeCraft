# Tool Evaluation System - Implementation Plan (Revised)

**Date:** 2025-11-27
**Status:** 📋 PLANNING
**Goal:** Implement comprehensive tool evaluation system integrated with pluggable architecture
**Approach:** Full design implementation following strict TDD methodology

---

## Executive Summary

This plan revises the original evaluation system design to integrate seamlessly with CodeCraft's pluggable tool architecture. The implementation will be done in 5 phases, following strict Test-Driven Development (TDD) with comprehensive testing at each stage.

**Key Changes from Original Design:**
- Leverage existing `ToolRegistry`, `ToolExecutor`, and `ToolContext` infrastructure
- Evaluation system becomes a **consumer** of the tool architecture, not a parallel system
- Fixture management integrates with `ToolContext` abstraction
- All evaluation tools use the same `Tool` interface
- Comprehensive test coverage at unit, integration, and E2E levels

---

## Architecture Integration

### Current Pluggable Architecture (Existing)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Tool Interface                               │
│  - name, description, version                                        │
│  - parameters (Gemini-compatible schema)                             │
│  - capabilities (flags for behavior)                                 │
│  - execute(params, context) → ToolResult                             │
│  - validate(params) → validation result                              │
└─────────────────────────────────────────────────────────────────────┘
                                  ▲
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│ ToolRegistry  │         │ ToolExecutor  │         │  ToolContext  │
│               │         │               │         │               │
│ - register    │────────▶│ - execute     │────────▶│ - fs abstraction
│ - get         │         │ - validate    │         │ - rustEngine │
│ - getAll      │         │ - getStats    │         │ - cwd        │
└───────────────┘         └───────────────┘         │ - confirm    │
                                                     │ - logger     │
                                                     └───────────────┘
```

### Evaluation System Integration (New)

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Evaluation System                               │
└─────────────────────────────────────────────────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        ▼                         ▼                         ▼
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│  EvalRunner   │         │FixtureManager │         │ EvalReporter  │
│               │         │               │         │               │
│ Uses existing │         │ Creates mock  │         │ Generates     │
│ ToolExecutor  │────────▶│ ToolContext   │         │ reports from  │
│ infrastructure│         │ for isolation │         │ EvalResults   │
└───────────────┘         └───────────────┘         └───────────────┘
        │
        │ Uses
        ▼
┌───────────────────────────────────────────────────────────────┐
│              Existing ToolExecutor + ToolRegistry              │
│  Evaluation runs tools exactly like the agent does             │
└───────────────────────────────────────────────────────────────┘
```

**Key Insight:** The evaluation system doesn't reimplement tool execution - it uses the existing `ToolExecutor` and creates appropriate `ToolContext` instances for isolated testing.

---

## Phase Overview

Following strict TDD for each phase:

| Phase | Focus | Duration | Test Coverage |
|-------|-------|----------|---------------|
| **Phase 1** | Core eval types & fixtures | Week 1 | Unit + Integration |
| **Phase 2** | Unit tool evaluation | Week 2 | Unit + Integration + E2E |
| **Phase 3** | LLM evaluation | Week 2-3 | Unit + Integration + E2E |
| **Phase 4** | Chain & E2E evaluation | Week 3-4 | Unit + Integration + E2E |
| **Phase 5** | CLI, reporting, CI | Week 4-5 | Integration + E2E |

**Total Timeline:** 5 weeks
**TDD Approach:** RED → GREEN → REFACTOR for every feature

---

## Phase 1: Core Evaluation Infrastructure

### Goals
1. Define core evaluation types that work with existing architecture
2. Implement fixture management using `ToolContext` abstraction
3. Create dataset loading system
4. Set up evaluation test infrastructure

### TDD Approach

**Step 1.1: Write Test Plan** (BEFORE any code)
- Document all test cases in test plan file
- Get clarity on expected behavior

**Step 1.2: Write Tests** (RED phase)
- Write tests that will fail
- Tests define the API and behavior

**Step 1.3: Implement** (GREEN phase)
- Write minimal code to pass tests

**Step 1.4: Refactor** (REFACTOR phase)
- Clean up code while keeping tests green

**Step 1.5: E2E Verification**
- Manual testing of functionality

### Implementation Tasks

#### 1.1: Evaluation Types (`src/eval/types.ts`)

**Test Plan File:** `docs/test-plans/eval-types.test-plan.md`

**Test Cases:**
- EvalCase validates required fields
- EvalCase supports all category types
- EvalExpectation supports exact, contains, pattern, schema matchers
- FixtureSpec supports all fixture types
- EvalResult captures all execution details
- EvalSummary aggregates results correctly

**Test File:** `tests/eval/types.test.ts`
**Implementation File:** `src/eval/types.ts`

**Key Types:**
```typescript
export interface EvalCase {
  id: string;
  description: string;
  tool: string;
  category: EvalCategory;
  tags: string[];
  difficulty: number;
  input: EvalInput;
  expected: EvalExpectation;
  fixtures?: FixtureSpec;
  metadata?: Record<string, unknown>;
}

export interface EvalInput {
  // For unit evals: direct tool parameters
  params?: Record<string, unknown>;

  // For LLM evals: natural language query
  query?: string;

  // For chain evals: sequence of operations
  chain?: ChainStep[];

  // Context override
  context?: ContextOverride;
}

export interface ContextOverride {
  cwd?: string;
  env?: Record<string, string>;
}

// Other types: EvalResult, EvalSummary, EvalExpectation, etc.
```

#### 1.2: Fixture Manager (`src/eval/fixtures.ts`)

**Test Plan File:** `docs/test-plans/fixture-manager.test-plan.md`

**Test Cases:**
- Inline fixtures create files in temp directory
- Directory fixtures copy from source
- Preset fixtures load from fixtures directory
- Fixture cleanup removes all created files
- Creates isolated ToolContext for each fixture
- Fixture context uses mock filesystem
- Multiple fixtures don't interfere with each other

**Test File:** `tests/eval/fixtures.test.ts`
**Implementation File:** `src/eval/fixtures.ts`

**Key Class:**
```typescript
export class FixtureManager {
  private tempDirs: Set<string> = new Set();

  /**
   * Setup fixture and return isolated ToolContext
   */
  async setup(spec?: FixtureSpec): Promise<{
    context: ToolContext;
    cleanup: () => Promise<void>;
  }> {
    // Create temp directory
    // Create files based on spec type
    // Create mock ToolContext with temp directory
    // Return context and cleanup function
  }

  /**
   * Cleanup all fixtures
   */
  async cleanupAll(): Promise<void> {
    // Remove all temp directories
  }
}
```

**Integration with ToolContext:**
```typescript
// Fixture creates a real temp directory with real files
// Then creates ToolContext pointing to that directory
const { context, cleanup } = await fixtureManager.setup(spec);

// context.fs is real fs operations
// context.cwd points to temp directory
// Tools execute in isolated environment

await cleanup(); // Removes temp directory
```

#### 1.3: Dataset Loader (`src/eval/dataset-loader.ts`)

**Test Plan File:** `docs/test-plans/dataset-loader.test-plan.md`

**Test Cases:**
- Load single dataset JSON file
- Load all datasets from directory
- Validate dataset schema
- Handle missing files gracefully
- Handle invalid JSON
- Filter datasets by tool
- Filter datasets by category

**Test File:** `tests/eval/dataset-loader.test.ts`
**Implementation File:** `src/eval/dataset-loader.ts`

**Key Functions:**
```typescript
export class DatasetLoader {
  /**
   * Load dataset from file
   */
  async loadDataset(path: string): Promise<EvalCase[]> {
    // Read JSON file
    // Validate schema
    // Return cases
  }

  /**
   * Load all datasets from directory
   */
  async loadAll(dir: string, filter?: DatasetFilter): Promise<EvalCase[]> {
    // Find all .json files
    // Load each dataset
    // Combine and filter
    // Return all cases
  }

  /**
   * Validate dataset structure
   */
  validate(data: unknown): { valid: boolean; errors?: string[] } {
    // Check required fields
    // Validate types
    // Return validation result
  }
}
```

#### 1.4: Evaluation Scorer (`src/eval/scorer.ts`)

**Test Plan File:** `docs/test-plans/scorer.test-plan.md`

**Test Cases:**
- Exact match scoring
- Contains match scoring
- Pattern match scoring (regex)
- JSON schema validation scoring
- Custom scorer registration
- Score normalization (0-1)
- Breakdown generation for debugging

**Test File:** `tests/eval/scorer.test.ts`
**Implementation File:** `src/eval/scorer.ts`

**Key Classes:**
```typescript
export type ScorerFunction = (
  actual: unknown,
  expected: EvalExpectation,
  evalCase: EvalCase
) => ScoringResult;

export interface ScoringResult {
  passed: boolean;
  score: number; // 0-1
  breakdown: ScoreBreakdown[];
}

export interface ScoreBreakdown {
  criterion: string;
  passed: boolean;
  score: number;
  details?: string;
}

export class EvalScorer {
  private customScorers: Map<string, ScorerFunction> = new Map();

  registerScorer(name: string, scorer: ScorerFunction): void;

  score(
    actual: unknown,
    expected: EvalExpectation,
    evalCase: EvalCase
  ): ScoringResult;
}
```

### Phase 1 Success Criteria

**Code:**
- [ ] All type definitions in `src/eval/types.ts`
- [ ] FixtureManager implementation complete
- [ ] DatasetLoader implementation complete
- [ ] EvalScorer implementation complete

**Tests:**
- [ ] All unit tests pass (100% coverage for phase 1 code)
- [ ] Integration tests for fixture + context creation
- [ ] Test infrastructure ready for phase 2

**Documentation:**
- [ ] Test plan files created for all components
- [ ] API documentation in code comments
- [ ] Updated CLAUDE.md with eval system overview

---

## Phase 2: Unit Tool Evaluation

### Goals
1. Implement EvalRunner for Level 1 (unit tool) evaluation
2. Create initial datasets for core tools
3. Validate evaluation system with real tools
4. Achieve high coverage of tool functionality

### TDD Approach

Same RED → GREEN → REFACTOR cycle for each component.

### Implementation Tasks

#### 2.1: Unit Eval Runner (`src/eval/unit-runner.ts`)

**Test Plan File:** `docs/test-plans/unit-eval-runner.test-plan.md`

**Test Cases:**
- Run single eval case successfully
- Handle tool execution errors
- Capture execution time metrics
- Use fixture context correctly
- Cleanup fixtures after test
- Score results using EvalScorer
- Aggregate multiple test results
- Generate summary statistics
- Support parallel execution
- Support fail-fast mode
- Respect timeout settings

**Test File:** `tests/eval/unit-runner.test.ts`
**Implementation File:** `src/eval/unit-runner.ts`

**Key Class:**
```typescript
export class UnitEvalRunner {
  private executor: ToolExecutor;
  private fixtures: FixtureManager;
  private scorer: EvalScorer;

  constructor(
    executor: ToolExecutor,
    fixtures: FixtureManager,
    scorer: EvalScorer
  ) {
    this.executor = executor;
    this.fixtures = fixtures;
    this.scorer = scorer;
  }

  /**
   * Run a single eval case
   */
  async runCase(evalCase: EvalCase): Promise<EvalResult> {
    const startTime = Date.now();

    // Setup fixtures
    const { context, cleanup } = await this.fixtures.setup(evalCase.fixtures);

    try {
      // Execute tool using existing ToolExecutor infrastructure
      const toolResult = await this.executor.executeWithContext(
        evalCase.tool,
        evalCase.input.params,
        context
      );

      // Score the result
      const scoringResult = this.scorer.score(
        toolResult.data,
        evalCase.expected,
        evalCase
      );

      return {
        caseId: evalCase.id,
        passed: scoringResult.passed,
        score: scoringResult.score,
        actual: toolResult.data,
        expected: evalCase.expected,
        executionTimeMs: Date.now() - startTime,
        breakdown: scoringResult.breakdown,
        timestamp: new Date()
      };
    } finally {
      await cleanup();
    }
  }

  /**
   * Run multiple cases
   */
  async runCases(
    cases: EvalCase[],
    options?: RunOptions
  ): Promise<EvalResult[]> {
    // Parallel or sequential execution
    // Fail-fast support
    // Progress reporting
  }

  /**
   * Generate summary
   */
  summarize(results: EvalResult[], subject: string): EvalSummary {
    // Aggregate statistics
    // Group by category
    // Calculate percentiles
  }
}
```

**Key Integration Point:**
```typescript
// UnitEvalRunner uses existing ToolExecutor
// No need to reimplement tool execution!

const toolResult = await this.executor.executeWithContext(
  evalCase.tool,        // Tool name from eval case
  evalCase.input.params, // Parameters from eval case
  context               // Isolated context from fixture
);

// This ensures evaluation uses the EXACT same code path as production
```

#### 2.2: Initial Datasets

**Directory Structure:**
```
evals/
├── datasets/
│   ├── read_file/
│   │   ├── happy-path.json
│   │   ├── edge-cases.json
│   │   └── errors.json
│   ├── write_file/
│   │   ├── happy-path.json
│   │   ├── edge-cases.json
│   │   └── errors.json
│   ├── grep/
│   │   ├── happy-path.json
│   │   ├── regex-patterns.json
│   │   └── errors.json
│   └── search_code/
│       ├── happy-path.json
│       └── edge-cases.json
└── fixtures/
    ├── simple-project/
    │   ├── src/
    │   │   └── index.ts
    │   └── package.json
    └── typescript-project/
        ├── src/
        │   ├── utils.ts
        │   └── main.ts
        └── tsconfig.json
```

**Dataset Creation Priority:**
1. **read_file** - Most basic, good starting point
2. **write_file** - Tests file creation
3. **edit_file** - Tests file modification
4. **grep** - Tests search functionality
5. **search_code** - Tests Rust engine integration

**Example Dataset: `evals/datasets/read_file/happy-path.json`**
```json
{
  "tool": "read_file",
  "version": "1.0",
  "description": "Happy path tests for read_file tool",
  "cases": [
    {
      "id": "read-file-001",
      "description": "Read entire small file",
      "tool": "read_file",
      "category": "happy_path",
      "tags": ["read", "basic"],
      "difficulty": 1,
      "input": {
        "params": {
          "path": "test.txt"
        }
      },
      "fixtures": {
        "type": "inline",
        "files": {
          "test.txt": "Hello, World!"
        }
      },
      "expected": {
        "success": true,
        "exact": "Hello, World!"
      }
    },
    {
      "id": "read-file-002",
      "description": "Read file with offset",
      "tool": "read_file",
      "category": "happy_path",
      "tags": ["read", "offset"],
      "difficulty": 2,
      "input": {
        "params": {
          "path": "lines.txt",
          "offset": 1,
          "limit": 2
        }
      },
      "fixtures": {
        "type": "inline",
        "files": {
          "lines.txt": "Line 1\nLine 2\nLine 3\nLine 4"
        }
      },
      "expected": {
        "success": true,
        "contains": "Line 2"
      }
    }
  ]
}
```

**Test Plan File:** `docs/test-plans/initial-datasets.test-plan.md`

**Dataset Requirements:**
- Minimum 10 cases per tool
- Cover happy path, edge cases, errors
- Use realistic scenarios
- Include performance expectations where relevant
- Test all parameter combinations

### Phase 2 Success Criteria

**Code:**
- [ ] UnitEvalRunner implementation complete
- [ ] Integration with ToolExecutor working
- [ ] Fixture isolation working correctly

**Datasets:**
- [ ] 5 core tools have datasets (50+ cases total)
- [ ] All datasets validate correctly
- [ ] Fixtures working for all cases

**Tests:**
- [ ] Unit tests for UnitEvalRunner (100% coverage)
- [ ] Integration tests with real tools
- [ ] All dataset cases pass when run

**E2E Verification:**
- [ ] Run evaluation on read_file tool manually
- [ ] Verify all cases execute correctly
- [ ] Check summary statistics
- [ ] Confirm fixture cleanup

---

## Phase 3: LLM Evaluation

### Goals
1. Implement LLM tool selection evaluation
2. Create datasets for tool selection scenarios
3. Measure LLM's ability to choose correct tools
4. Track parameter quality

### TDD Approach

Same RED → GREEN → REFACTOR cycle.

### Implementation Tasks

#### 3.1: LLM Eval Runner (`src/eval/llm-runner.ts`)

**Test Plan File:** `docs/test-plans/llm-eval-runner.test-plan.md`

**Test Cases:**
- Send query to LLM with tool declarations
- Extract function call from response
- Validate tool selection
- Score parameter quality
- Handle cases where LLM doesn't select tool
- Handle cases where LLM selects wrong tool
- Track selection accuracy metrics
- Support acceptable alternative tools

**Test File:** `tests/eval/llm-runner.test.ts`
**Implementation File:** `src/eval/llm-runner.ts`

**Key Class:**
```typescript
export interface LLMEvalCase extends EvalCase {
  input: {
    query: string;
    history?: ConversationTurn[];
    context?: {
      currentFile?: string;
      recentFiles?: string[];
    };
  };

  expected: {
    expectedTool: string;
    acceptableTools?: string[];
    forbiddenTools?: string[];
    expectedParams?: ParamExpectation;
  };
}

export class LLMEvalRunner {
  private llmClient: any; // Gemini client
  private registry: ToolRegistry;
  private scorer: EvalScorer;

  async runCase(evalCase: LLMEvalCase): Promise<EvalResult> {
    // Send query to LLM
    const response = await this.llmClient.generateContent({
      contents: this.buildPrompt(evalCase),
      tools: this.registry.getDeclarations()
    });

    // Extract function call
    const functionCall = this.extractFunctionCall(response);

    // Score tool selection
    const scoringResult = this.scoreToolSelection(
      functionCall,
      evalCase.expected
    );

    return {
      caseId: evalCase.id,
      passed: scoringResult.passed,
      score: scoringResult.score,
      actual: functionCall,
      expected: evalCase.expected,
      selectedTool: functionCall?.name,
      generatedParams: functionCall?.args,
      breakdown: scoringResult.breakdown,
      executionTimeMs: 0, // LLM call time
      timestamp: new Date()
    };
  }

  private scoreToolSelection(
    functionCall: FunctionCall | null,
    expected: LLMEvalCase['expected']
  ): ScoringResult {
    const breakdown: ScoreBreakdown[] = [];

    // Check if tool was selected
    if (!functionCall) {
      return { passed: false, score: 0, breakdown: [{
        criterion: 'tool_called',
        passed: false,
        score: 0,
        details: 'LLM did not call any tool'
      }] };
    }

    // Check primary tool
    const primaryMatch = functionCall.name === expected.expectedTool;
    const acceptableMatch = expected.acceptableTools?.includes(functionCall.name);
    const toolCorrect = primaryMatch || acceptableMatch;

    breakdown.push({
      criterion: 'tool_selection',
      passed: toolCorrect,
      score: primaryMatch ? 1 : (acceptableMatch ? 0.8 : 0),
      details: `Selected: ${functionCall.name}, Expected: ${expected.expectedTool}`
    });

    // Check forbidden tools
    if (expected.forbiddenTools?.includes(functionCall.name)) {
      breakdown.push({
        criterion: 'forbidden_tool',
        passed: false,
        score: 0,
        details: `Selected forbidden tool: ${functionCall.name}`
      });
    }

    // Check parameters (if tool correct)
    if (toolCorrect && expected.expectedParams) {
      const paramScore = this.scoreParameters(
        functionCall.args,
        expected.expectedParams
      );
      breakdown.push(...paramScore.breakdown);
    }

    const avgScore = breakdown.reduce((sum, b) => sum + b.score, 0) / breakdown.length;

    return {
      passed: breakdown.every(b => b.passed),
      score: avgScore,
      breakdown
    };
  }
}
```

#### 3.2: LLM Evaluation Datasets

**Dataset Examples:**

**File Operations:**
```json
{
  "id": "llm-file-001",
  "description": "Read a specific file",
  "category": "llm_selection",
  "input": {
    "query": "Show me the contents of package.json"
  },
  "expected": {
    "expectedTool": "read_file",
    "expectedParams": {
      "path": {
        "pattern": "package\\.json"
      }
    }
  }
}
```

**Search Operations:**
```json
{
  "id": "llm-search-001",
  "description": "Find class definition",
  "category": "llm_selection",
  "input": {
    "query": "Where is the User class defined?"
  },
  "expected": {
    "expectedTool": "search_code",
    "acceptableTools": ["grep"],
    "expectedParams": {
      "query": {
        "pattern": "[Uu]ser|class"
      }
    }
  }
}
```

**Datasets to Create:**
- `llm-file-operations.json` - 20+ cases
- `llm-search-operations.json` - 20+ cases
- `llm-code-analysis.json` - 15+ cases
- `llm-command-execution.json` - 10+ cases

### Phase 3 Success Criteria

**Code:**
- [ ] LLMEvalRunner implementation complete
- [ ] Parameter scoring working
- [ ] Integration with Gemini client

**Datasets:**
- [ ] 60+ LLM evaluation cases
- [ ] Cover all tool categories
- [ ] Include edge cases (ambiguous queries)

**Tests:**
- [ ] Unit tests for LLMEvalRunner
- [ ] Mock LLM responses for testing
- [ ] Integration tests with real LLM

**Metrics:**
- [ ] Baseline tool selection accuracy measured
- [ ] Parameter quality metrics tracked
- [ ] Forbidden tool avoidance verified

**E2E Verification:**
- [ ] Run LLM eval on file operations
- [ ] Verify tool selection accuracy
- [ ] Review failure cases
- [ ] Adjust tool descriptions if needed

---

## Phase 4: Chain and E2E Evaluation

### Goals
1. Implement chain evaluation (multi-tool sequences)
2. Implement E2E evaluation (complete user tasks)
3. Test tool composability
4. Measure end-to-end task success

### Implementation Tasks

#### 4.1: Chain Eval Runner (`src/eval/chain-runner.ts`)

**Test Plan File:** `docs/test-plans/chain-eval-runner.test-plan.md`

**Test Cases:**
- Execute multi-step tool chains
- Pass output from one tool to next
- Handle chain breakage gracefully
- Track per-step results
- Validate final output
- Support data extraction (JSONPath)

**Key Class:**
```typescript
export interface ChainEvalCase extends EvalCase {
  input: {
    chain: ChainStep[];
    context?: ContextOverride;
  };

  expected: {
    finalOutput?: any;
    steps?: StepExpectation[];
    success: boolean;
  };
}

export interface ChainStep {
  tool: string;
  params: Record<string, unknown> | 'from_previous';
  extractOutput?: string; // JSONPath
}

export class ChainEvalRunner {
  private executor: ToolExecutor;
  private fixtures: FixtureManager;

  async runCase(evalCase: ChainEvalCase): Promise<EvalResult> {
    const { context, cleanup } = await this.fixtures.setup(evalCase.fixtures);

    try {
      const stepResults: StepResult[] = [];
      let previousOutput: any = null;

      // Execute each step in sequence
      for (const step of evalCase.input.chain) {
        const params = step.params === 'from_previous'
          ? this.extractFromPrevious(previousOutput, step.extractOutput)
          : step.params;

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
          return this.buildFailureResult(evalCase, stepResults);
        }

        previousOutput = result.data;
      }

      // Score final result
      return this.scoreChainResult(evalCase, stepResults, previousOutput);

    } finally {
      await cleanup();
    }
  }
}
```

#### 4.2: E2E Eval Runner (`src/eval/e2e-runner.ts`)

**Test Plan File:** `docs/test-plans/e2e-eval-runner.test-plan.md`

**Test Cases:**
- Complete user task scenarios
- LLM + multiple tools working together
- Task completion tracking
- User satisfaction proxy metrics

**Key Class:**
```typescript
export interface E2EEvalCase extends EvalCase {
  input: {
    task: string; // Natural language task
    initialContext?: ContextOverride;
  };

  expected: {
    taskCompleted: boolean;
    outputContains?: string[];
    filesModified?: string[];
    maxSteps?: number;
  };
}

export class E2EEvalRunner {
  private agent: any; // Agent instance
  private fixtures: FixtureManager;

  async runCase(evalCase: E2EEvalCase): Promise<EvalResult> {
    // Setup fixture
    // Initialize agent with fixture context
    // Send task to agent
    // Track tool calls
    // Evaluate final state
    // Return result
  }
}
```

#### 4.3: Chain and E2E Datasets

**Chain Datasets:**
- `chain-read-edit-write.json` - Modify file chains
- `chain-search-analyze.json` - Search then analyze
- `chain-multi-file.json` - Operations across files

**E2E Datasets:**
- `e2e-bug-fixes.json` - Fix bugs in code
- `e2e-feature-additions.json` - Add features
- `e2e-refactoring.json` - Refactor code

### Phase 4 Success Criteria

**Code:**
- [ ] ChainEvalRunner implementation complete
- [ ] E2EEvalRunner implementation complete
- [ ] Data extraction working

**Datasets:**
- [ ] 30+ chain evaluation cases
- [ ] 20+ E2E evaluation cases

**Tests:**
- [ ] Unit tests for both runners
- [ ] Integration tests with real chains
- [ ] E2E tests with agent

**E2E Verification:**
- [ ] Run chain evals manually
- [ ] Run E2E evals manually
- [ ] Verify task completion
- [ ] Analyze failure modes

---

## Phase 5: CLI, Reporting, and CI Integration

### Goals
1. Create CLI interface for running evaluations
2. Implement reporting system
3. Integrate with CI/CD
4. Set up metrics tracking

### Implementation Tasks

#### 5.1: CLI Interface (`src/eval/cli.ts`)

**Test Plan File:** `docs/test-plans/eval-cli.test-plan.md`

**Commands:**
```bash
# Run all evaluations
npx tsx src/eval/cli.ts run

# Run specific tool
npx tsx src/eval/cli.ts run --tool read_file

# Run specific category
npx tsx src/eval/cli.ts run --category happy_path

# Run with filters
npx tsx src/eval/cli.ts run --tags read,write

# Parallel execution
npx tsx src/eval/cli.ts run --parallel --concurrency 5

# Generate report
npx tsx src/eval/cli.ts report -i results.json -o report.md

# Compare runs
npx tsx src/eval/cli.ts compare baseline.json current.json
```

#### 5.2: Reporting System (`src/eval/reporter.ts`)

**Formats:**
- Markdown (for PRs)
- HTML (for dashboards)
- JSON (for storage)

**Test Plan File:** `docs/test-plans/reporter.test-plan.md`

#### 5.3: CI Integration

**GitHub Actions Workflow:**
```yaml
# .github/workflows/eval.yml
name: Tool Evaluation

on:
  push:
    paths:
      - 'src/tools/**'
      - 'evals/**'
  pull_request:

jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - name: Run evaluations
        run: npx tsx src/eval/cli.ts run --parallel -o eval-results.json
      - name: Generate report
        run: npx tsx src/eval/cli.ts report -i eval-results.json -o eval-report.md
      - name: Comment on PR
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

#### 5.4: Metrics Tracking (`src/eval/metrics.ts`)

**Test Plan File:** `docs/test-plans/metrics.test-plan.md`

**Tracked Metrics:**
- Pass rate by tool
- Average execution time
- LLM selection accuracy
- Chain success rate
- Regression detection

### Phase 5 Success Criteria

**Code:**
- [ ] CLI fully functional
- [ ] All report formats working
- [ ] Metrics tracking implemented

**CI/CD:**
- [ ] GitHub Actions workflow working
- [ ] PR comments working
- [ ] Regression detection working

**E2E Verification:**
- [ ] Run full eval suite via CLI
- [ ] Generate all report formats
- [ ] Trigger CI workflow
- [ ] Verify metrics tracking

---

## TDD Test Plan Structure

Each component will have a test plan file in `docs/test-plans/`:

```markdown
# Test Plan: [Component Name]

## Overview
Brief description of what is being tested.

## Test Cases

### Happy Path Tests

#### TC-001: [Test Name]
- **Description:** What this tests
- **Setup:** Prerequisites and fixtures
- **Input:** Input data
- **Expected Output:** What should happen
- **Verification:** How to verify success

### Edge Case Tests

#### TC-002: [Test Name]
...

### Error Handling Tests

#### TC-003: [Test Name]
...

### Integration Tests

#### TC-004: [Test Name]
...

### Performance Tests

#### TC-005: [Test Name]
...

## E2E Verification Steps

Manual testing steps to verify functionality works in practice.
```

---

## Success Metrics

### Code Quality
- [ ] 100% of code has tests written BEFORE implementation
- [ ] All tests pass (npm test)
- [ ] No TypeScript errors
- [ ] Test coverage > 90%

### Functionality
- [ ] All 4 evaluation levels working
- [ ] Integration with existing tools working
- [ ] Fixtures provide isolation
- [ ] Reporting generates useful insights

### Usability
- [ ] CLI is intuitive
- [ ] Reports are clear
- [ ] CI integration provides value
- [ ] Easy to add new datasets

### Performance
- [ ] Eval suite runs in < 5 minutes (parallel)
- [ ] Minimal overhead from evaluation infrastructure
- [ ] Efficient fixture creation/cleanup

---

## Implementation Checklist

### Phase 1: Core Infrastructure
- [ ] Test plan: eval-types
- [ ] Test plan: fixture-manager
- [ ] Test plan: dataset-loader
- [ ] Test plan: scorer
- [ ] Implement + test: types
- [ ] Implement + test: FixtureManager
- [ ] Implement + test: DatasetLoader
- [ ] Implement + test: EvalScorer
- [ ] E2E verification: Load and validate dataset
- [ ] Update CLAUDE.md

### Phase 2: Unit Evaluation
- [ ] Test plan: unit-eval-runner
- [ ] Test plan: initial-datasets
- [ ] Implement + test: UnitEvalRunner
- [ ] Create datasets: read_file, write_file, edit_file, grep, search_code
- [ ] E2E verification: Run eval on read_file
- [ ] Update CLAUDE.md

### Phase 3: LLM Evaluation
- [ ] Test plan: llm-eval-runner
- [ ] Implement + test: LLMEvalRunner
- [ ] Create LLM datasets (60+ cases)
- [ ] E2E verification: Run LLM eval suite
- [ ] Measure baseline accuracy
- [ ] Update CLAUDE.md

### Phase 4: Chain and E2E
- [ ] Test plan: chain-eval-runner
- [ ] Test plan: e2e-eval-runner
- [ ] Implement + test: ChainEvalRunner
- [ ] Implement + test: E2EEvalRunner
- [ ] Create chain datasets (30+ cases)
- [ ] Create E2E datasets (20+ cases)
- [ ] E2E verification: Run chain and E2E evals
- [ ] Update CLAUDE.md

### Phase 5: CLI and CI
- [ ] Test plan: eval-cli
- [ ] Test plan: reporter
- [ ] Test plan: metrics
- [ ] Implement + test: CLI
- [ ] Implement + test: Reporter (all formats)
- [ ] Implement + test: Metrics tracker
- [ ] Create GitHub Actions workflow
- [ ] E2E verification: Full CI run
- [ ] Update README.md
- [ ] Final documentation review

---

## End-to-End Testing Requirements

After each phase, perform manual E2E testing:

### Phase 1 E2E
```bash
# Test fixture creation
npx tsx -e "
  import { FixtureManager } from './src/eval/fixtures';
  const fm = new FixtureManager();
  const { context, cleanup } = await fm.setup({
    type: 'inline',
    files: { 'test.txt': 'Hello' }
  });
  console.log('Created:', context.cwd);
  await cleanup();
"

# Test dataset loading
npx tsx -e "
  import { DatasetLoader } from './src/eval/dataset-loader';
  const loader = new DatasetLoader();
  const cases = await loader.loadDataset('evals/datasets/read_file/happy-path.json');
  console.log('Loaded cases:', cases.length);
"
```

### Phase 2 E2E
```bash
# Run evaluation on read_file
npx tsx -e "
  import { UnitEvalRunner } from './src/eval/unit-runner';
  import { DatasetLoader } from './src/eval/dataset-loader';
  import { setupEvaluation } from './src/eval/setup';

  const { runner } = await setupEvaluation();
  const loader = new DatasetLoader();
  const cases = await loader.loadDataset('evals/datasets/read_file/happy-path.json');

  const results = await runner.runCases(cases);
  const summary = runner.summarize(results, 'read_file');

  console.log('Results:', summary);
"
```

### Phase 3 E2E
```bash
# Run LLM evaluation
npx tsx -e "
  import { LLMEvalRunner } from './src/eval/llm-runner';
  import { DatasetLoader } from './src/eval/dataset-loader';
  import { setupEvaluation } from './src/eval/setup';

  const { llmRunner } = await setupEvaluation();
  const loader = new DatasetLoader();
  const cases = await loader.loadDataset('evals/datasets/llm/file-operations.json');

  const results = await llmRunner.runCases(cases);
  const summary = llmRunner.summarize(results, 'llm_file_ops');

  console.log('LLM Selection Accuracy:', summary.llmSelectionAccuracy);
"
```

### Phase 4 E2E
```bash
# Run chain evaluation
npx tsx -e "
  import { ChainEvalRunner } from './src/eval/chain-runner';
  import { DatasetLoader } from './src/eval/dataset-loader';
  import { setupEvaluation } from './src/eval/setup';

  const { chainRunner } = await setupEvaluation();
  const loader = new DatasetLoader();
  const cases = await loader.loadDataset('evals/datasets/chains/read-edit-write.json');

  const results = await chainRunner.runCases(cases);
  console.log('Chain Success Rate:', results.filter(r => r.passed).length / results.length);
"
```

### Phase 5 E2E
```bash
# Full CLI run
npx tsx src/eval/cli.ts run --verbose

# Generate report
npx tsx src/eval/cli.ts report -i eval-results.json -o report.md

# View report
cat report.md
```

---

## Documentation Updates

### CLAUDE.md
Add section on evaluation system:
```markdown
## Evaluation System

CodeCraft includes a comprehensive tool evaluation system.

### Running Evaluations

```bash
# Run all evaluations
npx tsx src/eval/cli.ts run

# Run specific tool
npx tsx src/eval/cli.ts run --tool read_file
```

### Creating Eval Cases

See `evals/datasets/` for examples. Each dataset is a JSON file with test cases.

### Architecture

The eval system uses the same `ToolExecutor` infrastructure as the agent,
ensuring evaluations test the exact same code paths used in production.
```

### README.md
Add evaluation section:
```markdown
## Evaluation

CodeCraft includes a comprehensive evaluation system to measure tool quality.

See [TOOLS_EVALUATION_SYSTEM.md](docs/TOOLS_EVALUATION_SYSTEM.md) for details.
```

---

## Risk Mitigation

### Risk: Evaluation overhead slows development
**Mitigation:** Parallel execution, caching, incremental evaluation

### Risk: Fixtures interfere with each other
**Mitigation:** Isolated temp directories, cleanup verification tests

### Risk: LLM evaluation is non-deterministic
**Mitigation:** Multiple runs, temperature=0, threshold-based passing

### Risk: Dataset maintenance becomes burdensome
**Mitigation:** Clear templates, automation for dataset generation, tooling

---

## Future Enhancements

After Phase 5 completion:
1. **Automated dataset generation** - Use LLM to generate edge cases
2. **Coverage analysis** - Identify untested tool functionality
3. **A/B testing framework** - Compare tool improvements
4. **Real-world scenario mining** - Extract eval cases from production logs
5. **Continuous evaluation** - Run subset of evals on every commit

---

**Document Owner:** Claude Code
**Last Updated:** 2025-11-27
**Status:** Ready for Implementation
**Next Step:** Begin Phase 1 - Core Infrastructure
