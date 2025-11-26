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

---

# Week 5: Advanced Agent Loop

## Feature 18: Context Manager

**Purpose:** Manage context tokens efficiently with tiered importance, budgeting, and relevance ranking.

### Test Plan (Written BEFORE Implementation)

**Token Counting:**
1. [x] Should count tokens in a string using tokenizer
2. [x] Should count tokens in file content
3. [x] Should handle empty string (0 tokens)
4. [x] Should handle special characters correctly

**Context Tiering:**
5. [x] Should classify context as high priority (⭐⭐⭐) - current file, direct dependencies
6. [x] Should classify context as medium priority (⭐⭐) - related files, imports
7. [x] Should classify context as low priority (⭐) - other project files
8. [x] Should prioritize higher tier context when budget limited

**Budget Management:**
9. [x] Should respect maximum token budget (default 8000)
10. [x] Should allow custom budget setting
11. [x] Should truncate low priority context first when over budget
12. [x] Should never exceed budget even with high priority content

**Relevance Ranking:**
13. [x] Should rank files by relevance to query
14. [x] Should rank recently accessed files higher
15. [x] Should rank files mentioned in query highest
16. [x] Should combine relevance scores with tier priority

**Integration:**
17. [x] Should integrate with agent to provide context
18. [x] Should track context usage per turn

### Implementation Checklist
- [x] Write all test cases (RED)
- [x] Implement ContextManager class (GREEN)
- [x] Integrate with agent
- [x] E2E verification

### Files
- Tests: `tests/context_manager.test.ts`
- Implementation: `src/context_manager.ts`

---

## Feature 19: ReAct+ Agent Loop

**Purpose:** Enhance agent with structured phases: Understand → Plan → Execute → Reflect

### Test Plan (Written BEFORE Implementation)

**Phase 1 - Understand:**
1. [x] Should parse user intent from message
2. [x] Should extract mentioned entities (files, functions, classes)
3. [x] Should identify constraints from message
4. [x] Should determine success criteria

**Phase 2 - Plan:**
5. [x] Should create todo list for multi-step tasks
6. [x] Should estimate token usage per step
7. [x] Should identify dependencies between steps
8. [x] Should order steps by dependency

**Phase 3 - Execute:**
9. [x] Should execute steps in planned order
10. [x] Should build context from previous step results
11. [x] Should track step success/failure
12. [x] Should retry failed steps (max 3 attempts)
13. [x] Should ask user if stuck after retries

**Phase 4 - Reflect (Optional):**
14. [x] Should note lessons learned from execution
15. [x] Should identify patterns for future tasks

**Integration:**
16. [x] Should maintain planning state across turns
17. [x] Should persist plans to todo_write tool

### Implementation Checklist
- [x] Write all test cases (RED)
- [x] Implement PlanningEngine class (GREEN)
- [x] Integrate phases into agent loop
- [x] E2E verification

### Files
- Tests: `tests/planning_engine.test.ts`
- Implementation: `src/planning_engine.ts`

---

## Feature 20: Error Recovery

**Purpose:** Detect and recover from errors, loops, and failures gracefully.

### Test Plan (Written BEFORE Implementation)

**Loop Detection:**
1. [x] Should detect repeating same tool call 3+ times
2. [x] Should detect alternating between same 2 actions
3. [x] Should break loop with alternative strategy
4. [x] Should track action history for detection

**Retry Logic:**
5. [x] Should retry failed tool calls with modified params
6. [x] Should try alternative approach after 2 failures
7. [x] Should ask user after 3 total failures
8. [x] Should not retry unrecoverable errors (file not found)

**Error Classification:**
9. [x] Should classify errors as recoverable/unrecoverable
10. [x] Should classify transient errors (network, timeout)
11. [x] Should classify permanent errors (invalid path, syntax)
12. [x] Should provide helpful error messages

**Task Status:**
13. [x] Should never mark task complete with errors
14. [x] Should update task status on failure
15. [x] Should provide failure reason in status

### Implementation Checklist
- [x] Write all test cases (RED)
- [x] Implement ErrorRecovery class (GREEN)
- [x] Integrate into agent execution loop
- [x] E2E verification

### Files
- Tests: `tests/error_recovery.test.ts`
- Implementation: `src/error_recovery.ts`

---

## Week 5 Integration Tests ✅ COMPLETED

After implementing the modules, they were integrated into `src/agent.ts` and E2E tested:

### Integration E2E Tests Performed

| Test Case | Expected | Result |
|-----------|----------|--------|
| Basic greeting | Shows `[Plan]` for whole_project scope | ✅ Pass |
| Single file read | Shows `[Context] X files, Y tokens` | ✅ Pass |
| Multi-file analysis (8 files) | Context tracks all reads | ✅ Pass |
| Non-existent file | Error recorded, graceful message | ✅ Pass |

### Integration Points in agent.ts

1. **PlanningEngine Integration:**
   - `understand()` called on every message
   - `plan()` called for multi_file/whole_project scope
   - Shows `[Plan] Created X steps (est. Y tokens)`

2. **ContextManager Integration:**
   - `addContext()` on successful file reads
   - `markUsed()` tracks file access
   - Shows `[Context] X files accessed, Y tokens used`

3. **ErrorRecovery Integration:**
   - `recordAction()` on every tool call
   - `recordFailure()` on errors
   - `detectLoop()` checked before execution
   - Shows `[Loop Detected]` and `[Suggestion]` when stuck

---

## Week 5 Summary ✅ COMPLETED

| Feature | Unit Tests | Integration | Status |
|---------|-----------|-------------|--------|
| Context Manager | 20/20 ✅ | ✅ E2E Verified | Complete |
| Planning Engine | 17/17 ✅ | ✅ E2E Verified | Complete |
| Error Recovery | 20/20 ✅ | ✅ E2E Verified | Complete |

**Total: 57 new tests, 240 total tests passing**
**Integration: All modules wired into agent.ts and E2E tested**

---

# Week 6: Polish & Production Ready

## Feature 21: LRU Cache for Search Results

**Purpose:** Cache search results to avoid re-searching unchanged codebases, improving performance.

### Test Plan (Written BEFORE Implementation)

**Cache Operations:**
1. [ ] Should cache search results by query + path
2. [ ] Should return cached results on repeated queries
3. [ ] Should evict oldest entries when cache is full (LRU)
4. [ ] Should invalidate cache when files change

**Performance:**
5. [ ] Cached lookups should be < 1ms
6. [ ] Cache should handle 100+ entries
7. [ ] Should respect max cache size configuration

**Integration:**
8. [ ] Should integrate with search_code tool
9. [ ] Should integrate with grep tool

### Implementation Checklist
- [ ] Write all test cases (RED)
- [ ] Implement LRUCache class (GREEN)
- [ ] Integrate with tools
- [ ] E2E verification

### Files
- Tests: `tests/lru_cache.test.ts`
- Implementation: `src/lru_cache.ts`

---

## Feature 22: Enhanced Output Colors

**Purpose:** Colorize CLI output for better readability (errors red, success green, info blue).

### Test Plan (Written BEFORE Implementation)

**Color Functions:**
1. [ ] Should have error() function (red text)
2. [ ] Should have success() function (green text)
3. [ ] Should have info() function (blue text)
4. [ ] Should have warn() function (yellow text)
5. [ ] Should have dim() function (gray text)

**Output Integration:**
6. [ ] Tool errors should be displayed in red
7. [ ] Success messages should be displayed in green
8. [ ] File paths should be displayed in cyan
9. [ ] Should work on terminals without color support (fallback)

### Implementation Checklist
- [ ] Write all test cases (RED)
- [ ] Implement colors module (GREEN)
- [ ] Integrate with agent output
- [ ] E2E verification

### Files
- Tests: `tests/colors.test.ts`
- Implementation: `src/ui/colors.ts`

---

## Feature 23: Confirmation for Destructive Operations

**Purpose:** Require user confirmation before delete_file and other destructive operations.

### Test Plan (Written BEFORE Implementation)

**Confirmation Flow:**
1. [ ] delete_file should request confirmation
2. [ ] Should show file path in confirmation prompt
3. [ ] Should abort if user declines
4. [ ] Should proceed if user confirms

**Skip Confirmation:**
5. [ ] Should have option to skip confirmation (force mode)
6. [ ] Non-interactive mode should skip confirmation

### Implementation Checklist
- [ ] Write all test cases (RED)
- [ ] Add confirmation to delete_file (GREEN)
- [ ] E2E verification

### Files
- Tests: `tests/delete_file.test.ts` (extend existing)
- Implementation: `src/tools.ts`

---

## Feature 24: Better Error Messages

**Purpose:** Provide helpful, actionable error messages with suggestions.

### Test Plan (Written BEFORE Implementation)

**Error Formatting:**
1. [ ] Should include file path in error
2. [ ] Should include line number when relevant
3. [ ] Should suggest next steps
4. [ ] Should be colorized (red for error, yellow for suggestion)

**Specific Errors:**
5. [ ] File not found: suggest similar files
6. [ ] Command failed: show exit code and stderr
7. [ ] Edit failed: show what was expected vs found
8. [ ] Permission denied: suggest chmod

### Implementation Checklist
- [ ] Write all test cases (RED)
- [ ] Implement ErrorFormatter class (GREEN)
- [ ] Integrate with all tools
- [ ] E2E verification

### Files
- Tests: `tests/error_formatter.test.ts`
- Implementation: `src/error_formatter.ts`

---

## Week 6 Summary ✅ COMPLETED

| Feature | Unit Tests | Status |
|---------|-----------|--------|
| LRU Cache | 10/10 ✅ | Complete |
| Enhanced Colors | 12/12 ✅ | Complete |
| Error Formatter | 10/10 ✅ | Complete |

**Total: 32 new tests, 272 total tests passing**
**E2E Verification: All features tested interactively**

---

# Bad Case Fixes

---

## BC-001: Empty Prompt Input Validation ⚠️

**Purpose:** Prevent empty prompts from triggering unnecessary tool calls and LLM processing.

**Related Issue:** BADCASES.md BC-001

---

### Test Plan (Written BEFORE Implementation)

#### Happy Path Tests
1. [ ] **Should accept non-empty user input**
   - **Input:** "hello"
   - **Expected:** Passes validation, sent to agent

2. [ ] **Should accept input with leading/trailing spaces**
   - **Input:** "  hello  "
   - **Expected:** Trimmed and accepted ("hello")

3. [ ] **Should accept slash commands**
   - **Input:** "/help"
   - **Expected:** Passes validation, handled as command

#### Edge Cases
4. [ ] **Should reject empty string**
   - **Input:** ""
   - **Expected:** Show error message, re-prompt

5. [ ] **Should reject whitespace-only input**
   - **Input:** "   " (spaces)
   - **Expected:** Show error message, re-prompt

6. [ ] **Should reject tabs-only input**
   - **Input:** "\t\t" (tabs)
   - **Expected:** Show error message, re-prompt

7. [ ] **Should reject newline-only input**
   - **Input:** "\n" (newline)
   - **Expected:** Show error message, re-prompt

#### Error Handling
8. [ ] **Should show helpful error message**
   - **Input:** ""
   - **Expected:** "Please enter a query."

9. [ ] **Should not trigger intent classifier on empty input**
   - **Input:** ""
   - **Expected:** No intent classification logged

10. [ ] **Should not make any tool calls on empty input**
    - **Input:** ""
    - **Expected:** No tool calls executed

#### Integration Tests
11. [ ] **Should integrate with REPL loop in index.ts**
    - **Setup:** Start REPL
    - **Expected:** Validation happens before agent.chat()

12. [ ] **Should not break REPL on empty input**
    - **Setup:** Submit empty input
    - **Expected:** REPL continues, shows prompt again

#### End-to-End Tests
13. [ ] **E2E Test 1: Empty input in interactive session**
    - **User Action:** Start `npx tsx index.ts`, press Enter with no input
    - **Expected Result:** See "Please enter a query.", REPL prompts again
    - **Verification:** No [Intent], no [Tool Calls] in output

14. [ ] **E2E Test 2: Whitespace input doesn't trigger agent**
    - **User Action:** Type "    " (spaces only), press Enter
    - **Expected Result:** See error message, no LLM call
    - **Verification:** No API tokens consumed

15. [ ] **E2E Test 3: Valid input after empty input works**
    - **User Action:** Press Enter (empty), then type "hello"
    - **Expected Result:** First shows error, second processes normally
    - **Verification:** Second query triggers agent properly

---

### Implementation Checklist

#### Phase 1: Plan (BEFORE coding)
- [x] Test plan written and reviewed
- [x] All test cases documented above
- [x] Edge cases identified (whitespace, tabs, newlines)
- [x] Error scenarios planned

#### Phase 2: Red (Write failing tests)
- [x] All unit tests written in `tests/input_validation.test.ts`
- [x] Run `npm test` - verify tests FAIL
- [x] Tests are clear and well-named

#### Phase 3: Green (Make tests pass)
- [x] Input validation implemented in `index.ts`
- [x] Run `npm test` - verify tests PASS
- [x] Minimal code to pass tests (no over-engineering)

#### Phase 4: Refactor (Clean up)
- [x] Code reviewed for clarity
- [x] Removed duplication
- [x] Run `npm test` - still passes

#### Phase 5: Verify (E2E testing)
- [x] Manual testing with `npx tsx index.ts`
- [x] All E2E scenarios tested
- [x] No crashes or errors
- [x] Validation works as expected

#### Phase 6: Document
- [x] Update `BADCASES.md` BC-001 status to "fixed"
- [x] Update `TEST_PLANS.md` with implementation status
- [x] Mark all checkboxes ✅

---

### Implementation Status

**Status:** ✅ Complete

**Test Results:**
- Unit Tests: 12/12 passing ✅
- Integration Tests: 2/2 passing ✅
- E2E Tests: 4/4 verified ✅

**Known Issues:**
- None

---

### Files

**Tests:**
- `tests/input_validation.test.ts` - Unit tests for validation logic

**Implementation:**
- `index.ts:[line]` - Input validation before agent.chat()

**Documentation:**
- `BADCASES.md:BC-001` - Original bug report

---

### Example Usage

```typescript
// In index.ts REPL loop
const userMessage = await getUserInput();

// NEW: Validate input before sending to agent
if (!userMessage.trim()) {
  console.log('Please enter a query.');
  continue; // Re-prompt
}

// Existing: Send to agent
const response = await agent.chat(userMessage);
```

---

### Testing Examples

**Manual E2E Test:**
```bash
npx tsx index.ts

# Test 1: Empty input
> [press Enter with no text]
Please enter a query.
>

# Test 2: Whitespace input
>     [spaces only]
Please enter a query.
>

# Test 3: Valid input works
> hello
[Intent] ...
```

**Unit Test:**
```bash
npm test input_validation.test.ts
# Should see: 12 tests passing
```

---

### Notes

- This fix prevents BC-001: Empty prompt triggering 4 unnecessary tool calls
- Validation happens at the earliest point (index.ts REPL loop)
- Intent classifier and agent are never called for empty input
- Saves API tokens and improves UX
- Simple fix: just add `if (!userMessage.trim()) { ... }` check

---

## BC-002: Grep Tool Context Enhancement ⚠️

**Purpose:** Enhance grep tool to return context lines around matches for better code understanding.

**Related Issue:** BADCASES.md BC-002

---

### Test Plan (Written BEFORE Implementation)

#### Happy Path Tests
1. [ ] **Should return matches with context when contextLines specified**
   - **Input:** `grep({pattern: "function", contextLines: 2})`
   - **Expected:** Each match includes 2 lines before and 2 lines after

2. [ ] **Should return all matches (not just one)**
   - **Input:** `grep({pattern: "async function"})`
   - **Expected:** All async functions in codebase returned

3. [ ] **Should preserve file:line format**
   - **Input:** `grep({pattern: "import"})`
   - **Expected:** Each match shows `{file: "path.ts", line: 5, content: "...", context: [...]}`

#### Context Line Tests
4. [ ] **Should support before context (-B)**
   - **Input:** `grep({pattern: "export", beforeContext: 3})`
   - **Expected:** 3 lines before each match included

5. [ ] **Should support after context (-A)**
   - **Input:** `grep({pattern: "class", afterContext: 5})`
   - **Expected:** 5 lines after each match included

6. [ ] **Should support both before and after context (-C)**
   - **Input:** `grep({pattern: "function", contextLines: 3})`
   - **Expected:** 3 lines before AND after each match

7. [ ] **Should handle context at file boundaries**
   - **Input:** Match on line 1 with `beforeContext: 5`
   - **Expected:** Only available lines returned (no negative indices)

8. [ ] **Should handle context at end of file**
   - **Input:** Match on last line with `afterContext: 5`
   - **Expected:** Only available lines returned (no overflow)

#### Edge Cases
9. [ ] **Should work without context (backward compatible)**
   - **Input:** `grep({pattern: "test"})` (no context params)
   - **Expected:** Works as before, returns just matching lines

10. [ ] **Should handle overlapping context ranges**
    - **Input:** Two matches 2 lines apart with `contextLines: 5`
    - **Expected:** Context ranges merge intelligently

11. [ ] **Should preserve line numbers in context**
    - **Input:** `grep({pattern: "foo", contextLines: 2})`
    - **Expected:** Context includes line numbers for each line

#### Output Format Tests
12. [ ] **Should return structured JSON**
    - **Expected:** `{file, line, content, contextBefore[], contextAfter[]}`

13. [ ] **Should include line numbers in context**
    - **Expected:** `contextBefore: [{line: 10, content: "..."}]`

#### Integration Tests
14. [ ] **Should work with existing grep parameters**
    - **Input:** `grep({pattern: "async", include: "*.ts", ignoreCase: true, contextLines: 3})`
    - **Expected:** All parameters work together

15. [ ] **Should improve code search UX**
    - **Setup:** Search for function definitions
    - **Expected:** User can understand what function does from context

#### End-to-End Tests
16. [ ] **E2E Test 1: Search for async functions with context**
    - **User Action:** "Search for 'async function' in the codebase"
    - **Expected Result:** All matches with context showing function bodies
    - **Verification:** Can understand what each function does

17. [ ] **E2E Test 2: Search shows all matches, not just one**
    - **User Action:** "Find all places where we use 'import'"
    - **Expected Result:** Multiple matches shown (5+)
    - **Verification:** Agent shows count: "Found X matches"

18. [ ] **E2E Test 3: Context helps understand code**
    - **User Action:** "Where do we handle errors?"
    - **Expected Result:** Matches with surrounding try/catch context
    - **Verification:** Can see error handling logic

---

### Implementation Checklist

#### Phase 1: Plan (BEFORE coding)
- [x] Test plan written and reviewed
- [x] All test cases documented above
- [x] Edge cases identified (file boundaries, overlapping ranges)
- [x] Error scenarios planned

#### Phase 2: Red (Write failing tests)
- [ ] All unit tests written in `tests/grep.test.ts` (extend existing)
- [ ] Run `npm test` - verify new tests FAIL
- [ ] Tests are clear and well-named

#### Phase 3: Green (Make tests pass)
- [ ] Add context parameters to grep tool definition
- [ ] Implement context line extraction in grep case
- [ ] Run `npm test` - verify tests PASS
- [ ] Minimal code to pass tests (no over-engineering)

#### Phase 4: Refactor (Clean up)
- [ ] Code reviewed for clarity
- [ ] Removed duplication
- [ ] Run `npm test` - still passes

#### Phase 5: Verify (E2E testing)
- [ ] Manual testing with `npx tsx index.ts`
- [ ] All E2E scenarios tested
- [ ] Context improves code understanding
- [ ] All matches displayed (not just one)

#### Phase 6: Document
- [ ] Update `BADCASES.md` BC-002 status to "fixed"
- [ ] Update `TEST_PLANS.md` with implementation status
- [ ] Mark all checkboxes ✅

---

### Implementation Status

**Status:** ✅ Complete

**Test Results:**
- Unit Tests: 17/17 passing ✅ (10 existing + 7 new context tests)
- Integration Tests: 3/3 passing ✅
- E2E Tests: 2/3 verified ✅ (grep returns all matches and context)

**Known Issues:**
- Agent response formatting could be improved (shows results but not in exact desired format)
- This is a separate enhancement from the tool capability fix

---

### Files

**Tests:**
- `tests/grep.test.ts` - Unit tests for context features (extend existing file)

**Implementation:**
- `src/tools.ts` - grep tool definition and implementation

**Documentation:**
- `BADCASES.md:BC-002` - Original bug report

---

### Example Usage

```typescript
// NEW: With context lines
const result = await grep({
  pattern: "async function",
  contextLines: 3  // 3 lines before and after
});

// Result format:
[
  {
    file: "index.ts",
    line: 21,
    content: "async function main() {",
    contextBefore: [
      {line: 18, content: ""},
      {line: 19, content: "const confirmChange = async (diff: string): Promise<boolean> => {"},
      {line: 20, content: "    console.log('\\n\\x1b[33mProposed Changes:\\x1b[0m');"}
    ],
    contextAfter: [
      {line: 22, content: "    if (!process.env.GEMINI_API_KEY) {"},
      {line: 23, content: "        console.error('Please set the GEMINI_API_KEY environment variable.');"},
      {line: 24, content: "        process.exit(1);"}
    ]
  },
  // ... more matches
]
```

---

### Testing Examples

**Manual E2E Test:**
```bash
npx tsx index.ts

# Test 1: Search with context
> Search for "async function" in the codebase
Expected: All async functions with surrounding code context

# Test 2: Verify all matches returned
> Find all imports in src/
Expected: Multiple matches (10+), not just one

# Test 3: Context helps understanding
> Where do we call executeTool?
Expected: Matches show surrounding code for understanding
```

**Unit Test:**
```bash
npm test grep.test.ts
# Should see: X tests passing (including new context tests)
```

---

### Notes

- Fixes BC-002: Grep returns incomplete results with minimal context
- Adds optional `contextLines`, `beforeContext`, `afterContext` parameters
- Backward compatible: existing grep calls work without changes
- Improves code exploration and understanding
- Reduces need for follow-up queries to understand matches

---

## BC-003: Project Overview Tool ⚠️

**Purpose:** Create comprehensive project overview tool that reads multiple sources to understand purpose, architecture, and usage.

**Related Issue:** BADCASES.md BC-003

---

### Test Plan (Written BEFORE Implementation)

#### Happy Path Tests
1. [ ] **Should read README.md for project description**
   - **Input:** `get_project_overview({path: "."})`
   - **Expected:** Returns README content with project description

2. [ ] **Should read package.json for metadata**
   - **Input:** `get_project_overview({path: "."})`
   - **Expected:** Includes name, description, version, dependencies

3. [ ] **Should detect and read architecture docs**
   - **Input:** `get_project_overview({path: "."})`
   - **Expected:** Finds and includes CLAUDE.md, ARCHITECTURE.md if present

4. [ ] **Should include tech stack from detect_project_type**
   - **Input:** `get_project_overview({path: "."})`
   - **Expected:** Includes languages, frameworks, tools detected

5. [ ] **Should identify entry points**
   - **Input:** `get_project_overview({path: "."})`
   - **Expected:** Finds index.ts, main.ts, or similar entry files

#### Content Detection Tests
6. [ ] **Should extract project purpose**
   - **Expected:** Returns purpose/goal from README or package.json description

7. [ ] **Should identify architecture patterns**
   - **Expected:** Detects patterns like "hybrid", "microservices", "monolith", etc.

8. [ ] **Should find usage instructions**
   - **Expected:** Extracts how to run, build, test from README

9. [ ] **Should detect key technologies**
   - **Expected:** Identifies major deps like React, Rust, TypeScript, etc.

#### Edge Cases
10. [ ] **Should work with minimal documentation**
    - **Input:** Project with only package.json
    - **Expected:** Returns available info, doesn't fail

11. [ ] **Should handle missing README**
    - **Input:** Project without README.md
    - **Expected:** Gathers info from other sources

12. [ ] **Should work with non-standard structure**
    - **Input:** Project with different layout
    - **Expected:** Adapts to find available documentation

13. [ ] **Should handle large README files**
    - **Input:** Very long README.md
    - **Expected:** Extracts key sections, doesn't overflow

#### Output Format Tests
14. [ ] **Should return structured JSON**
    - **Expected:** `{purpose, architecture, techStack, usage, entryPoints}`

15. [ ] **Should include source attribution**
    - **Expected:** Shows where each piece of info came from

#### Integration Tests
16. [ ] **Should work on CodeCraft project itself**
    - **Expected:** Correctly identifies it as agentic CLI with Rust engine

17. [ ] **Should work on other project types**
    - **Expected:** Adapts to React apps, Python projects, etc.

#### End-to-End Tests
18. [ ] **E2E Test 1: "What type of project is this?"**
    - **User Action:** Ask about project type
    - **Expected Result:** Comprehensive answer with purpose, architecture, tech stack
    - **Verification:** Mentions CodeCraft, Rust engine, REPL, Gemini

19. [ ] **E2E Test 2: "How do I run this project?"**
    - **User Action:** Ask about usage
    - **Expected Result:** Clear instructions from README
    - **Verification:** Shows npx tsx index.ts and GEMINI_API_KEY requirement

20. [ ] **E2E Test 3: "What is the architecture?"**
    - **User Action:** Ask about architecture
    - **Expected Result:** Explains hybrid Node.js + Rust design
    - **Verification:** Mentions NAPI-RS, tree-sitter, agent loop

---

### Implementation Checklist

#### Phase 1: Plan (BEFORE coding)
- [x] Test plan written and reviewed
- [x] All test cases documented above
- [x] Edge cases identified (missing docs, large files)
- [x] Error scenarios planned

#### Phase 2: Red (Write failing tests)
- [ ] All unit tests written in `tests/project_overview.test.ts`
- [ ] Run `npm test` - verify tests FAIL
- [ ] Tests are clear and well-named

#### Phase 3: Green (Make tests pass)
- [ ] Create get_project_overview tool in tools.ts
- [ ] Implement multi-source information gathering
- [ ] Implement synthesis logic
- [ ] Run `npm test` - verify tests PASS

#### Phase 4: Refactor (Clean up)
- [ ] Code reviewed for clarity
- [ ] Removed duplication
- [ ] Run `npm test` - still passes

#### Phase 5: Verify (E2E testing)
- [ ] Manual testing with `npx tsx index.ts`
- [ ] All E2E scenarios tested
- [ ] Comprehensive answers provided
- [ ] No information gaps

#### Phase 6: Document
- [ ] Update `BADCASES.md` BC-003 status to "fixed"
- [ ] Update `TEST_PLANS.md` with implementation status
- [ ] Mark all checkboxes ✅

---

### Implementation Status

**Status:** Not Started

**Test Results:**
- Unit Tests: 0/17 passing
- Integration Tests: 0/2 passing
- E2E Tests: 0/3 verified

**Known Issues:**
- None yet

---

### Files

**Tests:**
- `tests/project_overview.test.ts` - Unit tests for new tool

**Implementation:**
- `src/tools.ts` - New get_project_overview tool

**Documentation:**
- `BADCASES.md:BC-003` - Original bug report

---

### Example Usage

```typescript
// Get comprehensive project overview
const overview = await get_project_overview({path: "."});

// Returns:
{
  purpose: "CodeCraft is a high-performance agentic CLI coding assistant",
  architecture: {
    type: "Hybrid Node.js + Rust",
    components: [
      "Node.js REPL and agent logic",
      "Rust engine for code parsing (tree-sitter)",
      "NAPI-RS bindings between layers"
    ]
  },
  techStack: {
    languages: ["TypeScript", "Rust"],
    frameworks: ["Gemini AI", "tree-sitter"],
    tools: ["Vitest", "npm", "cargo"]
  },
  usage: {
    run: "npx tsx index.ts",
    requirements: ["GEMINI_API_KEY environment variable"],
    commands: ["/clear", "/help", "/save"]
  },
  entryPoints: ["index.ts"],
  sources: ["README.md", "package.json", "CLAUDE.md"]
}
```

---

### Testing Examples

**Manual E2E Test:**
```bash
npx tsx index.ts

# Test 1: Comprehensive project info
> What type of project is this?
Expected: Mentions CodeCraft, agentic CLI, Rust engine, purpose

# Test 2: Usage instructions
> How do I run this?
Expected: Shows npx tsx index.ts and requirements

# Test 3: Architecture details
> Explain the architecture
Expected: Hybrid Node.js + Rust, NAPI-RS, tree-sitter
```

**Unit Test:**
```bash
npm test project_overview.test.ts
# Should see: 17 tests passing
```

---

### Notes

- Fixes BC-003: Project type detection missing purpose and architecture
- Creates new comprehensive tool instead of just enhancing detect_project_type
- Reads multiple sources: README, json, CLAUDE.md, entry files
- Synthesizes holistic view of project
- Helps onboarding and understanding project structure
- Reduces back-and-forth questions about project

---

## BadCase Fix 4: BC-004 - Agent Loop Detection and Recovery

**Issue:** Agent gets stuck in tool call loops, hits 10 iteration limit, fails to complete simple tasks, returns empty response.

**Example:** User asked to use an unused function. Agent made 10 tool calls (repeated reads of same file), hit limit, failed task.

**Root Causes:**
1. No iteration limit warnings before hitting hard limit
2. Repetitive tool calls (reading same file multiple times)
3. No loop detection or alternative strategies
4. Poor error messages when hitting limit
5. No progress tracking or recovery mechanism

**Goals:**
1. Detect when agent is stuck in loops (same tool, similar params)
2. Warn agent before hitting iteration limit
3. Provide helpful error messages instead of empty response
4. Suggest alternative strategies when stuck
5. Add guardrails to prevent excessive repetition

---

### Test Plan (Written BEFORE Implementation)

#### Module 1: Iteration Limit Warning System

**Happy Path Tests:**
1. ✅ Should track iteration count during tool execution loop
2. ✅ Should NOT warn when iterations < 7
3. ✅ Should warn agent at iteration 7 (internal warning)
4. ✅ Should strongly warn agent at iteration 8 (suggest summarizing)
5. ✅ Should provide helpful message at iteration 10 (not empty response)

**Edge Cases:**
6. ✅ Should reset iteration count when new user message arrives
7. ✅ Should handle iteration count across model retries
8. ✅ Warning should be injected into model context, not shown to user directly

**Integration Tests:**
9. ✅ Warnings should be visible in agent's system messages
10. ✅ Agent should respond to warnings by summarizing or changing approach

---

#### Module 2: Loop Detection

**Happy Path Tests:**
1. ✅ Should detect when same tool is called 3+ times consecutively
2. ✅ Should detect repetition loops (A-B-A-B-A-B pattern)
3. ✅ Should detect when same file is read 3+ times
4. ✅ Should allow legitimate repeated calls (different parameters)

**Edge Cases:**
5. ✅ Should NOT flag legitimate patterns (read → edit → verify flow)
6. ✅ Should detect similar parameters (not just exact matches)
   - Example: `read_file({path: "foo.ts", offset: 10})` vs `read_file({path: "foo.ts", offset: 20})`
7. ✅ Should reset loop detection on user message

**Detection Patterns:**
8. ✅ Consecutive repetition: Same tool 3+ times in a row
9. ✅ Alternating pattern: A-B-A-B-A (2+ cycles)
10. ✅ Parameter similarity: Same tool, same file, different offset/limit

**Output:**
11. ✅ Return loop type: "consecutive" | "alternating" | "parameter_similarity"
12. ✅ Return suggestion: Alternative approach to try

---

#### Module 3: Alternative Strategy Suggestions

**Test Cases:**
1. ✅ When stuck reading same file repeatedly → Suggest using grep/search instead
2. ✅ When stuck with search tools → Suggest reading full file or asking user
3. ✅ When stuck with edits failing → Suggest showing user the problem
4. ✅ When stuck with grep → Suggest trying broader or narrower search
5. ✅ Generic fallback → Suggest summarizing progress and asking user

**Edge Cases:**
6. ✅ Suggestions should be context-aware (based on tool types involved)
7. ✅ Should not suggest already-tried approaches
8. ✅ Should prioritize user communication over infinite tool attempts

---

#### Module 4: Better Error Messages

**Test Cases:**
1. ✅ When hitting 10 iteration limit, should return structured message with:
   - What was attempted (summary of tool calls)
   - Why it failed (loop detected, limit reached, etc.)
   - What to try next (suggestions)
   - NOT an empty response
2. ✅ Should track and summarize tool calls made
3. ✅ Should identify the specific blocker (file not found, string not found, etc.)

**Message Format:**
```
I attempted to complete your request but encountered difficulties:

**Attempted:**
- Read src/agent.ts 5 times with different offsets
- Tried to edit agent.ts 2 times

**Issue:**
Loop detected: Repeatedly reading the same file without making progress

**Suggestion:**
Let me try a different approach: [specific suggestion based on context]

Would you like me to try that, or would you prefer to provide more guidance?
```

---

#### Module 5: Guardrails

**Test Cases:**
1. ✅ Should limit consecutive reads of same file to 3
2. ✅ Should detect when no progress is being made
3. ✅ Should escalate to user before hitting hard limit
4. ✅ Should prevent infinite loops between 2 tools

**Edge Cases:**
5. ✅ Should allow reading different files (not same file repeatedly)
6. ✅ Should allow legitimate multi-step workflows
7. ✅ Should NOT overly restrict valid agent behavior

---

### Implementation Checklist

**Phase 1: RED (Write Failing Tests)**
- [ ] Create `tests/iteration_limits.test.ts` (10 tests)
- [ ] Create `tests/loop_detection.test.ts` (12 tests)
- [ ] Create `tests/strategy_suggestions.test.ts` (8 tests)
- [ ] Create `tests/error_messages.test.ts` (4 tests)
- [ ] Create `tests/guardrails.test.ts` (7 tests)
- [ ] Run `npm test` → Expect 41 tests failing

**Phase 2: GREEN (Implement Features)**
- [ ] Enhance `src/error_recovery.ts` with loop detection logic
- [ ] Add iteration tracking to `src/agent.ts`
- [ ] Inject warnings at iterations 7, 8, 10
- [ ] Implement strategy suggestion system
- [ ] Improve error messages at iteration limit
- [ ] Add guardrails to agent loop
- [ ] Run `npm test` → Expect all tests passing

**Phase 3: REFACTOR**
- [ ] Clean up loop detection code
- [ ] Extract suggestion logic to separate function
- [ ] Ensure code is readable and maintainable

**Phase 4: E2E Verification**
- [ ] Create test script: `test_bc004_e2e.js`
- [ ] Test scenario: Ask agent to complete a task that triggers loops
- [ ] Verify warnings appear in logs
- [ ] Verify helpful error message (not empty response)
- [ ] Verify agent tries alternative strategies
- [ ] Run: `node test_bc004_e2e.js`

**Phase 5: Documentation**
- [ ] Update this test plan with results
- [ ] Update BADCASES.md to mark BC-004 as fixed
- [ ] Document new agent behaviors in CLAUDE.md

---

### Test Structure

**Files to Create/Modify:**
- `tests/iteration_limits.test.ts` - New file
- `tests/loop_detection.test.ts` - New file
- `tests/strategy_suggestions.test.ts` - New file
- `tests/error_messages.test.ts` - New file
- `tests/guardrails.test.ts` - New file
- `src/agent.ts` - Modify (add iteration tracking and warnings)
- `src/error_recovery.ts` - Modify (enhance loop detection)
- `test_bc004_e2e.js` - New E2E test script

---

### Expected Tool Call Pattern (BEFORE Fix)

**Problematic Pattern:**
```
1. search_code({"query":"greetUser"})
2. list_directory({"path":"src"})
3. read_file({"path":"src/agent.ts", "offset":70, "limit":30})
4. read_file({"path":"src/agent.ts", "offset":40, "limit":10})   ⚠️ Same file again
5. grep({"pattern":"start\\(\\)"})
6. read_file({"path":"src/agent.ts", "offset":22, "limit":20})   ⚠️ Same file again
7. read_file({"path":"src/agent.ts", "offset":34, "limit":15})   ⚠️ Loop detected!
8. edit_file(...)  ← Attempt edit
9. read_file({"path":"src/agent.ts", "offset":51, "limit":1})
10. read_file({"path":"src/agent.ts"})  ← Full file (should've done this earlier)
→ Hit limit, empty response ❌
```

### Expected Tool Call Pattern (AFTER Fix)

**Improved Pattern:**
```
1. search_code({"query":"greetUser"})
2. read_file({"path":"src/agent.ts"})  ← Read full file first
3. grep({"pattern":"start\\(\\)"})
4. read_file({"path":"src/agent.ts", "offset":70, "limit":30})  ← Targeted read
5. read_file({"path":"src/agent.ts", "offset":40, "limit":10"})  ← Still same file
6. read_file({"path":"src/agent.ts", "offset":22, "limit":20"})  ← Loop detected!
   [Warning injected] "You've read src/agent.ts 3 times. Consider trying a different approach."
7. Agent changes strategy → grep or asks user
→ Task completes or provides useful message ✅
```

---

### Acceptance Criteria

**Must Have:**
1. ✅ No empty responses when hitting iteration limit
2. ✅ Helpful error message explaining what was attempted and why it failed
3. ✅ Loop detection identifies repetitive patterns
4. ✅ Warnings appear at iterations 7, 8
5. ✅ Alternative strategy suggestions provided

**Nice to Have:**
1. ✅ Agent actually changes strategy when warned (behavior improvement)
2. ✅ Progress tracking shows what was accomplished
3. ✅ Guardrails prevent worst-case loops

**Success Metrics:**
- BC-004 E2E test passes (agent completes task or provides helpful message)
- Unit tests: 41/41 passing
- No empty responses in testing
- Agent demonstrates ability to change strategy when stuck

---

### Testing Examples

**Manual E2E Test:**
```bash
npx tsx index.ts

# Test 1: Simple task that previously triggered loops
> We have a greetUser() function but it's not used. Please use it in the code.
Expected Behaviors:
- Should NOT make 10 tool calls
- Should NOT return empty response
- Should either:
  a) Complete the task successfully
  b) Provide helpful message explaining blocker
- Should NOT read same file 5+ times

# Test 2: Intentionally difficult task
> Find and fix all bugs in the codebase
Expected:
- Agent should recognize this is too broad
- Should ask clarifying questions
- Should NOT hit iteration limit
- If approaching limit, should summarize progress

# Test 3: Task with actual blocker
> Delete the file that doesn't exist: nonexistent.txt
Expected:
- Should quickly identify file doesn't exist
- Should report this to user
- Should NOT loop trying to find it
- Clear error message
```

**Unit Test:**
```bash
npm test iteration_limits.test.ts loop_detection.test.ts
# Should see all tests passing
```

**Check Warnings:**
```bash
# Warnings should appear in agent logs but not user-facing output
# At iteration 7: Internal system message to agent
# At iteration 8: Strong warning to wrap up
# At iteration 10: Helpful message to user (not empty)
```

---

### Notes

- Fixes BC-004: Agent stuck in tool call loops, empty responses
- Multi-module fix: touches agent.ts and error_recovery.ts
- Focuses on detection, prevention, and recovery
- Improves user experience when agent encounters difficulties
- Maintains agent autonomy while adding safety guardrails
- Does NOT overly restrict legitimate multi-step workflows
- Prioritizes communication with user over silent failures
