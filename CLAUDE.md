# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Goal

CodeCraft aims to combine the strengths of both **Claude Code** and **Augment Code**:

- **Claude Code's Advantage**: Direct command-line operation with an agentic workflow that can read, write, and execute code autonomously
- **Augment Code's Advantage**: Real-time code analysis and indexing capabilities for large codebases

The goal is to create a CLI coding assistant that operates directly in the terminal (like Claude Code) while also providing deep, real-time understanding of large codebases through AST-based indexing and analysis (like Augment Code).

## Overview

CodeCraft is a high-performance, agentic CLI coding assistant that combines Node.js/TypeScript for the interactive agent logic with Rust for heavy-duty code parsing and indexing. The Rust engine is exposed to Node.js via NAPI-RS bindings.

## Development Commands

### Building the Project
```bash
npm run build
```
This builds the Rust engine and copies the compiled `.node` addon to the project root as `rust_engine.linux-x64-gnu.node`.

**Build Process Details:**
- Navigates to `rust_engine/` directory
- Runs `cargo build --release`
- Copies `target/release/librust_engine.so` to `rust_engine.linux-x64-gnu.node`

### Testing
```bash
npm test          # Run unit tests (527 tests, 100% pass rate, <1 min)
npm run test:e2e  # Run E2E tests (20 tests, 100% pass rate, ~5 min)
npm run test:all  # Run both unit and E2E tests (547 total)
```

**Running Tests in Watch Mode:**
```bash
npx vitest
```

**Running Evaluations:**
```bash
npx tsx evals/run-all-evals.ts   # Tool evaluations (161/300 passing, 53.7%)
npx tsx evals/run-llm-evals.ts   # LLM evaluations (47/72 passing, 65.3%)
```

**Test Configuration:**
- `vitest.config.ts` - Main config for unit tests (excludes `tests/e2e/`)
- `vitest.e2e.config.ts` - E2E test config with 90s timeout
- `vitest.setup.ts` - Global setup with force-exit on completion

### Running the CLI
```bash
npx tsx index.ts
```
Starts the interactive REPL session.

**Requirements:**
- Set the `GEMINI_API_KEY` environment variable before running

## Architecture

### Hybrid Node.js + Rust Design

**Node.js Layer (`index.ts`, `src/`):**
- Entry point: `index.ts` - Creates the interactive REPL using readline
- Agent logic: `src/agent.ts` - Manages the Gemini chat session and tool execution loop
- Tool definitions: `src/tools.ts` - Defines tools for the LLM and handles execution
- UI: `src/ui/renderer.ts` - Renders markdown responses using marked-terminal

**Rust Layer (`rust_engine/src/lib.rs`):**
- Exported via NAPI-RS as a Node.js native addon
- Uses tree-sitter parsers for TypeScript and Rust
- Provides two main functions:
  - `generate_repo_map(path)` - Returns structural skeleton of codebase (signatures only)
  - `search(path, query)` - Fuzzy searches for symbols using SkimMatcherV2

**Bridge:**
- `rust_engine/` is compiled to a `.node` file
- Loaded in `src/tools.ts` using `require()` with the path `rust_engine.linux-x64-gnu.node`

### Agent Tool Loop

The agent implements a ReAct-style loop:
1. User sends message
2. Gemini model receives context and responds (may include function calls)
3. Function calls are executed via `executeTool()` in `src/tools.ts`
4. Results are sent back to Gemini
5. Loop continues until Gemini produces a text response

**Available Tools (17 total):**

*File Operations:*
- `read_file(path, offset?, limit?)` - Reads file content (supports partial reads)
- `write_file(path, content)` - Writes to file (shows diff and prompts for confirmation if file exists)
- `edit_file(path, old_string, new_string)` - Efficient string replacement editing
- `delete_file(path)` - Deletes a file with safety checks

*Search & Discovery:*
- `glob(pattern, path?)` - File pattern matching (e.g., `**/*.ts`)
- `grep(pattern, path?, options?)` - Content search with regex
- `list_directory(path)` - Browse directory structure
- `get_codebase_map(path)` - Generates AST-based skeleton via Rust engine
- `search_code(query, path?)` - Fuzzy searches symbols via Rust engine

*AST-Based Tools (Rust Engine):*
- `inspect_symbol(symbol, file, mode?)` - Inspect symbol: get info (default) or resolve definition (mode='resolve')
- `get_imports_exports(file)` - Show what file imports/exports
- `build_dependency_graph(path)` - Project-wide dependency graph
- `find_references(symbol, path)` - Find all usages of a symbol

*Execution & Process Management:*
- `bash(command, timeout?, run_in_background?)` - Execute bash commands (foreground or background)
- `bash_output(bash_id)` - Read output from background process (incremental)
- `kill_bash(bash_id)` - Terminate background process
- `todo_write(todos)` - Tracks multi-step tasks (required for 3+ step tasks)

### Confirmation Flow for File Writes

When the agent calls `write_file` on an existing file:
1. `executeTool()` generates a unified diff using the `diff` package
2. The diff is passed to the `confirmChange` callback (defined in `index.ts`)
3. User is prompted with inquirer
4. Only proceeds if user confirms

## Key Implementation Details

### Rust Engine

**File Filtering:**
- Ignores: hidden files (starting with `.`), `node_modules`, `target`, `dist`
- Supported languages: TypeScript (`.ts`, `.tsx`), Rust (`.rs`)

**Tree-sitter Parsing:**
- Extracts signatures for: functions, classes, interfaces, methods, structs, traits, impls
- Recursively walks AST but only includes relevant nodes
- Strips method bodies (splits on `{` character)

**Search Scoring:**
- Uses SkimMatcherV2 fuzzy matching
- Threshold: score > 60
- Returns top 10 results sorted by score descending

### Agent Session Management

**Chat Session:**
- Initialized via `Agent.start()` with system prompt
- System prompt: Concise responses, proactive tool use, mandatory TodoWrite for multi-step tasks
- History is maintained across turns

**Slash Commands:**
- `/clear` - Re-initializes the chat session
- `/help` - Shows help message
- `/init` - Generates CRAFT.md with comprehensive project analysis
- `/save` - Dumps chat history as JSON
- `exit` - Quits the application (handled in `index.ts`)

**CRAFT.md - Project Analysis File:**
- Generated by `/init` command
- Contains project overview, tech stack, and code conventions
- Automatically loaded into system prompt on agent startup
- Committed to git for team collaboration
- Re-run `/init` to refresh analysis after significant changes

### LLM Configuration

**Model:** `gemini-2.5-flash`
- Configured in `src/agent.ts:14`
- Tools are passed during model initialization

### Intent Classification

**Intent Classifier** (`src/intent_classifier.ts`):
- Classifies user messages into: explain, implement, refactor, debug, test, analyze
- Determines scope: single_file, multi_file, whole_project
- Extracts entities (mentioned files, classes, functions)
- Provides confidence score
- Used by agent to tailor response and choose appropriate workflow

### Advanced Agent Loop (ReAct+)

The agent uses three framework modules for intelligent behavior:

**Planning Engine** (`src/planning_engine.ts`):
- Creates execution plans for multi-step tasks
- Extracts entities, constraints, and success criteria from messages
- Estimates token usage per step
- Shows `[Plan] Created X steps (est. Y tokens)` for complex tasks

**Context Manager** (`src/context_manager.ts`):
- Tracks file reads and token usage
- Tiered context prioritization (HIGH/MEDIUM/LOW)
- Budget enforcement (default 8000 tokens)
- Shows `[Context] X files accessed, Y tokens used`

**Error Recovery** (`src/error_recovery.ts`):
- Records all tool calls for pattern detection
- Detects loops (repetition and alternation patterns)
- Suggests alternative strategies when stuck
- Shows `[Loop Detected]` and `[Suggestion]` warnings

## Testing Strategy

CodeCraft uses a **three-layer testing approach** to ensure both functional correctness and AI intelligence quality:

### 1. Unit Tests (527 tests, 100% pass rate, <1 min)
**Purpose**: Verify functional correctness of individual components

- Test pure functions and deterministic logic
- Mock external dependencies (filesystem, LLM, etc.)
- Cover edge cases and error conditions
- Fast execution for rapid feedback

**Location**: `tests/` directory (excludes `tests/e2e/`)

### 2. End-to-End Tests (20 tests, 100% pass rate, ~5 min)
**Purpose**: Verify system integration and real-world workflows

- Test actual CLI with real LLM interactions
- Verify tools are called correctly
- Ensure system doesn't crash or hang
- Cover 12/17 registered tools (71% coverage)

**Philosophy**: We test that the LLM **responds normally**, not that it's **smart**.
- ✅ Verify basic tool calling works
- ✅ Check system produces output
- ❌ Don't test if LLM chose the "best" tool
- ❌ Don't test quality of explanations

**Location**: `tests/e2e/` directory

### 3. Evaluation System (161/300 tool evals, 47/72 LLM evals)
**Purpose**: Measure AI intelligence quality - "how well does it work?"

**Tool Evaluations** (53.7% pass rate):
- Verify tools produce correct/high-quality results
- 15 test cases per tool (300 total)
- Validate data transformations and edge cases

**LLM Evaluations** (65.3% pass rate):
- Verify LLM makes smart decisions
- Test tool selection intelligence
- Measure reasoning quality
- Track performance over time

**Key Distinction**:
- **E2E Tests**: "Does it work?" → System produces output
- **Evaluations**: "How well does it work?" → Correct tool, good reasoning

See `docs/testing/TESTING_STRATEGY.md` for comprehensive testing philosophy.

## Development Rules

**CRITICAL: This project strictly follows Test-Driven Development (TDD).**

### Zero Tolerance for Test Failures

**We NEVER accept any test failures.** When tests fail:
1. **Analyze the issue** - Understand what the test expects vs what the code does
2. **Find the root cause** - Don't just fix symptoms, fix the underlying problem
3. **Fix properly** - Either fix the code to match the expected behavior, OR update the test if the design changed intentionally
4. **Verify** - Run full test suite to ensure no regressions

**If you change the design of the code, you MUST update the corresponding tests.** Tests and code must always be in sync. A "passing" test suite with skipped or ignored tests is not acceptable.

### Before Writing Any Code:
1. **Write a test plan** - Document ALL test cases in `TEST_PLANS.md` BEFORE writing any code
   - Happy path tests
   - Edge cases
   - Error conditions
   - Integration tests
   - End-to-end verification steps
2. **Write the tests** - Implement all test cases from the plan (they will fail - RED)
3. **Implement the feature** - Write minimal code to make tests pass (GREEN)
4. **Refactor** - Clean up code while keeping tests green (REFACTOR)
5. **End-to-end test** - Manually verify with `npx tsx index.ts`
6. **Document** - Update TEST_PLANS.md with implementation status

### After Writing Any Code:
1. **Always run `npm test`** - Verify all tests pass after any code changes
2. **Fix any failures** - Do not proceed until all tests are green
3. **For Rust changes** - Run `npm run build` before testing to recompile the native addon
4. **CRITICAL: Test end-to-end** - Always run the actual CLI (`npx tsx index.ts`) to verify features work in practice, not just in unit tests

### Test Planning:
**BEFORE writing any code:**
- Add test plan to `TEST_PLANS.md` using the template
- List ALL test cases (happy path, edge cases, errors, integration, E2E)
- Get clarity on expected behavior BEFORE implementation

### Test Guidelines:
- Tests are in `tests/` directory using Vitest
- E2E tests are in `tests/e2e/` directory (run separately)
- Test files mirror source structure (e.g., `tools.test.ts` tests `src/tools.ts`)
- Use mocking for external dependencies (fs, API calls, etc.)
- Each test should be isolated and independent
- **Write tests BEFORE implementation** (RED → GREEN → REFACTOR)

### E2E Test Infrastructure:
**Current Status**: 20 tests passing (100%), 12/17 tools covered (71%)

- **Location**: `tests/e2e/` directory
- **Helper**: `tests/e2e/helper.ts` - utilities for CLI process management
- **Test Files**: 7 focused files (2-4 tests each):
  - `file-tools.test.ts` - Glob, Grep, ListDirectory
  - `file-read-operations.test.ts` - ReadFile, ListDirectory
  - `search-operations.test.ts` - Search workflows
  - `code-analysis.test.ts` - InspectSymbol, GetImportsExports
  - `advanced-code-analysis.test.ts` - GetCodebaseMap, SearchCode
  - `multi-step-workflows.test.ts` - Complex workflows
  - `integration-scenarios.test.ts` - Real-world scenarios
- **Run Command**: `npm run test:e2e`
- **Features**:
  - Automatic process cleanup on test exit
  - Retry logic for flaky LLM responses (1 retry = 2 attempts)
  - Optimized timeouts (90s per test, 45s per attempt)
  - Sequential execution (no parallel)
  - 2-second delay between retries
  - API key validation with skip support

**Performance**:
- Fast execution: ~5.2 minutes for full suite
- 100% pass rate (20/20 tests)
- No thread hanging issues

See `docs/testing/E2E_TESTING_GUIDE.md` and `docs/testing/E2E_TEST_COVERAGE_PLAN.md` for details.

### End-to-End Testing:
**MANDATORY:** After implementing or modifying features, you MUST test the interactive CLI exactly as a user would:

**NOT end-to-end testing:**
- ❌ Running scripts that pipe input: `echo "hello" | npx tsx index.ts`
- ❌ Only running unit tests: `npm test`
- ❌ Testing individual functions in isolation

**ACTUAL end-to-end testing:**
- ✅ Start the CLI interactively: `npx tsx index.ts`
- ✅ Type queries manually and wait for responses
- ✅ Verify the REPL continues after each response
- ✅ Test multiple interactions in sequence
- ✅ Test error cases and edge cases interactively

**How to do proper E2E testing:**
```bash
export GEMINI_API_KEY=your_key_here
npx tsx index.ts

# Then type these queries one by one:
> hello
(wait for response, verify it works)
> what files are in src?
(wait for response, verify it works)
> show me package.json
(wait for response, verify it works)
> exit
(verify clean exit)
```

**What to verify:**
- REPL keeps prompting `>` after each response
- No crashes or error messages
- Responses are helpful and complete
- Tools are called when expected
- User can type multiple queries in one session

**Documentation**:
- `docs/testing/E2E_TESTING_GUIDE.md` - Comprehensive E2E testing procedures
- `docs/testing/TESTING_STRATEGY.md` - Three-layer testing philosophy
- `docs/development/TEST_PLAN_TEMPLATE.md` - Test plan templates

## Common Patterns

### Adding a New Tool

1. Add function declaration to `TOOLS` array in `src/tools.ts`
2. Add case to switch statement in `executeTool()`
3. If calling Rust, add exported function to `rust_engine/src/lib.rs` with `#[napi]` attribute
4. Rebuild with `npm run build`
5. Write tests in `tests/tools.test.ts`

### Modifying the Rust Engine

1. Edit `rust_engine/src/lib.rs`
2. Run `npm run build` to recompile
3. Test changes by running the CLI or via `npm test`

**Important:** The Rust code must be recompiled after any changes. The Node.js code loads the compiled `.node` file, not the source.

## Code Conventions

### File Naming
- **All files use `snake_case`**: `read_file.ts`, `tool_executor.ts`, `dataset_loader.ts`
- Test files mirror source structure: `src/tools/read_file.ts` → `tests/tools/read_file.test.ts`
- E2E test files use kebab-case: `file-tools.test.ts`, `code-analysis.test.ts`

### Code Style
- **Classes**: PascalCase (`Agent`, `ToolExecutor`, `FixtureManager`)
- **Functions/Methods**: camelCase (`executeTool()`, `runCase()`, `confirmChange()`)
- **Interfaces/Types**: PascalCase (`EvalCase`, `ToolResult`, `RunOptions`)
- **Variables**: camelCase (`fixtureManager`, `evalCase`, `testResults`)
- **Constants**: UPPER_SNAKE_CASE for true constants, camelCase for config objects

### Import Style
- Use ES Modules (`import`/`export`)
- Group imports: external packages first, then internal modules
- Use type imports where applicable: `import type { ToolResult } from './types'`

## File Structure Notes

- `*.js` files - Transpiled output (ignored by git, generated during build)
- `*.node` files - Compiled Rust addon (ignored by git, generated during build)
- `.gitignore` excludes:
  - `node_modules`, `target`, `dist`
  - `*.js` (transpiled TypeScript)
  - `*.node` (compiled Rust addons)
  - `*.log` files
- Source TypeScript is in `src/`, entry point is `index.ts`
- Documentation is in `docs/` directory (see README.md for full list)

## Documentation Organization

**IMPORTANT RULE:** All documentation files (*.md) must be placed in the `docs/` directory, with only two exceptions:
- `README.md` - Project overview and quick start (stays in root)
- `CLAUDE.md` - This file, instructions for Claude Code (stays in root)

All other documentation including:
- Architecture documents
- Testing guides
- Migration summaries
- Design documents
- Implementation plans
- API documentation

Must be created in or moved to the `docs/` directory to keep the repository root clean and organized.
