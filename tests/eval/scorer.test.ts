// tests/eval/scorer.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { EvalScorer } from '../../src/eval/scorer';
import type { EvalExpectation, EvalCase, ToolResult } from '../../src/eval/types';
import type { ScoringResult } from '../../src/eval/scorer';

describe('EvalScorer', () => {
  let scorer: EvalScorer;

  beforeEach(() => {
    scorer = new EvalScorer();
  });

  // Helper to create minimal eval case
  const createCase = (expected: EvalExpectation): EvalCase => ({
    id: 'test',
    description: 'test',
    tool: 'test',
    category: 'happy_path',
    tags: [],
    difficulty: 1,
    input: { params: {} },
    expected
  });

  describe('Exact Matching', () => {
    it('TC-001: should match exact string', () => {
      const result = scorer.score(
        'Hello, World!',
        { exact: 'Hello, World!' },
        createCase({ exact: 'Hello, World!' })
      );

      expect(result.passed).toBe(true);
      expect(result.score).toBe(1.0);
    });

    it('TC-002: should match exact number', () => {
      const result = scorer.score(
        42,
        { exact: 42 },
        createCase({ exact: 42 })
      );

      expect(result.passed).toBe(true);
      expect(result.score).toBe(1.0);
    });

    it('TC-003: should match exact object', () => {
      const obj = { name: 'test', value: 123 };
      const result = scorer.score(
        obj,
        { exact: obj },
        createCase({ exact: obj })
      );

      expect(result.passed).toBe(true);
      expect(result.score).toBe(1.0);
    });

    it('TC-006: should fail on type mismatch', () => {
      const result = scorer.score(
        '42',
        { exact: 42 },
        createCase({ exact: 42 })
      );

      expect(result.passed).toBe(false);
      expect(result.score).toBe(0);
    });
  });

  describe('Contains Matching', () => {
    it('TC-008: should match substring', () => {
      const result = scorer.score(
        'Hello, World!',
        { contains: 'World' },
        createCase({ contains: 'World' })
      );

      expect(result.passed).toBe(true);
      expect(result.score).toBe(1.0);
    });

    it('TC-009: should fail on missing substring', () => {
      const result = scorer.score(
        'Hello, World!',
        { contains: 'Goodbye' },
        createCase({ contains: 'Goodbye' })
      );

      expect(result.passed).toBe(false);
      expect(result.score).toBe(0);
    });

    it('TC-011: should match object property', () => {
      const result = scorer.score(
        { name: 'test', value: 123, other: 'data' },
        { contains: { name: 'test' } },
        createCase({ contains: { name: 'test' } })
      );

      expect(result.passed).toBe(true);
      expect(result.score).toBe(1.0);
    });
  });

  describe('Pattern Matching', () => {
    it('TC-014: should match regex pattern', () => {
      const result = scorer.score(
        'Error: File not found',
        { pattern: '^Error: .+' },
        createCase({ pattern: '^Error: .+' })
      );

      expect(result.passed).toBe(true);
      expect(result.score).toBe(1.0);
    });

    it('TC-015: should fail on non-match', () => {
      const result = scorer.score(
        'Success',
        { pattern: '^Error: .+' },
        createCase({ pattern: '^Error: .+' })
      );

      expect(result.passed).toBe(false);
      expect(result.score).toBe(0);
    });

    it('TC-016: should support regex flags', () => {
      const result = scorer.score(
        'ERROR: Failed',
        { pattern: 'error', flags: 'i' },
        createCase({ pattern: 'error', flags: 'i' })
      );

      expect(result.passed).toBe(true);
      expect(result.score).toBe(1.0);
    });
  });

  describe('Success Flag', () => {
    it('TC-024: should match success flag', () => {
      const toolResult: ToolResult = {
        success: true,
        data: 'result',
        executionTimeMs: 100,
        timestamp: new Date()
      };

      const result = scorer.score(
        toolResult,
        { success: true },
        createCase({ success: true })
      );

      expect(result.passed).toBe(true);
      expect(result.score).toBe(1.0);
    });

    it('TC-026: should match error code', () => {
      const toolResult: ToolResult = {
        success: false,
        error: { code: 'FILE_NOT_FOUND', message: 'File not found' },
        executionTimeMs: 50,
        timestamp: new Date()
      };

      const result = scorer.score(
        toolResult,
        { success: false, errorCode: 'FILE_NOT_FOUND' },
        createCase({ success: false, errorCode: 'FILE_NOT_FOUND' })
      );

      expect(result.passed).toBe(true);
      expect(result.score).toBe(1.0);
    });
  });

  describe('Multiple Criteria', () => {
    it('TC-031: should pass when all matchers pass', () => {
      const result = scorer.score(
        'Error: File not found',
        {
          contains: 'File',
          pattern: '^Error:'
        },
        createCase({ contains: 'File', pattern: '^Error:' })
      );

      expect(result.passed).toBe(true);
      expect(result.score).toBe(1.0);
      expect(result.breakdown.length).toBeGreaterThanOrEqual(2);
    });

    it('TC-032: should calculate partial score when some fail', () => {
      const result = scorer.score(
        'Error: File not found',
        {
          contains: 'File',
          pattern: '^Warning:' // This will fail
        },
        createCase({ contains: 'File', pattern: '^Warning:' })
      );

      expect(result.passed).toBe(false); // Not all passed
      expect(result.score).toBeGreaterThan(0); // But some did
      expect(result.score).toBeLessThan(1);
    });
  });

  describe('Custom Scorers', () => {
    it('TC-034: should register custom scorer', () => {
      const customScorer = () => ({
        passed: true,
        score: 0.8,
        breakdown: [{ criterion: 'custom', passed: true, score: 0.8 }]
      });

      scorer.registerScorer('test_scorer', customScorer);

      // Verify it can be used
      const result = scorer.score(
        'test data',
        { scorer: 'test_scorer' },
        createCase({ scorer: 'test_scorer' })
      );

      expect(result.score).toBe(0.8);
    });

    it('TC-037: should handle missing custom scorer', () => {
      const result = scorer.score(
        'test data',
        { scorer: 'does_not_exist' },
        createCase({ scorer: 'does_not_exist' })
      );

      // Should handle gracefully (either skip or error in breakdown)
      expect(result).toBeDefined();
    });
  });

  describe('Breakdown Generation', () => {
    it('TC-039: should list all criteria in breakdown', () => {
      const result = scorer.score(
        'test',
        { exact: 'test', contains: 'es', pattern: 'te' },
        createCase({ exact: 'test', contains: 'es', pattern: 'te' })
      );

      expect(result.breakdown.length).toBe(3);
      expect(result.breakdown.map(b => b.criterion)).toContain('exact_match');
      expect(result.breakdown.map(b => b.criterion)).toContain('contains');
      expect(result.breakdown.map(b => b.criterion)).toContain('pattern');
    });

    it('TC-040: should include details in breakdown', () => {
      const result = scorer.score(
        'wrong',
        { exact: 'right' },
        createCase({ exact: 'right' })
      );

      expect(result.breakdown[0].details).toBeDefined();
    });
  });
});
