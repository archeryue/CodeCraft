// src/eval/scorer.ts

import type { EvalExpectation, EvalCase, ScoreBreakdown, ToolResult } from './types';

/**
 * Scoring result with breakdown
 */
export interface ScoringResult {
  passed: boolean;
  score: number;
  breakdown: ScoreBreakdown[];
}

/**
 * Custom scoring function type
 */
export type ScorerFunction = (
  actual: unknown,
  expected: EvalExpectation,
  evalCase: EvalCase
) => ScoringResult;

/**
 * Scores evaluation results against expected outcomes
 */
export class EvalScorer {
  private customScorers: Map<string, ScorerFunction> = new Map();

  /**
   * Register a custom scoring function
   */
  registerScorer(name: string, scorer: ScorerFunction): void {
    this.customScorers.set(name, scorer);
  }

  /**
   * Score actual result against expected outcome
   */
  score(
    actual: unknown,
    expected: EvalExpectation,
    evalCase: EvalCase
  ): ScoringResult {
    const breakdown: ScoreBreakdown[] = [];

    // Extract data from ToolResult if needed
    const isToolResult = actual && typeof actual === 'object' && 'success' in actual;
    const dataToCompare = isToolResult ? (actual as ToolResult).data : actual;

    // Check exact match
    if (expected.exact !== undefined) {
      const match = this.checkExactMatch(dataToCompare, expected.exact);
      breakdown.push({
        criterion: 'exact_match',
        passed: match,
        score: match ? 1 : 0,
        details: match ? 'Exact match' : `Expected ${JSON.stringify(expected.exact)}, got ${JSON.stringify(dataToCompare)}`
      });
    }

    // Check contains
    if (expected.contains !== undefined) {
      const match = this.checkContains(dataToCompare, expected.contains);
      breakdown.push({
        criterion: 'contains',
        passed: match,
        score: match ? 1 : 0,
        details: match ? 'Contains match' : 'Does not contain expected value'
      });
    }

    // Check pattern
    if (expected.pattern !== undefined) {
      const match = this.checkPattern(dataToCompare, expected.pattern, expected.flags);
      breakdown.push({
        criterion: 'pattern',
        passed: match,
        score: match ? 1 : 0,
        details: match ? 'Pattern match' : `Does not match pattern: ${expected.pattern}`
      });
    }

    // Check success flag (for ToolResult)
    if (expected.success !== undefined) {
      const toolResult = actual as ToolResult;
      const match = toolResult.success === expected.success;
      breakdown.push({
        criterion: 'success',
        passed: match,
        score: match ? 1 : 0,
        details: `Expected success=${expected.success}, got ${toolResult.success}`
      });
    }

    // Check error code (for ToolResult)
    if (expected.errorCode !== undefined) {
      const toolResult = actual as ToolResult;
      const match = toolResult.error?.code === expected.errorCode;
      breakdown.push({
        criterion: 'error_code',
        passed: match,
        score: match ? 1 : 0,
        details: `Expected error code=${expected.errorCode}, got ${toolResult.error?.code}`
      });
    }

    // Check performance constraints
    if (expected.performance) {
      if (expected.performance.maxTimeMs !== undefined) {
        const toolResult = actual as ToolResult;
        const time = toolResult.executionTimeMs || 0;
        const match = time <= expected.performance.maxTimeMs;
        breakdown.push({
          criterion: 'performance_time',
          passed: match,
          score: match ? 1 : 0,
          details: `Execution time: ${time}ms (max: ${expected.performance.maxTimeMs}ms)`
        });
      }
    }

    // Custom scorer
    if (expected.scorer) {
      const scorer = this.customScorers.get(expected.scorer);
      if (scorer) {
        const customResult = scorer(actual, expected, evalCase);
        breakdown.push(...customResult.breakdown);
      } else {
        breakdown.push({
          criterion: 'custom_scorer',
          passed: false,
          score: 0,
          details: `Custom scorer '${expected.scorer}' not found`
        });
      }
    }

    // Calculate overall score and pass status
    const avgScore = breakdown.length > 0
      ? breakdown.reduce((sum, b) => sum + b.score, 0) / breakdown.length
      : 1;

    const passed = breakdown.every(b => b.passed);

    return {
      passed,
      score: avgScore,
      breakdown
    };
  }

  /**
   * Check exact match using deep equality
   */
  private checkExactMatch(actual: unknown, expected: unknown): boolean {
    return JSON.stringify(actual) === JSON.stringify(expected);
  }

  /**
   * Check if actual contains expected value
   */
  private checkContains(actual: unknown, expected: unknown): boolean {
    // String contains
    if (typeof actual === 'string' && typeof expected === 'string') {
      return actual.includes(expected);
    }

    // Object/Array contains string value (search recursively)
    if ((typeof actual === 'object' || Array.isArray(actual)) && actual !== null && typeof expected === 'string') {
      return this.objectContainsString(actual, expected);
    }

    // Array contains exact item
    if (Array.isArray(actual)) {
      return actual.some(item => JSON.stringify(item) === JSON.stringify(expected));
    }

    // Object contains (partial match)
    if (typeof actual === 'object' && actual !== null &&
        typeof expected === 'object' && expected !== null) {
      return this.objectContains(actual as Record<string, unknown>, expected as Record<string, unknown>);
    }

    return false;
  }

  /**
   * Check if any string value in object (recursively) contains the expected string
   */
  private objectContainsString(obj: unknown, expected: string): boolean {
    if (typeof obj === 'string') {
      return obj.includes(expected);
    }

    if (Array.isArray(obj)) {
      return obj.some(item => this.objectContainsString(item, expected));
    }

    if (typeof obj === 'object' && obj !== null) {
      for (const value of Object.values(obj)) {
        if (this.objectContainsString(value, expected)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if object contains all properties from expected
   */
  private objectContains(actual: Record<string, unknown>, expected: Record<string, unknown>): boolean {
    for (const [key, value] of Object.entries(expected)) {
      if (!(key in actual)) {
        return false;
      }

      if (typeof value === 'object' && value !== null) {
        if (typeof actual[key] !== 'object' || actual[key] === null) {
          return false;
        }
        if (!this.objectContains(actual[key] as Record<string, unknown>, value as Record<string, unknown>)) {
          return false;
        }
      } else {
        if (actual[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Check if actual matches regex pattern
   */
  private checkPattern(actual: unknown, pattern: string, flags?: string): boolean {
    try {
      const regex = new RegExp(pattern, flags);
      const str = String(actual);
      return regex.test(str);
    } catch (error) {
      // Invalid regex
      return false;
    }
  }
}
