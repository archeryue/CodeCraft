// run-all-evals.ts - Comprehensive evaluation runner for all tools

import { DatasetLoader } from './src/eval/dataset-loader';
import { FixtureManager } from './src/eval/fixtures';
import { EvalScorer } from './src/eval/scorer';
import { DefaultToolExecutor } from './src/tool-executor';
import { DefaultToolRegistry } from './src/tool-registry';
import type { EvalResult, EvalSummary, EvalCase } from './src/eval/types';
import * as fs from 'fs';
import * as path from 'path';

// Import all tools
import { readFileTool } from './src/tools/read_file';
import { writeFileTool } from './src/tools/write_file';
import { editFileTool } from './src/tools/edit_file';
import { deleteFileTool } from './src/tools/delete_file';
import { listDirectoryTool } from './src/tools/list_directory';
import { globTool } from './src/tools/glob';
import { grepTool } from './src/tools/grep';
import { getCodebaseMapTool } from './src/tools/get_codebase_map';
import { searchCodeTool } from './src/tools/search_code';
import { inspectSymbolTool } from './src/tools/inspect_symbol';
import { getImportsExportsTool } from './src/tools/get_imports_exports';
import { buildDependencyGraphTool } from './src/tools/build_dependency_graph';
import { findReferencesTool } from './src/tools/find_references';
import { detectProjectTypeTool } from './src/tools/detect_project_type';
import { extractConventionsTool } from './src/tools/extract_conventions';
import { getProjectOverviewTool } from './src/tools/get_project_overview';
import { bashTool } from './src/tools/bash';
import { bashOutputTool } from './src/tools/bash_output';
import { killBashTool } from './src/tools/kill_bash';
import { todoWriteTool } from './src/tools/todo_write';

interface ToolEvalSummary extends EvalSummary {
  toolName: string;
  datasetFile: string;
}

async function runAllEvaluations() {
  console.log('🚀 CodeCraft Comprehensive Tool Evaluation\n');
  console.log('='.repeat(80));
  console.log('Running evaluations for all 20 tools with 300 test cases\n');

  // Initialize components
  const loader = new DatasetLoader();
  const fixtureManager = new FixtureManager();
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

  // Load the real Rust engine
  let rustEngine;
  try {
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const rustEnginePath = path.join(process.cwd(), 'rust_engine.linux-x64-gnu.node');
    rustEngine = require(rustEnginePath);
    console.log('   ✓ Rust engine loaded\n');
  } catch (error) {
    console.log(`   ⚠️  Rust engine not available: ${error instanceof Error ? error.message : String(error)}\n`);
  }

  // Set Rust engine on fixture manager so it's available in all fixture contexts
  fixtureManager.setRustEngine(rustEngine);

  const executor = new DefaultToolExecutor(registry, {
    cwd: process.cwd(),
    fs: fs as any,
    rustEngine
  });

  // Find all dataset files
  const datasetsDir = path.join(process.cwd(), 'evals/datasets');
  const datasetFiles = fs.readdirSync(datasetsDir)
    .filter(f => f.endsWith('.json') && f !== 'demo')
    .sort();

  console.log(`\n📂 Found ${datasetFiles.length} dataset files\n`);

  const allSummaries: ToolEvalSummary[] = [];
  let totalCases = 0;
  let totalPassed = 0;
  let totalFailed = 0;

  // Run evaluation for each dataset
  for (const datasetFile of datasetFiles) {
    const datasetPath = path.join(datasetsDir, datasetFile);
    const toolName = datasetFile.replace('.json', '');

    console.log('─'.repeat(80));
    console.log(`\n🔧 Evaluating: ${toolName}`);
    console.log(`   Dataset: ${datasetFile}`);

    try {
      // Load dataset
      const cases = await loader.loadDataset(datasetPath);
      console.log(`   Test cases: ${cases.length}`);

      const results: EvalResult[] = [];
      let passed = 0;
      let failed = 0;

      // Run each test case
      for (const evalCase of cases) {
        const startTime = Date.now();

        // Setup fixture
        const { context, cleanup } = await fixtureManager.setup(evalCase.fixtures);

        try {
          // Execute tool
          const toolResult = await executor.executeWithContext(
            evalCase.tool,
            evalCase.input.params!,
            context
          );

          // Score result
          const scoringResult = scorer.score(
            toolResult,
            evalCase.expected,
            evalCase
          );

          if (scoringResult.passed) {
            passed++;
          } else {
            failed++;
            console.log(`   ❌ ${evalCase.id}: ${evalCase.description}`);
            scoringResult.breakdown.forEach(b => {
              if (!b.passed) {
                console.log(`      ✗ ${b.criterion}: ${b.details}`);
              }
            });
          }

          // Create eval result
          const result: EvalResult = {
            caseId: evalCase.id,
            passed: scoringResult.passed,
            score: scoringResult.score,
            actual: toolResult,
            expected: evalCase.expected,
            executionTimeMs: Date.now() - startTime,
            breakdown: scoringResult.breakdown,
            timestamp: new Date()
          };

          results.push(result);

        } catch (error) {
          failed++;
          console.log(`   ❌ ${evalCase.id}: ${evalCase.description}`);
          console.log(`      Error: ${error instanceof Error ? error.message : String(error)}`);

          results.push({
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
            error: error instanceof Error ? error : new Error(String(error)),
            timestamp: new Date()
          });
        } finally {
          await cleanup();
        }
      }

      // Generate summary for this tool
      const summary = generateSummary(results, cases, toolName, datasetFile);
      allSummaries.push(summary);

      totalCases += cases.length;
      totalPassed += passed;
      totalFailed += failed;

      // Print tool summary
      console.log(`\n   Results: ${passed}/${cases.length} passed (${(passed/cases.length*100).toFixed(1)}%)`);
      if (failed > 0) {
        console.log(`   Failed: ${failed}`);
      }

    } catch (error) {
      console.error(`   ❌ Error loading/running dataset: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Print overall summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 OVERALL EVALUATION SUMMARY');
  console.log('='.repeat(80));
  console.log(`\nTotal Tools Evaluated: ${allSummaries.length}`);
  console.log(`Total Test Cases: ${totalCases}`);
  console.log(`Passed: ${totalPassed} (${(totalPassed/totalCases*100).toFixed(1)}%)`);
  console.log(`Failed: ${totalFailed} (${(totalFailed/totalCases*100).toFixed(1)}%)`);

  // Group by category
  console.log('\n📋 Results by Category:');

  const categories = {
    'File Operations': ['read_file', 'write_file', 'edit_file', 'delete_file', 'list_directory'],
    'Search & Discovery': ['glob', 'grep', 'get_codebase_map', 'search_code'],
    'AST-Based Tools': ['inspect_symbol', 'get_imports_exports', 'build_dependency_graph', 'find_references'],
    'Project Analysis': ['detect_project_type', 'extract_conventions', 'get_project_overview'],
    'Execution & Process': ['bash', 'bash_output', 'kill_bash', 'todo_write']
  };

  for (const [category, toolNames] of Object.entries(categories)) {
    const categorySummaries = allSummaries.filter(s => toolNames.includes(s.toolName));
    const categoryPassed = categorySummaries.reduce((sum, s) => sum + s.passedCases, 0);
    const categoryTotal = categorySummaries.reduce((sum, s) => sum + s.totalCases, 0);

    console.log(`\n  ${category}:`);
    console.log(`    Total: ${categoryTotal} cases, Passed: ${categoryPassed} (${(categoryPassed/categoryTotal*100).toFixed(1)}%)`);

    categorySummaries.forEach(s => {
      const icon = s.passedCases === s.totalCases ? '✅' : '⚠️';
      console.log(`    ${icon} ${s.toolName}: ${s.passedCases}/${s.totalCases}`);
    });
  }

  // Show failed tools
  const failedTools = allSummaries.filter(s => s.failedCases > 0);
  if (failedTools.length > 0) {
    console.log('\n⚠️  Tools with Failures:');
    failedTools.forEach(s => {
      console.log(`   ${s.toolName}: ${s.failedCases} failures`);
      if (s.failures.length > 0) {
        s.failures.forEach(f => {
          console.log(`     - ${f.caseId}: ${f.description}`);
        });
      }
    });
  }

  // Performance summary
  console.log('\n⚡ Performance Summary:');
  const avgTime = allSummaries.reduce((sum, s) => sum + s.performance.avgExecutionTimeMs, 0) / allSummaries.length;
  const maxTime = Math.max(...allSummaries.map(s => s.performance.maxExecutionTimeMs));
  console.log(`   Average execution time: ${avgTime.toFixed(0)}ms`);
  console.log(`   Max execution time: ${maxTime.toFixed(0)}ms`);

  console.log('\n' + '='.repeat(80));
  if (totalFailed === 0) {
    console.log('✅ ALL TESTS PASSED! 🎉');
  } else {
    console.log(`⚠️  ${totalFailed} test(s) failed`);
  }
  console.log('='.repeat(80));

  // Cleanup
  await fixtureManager.cleanupAll();

  return {
    totalCases,
    totalPassed,
    totalFailed,
    summaries: allSummaries
  };
}

function generateSummary(
  results: EvalResult[],
  cases: EvalCase[],
  toolName: string,
  datasetFile: string
): ToolEvalSummary {
  const passed = results.filter(r => r.passed);
  const failed = results.filter(r => !r.passed);

  const times = results.map(r => r.executionTimeMs).sort((a, b) => a - b);
  const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length;

  // Group by category
  const byCategory: Record<string, any> = {};
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

  // Calculate pass rates
  for (const cat in byCategory) {
    byCategory[cat].passRate = byCategory[cat].passed / byCategory[cat].total;
    byCategory[cat].avgScore = byCategory[cat].passRate;
  }

  return {
    toolName,
    datasetFile,
    subject: toolName,
    totalCases: results.length,
    passedCases: passed.length,
    failedCases: failed.length,
    passRate: passed.length / results.length,
    averageScore: results.reduce((sum, r) => sum + r.score, 0) / results.length,
    byCategory,
    performance: {
      avgExecutionTimeMs: avgTime,
      p50ExecutionTimeMs: times[Math.floor(times.length * 0.5)],
      p95ExecutionTimeMs: times[Math.floor(times.length * 0.95)],
      p99ExecutionTimeMs: times[Math.floor(times.length * 0.99)],
      maxExecutionTimeMs: Math.max(...times)
    },
    failures: failed.map(r => ({
      caseId: r.caseId,
      description: casesById.get(r.caseId)?.description || r.caseId,
      error: r.error?.message
    })),
    timestamp: new Date()
  };
}

// Run the evaluation
runAllEvaluations()
  .then((results) => {
    console.log('\n✨ Evaluation complete!\n');
    process.exit(results.totalFailed > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('\n❌ Evaluation failed:', error);
    process.exit(1);
  });
