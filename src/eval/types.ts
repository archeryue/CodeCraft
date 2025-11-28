// src/eval/types.ts

/**
 * Evaluation system type definitions
 *
 * These types define the structure for evaluation cases, results, and summaries
 * used throughout the tool evaluation system.
 */

/**
 * Category of evaluation case
 */
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
 * Input specification for an evaluation case
 */
export interface EvalInput {
  // For unit evals: direct tool parameters
  params?: Record<string, unknown>;

  // For LLM evals: natural language query
  query?: string;

  // For chain evals: sequence of operations
  chain?: ChainStep[];

  // Context override for execution
  context?: ContextOverride;
}

/**
 * Context override for evaluation execution
 */
export interface ContextOverride {
  cwd?: string;
  env?: Record<string, string>;
}

/**
 * Step in a tool chain
 */
export interface ChainStep {
  tool: string;
  params: Record<string, unknown> | 'from_previous';
  extractOutput?: string; // JSONPath to extract for next step
}

/**
 * Expected output specification with multiple matcher types
 */
export interface EvalExpectation {
  // Exact match (for deterministic outputs)
  exact?: unknown;

  // Partial match (output contains these values)
  contains?: unknown;

  // Pattern match (regex for string outputs)
  pattern?: string;

  // Regex flags for pattern matching
  flags?: string;

  // JSON Schema validation
  schema?: Record<string, unknown>;

  // Custom scorer function (returns 0-1)
  scorer?: string;

  // For LLM evals: expected tool to be called
  expectedTool?: string;

  // For LLM evals: alternative acceptable tools
  acceptableTools?: string[];

  // For LLM evals: forbidden tools that should not be selected
  forbiddenTools?: string[];

  // For LLM evals: expected parameter patterns
  expectedParams?: ParamExpectation;

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
 * Parameter expectation for LLM evaluation
 */
export interface ParamExpectation {
  [key: string]: {
    type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
    pattern?: string;
    contains?: string;
    equals?: unknown;
  };
}

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
  generator: string;
  options?: Record<string, unknown>;
}

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

/**
 * Individual scoring criterion result
 */
export interface ScoreBreakdown {
  criterion: string;
  passed: boolean;
  score: number;
  details?: string;
}

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
  expected: EvalExpectation;

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
  breakdown?: ScoreBreakdown[];

  // Timestamp
  timestamp: Date;
}

/**
 * Category-specific statistics
 */
export interface CategoryStats {
  total: number;
  passed: number;
  passRate: number;
  avgScore: number;
}

/**
 * Performance statistics
 */
export interface PerformanceStats {
  avgExecutionTimeMs: number;
  p50ExecutionTimeMs: number;
  p95ExecutionTimeMs: number;
  p99ExecutionTimeMs: number;
  maxExecutionTimeMs: number;
}

/**
 * Failed case summary
 */
export interface FailureSummary {
  caseId: string;
  description: string;
  error?: string;
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
  byCategory: Record<string, CategoryStats>;

  // Performance metrics
  performance: PerformanceStats;

  // Failed cases for investigation
  failures: FailureSummary[];

  // Timestamp
  timestamp: Date;
}

/**
 * Dataset filter options
 */
export interface DatasetFilter {
  tool?: string;
  category?: EvalCategory;
  tags?: string[];
  minDifficulty?: number;
  maxDifficulty?: number;
}

/**
 * Dataset file structure
 */
export interface DatasetFile {
  tool: string;
  version: string;
  description: string;
  cases: EvalCase[];
}

/**
 * Evaluation run options
 */
export interface RunOptions {
  // Run cases in parallel
  parallel?: boolean;

  // Max concurrent cases
  concurrency?: number;

  // Timeout per case in ms
  timeoutMs?: number;

  // Filter by tags
  tags?: string[];

  // Filter by category
  categories?: EvalCategory[];

  // Stop on first failure
  failFast?: boolean;

  // Verbose output
  verbose?: boolean;
}
