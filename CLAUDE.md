# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
npm test
```
Runs the full test suite using Vitest.

**Running Tests in Watch Mode:**
```bash
npx vitest
```

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

**Available Tools:**
- `read_file(path, offset?, limit?)` - Reads file content (supports partial reads)
- `write_file(path, content)` - Writes to file (shows diff and prompts for confirmation if file exists)
- `edit_file(path, old_string, new_string)` - Efficient string replacement editing
- `run_command(command)` - Executes shell commands (shows first 1-3 lines of output to user immediately)
- `get_codebase_map(path)` - Generates AST-based skeleton via Rust engine
- `search_code(query, path?)` - Fuzzy searches symbols via Rust engine
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
- `/save` - Dumps chat history as JSON
- `exit` - Quits the application (handled in `index.ts`)

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

## Development Rules

**CRITICAL: This project strictly follows Test-Driven Development (TDD).**

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
- Test files mirror source structure (e.g., `tools.test.ts` tests `src/tools.ts`)
- Use mocking for external dependencies (fs, API calls, etc.)
- Each test should be isolated and independent
- **Write tests BEFORE implementation** (RED → GREEN → REFACTOR)

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

See `TESTING.md` for detailed testing instructions.
See `TEST_PLANS.md` for all feature test plans and the TDD process.

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
