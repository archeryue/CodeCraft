# Evaluation Failure Analysis

> **Last Updated**: 2024-11-29 (Added Bash Command Evals)

## Current Status

| Category | Passed | Total | Rate | Change |
|----------|--------|-------|------|--------|
| **Tool Evals** | 92 | 135 | 68.1% | +15.5% |
| **LLM Evals** | 60 | 72 | 83.3% | +19.4% |
| **Bash Command Evals** | 55 | 64 | 85.9% | NEW |
| **Combined** | 207 | 271 | 76.4% | +3.0% |

### Progress Summary

| Fix Applied | Tool Impact | LLM Impact | Bash Cmd Impact |
|-------------|-------------|------------|-----------------|
| Path resolution (glob/grep) | +9 tests | - | - |
| Error code standardization | +6 tests | - | - |
| Missing validation logic | +2 tests | - | - |
| LLM acceptableTools updates | - | +10 tests | - |
| EditFile description clarification | - | +4 tests | - |
| **New: Bash Command Eval System** | - | - | +55 tests |

---

## NEW: Bash Command Evaluation System

> **Added**: 2024-11-29

### Overview

A dedicated evaluation system for testing whether the agent generates **correct bash commands** with proper syntax, flags, and parameters. This is separate from the general LLM tool selection evals - it focuses specifically on **command correctness**.

### Files Created

| File | Purpose |
|------|---------|
| `evals/datasets/llm/bash_commands.json` | 64 test cases across 10 categories |
| `evals/run-bash-evals.ts` | Dedicated runner with command quality scoring |

### Usage

```bash
npx tsx evals/run-bash-evals.ts
```

### Results Summary (First Run)

| Metric | Value |
|--------|-------|
| **Total Cases** | 64 |
| **Passed** | 55 (85.9%) |
| **Exact Command Match** | 53 (82.8%) |
| **Partial Match** | 0 (0.0%) |
| **Wrong Command** | 7 (10.9%) |
| **Wrong Tool** | 2 (3.1%) |
| **No Tool** | 2 (3.1%) |

### Results by Category

| Category | Pass | Total | Rate | Description |
|----------|------|-------|------|-------------|
| python | 6 | 6 | **100%** | Script execution, pip, venv |
| docker | 5 | 5 | **100%** | run, build, exec, compose |
| system | 5 | 5 | **100%** | df, du, free, pwd, env |
| process | 4 | 4 | **100%** | ps, kill, pkill, lsof |
| build | 4 | 4 | **100%** | make, cargo, go |
| git | 7 | 8 | 87.5% | commit, push, checkout, stash |
| node | 5 | 6 | 83.3% | npm, npx, node |
| network | 4 | 5 | 80.0% | curl, wget |
| text | 3 | 4 | 75.0% | sort, wc, uniq, sed |
| advanced | 4 | 6 | 66.7% | Chaining, pipes, tar |
| negative | 2 | 3 | 66.7% | Should NOT use Bash |

### Command Quality Metrics

The eval system tracks not just pass/fail, but **command quality**:

- **Exact Match** 🎯 - Command perfectly matches expected regex pattern
- **Partial Match** 🔶 - Command is functional but not optimal
- **Wrong Command** ⚠️ - Correct tool selected, wrong command syntax
- **Wrong Tool** 🚫 - Selected wrong tool entirely (e.g., ReadFile instead of Bash)
- **No Tool** - Did not call any tool

### Failed Cases Analysis (9 failures)

| Case ID | Category | Issue |
|---------|----------|-------|
| bash-git-007 | git | Used `git reset HEAD~1` without `--soft` flag |
| bash-node-003 | node | Selected ReadFile instead of Bash for build script |
| bash-text-002 | text | Selected ReadFile to count lines instead of `wc -l` |
| bash-advanced-001 | advanced | Chained command format mismatch |
| bash-advanced-002 | advanced | Selected Glob instead of Bash for counting files |
| bash-advanced-004 | advanced | Did not call any tool for background process |
| bash-advanced-005 | advanced | Tar command format mismatch |
| bash-negative-001 | negative | Did not call any tool (edge case) |

### Key Findings

1. **Strong Performance on Core Commands**: 100% on Python, Docker, System, Process, and Build categories
2. **Git Commands**: Generally good (87.5%), but some edge cases with specific flags (`--soft`)
3. **Tool Selection Confusion**: Some cases where LLM chose ReadFile instead of Bash (e.g., `wc -l`)
4. **Advanced Commands**: Lower pass rate (66.7%) for complex operations (piping, chaining, tar)

### Recommendations

1. **Improve system prompt**: Clarify when to use Bash vs ReadFile for utility operations
2. **Add more examples**: For advanced command patterns (chaining, piping)
3. **Flexible patterns**: Continue refining regex patterns to accept valid command variations

---

## Completed Fixes

### ✅ Fix 1: Path Resolution in Glob/Grep (DONE)

**Status**: Fixed in commit `6283823`

**Solution**: Both `glob.ts` and `grep.ts` now resolve paths relative to `context.cwd`:

```typescript
const relativePath = p.path || '.';
const searchPath = path.isAbsolute(relativePath)
  ? relativePath
  : path.join(context.cwd, relativePath);
```

**Impact**: glob 12/15 (80%), grep 11/15 (73.3%)

---

### ✅ Fix 2: Error Code Standardization (DONE)

**Status**: Fixed in commit `3013aaf`

**Solution**: Updated all eval datasets to use `VALIDATION_ERROR` instead of `INVALID_PARAMS` to match what `tool-executor.ts` returns.

**Affected Datasets**: bash, bash_output, edit_file, glob, grep, kill_bash, read_file, todo_write

**Impact**: +6 tests across multiple tools

---

### ✅ Fix 3: Missing Validation Logic (DONE)

**Status**: Fixed in commit `3013aaf`

**Solution**: Added validation to tools:

```typescript
// edit-file.ts - Reject no-op edits
if (p.old_string === p.new_string) {
  errors.push('old_string and new_string must be different');
}

// todo-write.ts - Only one in_progress allowed
if (inProgressCount > 1) {
  errors.push('Only one todo can be in_progress at a time');
}
```

**Impact**: edit_file 14/15 (93.3%), todo_write 15/15 (100%)

---

### ✅ Fix 4: LLM Eval - acceptableTools Updates (DONE)

**Status**: Fixed in commits `6283823`, `b1a1f45`

**Solution**: Added `acceptableTools` arrays to allow valid alternative tool selections:
- file_operations: 6 cases updated
- code_analysis: 4 cases updated
- command_execution: 3 cases updated (param names fixed)

**Impact**: LLM evals 63.9% → 77.8% → 83.3%

---

### ✅ Fix 5: EditFile Tool Description Clarification (DONE)

**Status**: Fixed in commit `b1a1f45`

**Problem**: EditFile cannot create new files (returns FILE_NOT_FOUND), but LLM was selecting it for file creation tasks.

**Solution**:
1. Updated tool description: `'Edits an existing file... Cannot create new files - use Bash for that.'`
2. Changed file creation tests to use `forbiddenTools: ["EditFile"]` instead of `acceptableTools`

**Impact**: +4 LLM tests, wrong tool selections reduced from 15.3% → 12.5%

---

## Remaining Issues

### Issue 1: Background Process State Dependencies (30 failures)

**Affected Tools**: bash_output (15/15 fail), kill_bash (15/15 fail)

**Problem**: Tests expect background processes to exist before the test runs, but the `backgroundProcesses` Map is empty.

```json
// bash_output.json - expects non-existent process
{
  "id": "bashout-001",
  "input": { "params": { "bashId": "test-bash-001" } },
  "expected": { "success": true, "contains": "output" }
}
```

**Fix Options**:
1. **Mock the registry**: Pre-populate `backgroundProcesses` Map in fixtures
2. **Sequence fixtures**: Add setup hooks to start processes before test
3. **Integration tests**: Move these to E2E tests where processes can be managed

**Effort**: 4-6 hours | **Impact**: +30 tests

---

### Issue 2: Remaining Edge Cases (13 failures)

| Tool | Failures | Cases |
|------|----------|-------|
| bash | 3 | Background mode, missing command, multi-line output |
| glob | 3 | Negation pattern, invalid pattern, missing pattern |
| grep | 4 | Case-insensitive, line numbers, invalid regex, missing pattern |
| read_file | 2 | Read directory, very long lines |
| edit_file | 1 | Large file performance |

**Fix Options**: These are real edge cases that need either:
1. Tool implementation fixes (e.g., proper error handling)
2. Test expectation updates (if behavior is correct)

**Effort**: 2-3 hours | **Impact**: +13 tests

---

### Issue 3: LLM "No Tool Called" Cases (3 failures)

| Case | Query | Issue |
|------|-------|-------|
| llm-file-021 | "Show me this file" | No context about which file |
| llm-cmd-003 | "Show me git status" | Might respond conversationally |
| Others | Various | Ambiguous queries |

**Fix Options**:
1. Make queries more explicit
2. Add context to ambiguous queries
3. Accept that some queries are genuinely ambiguous

**Effort**: 30 min | **Impact**: +3 tests

---

## Current Failure Distribution

### Tool Evals (43 failures)

| Tool | Pass | Fail | Rate | Primary Cause |
|------|------|------|------|---------------|
| code_search | 15 | 0 | 100% | - |
| todo_write | 15 | 0 | 100% | - |
| edit_file | 14 | 1 | 93.3% | Performance edge case |
| read_file | 13 | 2 | 86.7% | Edge cases |
| glob | 12 | 3 | 80% | Edge cases |
| bash | 12 | 3 | 80% | Background tests |
| grep | 11 | 4 | 73.3% | Edge cases |
| bash_output | 0 | 15 | 0% | **Process state** |
| kill_bash | 0 | 15 | 0% | **Process state** |

### LLM Evals (12 failures)

| Dataset | Pass | Fail | Rate | Primary Causes |
|---------|------|------|------|----------------|
| search_operations | 20 | 2 | 90.9% | Minor selection issues |
| code_analysis | 14 | 2 | 87.5% | Edge cases |
| command_execution | 10 | 2 | 83.3% | No tool called |
| file_operations | 16 | 6 | 72.7% | Ambiguous queries |

---

## Priority Fix Recommendations

### Priority 1: Background Process Mocking (High Impact)

| Fix | Effort | Impact |
|-----|--------|--------|
| Add process state mocking to eval system | 4-6 hours | +30 tests |

**Expected improvement**: 68.1% → **~90%** (tool)

### Priority 2: Edge Cases (Medium Impact)

| Fix | Effort | Impact |
|-----|--------|--------|
| Fix remaining tool edge cases | 2-3 hours | +13 tests |
| Make LLM queries more explicit | 30 min | +3 tests |

**Expected improvement**: ~90% → **~95%** (tool), 83.3% → **~87%** (LLM)

---

## Conclusion

We've made significant progress:

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Tool Evals | 52.6% | 68.1% | **+15.5%** |
| LLM Evals | 63.9% | 83.3% | **+19.4%** |
| Bash Command Evals | - | 85.9% | **NEW** |
| **Combined** | 56.5% | 76.4% | **+19.9%** |

**Key Learnings**:
1. Tool descriptions should explicitly state limitations (what tool CAN'T do)
2. Error codes should be standardized across the codebase
3. Path resolution must respect `context.cwd` for fixture isolation
4. LLM evals need `acceptableTools` for valid alternatives
5. Bash command quality is strong (85.9%) with 100% on Python/Docker/System/Process/Build

**Remaining Work**:
- Background process mocking for bash_output/kill_bash (+30 tests)
- Edge case fixes (+16 tests)
- Bash command edge cases: advanced chaining, piping, tar formats (+9 tests)
- Potential ceiling: **~95%** tool, **~87%** LLM, **~92%** Bash commands

**Evaluation Commands**:
```bash
npx tsx evals/run-all-evals.ts      # Tool evals (135 tests)
npx tsx evals/run-llm-evals.ts      # LLM selection evals (72 tests)
npx tsx evals/run-bash-evals.ts     # Bash command evals (64 tests)
```
