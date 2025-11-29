# Evaluation Failure Analysis

> **Last Updated**: 2024-11-28 (Post-CodeSearch Consolidation)

## Current Status

| Category | Passed | Total | Rate |
|----------|--------|-------|------|
| **Tool Evals** | 71 | 135 | 52.6% |
| **LLM Evals** | 46 | 72 | 63.9% |
| **Combined** | 117 | 207 | 56.5% |

---

## Tool Evals Breakdown by Category

| Category | Passed | Total | Rate |
|----------|--------|-------|------|
| Code Intelligence | 15 | 15 | **100%** |
| File Operations | 21 | 30 | 70% |
| Execution & Process | 27 | 60 | 45% |
| Search & Discovery | 8 | 30 | **26.7%** |

---

## Root Cause Analysis

### Issue 1: Path Resolution in Glob/Grep (Critical)

**Affected Tools**: glob (3/15), grep (5/15)

**Problem**: Tools pass relative paths directly to external libraries without resolving against `context.cwd`. Fixtures create files in temp directories like `/tmp/eval-xxx/`, but tools search in the current working directory (project root).

```typescript
// glob.ts line 40 - CURRENT (WRONG)
const files = await fg(p.pattern, {
  cwd: searchPath,  // searchPath = "." = process.cwd()
});

// SHOULD BE:
const absolutePath = path.isAbsolute(searchPath)
  ? searchPath
  : path.join(context.cwd, searchPath);
const files = await fg(p.pattern, { cwd: absolutePath });
```

**Failed Test Examples**:
- `glob-001`: Expects `test.txt` from fixture, finds nothing (wrong directory)
- `grep-001`: Returns empty array, searching wrong location

**Fix**: Resolve all paths relative to `context.cwd` before passing to fast-glob/ripgrep.

**Impact**: +~20 tests

---

### Issue 2: Background Process State Dependencies (Critical)

**Affected Tools**: bash_output (2/15), kill_bash (3/15)

**Problem**: Tests expect background processes (e.g., `bashId: "test-bash-001"`) to exist before the test runs. The `backgroundProcesses` Map is empty when tests execute.

```json
// bash_output.json - expects non-existent process
{
  "id": "bashout-001",
  "input": { "params": { "bashId": "test-bash-001" } },
  "expected": { "success": true, "contains": "output" }
}
```

**Root Cause**: The eval fixture system doesn't support starting background processes as part of setup. These tests need actual running processes.

**Fix Options**:
1. **Mock the registry**: Pre-populate `backgroundProcesses` Map before tests
2. **Sequence fixtures**: Add setup hooks to start processes before test
3. **Integration tests**: Move these to E2E tests where processes can be managed

**Impact**: +~25 tests

---

### Issue 3: Error Code Mismatches (Medium)

**Affected Tools**: edit_file (5 failures), todo_write (6 failures), read_file (4 failures)

**Problem**: Tools return `VALIDATION_ERROR`, tests expect `INVALID_PARAMS`.

| Test Case | Tool Returns | Expected |
|-----------|-------------|----------|
| edit-011 (missing old_string) | `VALIDATION_ERROR` | `INVALID_PARAMS` |
| edit-012 (missing new_string) | `VALIDATION_ERROR` | `INVALID_PARAMS` |
| todo-006 (missing todos) | `VALIDATION_ERROR` | `INVALID_PARAMS` |
| todo-007 (invalid status) | `VALIDATION_ERROR` | `INVALID_PARAMS` |

**Fix**: Standardize error codes across all tools OR update test expectations.

**Impact**: +~15 tests

---

### Issue 4: Missing Validation Logic (Medium)

**Affected Tests**:
- `edit-013`: Edit identical strings (old == new) should fail, but succeeds
- `todo-011`: Multiple in_progress tasks should fail, but succeeds
- `read-012`: Negative offset should fail with validation error
- `read-013`: Zero limit should fail with validation error

**Fix**: Add proper validation to tool implementations:

```typescript
// edit_file validation
if (old_string === new_string) {
  return { success: false, error: { code: 'INVALID_PARAMS', message: 'old_string and new_string cannot be identical' }};
}

// todo_write validation
const inProgressCount = todos.filter(t => t.status === 'in_progress').length;
if (inProgressCount > 1) {
  return { success: false, error: { code: 'INVALID_STATE', message: 'Only one task can be in_progress at a time' }};
}
```

**Impact**: +~10 tests

---

## LLM Evals Breakdown

| Dataset | Passed | Total | Rate |
|---------|--------|-------|------|
| search_operations | 18 | 22 | **81.8%** |
| code_analysis | 12 | 16 | 75% |
| command_execution | 6 | 12 | 50% |
| file_operations | 10 | 22 | **45.5%** |

---

## LLM Eval Root Causes

### Issue 5: Overly Strict Tool Expectations

**Affected Datasets**: file_operations (12 failures), code_analysis (4 failures)

**Problem**: Tests accept only one "correct" tool when multiple tools are valid for the query.

| Case | Query | Expected | LLM Selected | Valid? |
|------|-------|----------|--------------|--------|
| llm-file-005 | "Create config.json" | Bash | EditFile | Both valid |
| llm-file-012 | "List files in tests" | Bash | Glob | Glob is better |
| llm-file-020 | "Create src/utils/helper.ts" | Bash | EditFile | Both valid |
| llm-analysis-005 | "Show dependencies" | ReadFile | Bash | Both valid |
| llm-analysis-013 | "Codebase structure" | Glob | Bash | Both valid |

**Fix**: Add `acceptableTools` arrays to allow valid alternatives:

```json
{
  "expectedTool": "Bash",
  "acceptableTools": ["EditFile", "WriteFile", "Glob"]
}
```

**Impact**: +~8 tests

---

### Issue 6: Parameter Name Mismatches

**Affected Dataset**: command_execution (3 failures)

**Problem**: Tests expect camelCase params, tools use snake_case.

| Test | Expected Param | Actual Tool Param |
|------|---------------|-------------------|
| llm-cmd-006 | `bashId` | `bash_id` |
| llm-cmd-007 | `bashId` | `bash_id` |

**Fix**: Update test expectations to use actual tool parameter names.

**Impact**: +~3 tests

---

### Issue 7: "No Tool Called" Cases

**Affected**: 5 cases (6.9% of LLM evals)

| Case | Query | Issue |
|------|-------|-------|
| llm-file-003 | "Show me src/agent.ts" | Ambiguous - LLM might explain instead |
| llm-file-017 | "Update the title in README" | Vague - no specific content given |
| llm-file-021 | "Show me this file" | No context about which file |
| llm-cmd-003 | "Show me git status" | Might respond conversationally |
| llm-cmd-012 | "Kill the hanging process" | No process ID provided |

**Fix Options**:
1. Make queries more explicit
2. Accept that ambiguous queries may not trigger tools
3. Add `allowNoTool: true` option for genuinely ambiguous cases

**Impact**: +~3 tests (if queries made explicit)

---

### Issue 8: Missing Optional Parameters

**Affected**: command_execution background tests

**Problem**: LLM correctly selects tool but doesn't include optional parameters like `run_in_background`.

| Case | Query | Selected | Missing Param |
|------|-------|----------|---------------|
| llm-cmd-005 | "Start dev server in background" | Bash | `run_in_background` |
| llm-cmd-011 | "Start build in background" | Bash | `run_in_background` |

**Fix**: Either:
1. Remove strict parameter expectations for optional params
2. Make test queries more explicit ("use run_in_background=true")

**Impact**: +~2 tests

---

## Priority Fix Recommendations

### Priority 1: High Impact, Low Effort

| Fix | Effort | Impact |
|-----|--------|--------|
| Fix glob/grep path resolution | 1 hour | +20 tests |
| Add acceptableTools to LLM datasets | 1 hour | +8 tests |
| Fix parameter name mismatches | 30 min | +3 tests |

**Expected improvement**: 52.6% → ~75% (tool), 63.9% → ~78% (LLM)

### Priority 2: Medium Effort

| Fix | Effort | Impact |
|-----|--------|--------|
| Standardize error codes | 2 hours | +15 tests |
| Add missing validation | 2 hours | +10 tests |
| Make ambiguous LLM queries explicit | 1 hour | +5 tests |

**Expected improvement**: ~75% → ~90% (tool), ~78% → ~85% (LLM)

### Priority 3: High Effort

| Fix | Effort | Impact |
|-----|--------|--------|
| Mock/redesign background process tests | 4 hours | +25 tests |

**Expected improvement**: ~90% → ~95%+ (tool)

---

## Detailed Failure List

### Tool Evals (64 failures)

| Tool | Pass | Fail | Primary Cause |
|------|------|------|---------------|
| glob | 3 | 12 | Path resolution |
| grep | 5 | 10 | Path resolution |
| bash_output | 2 | 13 | Process state |
| kill_bash | 3 | 12 | Process state |
| todo_write | 9 | 6 | Error codes + validation |
| edit_file | 10 | 5 | Error codes + validation |
| read_file | 11 | 4 | Validation |
| bash | 13 | 2 | Background tests |
| code_search | 15 | 0 | None |

### LLM Evals (26 failures)

| Dataset | Pass | Fail | Primary Causes |
|---------|------|------|----------------|
| file_operations | 10 | 12 | Strict expectations, no tool called |
| command_execution | 6 | 6 | Missing params, no tool called |
| code_analysis | 12 | 4 | Strict expectations |
| search_operations | 18 | 4 | Minor selection issues |

---

## Conclusion

The 90 total failures (64 tool + 26 LLM) have clear patterns:

1. **Path resolution** (22 failures): Glob/grep don't use `context.cwd`
2. **Background processes** (25 failures): Tests need process state
3. **Error codes** (15 failures): VALIDATION_ERROR vs INVALID_PARAMS
4. **Validation** (10 failures): Missing edge case validation
5. **LLM strictness** (18 failures): Need acceptableTools + explicit queries

**With Priority 1 fixes alone**, we could reach:
- Tool Evals: 52.6% → **~75%**
- LLM Evals: 63.9% → **~78%**

**With all priority fixes**, targets are:
- Tool Evals: **~95%**
- LLM Evals: **~85%**
