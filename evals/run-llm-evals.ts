// run-llm-evals.ts - LLM tool selection evaluation runner

import { DatasetLoader } from '../src/eval/dataset-loader';
import { EvalScorer } from '../src/eval/scorer';
import { LLMEvalRunner, type LLMEvalCase } from '../src/eval/llm-runner';
import { DefaultToolRegistry } from '../src/tool-registry';
import type { EvalResult, EvalSummary } from '../src/eval/types';
import * as fs from 'fs';
import * as path from 'path';

// Import all tools
import { readFileTool } from '../src/tools/read-file';
import { writeFileTool } from '../src/tools/write-file';
import { editFileTool } from '../src/tools/edit-file';
import { deleteFileTool } from '../src/tools/delete-file';
import { listDirectoryTool } from '../src/tools/list-directory';
import { globTool } from '../src/tools/glob';
import { grepTool } from '../src/tools/grep';
import { getCodebaseMapTool } from '../src/tools/get-codebase-map';
import { searchCodeTool } from '../src/tools/search-code';
import { inspectSymbolTool } from '../src/tools/inspect-symbol';
import { getImportsExportsTool } from '../src/tools/get-imports-exports';
import { buildDependencyGraphTool } from '../src/tools/build-dependency-graph';
import { findReferencesTool } from '../src/tools/find-references';
import { detectProjectTypeTool } from '../src/tools/detect-project-type';
import { extractConventionsTool } from '../src/tools/extract-conventions';
import { getProjectOverviewTool } from '../src/tools/get-project-overview';
import { bashTool } from '../src/tools/bash';
import { bashOutputTool } from '../src/tools/bash-output';
import { killBashTool } from '../src/tools/kill-bash';
import { todoWriteTool } from '../src/tools/todo-write';

interface LLMEvalDataset {
  tool: string;
  version: string;
  description: string;
  cases: LLMEvalCase[];
}

async function runLLMEvaluations() {
  console.log('🚀 CodeCraft LLM Tool Selection Evaluation\\n');
  console.log('='.repeat(80));
  console.log('Testing whether the AI agent selects the correct tools for natural language queries\\n');

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
    writeFileTool,
    editFileTool,
    deleteFileTool,
    listDirectoryTool,
    globTool,
    grepTool,
    getCodebaseMapTool,
    searchCodeTool,
    inspectSymbolTool,
    getImportsExportsTool,
    buildDependencyGraphTool,
    findReferencesTool,
    detectProjectTypeTool,
    extractConventionsTool,
    getProjectOverviewTool,
    bashTool,
    bashOutputTool,
    killBashTool,
    todoWriteTool
  ];

  console.log('📝 Registering tools...');
  for (const tool of tools) {
    registry.register(tool);
    console.log(`   ✓ ${tool.name}`);
  }
  console.log('');

  // Create LLM eval runner
  const runner = new LLMEvalRunner({
    registry,
    scorer,
    apiKey,
    rateLimitDelayMs: 1000 // 1 second delay between requests
  });

  // Find all LLM dataset files
  const llmDir = path.join(process.cwd(), 'evals/datasets/llm');
  const datasetFiles = fs.readdirSync(llmDir).filter(f => f.endsWith('.json')).sort();

  console.log(`📂 Found ${datasetFiles.length} LLM evaluation datasets\\n`);

  const allResults: EvalResult[] = [];
  let totalCases = 0;
  let totalPassed = 0;

  // Track LLM-specific metrics
  let exactMatches = 0;
  let acceptableMatches = 0;
  let wrongTool = 0;
  let noTool = 0;
  let forbiddenTool = 0;

  for (const datasetFile of datasetFiles) {
    const datasetPath = path.join(llmDir, datasetFile);
    const dataset: LLMEvalDataset = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));
    const cases = dataset.cases;

    console.log('─'.repeat(80));
    console.log(`\\n📝 Dataset: ${datasetFile}`);
    console.log(`   Description: ${dataset.description}`);
    console.log(`   Test cases: ${cases.length}\\n`);

    // Run all cases with progress reporting
    const results = await runner.runCases(cases, (completed, total, result) => {
      const evalCase = cases.find(c => c.id === result.caseId);
      if (!evalCase) return;

      if (result.passed) {
        console.log(`   ✅ ${result.caseId}: "${evalCase.input.query}"`);
        console.log(`      Selected: ${(result.actual as any)?.tool || 'none'}`);
      } else {
        console.log(`   ❌ ${result.caseId}: "${evalCase.input.query}"`);
        console.log(`      Expected: ${evalCase.expected.expectedTool}`);
        console.log(`      Selected: ${(result.actual as any)?.tool || 'none'}`);
        if (result.breakdown) {
          result.breakdown.filter(b => !b.passed).forEach(b => {
            console.log(`         ✗ ${b.criterion}: ${b.details}`);
          });
        }
      }
    });

    allResults.push(...results);
    totalCases += cases.length;

    // Count metrics
    for (const result of results) {
      if (result.passed) {
        totalPassed++;
        const toolBreakdown = result.breakdown?.find(b => b.criterion === 'tool_selection');
        if (toolBreakdown && toolBreakdown.score === 1) {
          exactMatches++;
        } else if (toolBreakdown && toolBreakdown.score === 0.8) {
          acceptableMatches++;
        }
      } else {
        const actualTool = (result.actual as any)?.tool;
        if (!actualTool) {
          noTool++;
        } else {
          const evalCase = cases.find(c => c.id === result.caseId);
          if (evalCase?.expected.forbiddenTools?.includes(actualTool)) {
            forbiddenTool++;
          } else {
            wrongTool++;
          }
        }
      }
    }

    const passedInDataset = results.filter(r => r.passed).length;
    console.log(`\\n   Summary: ${passedInDataset}/${cases.length} passed (${(passedInDataset/cases.length*100).toFixed(1)}%)\\n`);
  }

  // Calculate parameter quality (only for correct tool selections)
  const correctToolSelections = allResults.filter(r => {
    const toolBreakdown = r.breakdown?.find(b => b.criterion === 'tool_selection');
    return toolBreakdown?.passed;
  });

  const paramBreakdowns = correctToolSelections.flatMap(r =>
    r.breakdown?.filter(b => b.criterion.startsWith('param_')) || []
  );

  const paramQuality = paramBreakdowns.length > 0
    ? paramBreakdowns.filter(b => b.passed).length / paramBreakdowns.length
    : 0;

  // Overall summary
  console.log('\\n' + '='.repeat(80));
  console.log('📊 OVERALL LLM EVALUATION SUMMARY');
  console.log('='.repeat(80));
  console.log(`\\nTotal Test Cases: ${totalCases}`);
  console.log(`Passed: ${totalPassed} (${(totalPassed/totalCases*100).toFixed(1)}%)`);
  console.log(`Failed: ${totalCases - totalPassed} (${((totalCases - totalPassed)/totalCases*100).toFixed(1)}%)`);

  const avgScore = allResults.reduce((sum, r) => sum + r.score, 0) / allResults.length;
  console.log(`Average Score: ${(avgScore * 100).toFixed(1)}%`);

  // LLM-specific metrics
  console.log('\\n📈 LLM-Specific Metrics:');
  console.log(`Exact Matches:       ${exactMatches} (${(exactMatches/totalCases*100).toFixed(1)}%)    ← Selected exactly the right tool`);
  console.log(`Acceptable Matches:  ${acceptableMatches} (${(acceptableMatches/totalCases*100).toFixed(1)}%)     ← Selected acceptable alternative tool`);
  console.log(`Wrong Tool:          ${wrongTool} (${(wrongTool/totalCases*100).toFixed(1)}%)    ← Selected wrong tool`);
  console.log(`No Tool:             ${noTool} (${(noTool/totalCases*100).toFixed(1)}%)     ← Did not call any tool`);
  console.log(`Forbidden Tool:      ${forbiddenTool} (${(forbiddenTool/totalCases*100).toFixed(1)}%)     ← Called forbidden tool`);
  console.log(`Parameter Quality:   ${(paramQuality * 100).toFixed(1)}%         ← Quality of parameters when tool was selected`);

  // Performance summary
  const totalTime = allResults.reduce((sum, r) => sum + r.executionTimeMs, 0);
  const avgTime = totalTime / allResults.length;
  const times = allResults.map(r => r.executionTimeMs).sort((a, b) => a - b);
  const p50 = times[Math.floor(times.length * 0.5)];
  const p95 = times[Math.floor(times.length * 0.95)];
  const p99 = times[Math.floor(times.length * 0.99)];
  const maxTime = Math.max(...times);

  console.log('\\n⚡ Performance:');
  console.log(`Total Time:     ${(totalTime / 1000).toFixed(2)}s`);
  console.log(`Avg Time/Case:  ${avgTime.toFixed(0)}ms`);
  console.log(`P50 (Median):   ${p50.toFixed(0)}ms`);
  console.log(`P95:            ${p95.toFixed(0)}ms`);
  console.log(`P99:            ${p99.toFixed(0)}ms`);
  console.log(`Max:            ${maxTime.toFixed(0)}ms`);

  console.log('\\n' + '='.repeat(80));
  if (totalPassed === totalCases) {
    console.log('✅ ALL LLM EVALUATION TESTS PASSED! 🎉');
  } else {
    console.log(`⚠️  ${totalCases - totalPassed} test(s) failed`);
  }
  console.log('='.repeat(80));

  // Save results
  const resultsPath = path.join(process.cwd(), 'llm-eval-results.json');
  const summary: EvalSummary = {
    subject: 'LLM Tool Selection',
    totalCases,
    passedCases: totalPassed,
    failedCases: totalCases - totalPassed,
    passRate: totalPassed / totalCases,
    averageScore: avgScore,
    byCategory: {
      llm_selection: {
        total: totalCases,
        passed: totalPassed,
        passRate: totalPassed / totalCases,
        avgScore: avgScore
      }
    },
    performance: {
      avgExecutionTimeMs: avgTime,
      p50ExecutionTimeMs: p50,
      p95ExecutionTimeMs: p95,
      p99ExecutionTimeMs: p99,
      maxExecutionTimeMs: maxTime
    },
    failures: allResults
      .filter(r => !r.passed)
      .map(r => ({
        caseId: r.caseId,
        description: `Tool: ${(r.actual as any)?.tool || 'none'}, Expected: ${(r.expected as any).expectedTool}`
      })),
    timestamp: new Date()
  };

  fs.writeFileSync(resultsPath, JSON.stringify({
    summary,
    timestamp: new Date().toISOString(),
    results: allResults
  }, null, 2));

  console.log(`\\n💾 Results saved to: ${resultsPath}\\n`);

  return {
    totalCases,
    totalPassed,
    totalFailed: totalCases - totalPassed
  };
}

// Run the evaluation
runLLMEvaluations()
  .then((results) => {
    console.log('✨ LLM Evaluation complete!\\n');
    process.exit(results.totalFailed > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('\\n❌ LLM Evaluation failed:', error);
    process.exit(1);
  });
