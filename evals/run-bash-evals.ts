/**
 * Bash Command Evaluation Runner
 *
 * Focused evaluation for Bash tool usage - tests if the agent generates
 * correct bash commands with proper syntax, flags, and parameters.
 *
 * Usage: npx tsx evals/run-bash-evals.ts
 */

import { DatasetLoader } from '../src/eval/dataset-loader';
import { EvalScorer } from '../src/eval/scorer';
import { LLMEvalRunner, type LLMEvalCase } from '../src/eval/llm-runner';
import { DefaultToolRegistry } from '../src/tool-registry';
import type { EvalResult, ScoreBreakdown } from '../src/eval/types';
import * as fs from 'fs';
import * as path from 'path';

// Import all tools (needed for LLM to choose from)
import { readFileTool } from '../src/tools/read-file';
import { editFileTool } from '../src/tools/edit-file';
import { globTool } from '../src/tools/glob';
import { grepTool } from '../src/tools/grep';
import { codeSearchTool } from '../src/tools/code-search';
import { bashTool } from '../src/tools/bash';
import { bashOutputTool } from '../src/tools/bash-output';
import { killBashTool } from '../src/tools/kill-bash';
import { todoWriteTool } from '../src/tools/todo-write';

interface BashEvalDataset {
  tool: string;
  version: string;
  description: string;
  categories: Record<string, string>;
  cases: LLMEvalCase[];
}

interface CategoryMetrics {
  total: number;
  passed: number;
  avgScore: number;
  exactCommandMatch: number;
  partialCommandMatch: number;
  wrongCommand: number;
  wrongTool: number;
}

interface BashEvalSummary {
  totalCases: number;
  passedCases: number;
  failedCases: number;
  passRate: number;
  avgScore: number;
  byCategory: Record<string, CategoryMetrics>;
  commandQuality: {
    exactMatch: number;
    partialMatch: number;
    wrongCommand: number;
    wrongTool: number;
    noTool: number;
  };
  performance: {
    avgTimeMs: number;
    p50TimeMs: number;
    p95TimeMs: number;
    maxTimeMs: number;
  };
}

function extractCommandFromResult(result: EvalResult): string | null {
  const actual = result.actual as { tool: string; params: Record<string, any> } | null;
  if (!actual || !actual.params || !actual.params.command) {
    return null;
  }
  return actual.params.command;
}

function scoreCommandQuality(
  actualCommand: string | null,
  expectedPatterns: Record<string, any> | undefined,
  expectedTool: string,
  actualTool: string | null
): { quality: 'exact' | 'partial' | 'wrong_command' | 'wrong_tool' | 'no_tool'; score: number } {

  if (!actualTool) {
    return { quality: 'no_tool', score: 0 };
  }

  if (actualTool !== expectedTool && actualTool !== 'Bash') {
    return { quality: 'wrong_tool', score: 0 };
  }

  if (!actualCommand) {
    return { quality: 'wrong_command', score: 0.2 };
  }

  if (!expectedPatterns || !expectedPatterns.command) {
    // No specific command pattern expected, just check tool was correct
    return actualTool === expectedTool
      ? { quality: 'partial', score: 0.8 }
      : { quality: 'wrong_tool', score: 0 };
  }

  const commandExpectation = expectedPatterns.command;

  // Check pattern match
  if (commandExpectation.pattern) {
    try {
      const regex = new RegExp(commandExpectation.pattern, 'i');
      if (regex.test(actualCommand)) {
        return { quality: 'exact', score: 1.0 };
      }
    } catch (e) {
      console.warn(`Invalid regex pattern: ${commandExpectation.pattern}`);
    }
  }

  // Check contains match
  if (commandExpectation.contains) {
    if (actualCommand.includes(commandExpectation.contains)) {
      return { quality: 'partial', score: 0.7 };
    }
  }

  // Check type match (just verify it's a string command)
  if (commandExpectation.type === 'string' && typeof actualCommand === 'string') {
    return { quality: 'partial', score: 0.5 };
  }

  return { quality: 'wrong_command', score: 0.2 };
}

async function runBashEvaluations() {
  console.log('🔧 CodeCraft Bash Command Evaluation\n');
  console.log('='.repeat(80));
  console.log('Testing if the agent generates correct bash commands with proper syntax\n');

  // Check for API key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ Error: GEMINI_API_KEY environment variable not set');
    console.error('Please set your Gemini API key:');
    console.error('  export GEMINI_API_KEY=your_key_here');
    process.exit(1);
  }

  // Initialize components
  const loader = new DatasetLoader();
  const scorer = new EvalScorer();
  const registry = new DefaultToolRegistry();

  // Register all tools
  const tools = [
    readFileTool,
    editFileTool,
    globTool,
    grepTool,
    codeSearchTool,
    bashTool,
    bashOutputTool,
    killBashTool,
    todoWriteTool
  ];

  console.log('📝 Registering tools...');
  for (const tool of tools) {
    registry.register(tool);
  }
  console.log(`   ✓ ${tools.length} tools registered\n`);

  // Create LLM eval runner
  const runner = new LLMEvalRunner({
    registry,
    scorer,
    apiKey,
    rateLimitDelayMs: 1000
  });

  // Load bash commands dataset
  const datasetPath = path.join(process.cwd(), 'evals/datasets/llm/bash_commands.json');

  if (!fs.existsSync(datasetPath)) {
    console.error(`❌ Dataset not found: ${datasetPath}`);
    process.exit(1);
  }

  const dataset: BashEvalDataset = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));
  const cases = dataset.cases;

  console.log(`📂 Loaded dataset: ${dataset.description}`);
  console.log(`   Total cases: ${cases.length}`);
  console.log(`   Categories: ${Object.keys(dataset.categories).join(', ')}\n`);

  // Initialize category metrics
  const categoryMetrics: Record<string, CategoryMetrics> = {};
  for (const category of Object.keys(dataset.categories)) {
    categoryMetrics[category] = {
      total: 0,
      passed: 0,
      avgScore: 0,
      exactCommandMatch: 0,
      partialCommandMatch: 0,
      wrongCommand: 0,
      wrongTool: 0
    };
  }

  // Track overall command quality
  const commandQuality = {
    exactMatch: 0,
    partialMatch: 0,
    wrongCommand: 0,
    wrongTool: 0,
    noTool: 0
  };

  const allResults: EvalResult[] = [];
  let totalPassed = 0;

  console.log('─'.repeat(80));
  console.log('Running evaluations...\n');

  // Run all cases
  const results = await runner.runCases(cases, (completed, total, result) => {
    const evalCase = cases.find(c => c.id === result.caseId);
    if (!evalCase) return;

    // Extract category from tags
    const category = evalCase.tags[0] || 'unknown';

    // Get actual tool and command
    const actual = result.actual as { tool: string; params: Record<string, any> } | null;
    const actualTool = actual?.tool || null;
    const actualCommand = extractCommandFromResult(result);

    // Score command quality
    const quality = scoreCommandQuality(
      actualCommand,
      evalCase.expected.expectedParams,
      evalCase.expected.expectedTool,
      actualTool
    );

    // Update quality counters
    switch (quality.quality) {
      case 'exact':
        commandQuality.exactMatch++;
        break;
      case 'partial':
        commandQuality.partialMatch++;
        break;
      case 'wrong_command':
        commandQuality.wrongCommand++;
        break;
      case 'wrong_tool':
        commandQuality.wrongTool++;
        break;
      case 'no_tool':
        commandQuality.noTool++;
        break;
    }

    // Update category metrics
    if (categoryMetrics[category]) {
      categoryMetrics[category].total++;
      if (result.passed) {
        categoryMetrics[category].passed++;
      }
      switch (quality.quality) {
        case 'exact':
          categoryMetrics[category].exactCommandMatch++;
          break;
        case 'partial':
          categoryMetrics[category].partialCommandMatch++;
          break;
        case 'wrong_command':
          categoryMetrics[category].wrongCommand++;
          break;
        case 'wrong_tool':
          categoryMetrics[category].wrongTool++;
          break;
      }
    }

    // Print progress
    const statusIcon = result.passed ? '✅' : '❌';
    const qualityIcon = quality.quality === 'exact' ? '🎯' :
                        quality.quality === 'partial' ? '🔶' :
                        quality.quality === 'wrong_command' ? '⚠️' : '🚫';

    console.log(`${statusIcon} ${qualityIcon} [${category}] ${evalCase.id}: ${evalCase.description}`);

    if (actualCommand) {
      // Truncate long commands
      const displayCmd = actualCommand.length > 60
        ? actualCommand.substring(0, 57) + '...'
        : actualCommand;
      console.log(`      Command: ${displayCmd}`);
    } else if (actualTool) {
      console.log(`      Tool: ${actualTool} (no command)`);
    } else {
      console.log(`      No tool called`);
    }

    if (!result.passed && result.breakdown) {
      result.breakdown.filter(b => !b.passed).forEach(b => {
        console.log(`      ✗ ${b.criterion}: ${b.details}`);
      });
    }
  });

  allResults.push(...results);
  totalPassed = results.filter(r => r.passed).length;

  // Calculate category averages
  for (const category of Object.keys(categoryMetrics)) {
    const metrics = categoryMetrics[category];
    if (metrics.total > 0) {
      metrics.avgScore = metrics.passed / metrics.total;
    }
  }

  // Calculate performance metrics
  const times = results.map(r => r.executionTimeMs).sort((a, b) => a - b);
  const totalTime = times.reduce((sum, t) => sum + t, 0);
  const p50 = times[Math.floor(times.length * 0.5)];
  const p95 = times[Math.floor(times.length * 0.95)];

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 BASH COMMAND EVALUATION SUMMARY');
  console.log('='.repeat(80));

  console.log(`\nOverall Results:`);
  console.log(`  Total Cases:  ${cases.length}`);
  console.log(`  Passed:       ${totalPassed} (${(totalPassed/cases.length*100).toFixed(1)}%)`);
  console.log(`  Failed:       ${cases.length - totalPassed} (${((cases.length - totalPassed)/cases.length*100).toFixed(1)}%)`);

  console.log(`\n🎯 Command Quality Breakdown:`);
  console.log(`  Exact Match:    ${commandQuality.exactMatch} (${(commandQuality.exactMatch/cases.length*100).toFixed(1)}%)  ← Command perfectly matches expected pattern`);
  console.log(`  Partial Match:  ${commandQuality.partialMatch} (${(commandQuality.partialMatch/cases.length*100).toFixed(1)}%)  ← Command is functional but not optimal`);
  console.log(`  Wrong Command:  ${commandQuality.wrongCommand} (${(commandQuality.wrongCommand/cases.length*100).toFixed(1)}%)  ← Correct tool, wrong command syntax`);
  console.log(`  Wrong Tool:     ${commandQuality.wrongTool} (${(commandQuality.wrongTool/cases.length*100).toFixed(1)}%)  ← Selected wrong tool entirely`);
  console.log(`  No Tool:        ${commandQuality.noTool} (${(commandQuality.noTool/cases.length*100).toFixed(1)}%)  ← Did not call any tool`);

  console.log(`\n📋 Results by Category:`);
  const sortedCategories = Object.entries(categoryMetrics)
    .filter(([_, m]) => m.total > 0)
    .sort((a, b) => b[1].total - a[1].total);

  for (const [category, metrics] of sortedCategories) {
    const passRate = (metrics.passed / metrics.total * 100).toFixed(1);
    const exactRate = (metrics.exactCommandMatch / metrics.total * 100).toFixed(1);
    const icon = metrics.passed === metrics.total ? '✅' :
                 metrics.passed >= metrics.total * 0.7 ? '🔶' : '❌';

    console.log(`\n  ${icon} ${category.toUpperCase()} (${dataset.categories[category] || category}):`);
    console.log(`     Total: ${metrics.total}, Passed: ${metrics.passed} (${passRate}%)`);
    console.log(`     Exact: ${metrics.exactCommandMatch}, Partial: ${metrics.partialCommandMatch}, Wrong: ${metrics.wrongCommand + metrics.wrongTool}`);
  }

  console.log(`\n⚡ Performance:`);
  console.log(`  Total Time:    ${(totalTime / 1000).toFixed(2)}s`);
  console.log(`  Avg Time/Case: ${(totalTime / cases.length).toFixed(0)}ms`);
  console.log(`  P50 (Median):  ${p50.toFixed(0)}ms`);
  console.log(`  P95:           ${p95.toFixed(0)}ms`);
  console.log(`  Max:           ${Math.max(...times).toFixed(0)}ms`);

  // Print failed cases summary
  const failedResults = results.filter(r => !r.passed);
  if (failedResults.length > 0) {
    console.log(`\n⚠️  Failed Cases (${failedResults.length}):`);
    for (const result of failedResults.slice(0, 10)) {
      const evalCase = cases.find(c => c.id === result.caseId);
      const actual = result.actual as { tool: string; params: Record<string, any> } | null;
      console.log(`   ${result.caseId}: Expected ${evalCase?.expected.expectedTool}, Got ${actual?.tool || 'none'}`);
    }
    if (failedResults.length > 10) {
      console.log(`   ... and ${failedResults.length - 10} more`);
    }
  }

  console.log('\n' + '='.repeat(80));
  if (totalPassed === cases.length) {
    console.log('✅ ALL BASH COMMAND TESTS PASSED! 🎉');
  } else {
    const passRate = (totalPassed / cases.length * 100).toFixed(1);
    console.log(`📈 Pass Rate: ${passRate}% (${totalPassed}/${cases.length})`);
  }
  console.log('='.repeat(80));

  // Save detailed results
  const resultsPath = path.join(process.cwd(), 'bash-eval-results.json');
  const summary: BashEvalSummary = {
    totalCases: cases.length,
    passedCases: totalPassed,
    failedCases: cases.length - totalPassed,
    passRate: totalPassed / cases.length,
    avgScore: results.reduce((sum, r) => sum + r.score, 0) / results.length,
    byCategory: categoryMetrics,
    commandQuality,
    performance: {
      avgTimeMs: totalTime / cases.length,
      p50TimeMs: p50,
      p95TimeMs: p95,
      maxTimeMs: Math.max(...times)
    }
  };

  fs.writeFileSync(resultsPath, JSON.stringify({
    summary,
    timestamp: new Date().toISOString(),
    dataset: {
      path: datasetPath,
      categories: dataset.categories
    },
    results: results.map(r => ({
      caseId: r.caseId,
      passed: r.passed,
      score: r.score,
      actual: r.actual,
      expected: r.expected,
      executionTimeMs: r.executionTimeMs,
      breakdown: r.breakdown
    }))
  }, null, 2));

  console.log(`\n💾 Detailed results saved to: ${resultsPath}\n`);

  return {
    totalCases: cases.length,
    totalPassed,
    totalFailed: cases.length - totalPassed
  };
}

// Run the evaluation
runBashEvaluations()
  .then((results) => {
    console.log('✨ Bash evaluation complete!\n');
    process.exit(results.totalFailed > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('\n❌ Bash evaluation failed:', error);
    process.exit(1);
  });
