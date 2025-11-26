# Test Plans for CodeCraft Features

This document contains comprehensive test plans written BEFORE implementing features. This is the foundation of our TDD approach.

## Test Planning Philosophy

**BEFORE writing any code:**
1. Write a detailed test plan listing ALL test cases
2. Implement the tests (they will fail - RED)
3. Implement the feature to make tests pass - GREEN
4. Refactor if needed - REFACTOR
5. Run end-to-end tests to verify real-world usage

---

## Feature 1: edit_file Tool

**Purpose:** Efficiently edit files using string replacement instead of rewriting entire file.

### Test Plan (Written BEFORE Implementation)

**Happy Path Tests:**
1. ✅ Should replace old_string with new_string in a file
2. ✅ Should handle multiline replacements
3. ✅ Should preserve exact whitespace and indentation

**Edge Cases:**
4. ✅ Should return error when old_string not found
5. ✅ Should return error when file does not exist
6. ✅ Should replace only first occurrence by default (not all matches)

**Integration Tests:**
7. Should work with real file reads/writes (not just mocks)

**End-to-End Tests:**
8. Agent should use edit_file when asked to change code
9. Should show tool call in logs: `[Tool Call] edit_file(...)`

### Implementation Status
- ✅ All 6 unit tests written and passing
- ✅ Tool integrated into agent
- ✅ End-to-end verified

### Files
- Tests: `tests/edit_file.test.ts`
- Implementation: `src/tools.ts:85-95, 185-195`

---

## Feature 2: todo_write Tool

**Purpose:** Track multi-step tasks with status management.

### Test Plan (Written BEFORE Implementation)

**Happy Path Tests:**
1. ✅ Should accept array of todos and return confirmation
2. ✅ Should handle single todo
3. ✅ Should handle empty todos array

**Validation Tests:**
4. ✅ Should validate status values (pending|in_progress|completed)
5. ✅ Should require all required fields (content, status, activeForm)

**Status Tracking:**
6. ✅ Should show current task status breakdown (X completed, Y in progress, Z pending)

**Integration Tests:**
7. Should persist todos across agent calls
8. Should validate only one task is in_progress at a time (NOT IMPLEMENTED YET)

**End-to-End Tests:**
9. Agent should create todos for multi-step tasks (3+ steps)
10. Agent should mark todos as in_progress before starting
11. Agent should mark todos as completed after finishing

### Implementation Status
- ✅ 6/6 unit tests passing
- ⚠️ Missing: validation for "only one in_progress" rule
- ✅ End-to-end verified

### Files
- Tests: `tests/todo_write.test.ts`
- Implementation: `src/tools.ts:100-121, 196-222`

---

## Feature 3: read_file offset/limit Enhancement

**Purpose:** Support reading large files in chunks to manage token usage.

### Test Plan (Written BEFORE Implementation)

**Basic Functionality:**
1. ✅ Should read entire file when no offset/limit provided
2. ✅ Should read from offset to end when only offset provided
3. ✅ Should read limited lines from start when only limit provided
4. ✅ Should read range when both offset and limit provided

**Edge Cases:**
5. ✅ Should handle offset beyond file length (return empty)
6. ✅ Should handle limit larger than remaining lines
7. ✅ Should handle single line file
8. ✅ Should handle empty file

**Indexing:**
9. ✅ Should use 0-based offset (line 0 is first line)

**End-to-End Tests:**
10. Agent should use offset/limit when asked for specific line ranges
11. Should work with actual files, not just mocks

### Implementation Status
- ✅ All 9 unit tests passing
- ✅ End-to-end verified

### Files
- Tests: `tests/read_file.test.ts`
- Implementation: `src/tools.ts:135-157`

---

## Feature 4: Intent Classification

**Purpose:** Classify user queries into intent types to guide agent behavior.

### Test Plan (Written BEFORE Implementation)

**Intent Detection - Explain:**
1. ✅ "what is X" → explain
2. ✅ "how does X work" → explain
3. ✅ "show me X" → explain

**Intent Detection - Implement:**
4. ✅ "add X" → implement
5. ✅ "create X" → implement
6. ✅ "implement X" → implement

**Intent Detection - Refactor:**
7. ✅ "refactor X" → refactor
8. ✅ "improve X" → refactor

**Intent Detection - Debug:**
9. ✅ "fix X" → debug
10. ✅ "debug X" → debug

**Intent Detection - Test:**
11. ✅ "test X" → test
12. ✅ "write tests" → test

**Intent Detection - Analyze:**
13. ✅ "analyze X" → analyze
14. ✅ "review X" → analyze

**Entity Extraction:**
15. ✅ Should detect file mentions (e.g., src/agent.ts)
16. ✅ Should detect function/class names (e.g., Agent)

**Scope Detection:**
17. ✅ Single file for one file mention
18. ✅ Multi-file for multiple file mentions
19. ✅ Whole project for broad requests

**Fallback:**
20. ✅ Should handle ambiguous requests with default intent

### Implementation Status
- ✅ All 20 tests passing
- ✅ Integrated into agent (logs intent before each query)
- ✅ End-to-end verified

### Files
- Tests: `tests/intent_classifier.test.ts`
- Implementation: `src/intent_classifier.ts`
- Integration: `src/agent.ts:114-115`

---

## Feature 5: Production System Prompt

**Purpose:** Guide agent to be concise, use tools proactively, and follow TDD workflow.

### Test Plan (Written BEFORE Implementation)

**Behavior Tests:**
1. ⚠️ Should produce concise responses (< 4 lines for simple queries)
2. ⚠️ Should use tools proactively when asked about files/code
3. ⚠️ Should NOT return empty responses
4. ⚠️ Should create todos for multi-step tasks

**Tool Usage:**
5. ✅ Should call read_file when asked about file contents
6. ✅ Should call edit_file when asked to change code
7. ✅ Should call run_command when asked to execute commands

**Verification:**
8. ⚠️ Should run tests after making code changes (NOT TESTED)

**End-to-End Tests:**
9. ✅ Should answer questions helpfully
10. ✅ Should not crash or give empty responses
11. ✅ Should show tool calls in logs

### Implementation Status
- ✅ System prompt written and working
- ⚠️ Behavioral tests not implemented (hard to test LLM behavior)
- ✅ End-to-end verified manually

### Files
- Implementation: `src/agent.ts:24-49`

---

## Feature 6: Test Verification Workflow

**Purpose:** Document and enforce testing after code changes.

### Test Plan (Written BEFORE Implementation)

**Documentation Tests:**
1. ✅ Should define workflow steps
2. ✅ Should specify when to use todo_write
3. ✅ Should specify when to run tests
4. ✅ Should include code quality checks

**Integration Tests:**
5. ⚠️ Agent should run tests after making code changes (NOT ENFORCED)
6. ⚠️ Agent should report test failures (NOT TESTED)

**End-to-End Tests:**
7. ✅ Documentation exists and is comprehensive
8. ⚠️ Workflow is followed in practice (MANUAL VERIFICATION ONLY)

### Implementation Status
- ✅ Documentation complete (WORKFLOW.md)
- ✅ Workflow tests define the process
- ⚠️ No automated enforcement of workflow

### Files
- Documentation: `WORKFLOW.md`
- Tests: `tests/workflow.test.ts`

---

## Test Coverage Summary

| Feature | Unit Tests | Integration Tests | E2E Tests | Status |
|---------|-----------|-------------------|-----------|--------|
| edit_file | 6/6 ✅ | N/A | ✅ | Complete |
| todo_write | 6/6 ✅ | 0/2 ⚠️ | ✅ | Mostly complete |
| read_file offset/limit | 9/9 ✅ | N/A | ✅ | Complete |
| Intent classification | 20/20 ✅ | N/A | ✅ | Complete |
| System prompt | 0/8 ⚠️ | 3/3 ✅ | ✅ | Needs behavioral tests |
| Test workflow | 4/4 ✅ | 0/2 ⚠️ | ⚠️ | Documentation only |

**Total: 60 tests passing**

---

## Missing Tests (Technical Debt)

### High Priority
1. **todo_write validation:** Should enforce only one task in_progress at a time
2. **Agent test verification:** Should run `npm test` after code changes automatically

### Medium Priority
3. **System prompt behavior:** Quantitative tests for response length, tool usage frequency
4. **Error handling:** Test all tools with malformed inputs
5. **Workflow enforcement:** Automated checks that agent follows workflow

### Low Priority
6. **Performance tests:** Tool execution speed, large file handling
7. **Integration tests:** Multi-tool workflows (grep → read → edit)

---

## Test Plan Template for New Features

```markdown
## Feature: [Feature Name]

**Purpose:** [What does this feature do?]

### Test Plan (Written BEFORE Implementation)

**Happy Path Tests:**
1. [ ] Test case 1
2. [ ] Test case 2

**Edge Cases:**
3. [ ] Test case 3
4. [ ] Test case 4

**Error Handling:**
5. [ ] Test case 5

**Integration Tests:**
6. [ ] Test case 6

**End-to-End Tests:**
7. [ ] Test case 7

### Implementation Checklist
- [ ] Write all test cases (RED)
- [ ] Implement feature (GREEN)
- [ ] Refactor if needed (REFACTOR)
- [ ] Run end-to-end manual tests
- [ ] Update documentation

### Files
- Tests: `tests/[feature].test.ts`
- Implementation: `src/[file].ts:[lines]`
```

---

## Test-First Development Process

### Step 1: Plan Tests (THIS DOCUMENT)
Write comprehensive test plan covering:
- Happy path
- Edge cases
- Error conditions
- Integration scenarios
- End-to-end verification

### Step 2: Write Tests (RED)
Implement all tests from the plan. They should ALL fail initially.

```bash
npm test  # Should show FAILURES
```

### Step 3: Implement Feature (GREEN)
Write minimal code to make tests pass.

```bash
npm test  # Should show SUCCESS
```

### Step 4: Refactor (REFACTOR)
Clean up implementation while keeping tests green.

### Step 5: End-to-End Test (VERIFY)
**CRITICAL:** Test the actual product interactively as a real user would.

**WRONG way (not E2E):**
```bash
echo "test" | npx tsx index.ts  # This is NOT how users use it!
```

**CORRECT way (actual E2E):**
```bash
npx tsx index.ts
# Then TYPE queries manually:
> [test query 1]
(wait for response)
> [test query 2]
(wait for response)
> exit
```

**What to verify:**
- REPL continues after each response (doesn't exit)
- Feature works as expected
- No crashes or errors
- User experience is smooth

### Step 6: Document
Update:
- CLAUDE.md (if architecture changed)
- TESTING.md (if testing instructions changed)
- This file (TEST_PLANS.md) with implementation status

---

## Current Week 1 Status

✅ **Completed Features:**
- edit_file tool (6 tests)
- todo_write tool (6 tests)
- read_file enhancement (9 tests)
- Intent classification (20 tests)
- Production system prompt
- Workflow documentation

⚠️ **Technical Debt:**
- Missing behavioral tests for system prompt
- Missing workflow enforcement tests
- Missing todo_write validation for "one in_progress" rule

**Next:** Week 2 - Search & Discovery (glob, grep, list_directory)

---

## Week 2: Search & Discovery

---

## Feature 7: glob Tool

**Purpose:** Find files matching glob patterns (e.g., `**/*.ts`, `src/**/*.tsx`) for efficient file discovery.

### Test Plan (Written BEFORE Implementation)

**Happy Path Tests:**
1. ✅ Should find all TypeScript files with `**/*.ts`
2. ✅ Should find files in specific directory with `src/*.ts`
3. ✅ Should find files with multiple extensions `**/*.{ts,tsx}`
4. ✅ Should return empty array when no matches

**Edge Cases:**
5. ✅ Should ignore node_modules by default
6. ✅ Should ignore hidden files (starting with `.`) by default
7. ✅ Should handle non-existent directory gracefully
8. ✅ Should work with relative paths

**Pattern Tests:**
9. ✅ Should support `*` wildcard (single level)
10. ✅ Should support `**` wildcard (recursive)
11. ✅ Should support `?` wildcard (single character)
12. ✅ Should support brace expansion `{ts,js}`

**Integration Tests:**
13. ✅ Should work with real filesystem (not just mocks)
14. ⚠️ Agent should use glob to find files before reading (needs E2E)

**End-to-End Tests:**
15. ⚠️ Ask agent "find all test files" → should use glob (needs E2E)
16. ✅ Verify tool call appears in logs: `[Tool Call] glob(...)`

### Implementation Status
- ✅ All 12 unit tests passing
- ✅ Tool integrated into agent
- ⚠️ E2E verification pending

### Files
- Tests: `tests/glob.test.ts`
- Implementation: `src/tools.ts:124-133, 269-279`

---

## Feature 8: grep Tool

**Purpose:** Search file contents using regex patterns (ripgrep-style).

### Test Plan (Written BEFORE Implementation)

**Happy Path Tests:**
1. ✅ Should find lines matching a simple string
2. ✅ Should find lines matching a regex pattern
3. ✅ Should return file path and line number with matches
4. ✅ Should search recursively by default

**Options Tests:**
5. ✅ Should support case-insensitive search (`-i`)
6. ⚠️ Should support showing context lines (`-C`) - NOT IMPLEMENTED
7. ✅ Should support file pattern filtering (`--include`)
8. ✅ Should return empty array when no matches

**Edge Cases:**
9. ✅ Should ignore node_modules by default
10. ✅ Should ignore binary files (skipped automatically)
11. ✅ Should handle non-existent directory gracefully
12. ✅ Should handle invalid regex gracefully

**Integration Tests:**
13. ✅ Should work with real filesystem
14. ⚠️ Agent should use grep before edit_file (needs E2E)

**End-to-End Tests:**
15. ⚠️ Ask agent "find where executeTool is defined" → should use grep (needs E2E)
16. ✅ Verify matches are accurate and useful

### Implementation Status
- ✅ All 10 unit tests passing
- ✅ Tool integrated into agent
- ⚠️ E2E verification pending
- ⚠️ Context lines (-C) not implemented

### Files
- Tests: `tests/grep.test.ts`
- Implementation: `src/tools.ts:135-148, 280-341`

---

## Feature 9: list_directory Tool

**Purpose:** List contents of a directory with metadata (type, size).

### Test Plan (Written BEFORE Implementation)

**Happy Path Tests:**
1. ✅ Should list files in a directory
2. ✅ Should list subdirectories
3. ✅ Should include file/directory type indicator
4. ✅ Should work with current directory (`.`)

**Edge Cases:**
5. ✅ Should handle non-existent directory
6. ⚠️ Should handle empty directory - NOT TESTED
7. ⚠️ Should handle permission errors gracefully - NOT TESTED
8. ✅ Should not recurse by default (single level only)

**Output Format:**
9. ✅ Should clearly distinguish files from directories
10. ✅ Should sort entries alphabetically

**Integration Tests:**
11. ✅ Should work with real filesystem
12. ⚠️ Agent should use list_directory to explore structure (needs E2E)

**End-to-End Tests:**
13. ⚠️ Ask agent "what's in src folder" → should use list_directory (needs E2E)
14. ⚠️ Verify output is clear and useful (needs E2E)

### Implementation Status
- ✅ All 8 unit tests passing
- ✅ Tool integrated into agent
- ⚠️ E2E verification pending

### Files
- Tests: `tests/list_directory.test.ts`
- Implementation: `src/tools.ts:149-159, 343-365`

---

## Week 2 Summary

| Tool | Unit Tests | Status |
|------|-----------|--------|
| glob | 12/12 ✅ | Complete |
| grep | 10/10 ✅ | Complete |
| list_directory | 8/8 ✅ | Complete |

**Total: 30 new tests, 91 total tests passing**

---

## Week 3: Smart Context Selection + AST Power

---

## Feature 10: get_symbol_info Tool

**Purpose:** Get detailed information about a symbol (function, class, interface) using AST parsing. Returns type info, parameters, return type, and location.

### Test Plan

**Happy Path Tests:**
1. ✅ Should return info for a function (name, kind, signature, line)
2. ✅ Should return info for a class
3. ✅ Should return info for an interface
4. ✅ Should return parameters for functions (in signature)
5. ⚠️ Should return return type when available - IN SIGNATURE

**Edge Cases:**
6. ✅ Should return error when symbol not found
7. ✅ Should return error when file not found
8. ⚠️ Should handle multiple symbols with same name - RETURNS FIRST
9. ✅ Should work with TypeScript files
10. ⚠️ Should work with Rust files - IMPLEMENTED BUT NOT TESTED

**Output Format:**
11. ✅ Should return structured JSON with: name, kind, signature, line, file
12. ⚠️ Should include parameters array - IN SIGNATURE STRING

### Implementation Status
- ✅ All 8 unit tests passing
- ✅ Rust AST parsing implemented
- ✅ Tool integrated into agent

### Files
- Tests: `tests/get_symbol_info.test.ts`
- Rust: `rust_engine/src/lib.rs`
- Node: `src/tools.ts`

---

## Feature 11: get_imports_exports Tool

**Purpose:** Analyze a file's imports and exports using AST. Understand dependencies without grep.

### Test Plan

**Happy Path Tests:**
1. ✅ Should return imports from a TypeScript file
2. ✅ Should return exports from a TypeScript file
3. ✅ Should identify named imports `{ foo, bar }`
4. ✅ Should identify default imports
5. ✅ Should identify namespace imports `* as foo`

**Export Tests:**
6. ✅ Should identify named exports
7. ⚠️ Should identify default exports - IMPLEMENTED
8. ⚠️ Should identify re-exports - NOT IMPLEMENTED

**Edge Cases:**
9. ✅ Should return empty arrays when no imports/exports
10. ✅ Should return error when file not found
11. ✅ Should handle relative imports `./foo`
12. ✅ Should handle package imports `lodash`

**Output Format:**
13. ✅ Imports: `[{ source, symbols, isDefault, isNamespace }]`
14. ✅ Exports: `[{ name, kind, isDefault }]`

### Implementation Status
- ✅ All 12 unit tests passing
- ✅ Rust AST parsing implemented
- ✅ Tool integrated into agent

### Files
- Tests: `tests/get_imports_exports.test.ts`
- Rust: `rust_engine/src/lib.rs`
- Node: `src/tools.ts`

---

## Week 3 Summary (AST Tools)

| Tool | Unit Tests | Status |
|------|-----------|--------|
| get_symbol_info | 8/8 ✅ | Complete |
| get_imports_exports | 12/12 ✅ | Complete |

**Total: 20 new tests, 111 total tests passing**

---

## Feature 12: build_dependency_graph Tool ✅

**Purpose:** Build a project-wide import/export dependency graph. Track which files import which.

### Test Plan (Written BEFORE Implementation)

**Happy Path Tests:**
1. [x] Should return dependency graph for a directory
2. [x] Should identify all imports for each file
3. [x] Should identify all exports for each file
4. [x] Should resolve relative imports to full paths

**Graph Structure Tests:**
5. [x] Should support forward lookup (file → what it imports)
6. [x] Should support reverse lookup (file → what imports it)
7. [x] Should handle circular dependencies gracefully

**Edge Cases:**
8. [x] Should mark node_modules imports as external
9. [x] Should handle missing files gracefully
10. [x] Should return error for non-existent directory

**Output Format:**
11. [x] Should return JSON with nodes (files) and edges (imports)
12. [x] Should include file path and exports in each node
13. [x] Each edge should have: from, to, symbols

### Implementation Status
- [x] Tests written (RED) - 13 tests
- [x] Implementation complete (GREEN)
- [x] Integrated into agent

### Files
- Tests: `tests/dependency_graph.test.ts`
- Rust: `rust_engine/src/lib.rs:596-670`
- Node: `src/tools.ts:464-485`

---

## Feature 13: resolve_symbol Tool ✅

**Purpose:** Find where a symbol is defined, given its usage location.

### Test Plan (Written BEFORE Implementation)

**Happy Path Tests:**
1. [x] Should resolve locally defined function
2. [x] Should resolve imported symbol to source file
3. [x] Should resolve class/interface definitions
4. [x] Should return file path and line number

**Import Resolution Tests:**
5. [x] Should resolve named imports `{ foo }`
6. [x] Should resolve default imports
7. [x] Should resolve namespace imports `* as lib`

**Edge Cases:**
8. [x] Should return error when symbol not found
9. [x] Should handle file not found
10. [x] Should handle external packages (return package name)

**Output Format:**
11. [x] Should return structured JSON with file, line, kind

### Implementation Status
- [x] Tests written (RED) - 11 tests
- [x] Implementation complete (GREEN)
- [x] Integrated into agent

### Files
- Tests: `tests/resolve_symbol.test.ts`
- Rust: `rust_engine/src/lib.rs:698-785`
- Node: `src/tools.ts:486-505`

---

## Feature 14: find_references Tool ✅

**Purpose:** Find all usages of a symbol across the codebase.

### Test Plan (Written BEFORE Implementation)

**Happy Path Tests:**
1. [x] Should find all usages of a function
2. [x] Should find all usages of a class
3. [x] Should find all usages of a variable/constant
4. [x] Should return file, line, column for each reference

**Search Scope Tests:**
5. [x] Should search entire project by default
6. [x] Should support limiting to specific directory
7. [x] Should find both definitions and usages

**Edge Cases:**
8. [x] Should return empty array when no references found
9. [x] Should handle symbols with same name in different scopes
10. [x] Should exclude node_modules
11. [x] Should return error for non-existent path

**Output Format:**
12. [x] Should return array of references
13. [x] Context should show the line of code

### Implementation Status
- [x] Tests written (RED) - 13 tests
- [x] Implementation complete (GREEN)
- [x] Integrated into agent

### Files
- Tests: `tests/find_references.test.ts`
- Rust: `rust_engine/src/lib.rs:787-905`
- Node: `src/tools.ts:506-523`

---

## Week 3 Remaining Summary ✅ COMPLETED

| Tool | Unit Tests | Status |
|------|-----------|--------|
| build_dependency_graph | 13/13 ✅ | Complete |
| resolve_symbol | 11/11 ✅ | Complete |
| find_references | 13/13 ✅ | Complete |

**Total: 37 new tests, 148 total tests passing**

---

# Week 4: Verification & Quality

## Feature 15: delete_file Tool ✅

**Purpose:** Delete a file with safety confirmation. Prevent accidental deletions.

### Test Plan (Written BEFORE Implementation)

**Happy Path Tests:**
1. [x] Should delete an existing file
2. [x] Should return success message after deletion
3. [x] Should work with relative paths
4. [x] Should work with absolute paths

**Safety Tests:**
5. [x] Should return error when file does not exist
6. [x] Should return error when path is a directory
7. [x] Should not delete files with dangerous paths (path traversal)

**Output Format:**
8. [x] Should return confirmation message with file path

### Implementation Status
- [x] Tests written (RED) - 8 tests
- [x] Implementation complete (GREEN)
- [x] Integrated into agent
- [x] E2E verified

### Files
- Tests: `tests/delete_file.test.ts`
- Implementation: `src/tools.ts:557-579`

---

## Feature 16: detect_project_type Tool ✅

**Purpose:** Detect project type (Node, Rust, Python, etc.) and tooling configuration.

### Test Plan (Written BEFORE Implementation)

**Happy Path Tests:**
1. [x] Should detect Node.js project (package.json exists)
2. [x] Should detect Rust project (Cargo.toml exists)
3. [x] Should detect TypeScript usage
4. [x] Should detect mixed projects (multiple indicators)

**Framework Detection:**
5. [x] Should detect test framework (vitest, jest, pytest, cargo test)
6. [x] Should detect linter (eslint, prettier, rustfmt, pylint)
7. [x] Should detect package manager (npm, yarn, pnpm)

**Edge Cases:**
8. [x] Should return unknown for directory without project files
9. [x] Should return error for non-existent path

**Output Format:**
10. [x] Should return JSON with type, testFramework, linter fields

### Implementation Status
- [x] Tests written (RED) - 10 tests
- [x] Implementation complete (GREEN)
- [x] Integrated into agent
- [x] E2E verified

### Files
- Tests: `tests/detect_project_type.test.ts`
- Implementation: `src/tools.ts:580-656`

---

## Feature 17: extract_conventions Tool ✅

**Purpose:** Extract coding conventions from existing codebase (naming, style, patterns).

### Test Plan (Written BEFORE Implementation)

**Naming Convention Tests:**
1. [x] Should detect camelCase naming for functions
2. [x] Should detect PascalCase for classes
3. [x] Should detect constant naming style

**Style Detection:**
4. [x] Should detect indentation style (spaces vs tabs)
5. [x] Should detect indent size (2 or 4 spaces)
6. [x] Should detect quote style (single vs double)
7. [x] Should detect semicolon usage

**Pattern Detection:**
8. [x] Should detect test file location (tests/, __tests__, *.test.ts)
9. [x] Should detect test naming pattern

**Edge Cases:**
10. [x] Should handle directory with few files
11. [x] Should return error for non-existent path

**Output Format:**
12. [x] Should return JSON with naming and style fields

### Implementation Status
- [x] Tests written (RED) - 12 tests
- [x] Implementation complete (GREEN)
- [x] Integrated into agent
- [x] E2E verified

### Files
- Tests: `tests/extract_conventions.test.ts`
- Implementation: `src/tools.ts:657-770`

---

## Week 4 Summary ✅ COMPLETED

| Tool | Unit Tests | Status |
|------|-----------|--------|
| delete_file | 8/8 ✅ | Complete |
| detect_project_type | 10/10 ✅ | Complete |
| extract_conventions | 12/12 ✅ | Complete |

**Total: 30 new tests, 178 total tests passing**
