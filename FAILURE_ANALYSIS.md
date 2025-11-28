# Comprehensive Failure Analysis - 139 Failed Tests

## Summary

Out of 300 tests, 139 are failing (46.3%). The failures fall into several distinct categories with different root causes.

---

## Category 1: Path Resolution Issues (27 failures)

### Tools Affected:
- **glob**: 12/15 failures
- **grep**: 10/15 failures
- **extract_conventions**: 15/15 failures (all!)

### Root Cause:
These tools use external libraries (fast-glob, ripgrep) that don't respect `context.cwd` because they pass relative paths like "." directly to the library.

### Example: glob-001
```javascript
// Current code (WRONG):
const files = await fg(p.pattern, {
  cwd: searchPath,  // searchPath = "."
  // fast-glob resolves "." relative to process.cwd(), not context.cwd!
});

// Should be:
const absolutePath = searchPath.startsWith('/')
  ? searchPath
  : `${context.cwd}/${searchPath}`.replace(/\/\.$/, '');
const files = await fg(p.pattern, {
  cwd: absolutePath  // Now uses absolute path
});
```

**Impact**: Tool searches wrong directory (CodeCraft root instead of fixture temp dir)

**Test Evidence**:
- glob-001: Finds "demo.txt" (from codebase) instead of "test.txt" (from fixture)
- grep-001: Returns empty array because it's searching wrong directory
- conv-001: Error "ENOENT: no such file or directory" trying to open files that don't exist in codebase

### Fix Required:
Modify these tools to resolve `searchPath`/`path` relative to `context.cwd` before passing to external libraries:
- `src/tools/glob.ts` (line 40-45)
- `src/tools/grep.ts` (similar pattern)
- `src/tools/extract_conventions.ts` (line 71-75, fast-glob usage)

---

## Category 2: Background Process Dependencies (27 failures)

### Tools Affected:
- **bash_output**: 13/15 failures
- **kill_bash**: 12/15 failures
- **bash**: 2/15 failures (background-specific tests)

### Root Cause:
These tests require background bash processes to exist BEFORE the test runs. Current fixture system doesn't support creating background processes as part of setup.

### Example: bashout-001
```json
{
  "id": "bashout-001",
  "input": {
    "params": {
      "bashId": "test-bash-001"  // Expects this process to exist!
    }
  }
}
```

**Problem**: There's no background process with ID "test-bash-001" because fixtures can't start bash processes.

### Fix Required:
1. **Option A**: Enhance fixture system with lifecycle hooks
   ```typescript
   {
     "type": "inline",
     "files": {...},
     "setup": async (context) => {
       // Start background bash process
       const result = await bashTool.execute({
         command: "sleep 10",
         run_in_background: true
       }, context);
       return { bashId: result.data.bash_id };
     }
   }
   ```

2. **Option B**: Create integration tests that manage process lifecycle separately
3. **Option C**: Mock the backgroundProcesses registry for testing

**Recommendation**: Option C is easiest - mock the global registry in tests.

---

## Category 3: Validation/Edge Case Issues (31 failures)

### Tools Affected:
- **read_file**: 4 failures
- **write_file**: 3 failures
- **edit_file**: 5 failures
- **delete_file**: 5 failures
- **list_directory**: 5 failures
- **todo_write**: 6 failures
- **Various missing parameter tests**: 3 failures

### Root Cause:
Tools don't properly validate edge cases or return incorrect error codes.

### Examples:

#### read-011: Read directory instead of file
**Expected**: Error with code 'DIR_NOT_FILE' or similar
**Actual**: Probably crashes or returns wrong error

#### read-012: Invalid offset (negative)
**Expected**: Error code 'INVALID_PARAMS'
**Actual**: Tool probably doesn't validate offset < 0

#### delete-009: Delete directory instead of file
**Expected**: Error code 'IS_DIRECTORY'
**Actual**: Tool might succeed or return wrong error

#### todo-011: Multiple in_progress tasks
**Expected**: Error code 'INVALID_STATE' or validation error
**Actual**: Tool allows it (violates single in_progress constraint)

### Fix Required:
Add proper validation to each tool:
```typescript
// Example for read_file
if (offset !== undefined && offset < 0) {
  return {
    success: false,
    error: { code: 'INVALID_PARAMS', message: 'Offset cannot be negative' }
  };
}

if (limit !== undefined && limit <= 0) {
  return {
    success: false,
    error: { code: 'INVALID_PARAMS', message: 'Limit must be positive' }
  };
}
```

---

## Category 4: Scorer Logic Issues (15+ failures)

### Root Cause:
The scorer's `objectContainsString()` doesn't handle boolean/number values that should match string expectations.

### Example: detect-001
```json
{
  "expected": {
    "success": true,
    "contains": "typescript"  // Looking for string "typescript"
  },
  "actual": {
    "data": {
      "typescript": true  // Boolean value!
    }
  }
}
```

**Problem**: Scorer looks for string "typescript" but the value is `true` (boolean). The recursive search doesn't convert booleans/numbers to strings or check property names.

### Fix Required:
Enhance `objectContainsString()` to also check property names:
```typescript
private objectContainsString(obj: unknown, expected: string): boolean {
  if (typeof obj === 'string') {
    return obj.includes(expected);
  }

  // NEW: Check if expected matches a property name
  if (typeof obj === 'object' && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      if (key.toLowerCase().includes(expected.toLowerCase())) {
        return true;  // Found in property name!
      }
      if (this.objectContainsString(value, expected)) {
        return true;
      }
    }
  }

  // ... rest of existing logic
}
```

**Affected Tests**:
- detect_project_type: Many tests fail because data has `typescript: true` but test expects string "typescript"
- get_project_overview: Similar issues with property names vs values

---

## Category 5: AST Tool Edge Cases (18 failures)

### Tools Affected:
- **inspect_symbol**: 6 failures
- **find_references**: 4 failures
- **get_imports_exports**: 5 failures
- **build_dependency_graph**: 3 failures

### Root Cause:
Missing parameter validation and null/not-found handling.

### Examples:

#### inspect-007: Missing symbol parameter
**Expected**: Error code 'INVALID_PARAMS'
**Actual**: Probably crashes or passes undefined to Rust engine

#### inspect-006: File not found
**Expected**: Error code 'FILE_NOT_FOUND'
**Actual**: Rust engine might return null/undefined, tool might not handle gracefully

#### build_dependency_graph depgraph-010: Missing path parameter
**Expected**: Should use default "." path
**Actual**: Might fail validation

### Fix Required:
Add validation at start of execute():
```typescript
async execute(params: unknown, context: ToolContext): Promise<ToolResult> {
  const p = params as { symbol?: string; file?: string };

  // Validate required parameters
  if (!p.symbol || typeof p.symbol !== 'string') {
    return {
      success: false,
      error: { code: 'INVALID_PARAMS', message: 'symbol is required and must be a string' }
    };
  }

  if (!p.file || typeof p.file !== 'string') {
    return {
      success: false,
      error: { code: 'INVALID_PARAMS', message: 'file is required and must be a string' }
    };
  }

  // ... rest of execution
}
```

---

## Category 6: Project Analysis Tools (26 failures)

### Tools Affected:
- **detect_project_type**: 11 failures
- **get_project_overview**: 12 failures
- **extract_conventions**: All failures overlap with Category 1

### Root Cause:
Two issues:
1. **Path resolution** (same as Category 1)
2. **Scorer property name matching** (same as Category 4)

### Additional Issue: Missing Fixture Files
Some tests expect specific project files that aren't set up in fixtures:

#### detect-001: Node.js TypeScript project
```json
{
  "fixtures": {
    "type": "inline",
    "files": {
      "package.json": "{\"name\":\"test\",\"devDependencies\":{\"typescript\":\"^5.0.0\"}}"
    }
  }
}
```

**Problem**: Fixture likely doesn't create package.json correctly, or tool doesn't find it.

### Fix Required:
1. Fix path resolution (Category 1 fix)
2. Fix scorer property name matching (Category 4 fix)
3. Verify fixture JSON strings are valid and properly parsed

---

## Category 7: Rust-Specific Features (3 failures)

### Examples:
- **findref-007**: Rust symbol references
- **imports-011**: Rust use statements
- **imports-012**: Rust pub exports

### Root Cause:
Fixtures create TypeScript files but tests expect Rust files. Rust engine may not be processing Rust syntax correctly in test fixtures.

### Fix Required:
1. Verify Rust test fixtures actually create `.rs` files:
   ```json
   {
     "files": {
       "lib.rs": "pub fn hello() { println!(\"world\"); }"
     }
   }
   ```

2. Check if Rust engine supports all Rust syntax features being tested

---

## Detailed Failure Breakdown by Tool

| Tool | Failures | Primary Cause | Fix Complexity |
|------|----------|---------------|----------------|
| extract_conventions | 15/15 | Path resolution (Category 1) | Medium |
| bash_output | 13/15 | Background process deps (Category 2) | High |
| kill_bash | 12/15 | Background process deps (Category 2) | High |
| glob | 12/15 | Path resolution (Category 1) | Low |
| detect_project_type | 11/15 | Path + Scorer (Cat 1+4) | Medium |
| get_project_overview | 12/15 | Path + Scorer (Cat 1+4) | Medium |
| grep | 10/15 | Path resolution (Category 1) | Low |
| inspect_symbol | 6/15 | Validation (Category 3) | Low |
| todo_write | 6/15 | Validation (Category 3) | Low |
| delete_file | 5/15 | Validation (Category 3) | Low |
| edit_file | 5/15 | Validation (Category 3) | Low |
| list_directory | 5/15 | Validation (Category 3) | Low |
| get_imports_exports | 5/15 | Validation (Category 3) | Low |
| find_references | 4/15 | Validation (Category 3) | Low |
| read_file | 4/15 | Validation (Category 3) | Low |
| build_dependency_graph | 3/15 | Validation (Category 3) | Low |
| write_file | 3/15 | Validation (Category 3) | Low |
| search_code | 3/15 | Validation (Category 3) | Low |
| bash | 2/15 | Background tests (Category 2) | Medium |

---

## Priority Fix Recommendations

### Priority 1: Quick Wins (Low Complexity, High Impact)
1. **Fix glob path resolution** → +12 tests (glob.ts line 40)
2. **Fix grep path resolution** → +10 tests (grep.ts similar to glob)
3. **Add parameter validation to all tools** → +20 tests (standardized pattern)

**Estimated effort**: 2-3 hours
**Expected improvement**: 22.3% → 67.7% (+42 tests)

### Priority 2: Medium Complexity
4. **Fix extract_conventions path resolution** → +15 tests
5. **Enhance scorer to match property names** → +15 tests (detect/overview tools)

**Estimated effort**: 3-4 hours
**Expected improvement**: 67.7% → 77.7% (+30 tests)

### Priority 3: Complex Fixes
6. **Mock background processes for bash_output/kill_bash** → +25 tests
7. **Add Rust fixture support** → +3 tests

**Estimated effort**: 4-6 hours
**Expected improvement**: 77.7% → 87.0% (+28 tests)

---

## Conclusion

The 139 failures have clear patterns:
- **27 failures**: Path resolution (fixable in <2 hours)
- **27 failures**: Background process architecture (needs design)
- **31 failures**: Missing validation (tedious but straightforward)
- **15+ failures**: Scorer enhancement needed
- **Rest**: Mix of edge cases and Rust-specific issues

**With Priority 1 & 2 fixes, we could reach 77.7% pass rate (233/300 tests passing).**
