# Test Plan: LLM Evaluation Runner

**Feature:** LLM Tool Selection Evaluation
**Purpose:** Evaluate whether the LLM correctly selects appropriate tools for natural language queries
**Status:** Not Started
**Phase:** 3 of 5 (Tool Evaluation System)

---

## Overview

The LLM Evaluation Runner tests the LLM's ability to:
1. Select the correct tool for a given query
2. Generate appropriate parameters for the selected tool
3. Avoid forbidden tools when applicable
4. Accept reasonable alternative tools when multiple tools could work

This is different from unit evaluation - we're testing the LLM's reasoning and tool selection, not the tool implementation itself.

---

## Test Cases

### Happy Path Tests

#### TC-001: Simple File Read Query
- **Description:** LLM should select read_file for straightforward file reading requests
- **Setup:** LLM with all tool declarations
- **Input:** Query: "Show me the contents of package.json"
- **Expected Output:**
  - Selected tool: `read_file`
  - Generated params contain: `{ path: "package.json" }` or `{ path: "./package.json" }`
  - No forbidden tools used
- **Verification:** Tool name matches, path parameter is reasonable

#### TC-002: Search Query
- **Description:** LLM should select search_code or grep for code search queries
- **Setup:** LLM with all tool declarations
- **Input:** Query: "Find all class definitions in the codebase"
- **Expected Output:**
  - Selected tool: `search_code` (preferred) or `grep` (acceptable)
  - Generated params contain query related to "class"
- **Verification:** Tool is one of the acceptable options

#### TC-003: File Pattern Matching
- **Description:** LLM should select glob for file pattern queries
- **Setup:** LLM with all tool declarations
- **Input:** Query: "Find all TypeScript test files"
- **Expected Output:**
  - Selected tool: `glob`
  - Generated params contain pattern like `**/*.test.ts`
- **Verification:** Tool is glob, pattern is reasonable

#### TC-004: Directory Listing
- **Description:** LLM should select list_directory for directory browsing
- **Setup:** LLM with all tool declarations
- **Input:** Query: "What files are in the src directory?"
- **Expected Output:**
  - Selected tool: `list_directory`
  - Generated params: `{ path: "src" }`
- **Verification:** Correct tool and path

#### TC-005: Code Modification
- **Description:** LLM should select edit_file for code changes
- **Setup:** LLM with all tool declarations
- **Input:** Query: "In test.txt, replace 'Hello' with 'Hi'"
- **Expected Output:**
  - Selected tool: `edit_file`
  - Generated params contain: file path, old_string, new_string
- **Verification:** Correct tool with all required parameters

### Ambiguous Query Tests

#### TC-006: Multiple Valid Tools (Search)
- **Description:** When query could use multiple tools, accept reasonable choices
- **Input:** Query: "Where is the User class?"
- **Expected Output:**
  - Selected tool: `search_code` OR `grep` OR `get_codebase_map`
  - Any of these is acceptable
- **Verification:** Tool is in acceptable list

#### TC-007: General vs Specific Tool
- **Description:** Prefer specific tools over general ones
- **Input:** Query: "Show me all async functions"
- **Expected Output:**
  - Preferred: `search_code` (AST-based)
  - Acceptable: `grep` (text-based)
  - Score: 1.0 for preferred, 0.8 for acceptable
- **Verification:** Scoring reflects tool quality

### Parameter Quality Tests

#### TC-008: Path Parameter Validation
- **Description:** Generated file paths should be reasonable
- **Input:** Query: "Read the README file"
- **Expected Output:**
  - Tool: `read_file`
  - Path: "README.md" OR "./README.md" OR "README"
  - NOT: "the README file" or other invalid paths
- **Verification:** Path parameter is usable

#### TC-009: Pattern Parameter Validation
- **Description:** Generated patterns should be valid
- **Input:** Query: "Find all .js files in src"
- **Expected Output:**
  - Tool: `glob`
  - Pattern: "src/**/*.js" OR "**/*.js" (with path: "src")
  - NOT: "all .js files" or other non-glob patterns
- **Verification:** Pattern is valid glob syntax

#### TC-010: Multiple Parameters
- **Description:** LLM should generate all required parameters
- **Input:** Query: "In foo.ts, change 'bar' to 'baz'"
- **Expected Output:**
  - Tool: `edit_file`
  - All params present: path, old_string, new_string
  - Values: path="foo.ts", old_string="bar", new_string="baz"
- **Verification:** All required params present and correct

### Forbidden Tool Tests

#### TC-011: Should Not Use Write For Read
- **Description:** LLM should not use write_file when asked to read
- **Input:** Query: "Show me the contents of test.txt"
- **Expected Output:**
  - Tool: `read_file`
  - Forbidden: `write_file`, `edit_file`, `delete_file`
- **Verification:** No forbidden tools used

#### TC-012: Should Not Use Delete For Edit
- **Description:** LLM should not use delete_file when asked to edit
- **Input:** Query: "Update the version in package.json"
- **Expected Output:**
  - Tool: `edit_file` or `write_file`
  - Forbidden: `delete_file`
- **Verification:** No forbidden tools used

### Edge Cases

#### TC-013: No Tool Needed (Conversational)
- **Description:** Some queries don't need tools
- **Input:** Query: "Thank you for your help"
- **Expected Output:**
  - No tool call OR minimal/safe tool
  - Should not call destructive tools
- **Verification:** Response is reasonable

#### TC-014: Unclear Query
- **Description:** Very vague queries
- **Input:** Query: "Check the files"
- **Expected Output:**
  - Tool: `list_directory` (reasonable default)
  - Should not call destructive tools
- **Verification:** Safe tool selection

#### TC-015: Complex Multi-Step Query
- **Description:** Queries requiring multiple steps
- **Input:** Query: "Find all TODOs in the codebase and list them"
- **Expected Output:**
  - First tool: `grep` or `search_code`
  - Params should target TODO pattern
- **Verification:** Reasonable first step selected

### Context-Aware Tests

#### TC-016: With File Context
- **Description:** LLM should use context when provided
- **Setup:** Context includes currentFile: "src/agent.ts"
- **Input:** Query: "Show me this file"
- **Expected Output:**
  - Tool: `read_file`
  - Path should reference agent.ts or current file
- **Verification:** Context influences parameters

#### TC-017: With Recent Files Context
- **Description:** LLM should consider recently accessed files
- **Setup:** Context includes recentFiles: ["src/tools.ts", "src/agent.ts"]
- **Input:** Query: "What does the agent do?"
- **Expected Output:**
  - Likely to reference files from recent context
- **Verification:** Uses context appropriately

### Error Handling Tests

#### TC-018: Invalid Tool Response
- **Description:** Handle cases where LLM responds with invalid tool
- **Input:** Query triggers invalid/non-existent tool
- **Expected Output:**
  - Result marked as failed
  - Error clearly indicated
  - Does not crash runner
- **Verification:** Graceful error handling

#### TC-019: Missing Required Parameters
- **Description:** Handle incomplete parameter generation
- **Input:** Query where LLM omits required param
- **Expected Output:**
  - Detected as parameter quality issue
  - Score reflects missing parameters
- **Verification:** Scoring accounts for missing params

#### TC-020: LLM Returns No Tool Call
- **Description:** Handle cases where LLM responds without calling tool
- **Input:** Query that should trigger tool, but LLM doesn't call
- **Expected Output:**
  - Result marked as failed
  - Reason: "No tool called"
  - Score: 0
- **Verification:** Properly detected and scored

### Integration Tests

#### TC-021: Full Evaluation Run
- **Description:** Run multiple LLM eval cases in sequence
- **Setup:** 10 diverse eval cases
- **Expected Output:**
  - All cases execute without errors
  - Summary statistics generated
  - Individual results captured
- **Verification:** Full pipeline works

#### TC-022: Accuracy Calculation
- **Description:** Correctly calculate tool selection accuracy
- **Setup:** Mix of passing and failing cases
- **Expected Output:**
  - Accuracy = (exact matches + acceptable matches) / total
  - Separate metrics for exact vs acceptable
- **Verification:** Math is correct

#### TC-023: Parameter Quality Scoring
- **Description:** Aggregate parameter quality across cases
- **Setup:** Cases with varying parameter quality
- **Expected Output:**
  - Average parameter quality score
  - Breakdown by parameter type (path, pattern, etc.)
- **Verification:** Scoring is consistent

### Performance Tests

#### TC-024: LLM Call Timeout
- **Description:** Handle slow LLM responses
- **Setup:** Configure timeout for LLM calls
- **Expected Output:**
  - Timeout respected
  - Cases marked as failed after timeout
- **Verification:** Timeout mechanism works

#### TC-025: Parallel Execution
- **Description:** Run LLM evals in parallel (if API allows)
- **Setup:** Multiple cases with parallel option
- **Expected Output:**
  - Faster than sequential
  - All results captured correctly
- **Verification:** Parallel execution works correctly

---

## Implementation Checklist

### Phase 1: Plan (BEFORE coding)
- [x] Test plan written and reviewed
- [x] All test cases documented above
- [x] Edge cases identified
- [x] Error scenarios planned

### Phase 2: Red (Write failing tests)
- [ ] Create `tests/eval/llm_runner.test.ts`
- [ ] Write tests for all 25+ test cases above
- [ ] Run `npm test` - verify tests FAIL
- [ ] Tests are clear and well-named

### Phase 3: Green (Make tests pass)
- [ ] Create `src/eval/llm_runner.ts`
- [ ] Implement LLMEvalRunner class
- [ ] Implement tool selection scoring
- [ ] Implement parameter quality scoring
- [ ] Run `npm test` - verify tests PASS

### Phase 4: Refactor (Clean up)
- [ ] Code reviewed for clarity
- [ ] Remove duplication
- [ ] Run `npm test` - still passes
- [ ] Type safety verified

### Phase 5: Verify (E2E testing)
- [ ] Create test script with real LLM
- [ ] Run on 10+ diverse queries
- [ ] Verify tool selection works
- [ ] Verify scoring is reasonable

### Phase 6: Document
- [ ] Update this test plan with results
- [ ] Update `TOOLS_EVALUATION_IMPLEMENTATION_PLAN.md`
- [ ] Mark all checkboxes ✅
- [ ] Document any issues found

---

## Success Criteria

- [ ] All unit tests pass (25+ tests)
- [ ] LLMEvalRunner correctly interfaces with Gemini API
- [ ] Tool selection scoring works accurately
- [ ] Parameter quality scoring works
- [ ] Error handling is robust
- [ ] Can run evaluations on real queries
- [ ] Summary statistics are accurate
- [ ] Code follows project conventions (snake_case, etc.)

---

## Files

**Tests:**
- `tests/eval/llm_runner.test.ts` - Main test file (25+ tests)

**Implementation:**
- `src/eval/llm_runner.ts` - LLMEvalRunner class
- `src/eval/types.ts` - Extended with LLM-specific types

**Datasets (created after implementation):**
- `evals/datasets/llm/file_operations.json` - 20+ cases
- `evals/datasets/llm/search_operations.json` - 20+ cases
- `evals/datasets/llm/code_analysis.json` - 15+ cases
- `evals/datasets/llm/command_execution.json` - 10+ cases

**Documentation:**
- `docs/testing/test-plans/llm-eval-runner.md` - This file

---

## Example LLM Evaluation Case

```json
{
  "id": "llm-file-001",
  "description": "Read a specific file",
  "tool": "llm_evaluation",
  "category": "llm_selection",
  "tags": ["file_ops", "read"],
  "difficulty": 1,
  "input": {
    "query": "Show me the contents of package.json"
  },
  "expected": {
    "expectedTool": "read_file",
    "acceptableTools": [],
    "forbiddenTools": ["write_file", "delete_file", "edit_file"],
    "expectedParams": {
      "path": {
        "pattern": "package\\.json"
      }
    }
  }
}
```

---

## Notes

- LLM evaluation is inherently non-deterministic
- Use temperature=0 for more consistent results
- Some queries may have multiple valid answers
- Scoring should reflect "good enough" not just "perfect"
- Real-world usage is the ultimate test

---

**Status:** Test plan complete, ready for implementation
**Next Step:** Write failing tests (RED phase)
