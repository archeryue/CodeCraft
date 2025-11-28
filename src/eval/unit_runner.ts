// src/eval/unit-runner.ts

import type { ToolExecutor } from '../types/executor';
import type {
  EvalCase,
  EvalResult,
  EvalSummary,
  RunOptions,
  CategoryStats,
  PerformanceStats,
  FailureSummary
} from './types';
import { FixtureManager } from './fixtures';
import { EvalScorer, ScoringResult } from './scorer';

/**
 * Options for UnitEvalRunner construction
 */
export interface UnitEvalRunnerOptions {
  executor: ToolExecutor;
  fixtureManager?: FixtureManager;
  scorer?: EvalScorer;
  verbose?: boolean;
}

/**
 * Progress callback for tracking evaluation progress
 */
export type ProgressCallback = (completed: number, total: number, result: EvalResult) => void;

/**
 * Runs unit-level tool evaluations
 *
 * Uses the existing ToolExecutor infrastructure to ensure evaluations
 * test the exact same code paths used in production.
 */
export class UnitEvalRunner {
  private executor: ToolExecutor;
  private fixtureManager: FixtureManager;
  private scorer: EvalScorer;
  private verbose: boolean;

  constructor(options: UnitEvalRunnerOptions) {
    this.executor = options.executor;
    this.fixtureManager = options.fixtureManager || new FixtureManager();
    this.scorer = options.scorer || new EvalScorer();
    this.verbose = options.verbose ?? false;
  }

  /**
   * Set the Rust engine for fixture contexts
   */
  setRustEngine(rustEngine: any): void {
    this.fixtureManager.setRustEngine(rustEngine);
  }

  /**
   * Run a single evaluation case
   */
  async runCase(evalCase: EvalCase): Promise<EvalResult> {
    const startTime = Date.now();

    // Setup fixture
    const { context, cleanup } = await this.fixtureManager.setup(evalCase.fixtures);

    try {
      // Execute tool using existing ToolExecutor infrastructure
      const toolResult = await this.executor.executeWithContext(
        evalCase.tool,
        evalCase.input.params!,
        context
      );

      // Score the result
      const scoringResult = this.scorer.score(
        toolResult,
        evalCase.expected,
        evalCase
      );

      return {
        caseId: evalCase.id,
        passed: scoringResult.passed,
        score: scoringResult.score,
        actual: toolResult,
        expected: evalCase.expected,
        executionTimeMs: Date.now() - startTime,
        breakdown: scoringResult.breakdown,
        timestamp: new Date()
      };

    } catch (error) {
      // Return failure result on error
      return {
        caseId: evalCase.id,
        passed: false,
        score: 0,
        actual: undefined,
        expected: evalCase.expected,
        executionTimeMs: Date.now() - startTime,
        breakdown: [{
          criterion: 'execution',
          passed: false,
          score: 0,
          details: error instanceof Error ? error.message : String(error)
        }],
        error: {
          code: 'EXECUTION_ERROR',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        },
        timestamp: new Date()
      };

    } finally {
      await cleanup();
    }
  }

  /**
   * Run multiple evaluation cases
   */
  async runCases(
    cases: EvalCase[],
    options?: RunOptions,
    onProgress?: ProgressCallback
  ): Promise<EvalResult[]> {
    const results: EvalResult[] = [];
    const filteredCases = this.filterCases(cases, options);

    if (options?.parallel && options.concurrency && options.concurrency > 1) {
      // Parallel execution with concurrency limit
      results.push(...await this.runParallel(filteredCases, options, onProgress));
    } else {
      // Sequential execution
      for (let i = 0; i < filteredCases.length; i++) {
        const evalCase = filteredCases[i];
        const result = await this.runCase(evalCase);
        results.push(result);

        if (onProgress) {
          onProgress(i + 1, filteredCases.length, result);
        }

        // Fail fast mode
        if (options?.failFast && !result.passed) {
          break;
        }
      }
    }

    return results;
  }

  /**
   * Run cases in parallel with concurrency limit
   */
  private async runParallel(
    cases: EvalCase[],
    options: RunOptions,
    onProgress?: ProgressCallback
  ): Promise<EvalResult[]> {
    const concurrency = options.concurrency || 5;
    const results: EvalResult[] = new Array(cases.length);
    let completed = 0;
    let index = 0;

    const runNext = async (): Promise<void> => {
      while (index < cases.length) {
        const currentIndex = index++;
        const evalCase = cases[currentIndex];

        const result = await this.runCase(evalCase);
        results[currentIndex] = result;
        completed++;

        if (onProgress) {
          onProgress(completed, cases.length, result);
        }

        if (options.failFast && !result.passed) {
          return;
        }
      }
    };

    // Start workers
    const workers = Array(Math.min(concurrency, cases.length))
      .fill(null)
      .map(() => runNext());

    await Promise.all(workers);

    // Filter out undefined results (from fail-fast)
    return results.filter(r => r !== undefined);
  }

  /**
   * Filter cases based on options
   */
  private filterCases(cases: EvalCase[], options?: RunOptions): EvalCase[] {
    if (!options) return cases;

    return cases.filter(c => {
      // Filter by tags
      if (options.tags && options.tags.length > 0) {
        if (!options.tags.some(tag => c.tags.includes(tag))) {
          return false;
        }
      }

      // Filter by categories
      if (options.categories && options.categories.length > 0) {
        if (!options.categories.includes(c.category)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Generate summary from results
   */
  summarize(results: EvalResult[], subject: string, cases?: EvalCase[]): EvalSummary {
    const passed = results.filter(r => r.passed);
    const failed = results.filter(r => !r.passed);

    // Calculate performance stats
    const times = results.map(r => r.executionTimeMs).sort((a, b) => a - b);
    const performance = this.calculatePerformanceStats(times);

    // Group by category
    const byCategory = this.calculateCategoryStats(results, cases);

    // Collect failures
    const failures = this.collectFailures(failed, cases);

    return {
      subject,
      totalCases: results.length,
      passedCases: passed.length,
      failedCases: failed.length,
      passRate: results.length > 0 ? passed.length / results.length : 0,
      averageScore: results.length > 0
        ? results.reduce((sum, r) => sum + r.score, 0) / results.length
        : 0,
      byCategory,
      performance,
      failures,
      timestamp: new Date()
    };
  }

  /**
   * Calculate performance statistics
   */
  private calculatePerformanceStats(times: number[]): PerformanceStats {
    if (times.length === 0) {
      return {
        avgExecutionTimeMs: 0,
        p50ExecutionTimeMs: 0,
        p95ExecutionTimeMs: 0,
        p99ExecutionTimeMs: 0,
        maxExecutionTimeMs: 0
      };
    }

    const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length;

    return {
      avgExecutionTimeMs: avgTime,
      p50ExecutionTimeMs: times[Math.floor(times.length * 0.5)] || 0,
      p95ExecutionTimeMs: times[Math.floor(times.length * 0.95)] || 0,
      p99ExecutionTimeMs: times[Math.floor(times.length * 0.99)] || 0,
      maxExecutionTimeMs: Math.max(...times)
    };
  }

  /**
   * Calculate category statistics
   */
  private calculateCategoryStats(
    results: EvalResult[],
    cases?: EvalCase[]
  ): Record<string, CategoryStats> {
    const byCategory: Record<string, CategoryStats> = {};

    if (!cases) return byCategory;

    const casesById = new Map(cases.map(c => [c.id, c]));

    results.forEach(r => {
      const evalCase = casesById.get(r.caseId);
      if (evalCase) {
        const cat = evalCase.category;
        if (!byCategory[cat]) {
          byCategory[cat] = { total: 0, passed: 0, passRate: 0, avgScore: 0 };
        }
        byCategory[cat].total++;
        if (r.passed) byCategory[cat].passed++;
      }
    });

    // Calculate pass rates and average scores
    for (const cat in byCategory) {
      const stats = byCategory[cat];
      stats.passRate = stats.total > 0 ? stats.passed / stats.total : 0;
      stats.avgScore = stats.passRate; // Simplified: avgScore = passRate
    }

    return byCategory;
  }

  /**
   * Collect failure summaries
   */
  private collectFailures(failed: EvalResult[], cases?: EvalCase[]): FailureSummary[] {
    const casesById = cases ? new Map(cases.map(c => [c.id, c])) : null;

    return failed.map(r => ({
      caseId: r.caseId,
      description: casesById?.get(r.caseId)?.description || r.caseId,
      error: r.error?.message
    }));
  }

  /**
   * Cleanup all fixtures
   */
  async cleanup(): Promise<void> {
    await this.fixtureManager.cleanupAll();
  }
}
