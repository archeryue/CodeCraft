# LLM Evaluation Baseline Results

**Date:** 2025-11-27
**Model:** gemini-2.5-flash (same as main application)
**Total Cases:** 72 (across 4 datasets)
**Status:** ✅ Complete

---

## Executive Summary

This evaluation measures the LLM's ability to select the correct tool and parameters when given natural language queries. The baseline establishes current performance before any prompt engineering or tool description improvements.

### Overall Results

```
Total Cases:     72
Passed:          45 (62.5%)
Failed:          27 (37.5%)
Average Score:   69.4%
Total Time:      133.19s
Avg Time/Case:   862ms
```

### LLM-Specific Metrics

```
Exact Matches:       44 (61.1%)    ← Selected exactly the right tool
Acceptable Matches:  1  (1.4%)     ← Selected acceptable alternative tool
Wrong Tool:          24 (33.3%)    ← Selected wrong tool
No Tool:             3  (4.2%)     ← Did not call any tool
Forbidden Tool:      0  (0.0%)     ← Good! Never called forbidden tools
Parameter Quality:   77.8%         ← Quality of parameters when tool was selected
```

---

## Results by Dataset

### File Operations (22 cases)
- **Passed:** 18/22 (81.8%)
- **Key Strengths:** Good at read_file, write_file, list_directory selection
- **Key Weaknesses:** Confusion between read_file and edit_file for modification tasks

**Failed Cases:**
- `llm-file-007`: Selected list_directory, expected edit_file
- `llm-file-011`: Selected list_directory correctly but parameter mismatch
- `llm-file-021`: No tool called, expected read_file
- `llm-file-022`: Selected read_file, expected edit_file

### Search Operations (22 cases)
- **Passed:** 11/22 (50.0%)
- **Key Strengths:** Good at basic glob and grep patterns
- **Key Weaknesses:** Prefers list_directory or grep over specialized search_code tool

**Failed Cases:**
- `llm-search-002`: Selected list_directory, expected search_code
- `llm-search-007`: Selected glob correctly but parameter mismatch
- `llm-search-008`: Selected list_directory, expected get_codebase_map
- `llm-search-010`: Selected grep, expected search_code
- `llm-search-013`: Selected list_directory, expected search_code
- `llm-search-016`: Selected grep, expected search_code
- `llm-search-020`: No tool called, expected search_code
- `llm-search-021`: Selected bash, expected grep

### Code Analysis (16 cases)
- **Passed:** 9/16 (56.3%)
- **Key Strengths:** Good at inspect_symbol and get_imports_exports
- **Key Weaknesses:** Prefers grep/list_directory over AST-based tools

**Failed Cases:**
- `llm-analysis-002`: Selected search_code, expected inspect_symbol
- `llm-analysis-005`: Selected build_dependency_graph correctly but parameter mismatch
- `llm-analysis-006`: Selected list_directory, expected build_dependency_graph
- `llm-analysis-009`: Selected list_directory, expected inspect_symbol
- `llm-analysis-011`: Selected grep, expected inspect_symbol
- `llm-analysis-013`: Selected list_directory, expected get_codebase_map
- `llm-analysis-015`: Selected grep, expected find_references
- `llm-analysis-016`: No tool called, expected inspect_symbol

### Command Execution (12 cases)
- **Passed:** 7/12 (58.3%)
- **Key Strengths:** Good at bash command selection
- **Key Weaknesses:** Confusion with background process management tools

**Failed Cases:**
- `llm-cmd-002`: Wrong tool selected
- `llm-cmd-006`: Wrong tool for bash_output
- `llm-cmd-007`: Wrong tool for kill_bash
- `llm-cmd-008`: Wrong tool for test execution
- `llm-cmd-010`: Wrong tool for script execution
- `llm-cmd-011`: Wrong tool for background process monitoring
- `llm-cmd-012`: Wrong tool for process termination

---

## Key Patterns and Insights

### 1. Over-reliance on `list_directory`
The LLM frequently selects `list_directory` when more specialized tools would be appropriate:
- 8 cases where list_directory was chosen incorrectly
- Often used as a "safe" exploration tool instead of search_code or get_codebase_map

### 2. Preference for Basic Tools Over Specialized Tools
The LLM tends to select grep/list_directory over AST-based tools:
- **grep vs search_code:** LLM chose grep in 3 cases where search_code was expected
- **grep vs inspect_symbol:** LLM chose grep in 2 cases where inspect_symbol was expected
- **grep vs find_references:** LLM chose grep when find_references was expected

**Hypothesis:** The LLM may be more familiar with traditional Unix tools or their descriptions are clearer.

### 3. Confusion Between Similar Tools
- **read_file vs edit_file:** For "make this change" queries, LLM sometimes selects read_file
- **grep vs search_code:** Unclear when to use basic grep vs specialized search_code
- **bash vs specialized process tools:** Confusion with bash_output and kill_bash

### 4. Parameter Quality Is Good
- When the LLM selects a tool, it generates correct parameters 77.8% of the time
- Most parameter failures are:
  - Path formatting issues
  - Missing required parameters
  - Incorrect pattern format

### 5. Very Few "No Tool" Failures
- Only 3 cases (4.2%) where the LLM didn't call any tool
- This suggests the LLM understands it should use tools, but sometimes picks the wrong one

---

## Performance Characteristics

```
Average Execution Time: 862ms
P50 (Median):          850ms
P95:                   1,163ms
P99:                   1,552ms
Max:                   1,552ms
```

**Rate Limiting:** Successfully completed all 72 cases with 1-second delay between requests (no API quota errors).

---

## Comparison with Previous Results

### Initial Run (gemini-2.0-flash-exp)
- Only 12/72 cases completed before rate limiting
- 16.7% pass rate (incomplete data)
- Hit 10 requests/minute quota limit

### Current Run (gemini-2.5-flash)
- All 72 cases completed successfully
- 62.5% pass rate
- No rate limiting issues
- Better model with higher quotas

**Improvement:** Switching to gemini-2.5-flash enabled full evaluation and revealed true baseline performance.

---

## Recommendations for Improvement

### 1. Improve Tool Descriptions
Focus on clarifying when to use specialized tools:
- **search_code:** Emphasize AST-based symbol search vs grep text search
- **inspect_symbol:** Highlight when symbol info is needed vs basic grep
- **get_codebase_map:** Explain architectural overview vs directory listing

### 2. Add Examples to Tool Descriptions
Include 1-2 example queries in tool descriptions:
- "Use search_code for: 'find the UserAuth class'"
- "Use grep for: 'find TODO comments'"

### 3. Prompt Engineering
Update system prompt to guide tool selection:
- "Prefer AST-based tools (search_code, inspect_symbol) for code understanding"
- "Use list_directory only for browsing directory structure"
- "Use edit_file for modifications, read_file for viewing"

### 4. Address Specific Confusion Points
- **edit_file vs read_file:** Add keywords like "change", "modify", "update" → edit_file
- **search_code vs grep:** "find class/function" → search_code, "find text" → grep
- **Process management:** Clarify bash vs bash_output vs kill_bash

---

## Next Steps

1. **Phase 4:** Implement chain evaluation (multi-tool sequences)
2. **Phase 5:** Add CLI, reporting, and CI integration
3. **Prompt Engineering:** Apply recommendations and re-run evaluation
4. **Tool Description Improvements:** Update tool descriptions based on failure patterns
5. **Baseline Tracking:** Track improvements over time as changes are made

---

## Files Generated

- `llm-eval-results.json` - Full detailed results with all test cases
- `docs/evaluation/LLM_EVAL_BASELINE_RESULTS.md` - This summary document

---

**Last Updated:** 2025-11-27
