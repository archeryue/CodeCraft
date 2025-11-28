# Test Plan: Evaluation Types

## Overview
Test the core type definitions for the evaluation system. These types define the structure of evaluation cases, results, and summaries.

## Components Under Test
- `src/eval/types.ts`
  - EvalCase
  - EvalInput
  - EvalExpectation
  - EvalResult
  - EvalSummary
  - FixtureSpec
  - Helper types and enums

---

## Test Cases

### Category: Type Validation

#### TC-001: EvalCase has all required fields
- **Description:** Verify EvalCase type requires all mandatory fields
- **Setup:** TypeScript compilation
- **Input:** EvalCase object with missing required field
- **Expected Output:** TypeScript compilation error
- **Verification:** Code fails to compile without required fields

#### TC-002: EvalCase accepts valid difficulty range
- **Description:** Difficulty should be 1-5
- **Setup:** Create EvalCase instances
- **Input:** EvalCase with difficulty values: 0, 1, 3, 5, 6
- **Expected Output:** Values 1-5 accepted, 0 and 6 should be flagged
- **Verification:** Runtime validation (if implemented) or documentation

#### TC-003: EvalCategory enum contains all expected values
- **Description:** Verify all category types are defined
- **Setup:** Import EvalCategory
- **Input:** Check enum values
- **Expected Output:** Contains: happy_path, edge_case, error_handling, performance, security, llm_selection, llm_params, chain, e2e
- **Verification:** Enum includes all 9 categories

### Category: EvalInput Variants

#### TC-004: EvalInput supports params-based input
- **Description:** Unit eval cases use params
- **Setup:** Create EvalInput with params
- **Input:** `{ params: { path: 'test.txt' } }`
- **Expected Output:** Valid EvalInput
- **Verification:** TypeScript accepts the structure

#### TC-005: EvalInput supports query-based input
- **Description:** LLM eval cases use natural language query
- **Setup:** Create EvalInput with query
- **Input:** `{ query: 'Show me package.json' }`
- **Expected Output:** Valid EvalInput
- **Verification:** TypeScript accepts the structure

#### TC-006: EvalInput supports chain-based input
- **Description:** Chain eval cases use step sequences
- **Setup:** Create EvalInput with chain
- **Input:** `{ chain: [{ tool: 'read_file', params: {...} }] }`
- **Expected Output:** Valid EvalInput
- **Verification:** TypeScript accepts the structure

#### TC-007: EvalInput supports context override
- **Description:** Can override cwd and env
- **Setup:** Create EvalInput with context
- **Input:** `{ params: {...}, context: { cwd: '/tmp', env: { TEST: '1' } } }`
- **Expected Output:** Valid EvalInput
- **Verification:** TypeScript accepts the structure

### Category: EvalExpectation Matchers

#### TC-008: EvalExpectation supports exact matching
- **Description:** Exact match for deterministic outputs
- **Setup:** Create expectation with exact
- **Input:** `{ exact: 'Hello, World!' }`
- **Expected Output:** Valid EvalExpectation
- **Verification:** TypeScript accepts the structure

#### TC-009: EvalExpectation supports contains matching
- **Description:** Partial match for flexible outputs
- **Setup:** Create expectation with contains
- **Input:** `{ contains: 'error' }`
- **Expected Output:** Valid EvalExpectation
- **Verification:** TypeScript accepts the structure

#### TC-010: EvalExpectation supports pattern matching
- **Description:** Regex matching for text outputs
- **Setup:** Create expectation with pattern
- **Input:** `{ pattern: '^Error: .+' }`
- **Expected Output:** Valid EvalExpectation
- **Verification:** TypeScript accepts the structure

#### TC-011: EvalExpectation supports schema validation
- **Description:** JSON Schema for structured outputs
- **Setup:** Create expectation with schema
- **Input:** `{ schema: { type: 'object', required: ['name'] } }`
- **Expected Output:** Valid EvalExpectation
- **Verification:** TypeScript accepts the structure

#### TC-012: EvalExpectation supports custom scorer
- **Description:** Named custom scoring function
- **Setup:** Create expectation with scorer
- **Input:** `{ scorer: 'semantic_similarity' }`
- **Expected Output:** Valid EvalExpectation
- **Verification:** TypeScript accepts the structure

#### TC-013: EvalExpectation supports success flag
- **Description:** Indicate expected success/failure
- **Setup:** Create expectation with success flag
- **Input:** `{ success: false, errorCode: 'FILE_NOT_FOUND' }`
- **Expected Output:** Valid EvalExpectation
- **Verification:** TypeScript accepts the structure

#### TC-014: EvalExpectation supports performance constraints
- **Description:** Max execution time and memory
- **Setup:** Create expectation with performance
- **Input:** `{ performance: { maxTimeMs: 1000, maxMemoryMb: 100 } }`
- **Expected Output:** Valid EvalExpectation
- **Verification:** TypeScript accepts the structure

#### TC-015: EvalExpectation supports LLM-specific fields
- **Description:** Expected tool and params for LLM evals
- **Setup:** Create expectation for LLM eval
- **Input:** `{ expectedTool: 'read_file', expectedParams: { path: {...} } }`
- **Expected Output:** Valid EvalExpectation
- **Verification:** TypeScript accepts the structure

### Category: FixtureSpec Types

#### TC-016: FixtureSpec supports inline type
- **Description:** Inline fixtures with files map
- **Setup:** Create inline FixtureSpec
- **Input:** `{ type: 'inline', files: { 'test.txt': 'content' } }`
- **Expected Output:** Valid FixtureSpec
- **Verification:** TypeScript accepts the structure

#### TC-017: FixtureSpec supports directory type
- **Description:** Directory fixtures with source path
- **Setup:** Create directory FixtureSpec
- **Input:** `{ type: 'directory', sourcePath: './fixtures/example' }`
- **Expected Output:** Valid FixtureSpec
- **Verification:** TypeScript accepts the structure

#### TC-018: FixtureSpec supports preset type
- **Description:** Preset fixtures by name
- **Setup:** Create preset FixtureSpec
- **Input:** `{ type: 'preset', name: 'typescript-project' }`
- **Expected Output:** Valid FixtureSpec
- **Verification:** TypeScript accepts the structure

#### TC-019: FixtureSpec supports snapshot type
- **Description:** Git snapshot fixtures
- **Setup:** Create snapshot FixtureSpec
- **Input:** `{ type: 'snapshot', repository: 'https://...', commit: 'abc123' }`
- **Expected Output:** Valid FixtureSpec
- **Verification:** TypeScript accepts the structure

#### TC-020: FixtureSpec supports generated type
- **Description:** Generated fixtures
- **Setup:** Create generated FixtureSpec
- **Input:** `{ type: 'generated', generator: 'typescript-app' }`
- **Expected Output:** Valid FixtureSpec
- **Verification:** TypeScript accepts the structure

### Category: EvalResult Structure

#### TC-021: EvalResult captures all execution details
- **Description:** Result includes all necessary fields
- **Setup:** Create EvalResult
- **Input:** Full result object
- **Expected Output:** Contains caseId, passed, score, actual, expected, executionTimeMs, timestamp
- **Verification:** TypeScript requires all fields

#### TC-022: EvalResult supports breakdown field
- **Description:** Detailed scoring breakdown
- **Setup:** Create EvalResult with breakdown
- **Input:** `{ breakdown: [{ criterion: 'exact_match', passed: true, score: 1 }] }`
- **Expected Output:** Valid EvalResult
- **Verification:** TypeScript accepts the structure

#### TC-023: EvalResult supports error field
- **Description:** Error details when execution fails
- **Setup:** Create EvalResult with error
- **Input:** `{ error: { code: 'TIMEOUT', message: '...' } }`
- **Expected Output:** Valid EvalResult
- **Verification:** TypeScript accepts the structure

#### TC-024: EvalResult supports LLM-specific fields
- **Description:** Track selected tool and generated params
- **Setup:** Create LLM EvalResult
- **Input:** `{ selectedTool: 'read_file', generatedParams: {...} }`
- **Expected Output:** Valid EvalResult
- **Verification:** TypeScript accepts the structure

### Category: EvalSummary Aggregation

#### TC-025: EvalSummary has all summary fields
- **Description:** Summary includes all necessary statistics
- **Setup:** Create EvalSummary
- **Input:** Full summary object
- **Expected Output:** Contains subject, totalCases, passedCases, failedCases, passRate, averageScore, byCategory, performance, failures, timestamp
- **Verification:** TypeScript requires all fields

#### TC-026: EvalSummary byCategory structure
- **Description:** Category breakdown with statistics
- **Setup:** Create byCategory map
- **Input:** Category statistics
- **Expected Output:** Each category has: total, passed, passRate, avgScore
- **Verification:** TypeScript accepts the structure

#### TC-027: EvalSummary performance structure
- **Description:** Performance percentiles
- **Setup:** Create performance stats
- **Input:** Performance object
- **Expected Output:** Contains avgExecutionTimeMs, p50, p95, p99, maxExecutionTimeMs
- **Verification:** TypeScript accepts the structure

### Category: Helper Types

#### TC-028: ChainStep structure
- **Description:** Tool chain step definition
- **Setup:** Create ChainStep
- **Input:** `{ tool: 'read_file', params: {...}, extractOutput: '$.data' }`
- **Expected Output:** Valid ChainStep
- **Verification:** TypeScript accepts the structure

#### TC-029: ChainStep supports from_previous
- **Description:** Reference previous step output
- **Setup:** Create ChainStep with from_previous
- **Input:** `{ tool: 'write_file', params: 'from_previous' }`
- **Expected Output:** Valid ChainStep
- **Verification:** TypeScript accepts params as string literal or object

#### TC-030: ScoreBreakdown structure
- **Description:** Individual scoring criterion result
- **Setup:** Create ScoreBreakdown
- **Input:** `{ criterion: 'tool_selection', passed: true, score: 1, details: '...' }`
- **Expected Output:** Valid ScoreBreakdown
- **Verification:** TypeScript accepts the structure

---

## E2E Verification Steps

Since types are compile-time constructs, E2E verification is primarily through usage in actual code:

1. **Import types in test file**
   ```typescript
   import { EvalCase, EvalResult, EvalSummary } from '../src/eval/types';
   ```

2. **Create sample instances**
   ```typescript
   const sampleCase: EvalCase = {
     id: 'test-001',
     description: 'Test case',
     tool: 'read_file',
     category: 'happy_path',
     tags: ['read', 'file'],
     difficulty: 1,
     input: { params: { path: 'test.txt' } },
     expected: { success: true, exact: 'content' }
   };
   ```

3. **Verify compilation**
   - Run `npm run build` or `npx tsc --noEmit`
   - Ensure no TypeScript errors

4. **Verify IDE support**
   - Check autocomplete works
   - Check type errors are highlighted
   - Verify JSDoc comments show up

---

## Success Criteria

- [ ] All types defined in `src/eval/types.ts`
- [ ] TypeScript compilation successful
- [ ] All required fields enforced by type system
- [ ] Optional fields properly typed
- [ ] JSDoc comments provide clear documentation
- [ ] Types align with implementation plan
- [ ] No `any` types unless absolutely necessary
- [ ] Enums defined for category, fixture type, etc.

---

## Notes

- Types should match the architecture described in implementation plan
- Focus on type safety and developer experience
- Consider future extensibility (e.g., new matcher types)
- Ensure types work well with existing ToolResult and ToolContext types
