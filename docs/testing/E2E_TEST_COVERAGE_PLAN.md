# End-to-End Test Coverage Plan

**Created:** 2025-11-28
**Status:** 🟢 25 tests implemented across 8 test files
**Goal:** Comprehensive E2E coverage for all 20 tools and key workflows

---

## Current Coverage (25 tests)

### ✅ Implemented Test Files

| File | Tests | Tools Covered | Status |
|------|-------|---------------|--------|
| `code-analysis.test.ts` | 2 | InspectSymbol, GetImportsExports | ✅ Passing |
| `file-tools.test.ts` | 3 | Glob, Grep, ListDirectory | ✅ Passing |
| `search-operations.test.ts` | 3 | Glob, Grep | 🆕 New |
| `file-read-operations.test.ts` | 3 | ReadFile, ListDirectory | 🆕 New |
| `advanced-code-analysis.test.ts` | 4 | GetCodebaseMap, SearchCode, GetImportsExports, InspectSymbol | 🆕 New |
| `project-analysis.test.ts` | 3 | DetectProjectType, ExtractConventions, GetProjectOverview | 🆕 New |
| `multi-step-workflows.test.ts` | 3 | Multiple tools, TodoWrite | 🆕 New |
| `integration-scenarios.test.ts` | 4 | Complex multi-tool workflows | 🆕 New |

**Total:** 25 tests covering ~15 tools

---

## Tool Coverage Matrix

| Tool | Unit Tests | Tool Eval | LLM Eval | E2E Tests | Status |
|------|-----------|-----------|----------|-----------|--------|
| **ReadFile** | ✅ | ✅ | ✅ | ✅ (2 tests) | Fully covered |
| **WriteFile** | ✅ | ✅ | ✅ | ❌ | Missing E2E |
| **EditFile** | ✅ | ✅ | ✅ | ❌ | Missing E2E |
| **DeleteFile** | ✅ | ✅ | ✅ | ❌ | Missing E2E |
| **ListDirectory** | ✅ | ✅ | ✅ | ✅ (3 tests) | Fully covered |
| **Glob** | ✅ | ✅ | ✅ | ✅ (3 tests) | Fully covered |
| **Grep** | ✅ | ✅ | ✅ | ✅ (3 tests) | Fully covered |
| **GetCodebaseMap** | ✅ | ✅ | ✅ | ✅ (2 tests) | Fully covered |
| **SearchCode** | ✅ | ✅ | ✅ | ✅ (2 tests) | Fully covered |
| **InspectSymbol** | ✅ | ✅ | ✅ | ✅ (3 tests) | Fully covered |
| **GetImportsExports** | ✅ | ✅ | ✅ | ✅ (3 tests) | Fully covered |
| **BuildDependencyGraph** | ✅ | ✅ | ❌ | ❌ | Missing E2E/LLM |
| **FindReferences** | ✅ | ✅ | ❌ | ⚠️ (indirect) | Partial |
| **DetectProjectType** | ✅ | ✅ | ✅ | ✅ (1 test) | Fully covered |
| **ExtractConventions** | ✅ | ✅ | ❌ | ✅ (1 test) | Missing LLM |
| **GetProjectOverview** | ✅ | ✅ | ❌ | ✅ (2 tests) | Missing LLM |
| **Bash** | ✅ | ✅ | ✅ | ❌ | Missing E2E |
| **BashOutput** | ✅ | ✅ | ✅ | ❌ | Missing E2E |
| **KillBash** | ✅ | ✅ | ✅ | ❌ | Missing E2E |
| **TodoWrite** | ✅ | ✅ | ❌ | ✅ (1 test) | Missing LLM |

---

## Missing E2E Coverage (5 tools)

### 1. File Modification Tools (3 tools)
- ❌ **WriteFile** - Create new files
- ❌ **EditFile** - Modify existing files
- ❌ **DeleteFile** - Remove files

**Recommended Test File:** `file-write-operations.test.ts`
- Test: Create new file
- Test: Overwrite existing file (with confirmation)
- Test: Edit file content
- Test: Delete file
- Test: Handle errors gracefully

### 2. Command Execution Tools (3 tools)
- ❌ **Bash** - Execute commands
- ❌ **BashOutput** - Read background process output
- ❌ **KillBash** - Terminate background processes

**Recommended Test File:** `command-execution.test.ts`
- Test: Execute simple command
- Test: Execute command in background
- Test: Read background process output
- Test: Kill background process
- Test: Handle command errors

---

## Test Organization Strategy

### Current Strategy (Working Well)
✅ **Small, focused test files** (3-4 tests each)
✅ **Shared helper utilities** (`tests/e2e/helper.ts`)
✅ **Retry logic** for flaky LLM responses
✅ **Proper cleanup** after each test
✅ **No thread hanging** issues

### Test File Guidelines
- **Max 4-5 tests per file** to avoid hanging
- **120-second timeout** per test
- **Use `runCLIWithRetry`** with 3 retries for LLM flakiness
- **Clean up processes** in `afterAll()` hook
- **Skip if no API key** with `skipIfNoAPIKey()`

---

## Recommended Next Steps

### Phase 1: Complete Basic Tool Coverage (Priority: HIGH)
- [ ] Create `file-write-operations.test.ts` (4 tests)
  - WriteFile: Create new file
  - WriteFile: Overwrite with confirmation
  - EditFile: Modify file content
  - DeleteFile: Remove file

- [ ] Create `command-execution.test.ts` (4 tests)
  - Bash: Execute simple command
  - Bash: Run command in background
  - BashOutput: Read process output
  - KillBash: Terminate process

**Impact:** +8 tests, 100% tool coverage in E2E

### Phase 2: Add Advanced Scenarios (Priority: MEDIUM)
- [ ] Create `dependency-analysis.test.ts` (3 tests)
  - BuildDependencyGraph: Full project graph
  - BuildDependencyGraph: Single directory
  - FindReferences: Find all usages of symbol

- [ ] Create `error-handling.test.ts` (4 tests)
  - Handle missing files
  - Handle invalid parameters
  - Handle command failures
  - Graceful degradation

**Impact:** +7 tests, better error coverage

### Phase 3: Add Real-World Workflows (Priority: LOW)
- [ ] Create `refactoring-workflows.test.ts` (3 tests)
  - Rename symbol workflow
  - Extract function workflow
  - Find and replace workflow

- [ ] Create `code-review-workflows.test.ts` (3 tests)
  - Analyze code quality
  - Find potential bugs
  - Suggest improvements

**Impact:** +6 tests, realistic use cases

---

## Success Criteria

### Minimum Coverage (Current: ✅ Met!)
- [x] At least 20 E2E tests
- [x] All critical tools have at least 1 E2E test
- [x] No thread hanging issues
- [x] All tests pass reliably

### Full Coverage (Target)
- [ ] All 20 tools have dedicated E2E tests
- [ ] Error handling scenarios covered
- [ ] Multi-tool workflows tested
- [ ] Real-world use cases validated
- [ ] 40+ total E2E tests

### Quality Metrics
- **Reliability:** Tests should pass ≥95% of the time
- **Performance:** Full E2E suite should complete in <5 minutes
- **Maintainability:** Each test file should be self-contained
- **Coverage:** Every tool should have at least 1 happy path E2E test

---

## Test Infrastructure

### Existing Utilities
- ✅ `runCLI(query, timeout)` - Execute single query
- ✅ `runCLIWithRetry(query, retries)` - Execute with retry logic
- ✅ `cleanupProcesses()` - Kill all spawned processes
- ✅ `skipIfNoAPIKey()` - Skip tests when no API key
- ✅ `hasAPIKey()` - Check API key availability

### Configuration
- ✅ `vitest.e2e.config.ts` - E2E-specific config
- ✅ Sequential execution (no parallel)
- ✅ 120s test timeout
- ✅ 60s hook timeout
- ✅ Automatic cleanup on exit

---

## Lessons Learned

### What Works
✅ Small test files (3-4 tests) prevent hanging
✅ Retry logic handles LLM flakiness
✅ Shared helpers reduce duplication
✅ Sequential execution is more reliable
✅ Explicit tool names in queries improve reliability

### What Doesn't Work
❌ Large comprehensive test files (cause hanging)
❌ Parallel test execution (race conditions)
❌ Implicit tool selection (LLM unpredictability)
❌ Short timeouts (<60s per test)

---

## Maintenance Notes

### When Adding New Tools
1. Add unit tests first
2. Add tool evaluation dataset (15 test cases)
3. Add to LLM evaluation dataset
4. Add E2E test (at least 1 happy path)
5. Update this coverage plan

### When Tests Fail
1. Check if LLM flakiness (retry helps?)
2. Check process cleanup (hanging?)
3. Check tool name casing (PascalCase!)
4. Check file name references (kebab-case!)

---

**Last Updated:** 2025-11-28
**Next Review:** After Phase 1 completion
