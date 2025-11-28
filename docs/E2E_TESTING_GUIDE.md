# Comprehensive End-to-End Testing Guide

**Last Updated:** 2025-11-27
**Purpose:** Manual and automated E2E testing procedures for CodeCraft

## Quick Start

### Prerequisites
```bash
export GEMINI_API_KEY=your_key_here
npm run build  # Build Rust engine
```

### Run Automated E2E Tests
```bash
npm run test:e2e  # Run all E2E tests
```

### Run All Tests (Unit + E2E)
```bash
npm run test:all
```

### Run Manual Interactive Testing
```bash
npx tsx index.ts
```

## E2E Test Infrastructure

### Directory Structure
```
tests/e2e/
├── helper.ts              # Shared utilities (runCLI, cleanup, retry)
├── file_tools.test.ts     # File operation tests (glob, grep, list_directory)
└── code_analysis.test.ts  # Code analysis tests (inspect_symbol, get_imports_exports)
```

### Helper Utilities (`tests/e2e/helper.ts`)
- `runCLI(query, timeoutMs)` - Execute CLI with query and capture output
- `runCLIWithRetry(query, retries, timeoutMs)` - Retry for flaky LLM responses
- `cleanupProcesses()` - Kill all spawned CLI processes
- `skipIfNoAPIKey()` - Skip tests when GEMINI_API_KEY not set
- `hasAPIKey()` - Check if API key is available

### Configuration (`vitest.e2e.config.ts`)
- Test timeout: 120 seconds per test
- Hook timeout: 60 seconds
- Sequential execution (no parallel tests)
- Longer teardown timeout for process cleanup

## Manual Testing Scenarios

### 1. Basic File Operations

#### Test: Read File
```
User: Read the package.json file
Expected: Agent calls read_file tool, shows package.json content
Verify:
  - [Tool Call] read_file appears
  - Content includes "codecraft" and version
  - Response is properly formatted
```

#### Test: List Directory
```
User: List files in the src directory
Expected: Agent calls list_directory tool
Verify:
  - [Tool Call] list_directory appears
  - Lists agent.ts, tool-setup.ts, etc.
  - Hidden files are filtered
```

#### Test: Write File
```
User: Create a file test.txt with content "Hello World"
Expected: Agent calls write_file tool
Verify:
  - [Tool Call] write_file appears
  - Asks for confirmation if file exists
  - File is created with correct content
Cleanup: Delete test.txt manually
```

#### Test: Edit File
```
User: In test.txt, replace "Hello" with "Hi"
Expected: Agent calls edit_file tool
Verify:
  - [Tool Call] edit_file appears
  - File content is updated correctly
```

#### Test: Delete File
```
User: Delete test.txt
Expected: Agent calls delete_file tool
Verify:
  - [Tool Call] delete_file appears
  - File is removed
  - Handles non-existent files gracefully
```

### 2. Search and Discovery

#### Test: Glob Pattern Search
```
User: Find all TypeScript test files using glob
Expected: Agent calls glob tool with pattern **/*.test.ts
Verify:
  - [Tool Call] glob appears
  - Lists files from tests/ directory
  - Respects ignore patterns (no node_modules)
```

#### Test: Content Search (grep)
```
User: Search for "Agent" in all src files using grep
Expected: Agent calls grep tool
Verify:
  - [Tool Call] grep appears
  - Shows file paths and line numbers
  - Highlights matching lines
```

#### Test: AST Code Search
```
User: Use search_code to find all class definitions
Expected: Agent calls search_code (Rust engine)
Verify:
  - [Tool Call] search_code appears
  - Returns AST-based results
  - More accurate than grep for code structures
```

### 3. Code Analysis

#### Test: Get Codebase Map
```
User: Show me the codebase structure using get_codebase_map
Expected: Agent calls get_codebase_map (Rust engine)
Verify:
  - [Tool Call] get_codebase_map appears
  - Shows function signatures, classes, exports
  - No method bodies (signatures only)
```

#### Test: Symbol Information
```
User: Get information about the TOOLS constant in src/tool-setup.ts
Expected: Agent calls get_symbol_info (Rust engine)
Verify:
  - [Tool Call] get_symbol_info appears
  - Shows type, location, signature
  - Returns accurate line numbers
```

#### Test: Import/Export Analysis
```
User: Analyze what src/agent.ts imports and exports
Expected: Agent calls get_imports_exports (Rust engine)
Verify:
  - [Tool Call] get_imports_exports appears
  - Lists all imports with sources
  - Lists all exports
  - Distinguishes named, default, namespace imports
```

#### Test: Dependency Graph
```
User: Build a dependency graph for the project
Expected: Agent calls build_dependency_graph (Rust engine)
Verify:
  - [Tool Call] build_dependency_graph appears
  - Shows nodes (files) and edges (dependencies)
  - Supports reverse lookup
```

#### Test: Symbol Resolution
```
User: Where is SchemaType defined?
Expected: Agent calls resolve_symbol (Rust engine)
Verify:
  - [Tool Call] resolve_symbol appears
  - Follows imports to find definition
  - Indicates if external package
```

#### Test: Find References
```
User: Find all usages of the executor variable
Expected: Agent calls find_references (Rust engine)
Verify:
  - [Tool Call] find_references appears
  - Lists all files that use the symbol
  - Shows line numbers and context
```

### 4. Project Analysis

#### Test: Detect Project Type
```
User: What type of project is this?
Expected: Agent calls detect_project_type
Verify:
  - [Tool Call] detect_project_type appears
  - Detects: node, typescript, hybrid (node+rust)
  - Identifies test framework (vitest)
  - Identifies linter (eslint)
  - Identifies package manager (npm/yarn/pnpm)
```

#### Test: Extract Conventions
```
User: What are the coding conventions in this project?
Expected: Agent calls extract_conventions
Verify:
  - [Tool Call] extract_conventions appears
  - Reports quote style (single/double)
  - Reports indentation (spaces/tabs, size)
  - Reports semicolon usage
  - Reports test location and patterns
```

#### Test: Project Overview
```
User: Give me a project overview
Expected: Agent calls get_project_overview
Verify:
  - [Tool Call] get_project_overview appears
  - Reads package.json, README.md, CLAUDE.md
  - Provides purpose, tech stack, architecture
  - Lists entry points
  - Shows usage instructions
```

### 5. Command Execution

#### Test: Simple Command
```
User: Run the command "echo hello world"
Expected: Agent calls run_command
Verify:
  - [Tool Call] run_command appears
  - Shows first 3 lines of output
  - Executes successfully
```

#### Test: List Files via Command
```
User: Use run_command to list files in src
Expected: Agent calls run_command with "ls src"
Verify:
  - [Tool Call] run_command appears
  - Shows directory contents
  - Matches actual file structure
```

### 6. Task Management

#### Test: Multi-Step Task Tracking
```
User: Create a plan to refactor the agent
Expected: Agent calls todo_write
Verify:
  - [Tool Call] todo_write appears
  - Creates multiple tasks
  - Shows status breakdown (X completed, Y in progress, Z pending)
  - Tracks each step
```

### 7. Multi-Tool Workflows

#### Test: Sequential Tool Use
```
User: First list files in src, then read agent.ts
Expected: Agent calls list_directory, then read_file
Verify:
  - [Tool Call] list_directory appears first
  - [Tool Call] read_file appears second
  - Agent maintains context between calls
  - Final response incorporates both results
```

#### Test: Question Answering
```
User: What is the Agent class and where is it defined?
Expected: Agent chooses appropriate tools
Verify:
  - Uses search_code or get_symbol_info
  - May use grep as fallback
  - Provides accurate answer with file and line
  - Response is conversational
```

#### Test: Refactoring Support
```
User: I want to rename the executor - show me where it's used
Expected: Agent calls find_references
Verify:
  - [Tool Call] find_references appears
  - Lists all usages across codebase
  - Includes tests and source files
  - Helps plan safe refactoring
```

### 8. Error Handling

#### Test: Non-Existent File
```
User: Read the file that-does-not-exist.txt
Expected: Agent calls read_file, returns error
Verify:
  - [Tool Call] read_file appears
  - Error message is clear: "File not found"
  - Agent explains the issue
  - REPL continues working
```

#### Test: Invalid Path
```
User: Delete ../../../etc/passwd
Expected: Agent calls delete_file, blocks path traversal
Verify:
  - [Tool Call] delete_file appears
  - Returns security error
  - Path traversal blocked
  - System protected
```

#### Test: Directory vs File
```
User: Delete the src directory
Expected: Agent calls delete_file, returns error
Verify:
  - [Tool Call] delete_file appears
  - Error: Cannot delete directory
  - Suggests using run_command with rm -r
```

### 9. Session Management

#### Test: Context Maintenance
```
User: Read package.json
(wait for response)
User: What's the project name?
Expected: Agent remembers previous read
Verify:
  - May not need to re-read file
  - Answers from context
  - Maintains conversation flow
```

#### Test: Clear Session
```
User: /clear
Expected: Session resets
Verify:
  - Chat history cleared
  - Fresh conversation starts
  - Previous context forgotten
```

#### Test: Help Command
```
User: /help
Expected: Shows help message
Verify:
  - Lists available commands
  - Explains tool usage
  - No errors
```

#### Test: Exit
```
User: exit
Expected: Clean shutdown
Verify:
  - Agent says goodbye
  - Process terminates
  - No errors or hangs
```

### 10. Tool Selection Intelligence

#### Test: Grep vs Search Code
```
Setup: Ask questions that should trigger different tools

User: Find error messages containing "not found"
Expected: Uses grep (text search)

User: Find all class definitions
Expected: Uses search_code (AST search)

Verify:
  - Agent chooses correct tool for task
  - grep for text/strings/logs
  - search_code for code structures
```

## Automated Test Execution

### Run All E2E Tests
```bash
npm run test:e2e
```

### Run Specific Test File
```bash
npx vitest run --config vitest.e2e.config.ts tests/e2e/file_tools.test.ts
```

### Run Single Test by Name
```bash
npx vitest run --config vitest.e2e.config.ts -t "should find test files"
```

## Performance Testing

### Response Time
- Simple queries: < 5 seconds
- File reads: < 3 seconds
- Code search: < 10 seconds
- Complex analysis: < 30 seconds

### Memory Usage
- Monitor with: `node --expose-gc --max-old-space-size=4096 index.ts`
- Should stay under 500MB for typical sessions

### Tool Execution Stats
- Access via executor.getStats()
- Check average execution time per tool
- Identify slow operations

## Debugging E2E Issues

### Enable Debug Logging
```bash
export DEBUG=true
npx tsx index.ts
```

### Check Tool Execution
- Look for `[Tool Call]` markers
- Verify tool parameters
- Check tool results

### Common Issues

**Issue: No response from agent**
- Check GEMINI_API_KEY is set
- Verify network connection
- Check API rate limits

**Issue: Tool not called**
- Query may be ambiguous
- Try being more specific
- Explicitly mention tool name

**Issue: Rust engine errors**
- Run `npm run build` to recompile
- Check .node file exists
- Verify file permissions

**Issue: File not found errors**
- Verify paths are relative to project root
- Check file actually exists
- Check for typos

## Best Practices

### Writing Good Queries
✅ Good: "Use glob to find all .test.ts files in tests/"
✅ Good: "Read src/agent.ts"
✅ Good: "Search for 'executor' using grep"

❌ Bad: "Find stuff"
❌ Bad: "Look at files"
❌ Bad: "Do something with code"

### Multi-Step Workflows
- Break complex tasks into steps
- Use todo_write for planning
- Verify each step before proceeding

### Error Recovery
- If tool fails, try different approach
- Rust engine tools may need fallback to grep
- Check file paths and permissions

## Success Criteria

E2E testing is successful when:

1. ✅ All file operations work (read, write, edit, delete, list)
2. ✅ Search tools function correctly (glob, grep, search_code)
3. ✅ Code analysis tools return accurate results
4. ✅ Project analysis tools detect correct information
5. ✅ Commands execute successfully
6. ✅ Multi-tool workflows complete
7. ✅ Error handling is graceful
8. ✅ Session management works (context, clear, exit)
9. ✅ Tool selection is intelligent
10. ✅ Performance is acceptable

## Troubleshooting

### If Tests Fail

1. **Check environment:**
   ```bash
   echo $GEMINI_API_KEY
   ls rust_engine.linux-x64-gnu.node
   ```

2. **Rebuild Rust engine:**
   ```bash
   npm run build
   ```

3. **Clear any test artifacts:**
   ```bash
   rm -f test*.txt test*.ts
   ```

4. **Run tests with verbose output:**
   ```bash
   npm test -- e2e-comprehensive.test.ts --reporter=verbose
   ```

5. **Test manually:**
   ```bash
   npx tsx index.ts
   ```

## Continuous Integration

Add to CI pipeline:
```yaml
- name: Unit Tests
  run: npm test

- name: E2E Tests
  run: |
    export GEMINI_API_KEY=${{ secrets.GEMINI_API_KEY }}
    npm run build
    npm run test:e2e
```

---

**For comprehensive test coverage, run both automated E2E tests AND manual testing scenarios.**
