# Testing Strategy

**Last Updated:** 2025-11-28

---

## Overview

CodeCraft uses a multi-layered testing strategy to ensure both **functional correctness** and **quality of intelligence**. We distinguish between tests that verify "does it work?" versus "how well does it work?"

---

## Testing Layers

### 1. Unit Tests - Functional Correctness
**Purpose:** Verify individual components work as expected
**Location:** `tests/**/*.test.ts`
**What we test:**
- Tool implementations
- Core logic (context manager, error recovery, planning engine)
- Helper functions and utilities
- Error handling

**Example:**
```typescript
// tests/tools/read-file.test.ts
it('should read file content', async () => {
  const result = await readFileTool.execute({ path: 'test.txt' }, context);
  expect(result.success).toBe(true);
  expect(result.data).toContain('expected content');
});
```

**When to use:**
- Testing pure logic that doesn't involve LLM
- Validating input/output contracts
- Testing error conditions
- Fast, deterministic tests

---

### 2. End-to-End Tests - System Integration
**Purpose:** Verify the product **works** in real usage scenarios
**Location:** `tests/e2e/**/*.test.ts`
**What we test:**
- CLI starts and responds
- Tools are called correctly
- Basic LLM interaction works
- System doesn't crash or hang

**Philosophy for LLM-dependent features:**
- We test that the LLM **responds normally**, not that it's **smart**
- We verify basic tool calling works, not optimal tool selection
- We check the system produces output, not that output is perfect

**Example:**
```typescript
// tests/e2e/file-read-operations.test.ts
it('should read files with ReadFile tool', async () => {
  const result = await runCLIWithRetry('read the package.json file');

  // We just verify the tool was called - we don't judge quality
  expect(result.output).toMatch(/Tool Call.*ReadFile/i);
  expect(result.output).toMatch(/package\.json/i);
});
```

**What we DON'T test in E2E:**
- ❌ Whether the LLM chose the "best" tool
- ❌ Quality of the LLM's explanation
- ❌ Accuracy of code understanding
- ❌ Intelligence of responses

**What we DO test in E2E:**
- ✅ System starts without errors
- ✅ LLM calls *some* tool (even if not optimal)
- ✅ Basic workflows complete
- ✅ No crashes or hangs

---

### 3. Evaluation System - Intelligence Quality
**Purpose:** Verify the product works **well** (quality, intelligence, accuracy)
**Location:** `evals/datasets/**/*.json`, `src/eval/**`
**What we test:**
- Tool selection accuracy
- LLM reasoning quality
- Code understanding accuracy
- Response quality

**Types of Evaluations:**

#### A. Tool Evaluations (Unit-level Quality)
**Purpose:** Verify tools produce correct/high-quality results
**Dataset:** `evals/datasets/{tool}.json` (15 cases per tool)

```json
{
  "id": "read-001",
  "description": "Read simple text file",
  "tool": "ReadFile",
  "input": { "params": { "path": "test.txt" } },
  "expected": {
    "success": true,
    "contains": "Hello World"
  }
}
```

**When to use:**
- Testing tool output quality
- Validating data transformations
- Checking edge case handling
- Performance benchmarking

#### B. LLM Evaluations (Intelligence Quality)
**Purpose:** Verify LLM makes **smart decisions**
**Dataset:** `evals/datasets/llm/{category}.json`

```json
{
  "id": "llm-001",
  "query": "find all TypeScript files",
  "expectedTool": "Glob",
  "acceptableTools": ["ListDirectory"],
  "forbiddenTools": ["ReadFile", "Grep"],
  "reasoning": "Glob is best for pattern matching"
}
```

**What we measure:**
- **Exact match:** LLM chose the expected tool
- **Acceptable match:** LLM chose an acceptable alternative
- **Wrong tool:** LLM chose wrong tool but it's registered
- **Forbidden tool:** LLM chose explicitly wrong tool
- **No tool:** LLM didn't call any tool

**When to use:**
- Testing tool selection intelligence
- Validating query understanding
- Checking reasoning quality
- Measuring LLM performance over time

---

## Decision Matrix: Which Test Type?

| Scenario | Test Type | Why |
|----------|-----------|-----|
| Verify file reading works | Unit Test | Pure logic, deterministic |
| Check CLI starts successfully | E2E Test | System integration |
| Verify glob pattern matching | Tool Eval | Output quality matters |
| Validate LLM chooses correct tool | LLM Eval | Intelligence matters |
| Test error handling | Unit Test | Deterministic behavior |
| Verify multi-tool workflows | E2E Test | System integration |
| Measure tool selection accuracy | LLM Eval | Quality benchmark |
| Check process cleanup | Unit Test | Deterministic behavior |

---

## Key Distinctions

### E2E vs LLM Evaluation

| Aspect | E2E Test | LLM Evaluation |
|--------|----------|----------------|
| **Goal** | Does it work? | How well does it work? |
| **LLM Expectation** | Responds normally | Makes smart decisions |
| **Pass Criteria** | No errors, produces output | Correct tool, good reasoning |
| **Flakiness Tolerance** | High (retry logic) | Low (measure consistency) |
| **Speed** | Slow (~30s per test) | Medium (~5s per case) |
| **When to Run** | Before commits | Periodic benchmarking |

### Example: Testing "find all TypeScript files"

**E2E Test (Does it work?):**
```typescript
it('should search for files', async () => {
  const result = await runCLIWithRetry('find all TypeScript files');

  // Just verify SOME tool was called - we don't care which
  expect(result.output).toMatch(/Tool Call/i);
  expect(result.output).toMatch(/\.ts/i);
});
```
✅ Passes if LLM calls Glob, Grep, ListDirectory, or even SearchCode
✅ We just care it produces a reasonable response

**LLM Evaluation (How well does it work?):**
```json
{
  "query": "find all TypeScript files",
  "expectedTool": "Glob",
  "acceptableTools": ["ListDirectory"],
  "reasoning": "Glob is optimal for file pattern matching"
}
```
✅ Passes only if LLM chooses Glob (exact match)
⚠️ Acceptable if LLM chooses ListDirectory
❌ Fails if LLM chooses Grep or ReadFile

---

## Guidelines

### When Writing Unit Tests
- ✅ Test pure functions and deterministic logic
- ✅ Mock external dependencies (filesystem, LLM, etc.)
- ✅ Cover edge cases and error conditions
- ✅ Keep tests fast (<100ms each)
- ❌ Don't test LLM behavior

### When Writing E2E Tests
- ✅ Test real user workflows
- ✅ Verify system integration works
- ✅ Accept that LLM might not be perfect
- ✅ Use retry logic for flaky LLM responses
- ❌ Don't test LLM intelligence/quality
- ❌ Don't expect specific tool selections
- ❌ Don't test if explanations are "good"

### When Writing Evaluations
- ✅ Test LLM decision quality
- ✅ Measure accuracy and consistency
- ✅ Define clear expected/acceptable outcomes
- ✅ Track metrics over time
- ❌ Don't use for functional correctness
- ❌ Don't test basic "does it run" scenarios

---

## Test Coverage Goals

### Minimum Requirements (Current: ✅ Met)
- [x] All tools have unit tests
- [x] All tools have evaluation datasets (15 cases each)
- [x] Critical workflows have E2E tests
- [x] LLM tool selection has evaluation coverage

### Full Coverage Targets
- [ ] 100% unit test coverage for core logic
- [ ] All 17 registered tools have E2E tests (currently 12/17)
- [ ] LLM evaluation coverage for all query types
- [ ] Performance benchmarks for all tools

---

## Running Tests

### Unit Tests
```bash
npm test                    # Run all unit tests
npm test -- --watch        # Watch mode
npm test -- read-file      # Run specific test
```

### E2E Tests
```bash
npm run test:e2e           # Run all E2E tests (~5 min)
npx vitest run tests/e2e/file-tools.test.ts  # Run specific file
```

### Evaluations
```bash
npx tsx run-all-evals.ts   # Run all tool evaluations
npx tsx run-llm-evals.ts   # Run LLM evaluations (requires API key)
```

---

## Metrics

### Current Status (2025-11-28)

| Test Type | Coverage | Pass Rate | Speed |
|-----------|----------|-----------|-------|
| Unit Tests | 527 tests | 100% | <1 min |
| Tool Evals | 300 cases (15 per tool × 20 tools) | 53.7% | ~2 min |
| LLM Evals | 72 cases across 4 categories | 65.3% | ~3 min |
| E2E Tests | 20 tests covering 12/17 tools | 100% | ~5 min |

---

## Philosophy

> **"Test that it works, then measure how well it works."**

1. **Unit tests** ensure the code doesn't break
2. **E2E tests** ensure the system integrates correctly
3. **Evaluations** ensure the AI is intelligent

This three-layer approach gives us:
- ✅ **Confidence** the system works (unit + E2E)
- ✅ **Visibility** into quality (evaluations)
- ✅ **Fast feedback** (unit tests)
- ✅ **Real-world validation** (E2E tests)
- ✅ **Intelligence benchmarks** (LLM evals)

---

**See Also:**
- [E2E Testing Guide](./E2E_TESTING_GUIDE.md)
- [E2E Test Coverage Plan](./E2E_TEST_COVERAGE_PLAN.md)
- [Evaluation System](../evaluation/)
