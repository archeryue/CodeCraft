// tests/eval/types.test.ts

import { describe, it, expect } from 'vitest';
import type {
  EvalCase,
  EvalInput,
  EvalExpectation,
  EvalResult,
  EvalSummary,
  EvalCategory,
  FixtureSpec,
  InlineFixture,
  DirectoryFixture,
  PresetFixture,
  SnapshotFixture,
  GeneratedFixture,
  ChainStep,
  ScoreBreakdown,
  ParamExpectation
} from '../../src/eval/types';

describe('Evaluation Types', () => {
  describe('EvalCase Structure', () => {
    it('TC-001: should accept valid EvalCase with all required fields', () => {
      const evalCase: EvalCase = {
        id: 'test-001',
        description: 'Test case description',
        tool: 'ReadFile',
        category: 'happy_path',
        tags: ['read', 'file'],
        difficulty: 3,
        input: {
          params: { path: 'test.txt' }
        },
        expected: {
          success: true,
          exact: 'Hello, World!'
        }
      };

      expect(evalCase.id).toBe('test-001');
      expect(evalCase.tool).toBe('ReadFile');
      expect(evalCase.category).toBe('happy_path');
    });

    it('TC-002: should accept EvalCase with optional metadata', () => {
      const evalCase: EvalCase = {
        id: 'test-002',
        description: 'Test',
        tool: 'ReadFile',
        category: 'happy_path',
        tags: [],
        difficulty: 1,
        input: { params: {} },
        expected: { success: true },
        metadata: {
          author: 'test',
          created: '2025-01-01'
        }
      };

      expect(evalCase.metadata).toBeDefined();
      expect(evalCase.metadata?.author).toBe('test');
    });

    it('TC-003: should accept EvalCase with fixtures', () => {
      const evalCase: EvalCase = {
        id: 'test-003',
        description: 'Test',
        tool: 'ReadFile',
        category: 'happy_path',
        tags: [],
        difficulty: 1,
        input: { params: {} },
        expected: { success: true },
        fixtures: {
          type: 'inline',
          files: { 'test.txt': 'content' }
        }
      };

      expect(evalCase.fixtures).toBeDefined();
      expect(evalCase.fixtures?.type).toBe('inline');
    });
  });

  describe('EvalCategory Enum', () => {
    it('TC-003: should contain all expected category values', () => {
      const categories: EvalCategory[] = [
        'happy_path',
        'edge_case',
        'error_handling',
        'performance',
        'security',
        'llm_selection',
        'llm_params',
        'chain',
        'e2e'
      ];

      categories.forEach(category => {
        const evalCase: EvalCase = {
          id: `test-${category}`,
          description: 'Test',
          tool: 'test',
          category,
          tags: [],
          difficulty: 1,
          input: { params: {} },
          expected: { success: true }
        };

        expect(evalCase.category).toBe(category);
      });
    });
  });

  describe('EvalInput Variants', () => {
    it('TC-004: should support params-based input', () => {
      const input: EvalInput = {
        params: {
          path: 'test.txt',
          offset: 0,
          limit: 100
        }
      };

      expect(input.params).toBeDefined();
      expect(input.params?.path).toBe('test.txt');
    });

    it('TC-005: should support query-based input (LLM)', () => {
      const input: EvalInput = {
        query: 'Show me the contents of package.json'
      };

      expect(input.query).toBeDefined();
      expect(input.query).toContain('package.json');
    });

    it('TC-006: should support chain-based input', () => {
      const input: EvalInput = {
        chain: [
          { tool: 'ReadFile', params: { path: 'test.txt' } },
          { tool: 'WriteFile', params: 'from_previous' }
        ]
      };

      expect(input.chain).toBeDefined();
      expect(input.chain?.length).toBe(2);
    });

    it('TC-007: should support context override', () => {
      const input: EvalInput = {
        params: { path: 'test.txt' },
        context: {
          cwd: '/tmp/test',
          env: { TEST_MODE: 'true' }
        }
      };

      expect(input.context).toBeDefined();
      expect(input.context?.cwd).toBe('/tmp/test');
      expect(input.context?.env?.TEST_MODE).toBe('true');
    });
  });

  describe('EvalExpectation Matchers', () => {
    it('TC-008: should support exact matching', () => {
      const expectation: EvalExpectation = {
        exact: 'Hello, World!'
      };

      expect(expectation.exact).toBe('Hello, World!');
    });

    it('TC-009: should support contains matching', () => {
      const expectation: EvalExpectation = {
        contains: 'error'
      };

      expect(expectation.contains).toBe('error');
    });

    it('TC-010: should support pattern matching', () => {
      const expectation: EvalExpectation = {
        pattern: '^Error: .+'
      };

      expect(expectation.pattern).toBe('^Error: .+');
    });

    it('TC-011: should support schema validation', () => {
      const expectation: EvalExpectation = {
        schema: {
          type: 'object',
          required: ['name', 'value']
        }
      };

      expect(expectation.schema).toBeDefined();
      expect(expectation.schema?.type).toBe('object');
    });

    it('TC-012: should support custom scorer', () => {
      const expectation: EvalExpectation = {
        scorer: 'semantic_similarity'
      };

      expect(expectation.scorer).toBe('semantic_similarity');
    });

    it('TC-013: should support success flag', () => {
      const expectation: EvalExpectation = {
        success: false,
        errorCode: 'FILE_NOT_FOUND'
      };

      expect(expectation.success).toBe(false);
      expect(expectation.errorCode).toBe('FILE_NOT_FOUND');
    });

    it('TC-014: should support performance constraints', () => {
      const expectation: EvalExpectation = {
        performance: {
          maxTimeMs: 1000,
          maxMemoryMb: 100
        }
      };

      expect(expectation.performance).toBeDefined();
      expect(expectation.performance?.maxTimeMs).toBe(1000);
    });

    it('TC-015: should support LLM-specific fields', () => {
      const expectation: EvalExpectation = {
        expectedTool: 'ReadFile',
        expectedParams: {
          path: {
            type: 'string',
            contains: 'package.json'
          }
        }
      };

      expect(expectation.expectedTool).toBe('ReadFile');
      expect(expectation.expectedParams).toBeDefined();
    });
  });

  describe('FixtureSpec Types', () => {
    it('TC-016: should support inline fixture type', () => {
      const fixture: InlineFixture = {
        type: 'inline',
        files: {
          'test.txt': 'content',
          'data.json': '{"key": "value"}'
        },
        directories: ['src', 'tests']
      };

      expect(fixture.type).toBe('inline');
      expect(fixture.files['test.txt']).toBe('content');
    });

    it('TC-017: should support directory fixture type', () => {
      const fixture: DirectoryFixture = {
        type: 'directory',
        sourcePath: './fixtures/example',
        include: ['*.ts', '*.json'],
        exclude: ['node_modules/**']
      };

      expect(fixture.type).toBe('directory');
      expect(fixture.sourcePath).toBe('./fixtures/example');
    });

    it('TC-018: should support preset fixture type', () => {
      const fixture: PresetFixture = {
        type: 'preset',
        name: 'typescript-project',
        overrides: {
          'package.json': '{"name": "test"}'
        }
      };

      expect(fixture.type).toBe('preset');
      expect(fixture.name).toBe('typescript-project');
    });

    it('TC-019: should support snapshot fixture type', () => {
      const fixture: SnapshotFixture = {
        type: 'snapshot',
        repository: 'https://github.com/example/repo',
        commit: 'abc123',
        sparse: ['src/', 'package.json']
      };

      expect(fixture.type).toBe('snapshot');
      expect(fixture.repository).toContain('github.com');
    });

    it('TC-020: should support generated fixture type', () => {
      const fixture: GeneratedFixture = {
        type: 'generated',
        generator: 'typescript-app',
        options: {
          useReact: true
        }
      };

      expect(fixture.type).toBe('generated');
      expect(fixture.generator).toBe('typescript-app');
    });
  });

  describe('EvalResult Structure', () => {
    it('TC-021: should capture all execution details', () => {
      const result: EvalResult = {
        caseId: 'test-001',
        passed: true,
        score: 1.0,
        actual: 'Hello, World!',
        expected: { exact: 'Hello, World!' },
        executionTimeMs: 150,
        timestamp: new Date()
      };

      expect(result.caseId).toBe('test-001');
      expect(result.passed).toBe(true);
      expect(result.score).toBe(1.0);
      expect(result.executionTimeMs).toBe(150);
    });

    it('TC-022: should support breakdown field', () => {
      const result: EvalResult = {
        caseId: 'test-002',
        passed: false,
        score: 0.67,
        actual: 'test',
        expected: {},
        executionTimeMs: 100,
        timestamp: new Date(),
        breakdown: [
          {
            criterion: 'exact_match',
            passed: true,
            score: 1
          },
          {
            criterion: 'contains',
            passed: false,
            score: 0,
            details: 'String does not contain expected substring'
          }
        ]
      };

      expect(result.breakdown).toBeDefined();
      expect(result.breakdown?.length).toBe(2);
    });

    it('TC-023: should support error field', () => {
      const result: EvalResult = {
        caseId: 'test-003',
        passed: false,
        score: 0,
        actual: null,
        expected: {},
        executionTimeMs: 50,
        timestamp: new Date(),
        error: {
          code: 'TIMEOUT',
          message: 'Tool execution timed out after 1000ms'
        }
      };

      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('TIMEOUT');
    });

    it('TC-024: should support LLM-specific fields', () => {
      const result: EvalResult = {
        caseId: 'test-004',
        passed: true,
        score: 1.0,
        actual: { tool: 'ReadFile', params: { path: 'test.txt' } },
        expected: { expectedTool: 'ReadFile' },
        executionTimeMs: 200,
        timestamp: new Date(),
        selectedTool: 'ReadFile',
        generatedParams: { path: 'test.txt' }
      };

      expect(result.selectedTool).toBe('ReadFile');
      expect(result.generatedParams).toBeDefined();
    });
  });

  describe('EvalSummary Aggregation', () => {
    it('TC-025: should have all summary fields', () => {
      const summary: EvalSummary = {
        subject: 'ReadFile',
        totalCases: 100,
        passedCases: 95,
        failedCases: 5,
        passRate: 0.95,
        averageScore: 0.97,
        byCategory: {
          happy_path: { total: 50, passed: 50, passRate: 1.0, avgScore: 1.0 },
          edge_case: { total: 30, passed: 28, passRate: 0.93, avgScore: 0.95 },
          error_handling: { total: 20, passed: 17, passRate: 0.85, avgScore: 0.88 }
        },
        performance: {
          avgExecutionTimeMs: 125.5,
          p50ExecutionTimeMs: 100,
          p95ExecutionTimeMs: 250,
          p99ExecutionTimeMs: 400,
          maxExecutionTimeMs: 500
        },
        failures: [
          {
            caseId: 'test-fail-001',
            description: 'Edge case with large file',
            error: 'Timeout'
          }
        ],
        timestamp: new Date()
      };

      expect(summary.subject).toBe('ReadFile');
      expect(summary.totalCases).toBe(100);
      expect(summary.passRate).toBe(0.95);
    });

    it('TC-026: should have byCategory structure', () => {
      const summary: EvalSummary = {
        subject: 'test',
        totalCases: 10,
        passedCases: 8,
        failedCases: 2,
        passRate: 0.8,
        averageScore: 0.85,
        byCategory: {
          happy_path: { total: 5, passed: 5, passRate: 1.0, avgScore: 1.0 }
        },
        performance: {
          avgExecutionTimeMs: 100,
          p50ExecutionTimeMs: 90,
          p95ExecutionTimeMs: 150,
          p99ExecutionTimeMs: 180,
          maxExecutionTimeMs: 200
        },
        failures: [],
        timestamp: new Date()
      };

      expect(summary.byCategory.happy_path).toBeDefined();
      expect(summary.byCategory.happy_path.total).toBe(5);
      expect(summary.byCategory.happy_path.passRate).toBe(1.0);
    });

    it('TC-027: should have performance structure', () => {
      const summary: EvalSummary = {
        subject: 'test',
        totalCases: 10,
        passedCases: 10,
        failedCases: 0,
        passRate: 1.0,
        averageScore: 1.0,
        byCategory: {},
        performance: {
          avgExecutionTimeMs: 100,
          p50ExecutionTimeMs: 95,
          p95ExecutionTimeMs: 150,
          p99ExecutionTimeMs: 180,
          maxExecutionTimeMs: 200
        },
        failures: [],
        timestamp: new Date()
      };

      expect(summary.performance).toBeDefined();
      expect(summary.performance.avgExecutionTimeMs).toBe(100);
      expect(summary.performance.p95ExecutionTimeMs).toBe(150);
    });
  });

  describe('Helper Types', () => {
    it('TC-028: ChainStep structure', () => {
      const step: ChainStep = {
        tool: 'ReadFile',
        params: { path: 'test.txt' },
        extractOutput: '$.data'
      };

      expect(step.tool).toBe('ReadFile');
      expect(step.extractOutput).toBe('$.data');
    });

    it('TC-029: ChainStep supports from_previous', () => {
      const step: ChainStep = {
        tool: 'WriteFile',
        params: 'from_previous'
      };

      expect(step.tool).toBe('WriteFile');
      expect(step.params).toBe('from_previous');
    });

    it('TC-030: ScoreBreakdown structure', () => {
      const breakdown: ScoreBreakdown = {
        criterion: 'tool_selection',
        passed: true,
        score: 1.0,
        details: 'Correctly selected read_file tool'
      };

      expect(breakdown.criterion).toBe('tool_selection');
      expect(breakdown.passed).toBe(true);
      expect(breakdown.score).toBe(1.0);
    });
  });
});
