// run-all-evals.ts - Comprehensive evaluation runner for all tools

import { DatasetLoader } from '../src/eval/dataset-loader';
import { FixtureManager } from '../src/eval/fixtures';
import { EvalScorer } from '../src/eval/scorer';
import { UnitEvalRunner } from '../src/eval/unit-runner';
import { DefaultToolExecutor } from '../src/tool-executor';
import { DefaultToolRegistry } from '../src/tool-registry';
import type { EvalResult, EvalSummary, EvalCase } from '../src/eval/types';
import * as fs from 'fs';
import * as path from 'path';

// Import all tools (13 total)
import { readFileTool } from '../src/tools/read-file';
import { editFileTool } from '../src/tools/edit-file';
import { globTool } from '../src/tools/glob';
import { grepTool } from '../src/tools/grep';
import { getCodebaseMapTool } from '../src/tools/get-codebase-map';
import { searchCodeTool } from '../src/tools/search-code';
import { inspectSymbolTool } from '../src/tools/inspect-symbol';
import { getImportsExportsTool } from '../src/tools/get-imports-exports';
import { findReferencesTool } from '../src/tools/find-references';
import { bashTool } from '../src/tools/bash';
import { bashOutputTool } from '../src/tools/bash-output';
import { killBashTool } from '../src/tools/kill-bash';
import { todoWriteTool } from '../src/tools/todo-write';

interface ToolEvalSummary extends EvalSummary {
  toolName: string;
  datasetFile: string;
}

async function runAllEvaluations() {
  console.log('🚀 CodeCraft Comprehensive Tool Evaluation\n');
  console.log('='.repeat(80));
  console.log('Running evaluations for all 13 tools\n');

  // Initialize components
  const loader = new DatasetLoader();
  const fixtureManager = new FixtureManager();
  const scorer = new EvalScorer();
  const registry = new DefaultToolRegistry();

  // Register all tools (13 total)
  const tools = [
    readFileTool,
    editFileTool,
    globTool,
    grepTool,
    getCodebaseMapTool,
    searchCodeTool,
    inspectSymbolTool,
    getImportsExportsTool,
    findReferencesTool,
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

  // Create executor with base context
  const executor = new DefaultToolExecutor(registry, {
    cwd: process.cwd(),
    fs: fs as any,
    rustEngine
  });

  // Create UnitEvalRunner
  const runner = new UnitEvalRunner({
    executor,
    fixtureManager,
    scorer,
    verbose: true
  });

  // Set Rust engine on runner (for fixture contexts)
  runner.setRustEngine(rustEngine);

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

      // Run all cases using UnitEvalRunner
      const results = await runner.runCases(cases, { verbose: true }, (completed, total, result) => {
        if (!result.passed) {
          console.log(`   ❌ ${result.caseId}: ${cases.find(c => c.id === result.caseId)?.description}`);
          result.breakdown?.forEach(b => {
            if (!b.passed) {
              console.log(`      ✗ ${b.criterion}: ${b.details}`);
            }
          });
        }
      });

      // Generate summary using UnitEvalRunner
      const baseSummary = runner.summarize(results, toolName, cases);
      const summary: ToolEvalSummary = {
        ...baseSummary,
        toolName,
        datasetFile
      };
      allSummaries.push(summary);

      const passed = results.filter(r => r.passed).length;
      const failed = results.filter(r => !r.passed).length;

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
    'File Operations': ['read_file', 'edit_file'],
    'Search & Discovery': ['glob', 'grep', 'get_codebase_map', 'search_code'],
    'AST-Based Tools': ['inspect_symbol', 'get_imports_exports', 'find_references'],
    'Execution & Process': ['bash', 'bash_output', 'kill_bash', 'todo_write']
  };

  for (const [category, toolNames] of Object.entries(categories)) {
    const categorySummaries = allSummaries.filter(s => toolNames.includes(s.toolName));
    const categoryPassed = categorySummaries.reduce((sum, s) => sum + s.passedCases, 0);
    const categoryTotal = categorySummaries.reduce((sum, s) => sum + s.totalCases, 0);

    console.log(`\n  ${category}:`);
    if (categoryTotal > 0) {
      console.log(`    Total: ${categoryTotal} cases, Passed: ${categoryPassed} (${(categoryPassed/categoryTotal*100).toFixed(1)}%)`);

      categorySummaries.forEach(s => {
        const icon = s.passedCases === s.totalCases ? '✅' : '⚠️';
        console.log(`    ${icon} ${s.toolName}: ${s.passedCases}/${s.totalCases}`);
      });
    } else {
      console.log('    No tools in this category');
    }
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
  if (allSummaries.length > 0) {
    const avgTime = allSummaries.reduce((sum, s) => sum + s.performance.avgExecutionTimeMs, 0) / allSummaries.length;
    const maxTime = Math.max(...allSummaries.map(s => s.performance.maxExecutionTimeMs));
    console.log(`   Average execution time: ${avgTime.toFixed(0)}ms`);
    console.log(`   Max execution time: ${maxTime.toFixed(0)}ms`);
  }

  console.log('\n' + '='.repeat(80));
  if (totalFailed === 0) {
    console.log('✅ ALL TESTS PASSED! 🎉');
  } else {
    console.log(`⚠️  ${totalFailed} test(s) failed`);
  }
  console.log('='.repeat(80));

  // Cleanup
  await runner.cleanup();

  return {
    totalCases,
    totalPassed,
    totalFailed,
    summaries: allSummaries
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
