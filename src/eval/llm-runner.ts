/**
 * LLM Evaluation Runner
 *
 * Tests whether the LLM selects the correct tool and parameters when given natural language queries.
 */

import { createEvalLLM } from '../llm';
import type { Tool } from '../types/tool';
import type { DefaultToolRegistry } from '../tool-registry';
import type { EvalScorer } from './scorer';
import type { EvalResult, EvalCase, ScoreBreakdown, ScoringResult } from './types';
import { FunctionCall, GenerateContentResult } from '@google/generative-ai';

export interface LLMEvalCase extends EvalCase {
  tool: string; // Should be 'llm_evaluation'
  input: {
    query: string;
    history?: Array<{ role: string; parts: Array<{ text: string }> }>;
    context?: {
      currentFile?: string;
      recentFiles?: string[];
    };
  };

  expected: {
    expectedTool: string;
    acceptableTools?: string[];
    forbiddenTools?: string[];
    expectedParams?: Record<string, any>;
  };
}

export interface LLMEvalRunnerOptions {
  registry: DefaultToolRegistry;
  scorer: EvalScorer;
  apiKey: string;
  rateLimitDelayMs?: number; // Delay between LLM calls to avoid rate limiting
}

export class LLMEvalRunner {
  private llmClient: any;
  private registry: DefaultToolRegistry;
  private scorer: EvalScorer;
  private rateLimitDelayMs: number;

  constructor(options: LLMEvalRunnerOptions) {
    this.registry = options.registry;
    this.scorer = options.scorer;
    this.rateLimitDelayMs = options.rateLimitDelayMs || 1000;

    // Create LLM client with tools from registry
    const toolDeclarations = this.registry.getAll().map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }));

    this.llmClient = createEvalLLM(options.apiKey, [{
      functionDeclarations: toolDeclarations
    }]);
  }

  /**
   * Run a single LLM evaluation case
   */
  async runCase(evalCase: LLMEvalCase): Promise<EvalResult> {
    const startTime = Date.now();

    try {
      // Build prompt from query
      const prompt = this.buildPrompt(evalCase);

      // Send to LLM
      const response = await this.llmClient.generateContent(prompt);

      // Extract function call from response
      const functionCall = this.extractFunctionCall(response);

      // Score the tool selection
      const scoringResult = this.scoreToolSelection(functionCall, evalCase.expected);

      return {
        caseId: evalCase.id,
        passed: scoringResult.passed,
        score: scoringResult.score,
        actual: functionCall ? {
          tool: functionCall.name,
          params: functionCall.args
        } : null,
        expected: evalCase.expected,
        executionTimeMs: Date.now() - startTime,
        breakdown: scoringResult.breakdown,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        caseId: evalCase.id,
        passed: false,
        score: 0,
        actual: null,
        expected: evalCase.expected,
        error: {
          message: error instanceof Error ? error.message : String(error),
          code: 'LLM_ERROR'
        },
        executionTimeMs: Date.now() - startTime,
        breakdown: [{
          criterion: 'execution',
          passed: false,
          score: 0,
          details: error instanceof Error ? error.message : String(error)
        }],
        timestamp: new Date()
      };
    }
  }

  /**
   * Run multiple cases with rate limiting
   */
  async runCases(
    cases: LLMEvalCase[],
    onProgress?: (completed: number, total: number, result: EvalResult) => void
  ): Promise<EvalResult[]> {
    const results: EvalResult[] = [];

    for (let i = 0; i < cases.length; i++) {
      const result = await this.runCase(cases[i]);
      results.push(result);

      if (onProgress) {
        onProgress(i + 1, cases.length, result);
      }

      // Rate limiting delay (except for last case)
      if (i < cases.length - 1 && this.rateLimitDelayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, this.rateLimitDelayMs));
      }
    }

    return results;
  }

  /**
   * Build prompt for LLM
   */
  private buildPrompt(evalCase: LLMEvalCase): string {
    let prompt = evalCase.input.query;

    // Add context if provided
    if (evalCase.input.context) {
      const { currentFile, recentFiles } = evalCase.input.context;

      if (currentFile) {
        prompt += `\n\nContext: Currently viewing ${currentFile}`;
      }

      if (recentFiles && recentFiles.length > 0) {
        prompt += `\nRecent files: ${recentFiles.join(', ')}`;
      }
    }

    return prompt;
  }

  /**
   * Extract function call from LLM response
   */
  private extractFunctionCall(response: GenerateContentResult): { name: string; args: Record<string, any> } | null {
    try {
      const candidates = response.response.candidates;
      if (!candidates || candidates.length === 0) {
        return null;
      }

      const content = candidates[0].content;
      if (!content.parts || content.parts.length === 0) {
        return null;
      }

      // Find function call part
      for (const part of content.parts) {
        if ('functionCall' in part && part.functionCall) {
          return {
            name: part.functionCall.name,
            args: part.functionCall.args as Record<string, any>
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Error extracting function call:', error);
      return null;
    }
  }

  /**
   * Score tool selection against expected
   */
  private scoreToolSelection(
    functionCall: { name: string; args: Record<string, any> } | null,
    expected: LLMEvalCase['expected']
  ): ScoringResult {
    const breakdown: ScoreBreakdown[] = [];

    // Check if tool was called
    if (!functionCall) {
      return {
        passed: false,
        score: 0,
        breakdown: [{
          criterion: 'tool_called',
          passed: false,
          score: 0,
          details: 'LLM did not call any tool'
        }]
      };
    }

    // Check if forbidden tool was used
    if (expected.forbiddenTools && expected.forbiddenTools.includes(functionCall.name)) {
      breakdown.push({
        criterion: 'forbidden_tool',
        passed: false,
        score: 0,
        details: `Used forbidden tool: ${functionCall.name}`
      });

      return {
        passed: false,
        score: 0,
        breakdown
      };
    }

    // Check tool selection
    const primaryMatch = functionCall.name === expected.expectedTool;
    const acceptableMatch = expected.acceptableTools?.includes(functionCall.name);
    const toolCorrect = primaryMatch || acceptableMatch;

    breakdown.push({
      criterion: 'tool_selection',
      passed: toolCorrect,
      score: primaryMatch ? 1 : (acceptableMatch ? 0.8 : 0),
      details: `Selected: ${functionCall.name}, Expected: ${expected.expectedTool}`
    });

    // Check parameters if tool is correct
    if (toolCorrect && expected.expectedParams) {
      const paramResults = this.scoreParameters(functionCall.args, expected.expectedParams);
      breakdown.push(...paramResults);
    }

    const avgScore = breakdown.reduce((sum, b) => sum + b.score, 0) / breakdown.length;
    const allPassed = breakdown.every(b => b.passed);

    return {
      passed: allPassed,
      score: avgScore,
      breakdown
    };
  }

  /**
   * Score parameters against expected
   */
  private scoreParameters(
    actualParams: Record<string, any>,
    expectedParams: Record<string, any>
  ): ScoreBreakdown[] {
    const breakdown: ScoreBreakdown[] = [];

    for (const [paramName, paramExpectation] of Object.entries(expectedParams)) {
      const actualValue = actualParams[paramName];

      // Check if parameter exists
      if (actualValue === undefined || actualValue === null) {
        breakdown.push({
          criterion: `param_${paramName}`,
          passed: false,
          score: 0,
          details: `Missing parameter: ${paramName}`
        });
        continue;
      }

      // Check parameter expectations
      if (typeof paramExpectation === 'object' && paramExpectation !== null) {
        // Type check
        if ('type' in paramExpectation) {
          const typeMatch = typeof actualValue === paramExpectation.type;
          breakdown.push({
            criterion: `param_${paramName}_type`,
            passed: typeMatch,
            score: typeMatch ? 1 : 0,
            details: typeMatch
              ? `Correct type: ${paramExpectation.type}`
              : `Expected type ${paramExpectation.type}, got ${typeof actualValue}`
          });

          if (!typeMatch) continue;
        }

        // Contains check
        if ('contains' in paramExpectation) {
          const containsMatch = String(actualValue).includes(paramExpectation.contains);
          breakdown.push({
            criterion: `param_${paramName}_contains`,
            passed: containsMatch,
            score: containsMatch ? 1 : 0,
            details: containsMatch
              ? `Contains "${paramExpectation.contains}"`
              : `Does not contain "${paramExpectation.contains}"`
          });
        }

        // Pattern check
        if ('pattern' in paramExpectation) {
          const regex = new RegExp(paramExpectation.pattern);
          const patternMatch = regex.test(String(actualValue));
          breakdown.push({
            criterion: `param_${paramName}_pattern`,
            passed: patternMatch,
            score: patternMatch ? 1 : 0,
            details: patternMatch
              ? `Matches pattern: ${paramExpectation.pattern}`
              : `Does not match pattern: ${paramExpectation.pattern}`
          });
        }

        // Exact match check
        if ('exact' in paramExpectation) {
          const exactMatch = actualValue === paramExpectation.exact;
          breakdown.push({
            criterion: `param_${paramName}_exact`,
            passed: exactMatch,
            score: exactMatch ? 1 : 0,
            details: exactMatch
              ? `Exact match: ${paramExpectation.exact}`
              : `Expected ${paramExpectation.exact}, got ${actualValue}`
          });
        }
      }
    }

    return breakdown;
  }
}
