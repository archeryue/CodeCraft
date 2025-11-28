# Test Plan: Evaluation Scorer

## Overview
Test the EvalScorer class that scores tool execution results against expected outcomes. The scorer supports multiple matching strategies and custom scoring functions.

## Component Under Test
- `src/eval/scorer.ts`
  - EvalScorer class
  - Built-in matchers (exact, contains, pattern, schema)
  - Custom scorer registry
  - Breakdown generation

---

## Test Cases

### Category: Exact Matching

#### TC-001: Exact match with string
- **Description:** String exactly matches expected
- **Setup:** EvalScorer instance
- **Input:**
  - Actual: 'Hello, World!'
  - Expected: `{ exact: 'Hello, World!' }`
- **Expected Output:**
  - passed: true
  - score: 1.0
  - breakdown: [{ criterion: 'exact_match', passed: true, score: 1 }]
- **Verification:** Check scoring result

#### TC-002: Exact match with number
- **Description:** Number exactly matches expected
- **Setup:** EvalScorer instance
- **Input:**
  - Actual: 42
  - Expected: `{ exact: 42 }`
- **Expected Output:** passed: true, score: 1.0
- **Verification:** Check result

#### TC-003: Exact match with object
- **Description:** Deep object equality
- **Setup:** EvalScorer instance
- **Input:**
  - Actual: `{ name: 'test', value: 123 }`
  - Expected: `{ exact: { name: 'test', value: 123 } }`
- **Expected Output:** passed: true, score: 1.0
- **Verification:** Check result

#### TC-004: Exact match with array
- **Description:** Array equality (order matters)
- **Setup:** EvalScorer instance
- **Input:**
  - Actual: [1, 2, 3]
  - Expected: `{ exact: [1, 2, 3] }`
- **Expected Output:** passed: true, score: 1.0
- **Verification:** Check result

#### TC-005: Exact match fails on different order
- **Description:** Array order matters for exact match
- **Setup:** EvalScorer instance
- **Input:**
  - Actual: [1, 3, 2]
  - Expected: `{ exact: [1, 2, 3] }`
- **Expected Output:** passed: false, score: 0
- **Verification:** Check result

#### TC-006: Exact match fails on type mismatch
- **Description:** '42' !== 42
- **Setup:** EvalScorer instance
- **Input:**
  - Actual: '42'
  - Expected: `{ exact: 42 }`
- **Expected Output:** passed: false, score: 0
- **Verification:** Check result

#### TC-007: Exact match with null and undefined
- **Description:** Handle null/undefined correctly
- **Setup:** EvalScorer instance
- **Input:**
  - Test 1: Actual: null, Expected: `{ exact: null }`
  - Test 2: Actual: undefined, Expected: `{ exact: undefined }`
  - Test 3: Actual: null, Expected: `{ exact: undefined }`
- **Expected Output:**
  - Test 1: passed: true
  - Test 2: passed: true
  - Test 3: passed: false
- **Verification:** Check results

### Category: Contains Matching

#### TC-008: Contains substring
- **Description:** String contains expected substring
- **Setup:** EvalScorer instance
- **Input:**
  - Actual: 'Hello, World!'
  - Expected: `{ contains: 'World' }`
- **Expected Output:** passed: true, score: 1.0
- **Verification:** Check result

#### TC-009: Contains fails on missing substring
- **Description:** Substring not found
- **Setup:** EvalScorer instance
- **Input:**
  - Actual: 'Hello, World!'
  - Expected: `{ contains: 'Goodbye' }`
- **Expected Output:** passed: false, score: 0
- **Verification:** Check result

#### TC-010: Contains with array membership
- **Description:** Array contains expected element
- **Setup:** EvalScorer instance
- **Input:**
  - Actual: [1, 2, 3, 4]
  - Expected: `{ contains: 3 }`
- **Expected Output:** passed: true, score: 1.0
- **Verification:** Check result

#### TC-011: Contains with object property
- **Description:** Object has expected property/value
- **Setup:** EvalScorer instance
- **Input:**
  - Actual: `{ name: 'test', value: 123, other: 'data' }`
  - Expected: `{ contains: { name: 'test' } }`
- **Expected Output:** passed: true, score: 1.0
- **Verification:** Check result

#### TC-012: Contains with nested object
- **Description:** Deep property check
- **Setup:** EvalScorer instance
- **Input:**
  - Actual: `{ user: { name: 'Alice', age: 30 } }`
  - Expected: `{ contains: { user: { name: 'Alice' } } }`
- **Expected Output:** passed: true, score: 1.0
- **Verification:** Check result

#### TC-013: Contains with operators
- **Description:** Support comparison operators
- **Setup:** EvalScorer instance
- **Input:**
  - Actual: [1, 2, 3, 4, 5]
  - Expected: `{ contains: { length: { $gte: 5 } } }`
- **Expected Output:** passed: true, score: 1.0
- **Verification:** Check result

### Category: Pattern Matching

#### TC-014: Pattern matches string
- **Description:** Regex pattern matches
- **Setup:** EvalScorer instance
- **Input:**
  - Actual: 'Error: File not found'
  - Expected: `{ pattern: '^Error: .+' }`
- **Expected Output:** passed: true, score: 1.0
- **Verification:** Check result

#### TC-015: Pattern fails on non-match
- **Description:** Regex doesn't match
- **Setup:** EvalScorer instance
- **Input:**
  - Actual: 'Success'
  - Expected: `{ pattern: '^Error: .+' }`
- **Expected Output:** passed: false, score: 0
- **Verification:** Check result

#### TC-016: Pattern with flags
- **Description:** Support regex flags (case-insensitive, etc.)
- **Setup:** EvalScorer instance
- **Input:**
  - Actual: 'ERROR: Failed'
  - Expected: `{ pattern: 'error', flags: 'i' }`
- **Expected Output:** passed: true, score: 1.0
- **Verification:** Check result

#### TC-017: Pattern on non-string
- **Description:** Handle non-string gracefully
- **Setup:** EvalScorer instance
- **Input:**
  - Actual: 42
  - Expected: `{ pattern: '\\d+' }`
- **Expected Output:** Convert to string first, then match
- **Verification:** Check result

#### TC-018: Invalid regex pattern
- **Description:** Handle invalid regex gracefully
- **Setup:** EvalScorer instance
- **Input:**
  - Actual: 'test'
  - Expected: `{ pattern: '[invalid(' }`
- **Expected Output:** Error in breakdown with clear message
- **Verification:** Check error handling

### Category: Schema Validation

#### TC-019: Simple schema validation
- **Description:** Validate object against JSON Schema
- **Setup:** EvalScorer instance
- **Input:**
  - Actual: `{ name: 'Alice', age: 30 }`
  - Expected: `{ schema: { type: 'object', required: ['name', 'age'] } }`
- **Expected Output:** passed: true, score: 1.0
- **Verification:** Check result

#### TC-020: Schema validation fails
- **Description:** Object doesn't match schema
- **Setup:** EvalScorer instance
- **Input:**
  - Actual: `{ name: 'Alice' }`
  - Expected: `{ schema: { type: 'object', required: ['name', 'age'] } }`
- **Expected Output:** passed: false, score: 0
- **Verification:** Check result

#### TC-021: Schema with type validation
- **Description:** Validate field types
- **Setup:** EvalScorer instance
- **Input:**
  - Actual: `{ count: '42' }`
  - Expected: `{ schema: { properties: { count: { type: 'number' } } } }`
- **Expected Output:** passed: false (string vs number)
- **Verification:** Check result

#### TC-022: Schema with array validation
- **Description:** Validate array structure
- **Setup:** EvalScorer instance
- **Input:**
  - Actual: [1, 2, 3]
  - Expected: `{ schema: { type: 'array', items: { type: 'number' } } }`
- **Expected Output:** passed: true, score: 1.0
- **Verification:** Check result

#### TC-023: Schema with nested objects
- **Description:** Complex nested schema
- **Setup:** EvalScorer instance
- **Input:**
  - Actual: Complex nested object
  - Expected: Nested schema
- **Expected Output:** Validated correctly
- **Verification:** Check result

### Category: Success Flag

#### TC-024: Success flag matches
- **Description:** Check operation success
- **Setup:** EvalScorer instance with ToolResult
- **Input:**
  - Actual: ToolResult { success: true, data: ... }
  - Expected: `{ success: true }`
- **Expected Output:** passed: true, score: 1.0
- **Verification:** Check result

#### TC-025: Success flag fails
- **Description:** Expected success but got failure
- **Setup:** EvalScorer instance
- **Input:**
  - Actual: ToolResult { success: false, error: ... }
  - Expected: `{ success: true }`
- **Expected Output:** passed: false, score: 0
- **Verification:** Check result

#### TC-026: Error code validation
- **Description:** Check specific error code
- **Setup:** EvalScorer instance
- **Input:**
  - Actual: ToolResult { success: false, error: { code: 'FILE_NOT_FOUND' } }
  - Expected: `{ success: false, errorCode: 'FILE_NOT_FOUND' }`
- **Expected Output:** passed: true, score: 1.0
- **Verification:** Check result

#### TC-027: Error code mismatch
- **Description:** Wrong error code
- **Setup:** EvalScorer instance
- **Input:**
  - Actual: ToolResult { success: false, error: { code: 'TIMEOUT' } }
  - Expected: `{ success: false, errorCode: 'FILE_NOT_FOUND' }`
- **Expected Output:** passed: false, score: 0
- **Verification:** Check result

### Category: Performance Constraints

#### TC-028: Execution time under limit
- **Description:** Check performance constraint met
- **Setup:** EvalScorer instance
- **Input:**
  - Actual: ToolResult with metadata { executionTimeMs: 500 }
  - Expected: `{ performance: { maxTimeMs: 1000 } }`
- **Expected Output:** passed: true, score: 1.0
- **Verification:** Check result

#### TC-029: Execution time over limit
- **Description:** Performance constraint violated
- **Setup:** EvalScorer instance
- **Input:**
  - Actual: ToolResult with metadata { executionTimeMs: 1500 }
  - Expected: `{ performance: { maxTimeMs: 1000 } }`
- **Expected Output:** passed: false, score: 0
- **Verification:** Check result

#### TC-030: Memory constraint
- **Description:** Check memory usage
- **Setup:** EvalScorer instance
- **Input:**
  - Actual: ToolResult with metadata { memoryUsageBytes: 50_000_000 }
  - Expected: `{ performance: { maxMemoryMb: 100 } }`
- **Expected Output:** passed: true, score: 1.0
- **Verification:** Check result

### Category: Multiple Criteria

#### TC-031: Multiple matchers all pass
- **Description:** Combine exact, contains, pattern
- **Setup:** EvalScorer instance
- **Input:**
  - Actual: 'Error: File not found'
  - Expected: `{ success: false, contains: 'File', pattern: '^Error:' }`
- **Expected Output:**
  - passed: true (all criteria pass)
  - score: 1.0
  - breakdown: 3 criteria, all passed
- **Verification:** Check breakdown

#### TC-032: Multiple matchers, one fails
- **Description:** Partial success
- **Setup:** EvalScorer instance
- **Input:**
  - Actual: 'Error: File not found'
  - Expected: `{ success: false, contains: 'File', pattern: '^Warning:' }`
- **Expected Output:**
  - passed: false (pattern fails)
  - score: 0.67 (2/3 pass)
  - breakdown: shows which failed
- **Verification:** Check breakdown details

#### TC-033: Score calculation with weights
- **Description:** Average score across criteria
- **Setup:** EvalScorer instance
- **Input:** Multiple criteria with different pass/fail
- **Expected Output:** Correct average score
- **Verification:** Calculate expected average, compare

### Category: Custom Scorers

#### TC-034: Register custom scorer
- **Description:** Add custom scoring function
- **Setup:** EvalScorer instance
- **Input:** Register scorer named 'custom_test'
- **Expected Output:** Scorer registered successfully
- **Verification:** Check scorer exists in registry

#### TC-035: Use custom scorer
- **Description:** Execute custom scoring function
- **Setup:**
  - Register custom scorer
  - Create expectation with scorer
- **Input:**
  - Actual: Some data
  - Expected: `{ scorer: 'custom_test' }`
- **Expected Output:** Custom scorer called, result used
- **Verification:** Check custom scorer was invoked

#### TC-036: Custom scorer returns partial score
- **Description:** Custom scorer returns 0-1 value
- **Setup:** Register scorer that returns 0.75
- **Input:**
  - Actual: Any data
  - Expected: `{ scorer: 'test_scorer' }`
- **Expected Output:** score: 0.75
- **Verification:** Check score value

#### TC-037: Missing custom scorer
- **Description:** Handle undefined scorer gracefully
- **Setup:** EvalScorer instance
- **Input:**
  - Expected: `{ scorer: 'does_not_exist' }`
- **Expected Output:** Error or warning in breakdown
- **Verification:** Check error handling

#### TC-038: Custom scorer receives eval case
- **Description:** Scorer gets full context
- **Setup:** Register scorer that checks evalCase
- **Input:** Score with custom scorer
- **Expected Output:** Scorer receives actual, expected, evalCase
- **Verification:** Verify scorer parameters

### Category: Breakdown Generation

#### TC-039: Breakdown lists all criteria
- **Description:** Each matcher creates breakdown entry
- **Setup:** EvalScorer instance
- **Input:** Multiple matchers in expected
- **Expected Output:** breakdown.length === number of matchers
- **Verification:** Count breakdown entries

#### TC-040: Breakdown includes details
- **Description:** Each entry has helpful details
- **Setup:** EvalScorer instance
- **Input:** Failed exact match
- **Expected Output:**
  - breakdown[0].criterion === 'exact_match'
  - breakdown[0].passed === false
  - breakdown[0].details includes why it failed
- **Verification:** Check details field

#### TC-041: Breakdown for custom scorer
- **Description:** Custom scorers add breakdown entries
- **Setup:** Custom scorer that returns breakdown
- **Input:** Use custom scorer
- **Expected Output:** Breakdown includes custom entries
- **Verification:** Check breakdown structure

### Category: Edge Cases

#### TC-042: Empty expectation
- **Description:** No matchers specified
- **Setup:** EvalScorer instance
- **Input:**
  - Actual: Anything
  - Expected: `{}`
- **Expected Output:** Error or default pass
- **Verification:** Check behavior

#### TC-043: Null actual value
- **Description:** Handle null results
- **Setup:** EvalScorer instance
- **Input:**
  - Actual: null
  - Expected: `{ exact: 'something' }`
- **Expected Output:** passed: false, clear breakdown
- **Verification:** Check handling

#### TC-044: Large object comparison
- **Description:** Efficiently compare large objects
- **Setup:** EvalScorer instance
- **Input:** 1000+ property objects
- **Expected Output:** Completes in reasonable time
- **Verification:** Measure performance

#### TC-045: Circular references
- **Description:** Handle circular object references
- **Setup:** Object with circular reference
- **Input:**
  - Actual: { self: <circular> }
  - Expected: `{ exact: ... }`
- **Expected Output:** Error or handled gracefully
- **Verification:** Check error handling

### Category: Integration

#### TC-046: Score ToolResult from real tool
- **Description:** Score actual tool execution result
- **Setup:**
  - Execute real tool
  - Get ToolResult
- **Input:**
  - Actual: ToolResult from read_file
  - Expected: `{ success: true, contains: 'Hello' }`
- **Expected Output:** Correct scoring
- **Verification:** Verify scoring works with real ToolResult

#### TC-047: Work with EvalRunner
- **Description:** Scorer integrates with runner
- **Setup:** Create minimal eval runner
- **Input:** Run eval case
- **Expected Output:** Scorer called correctly by runner
- **Verification:** Check integration

---

## E2E Verification Steps

### Manual Testing

1. **Test exact matching**
   ```bash
   npx tsx -e "
   import { EvalScorer } from './src/eval/scorer';
   const scorer = new EvalScorer();
   const result = scorer.score(
     'Hello, World!',
     { exact: 'Hello, World!' },
     {} as any
   );
   console.log('Result:', result);
   "
   ```

2. **Test multiple criteria**
   ```bash
   npx tsx -e "
   import { EvalScorer } from './src/eval/scorer';
   const scorer = new EvalScorer();
   const result = scorer.score(
     'Error: File not found',
     {
       contains: 'File',
       pattern: '^Error:',
       success: false
     },
     {} as any
   );
   console.log('Passed:', result.passed);
   console.log('Score:', result.score);
   console.log('Breakdown:', result.breakdown);
   "
   ```

3. **Test custom scorer**
   ```bash
   npx tsx -e "
   import { EvalScorer } from './src/eval/scorer';
   const scorer = new EvalScorer();
   scorer.registerScorer('test', (actual, expected) => ({
     passed: true,
     score: 0.8,
     breakdown: [{ criterion: 'custom', passed: true, score: 0.8 }]
   }));
   const result = scorer.score('data', { scorer: 'test' }, {} as any);
   console.log('Custom scorer result:', result);
   "
   ```

4. **Test with real ToolResult**
   ```bash
   npx tsx -e "
   import { EvalScorer } from './src/eval/scorer';
   import { readFileTool } from './src/tools/read_file';
   import * as fs from 'fs';

   // Create test file
   fs.writeFileSync('/tmp/test.txt', 'Hello, World!');

   // Execute tool
   const context = {
     fs,
     cwd: '/tmp',
     rustEngine: undefined
   };
   const toolResult = await readFileTool.execute({ path: 'test.txt' }, context);

   // Score result
   const scorer = new EvalScorer();
   const scoreResult = scorer.score(
     toolResult.data,
     { success: true, exact: 'Hello, World!' },
     {} as any
   );
   console.log('Score result:', scoreResult);

   // Cleanup
   fs.unlinkSync('/tmp/test.txt');
   "
   ```

---

## Success Criteria

- [ ] All matcher types implemented (exact, contains, pattern, schema)
- [ ] Success flag and error code checking works
- [ ] Performance constraints validated
- [ ] Multiple criteria combined correctly
- [ ] Custom scorers can be registered and used
- [ ] Breakdown provides clear debugging info
- [ ] Edge cases handled gracefully
- [ ] All tests pass
- [ ] Test coverage > 90%
- [ ] Integration with ToolResult works

---

## Notes

- Use JSON Schema validator library (e.g., Ajv) for schema matching
- Consider fuzzy string matching for flexible comparisons
- Ensure breakdown messages are human-readable
- Score should always be 0-1 range
- passed should be true only if ALL criteria pass (score can be partial)
- Support both ToolResult and raw data as actual value
- Log warnings for unrecognized matcher types
