# Test Plans Directory

This directory contains test plans for **active/in-progress features**. Completed test plans are moved to `docs/archive/`.

**Last Updated:** 2025-11-28

---

## Test Planning Philosophy

**BEFORE writing any code:**
1. Write a detailed test plan listing ALL test cases
2. Implement the tests (they will fail - RED)
3. Implement the feature to make tests pass - GREEN
4. Refactor if needed - REFACTOR
5. Run end-to-end tests to verify real-world usage

---

## Current Test Plans

### Evaluation System (Active)
These test plans are for the evaluation system, which is still being actively improved:

- **`eval-types.test-plan.md`** - Type definitions and interfaces
- **`dataset-loader.test-plan.md`** - Dataset loading and validation
- **`fixture-manager.test-plan.md`** - Test fixture management
- **`scorer.test-plan.md`** - Result scoring and analysis

**Status:** Evaluation system at 53.7% pass rate (161/300 tool evals), 65.3% LLM evals (47/72)

---

## Completed Test Plans

Completed test plans have been moved to `docs/archive/`:
- `bash-tools.md` - Background process management
- `init-command.md` - /init slash command
- `inspect-symbol.md` - Symbol inspection tool
- `pluggable-tools-architecture.md` - Pluggable tools migration
- `remove-analysis-tools.md` - Tool registry cleanup
- `llm-eval-runner.md` - LLM evaluation infrastructure
- `IMPLEMENTATION_SUMMARY.md` - Overall summary

---

## Test Plan Template

Each test plan should include:

1. **Purpose**: What the feature does
2. **Test Categories**:
   - Happy Path Tests
   - Edge Cases
   - Error Handling
   - Integration Tests
   - End-to-End Tests
3. **Implementation Status**: ✅ Done, ❌ Not Started, 🔴 RED, 🟢 GREEN
4. **Files**: Tests and implementation locations
5. **Success Criteria**: How we know it's done

## Current Test Plans

- [Pluggable Tools Architecture](./pluggable-tools-architecture.md) - Modular tool system

## Historical Test Plans

Historical test plans from the monolithic TEST_PLANS.md are preserved in `docs/TEST_PLANS.md` for reference.
