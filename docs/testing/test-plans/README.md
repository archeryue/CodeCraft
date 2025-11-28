# Test Plans Directory

This directory contains comprehensive test plans written BEFORE implementing features. This is the foundation of our TDD approach.

## Test Planning Philosophy

**BEFORE writing any code:**
1. Write a detailed test plan listing ALL test cases
2. Implement the tests (they will fail - RED)
3. Implement the feature to make tests pass - GREEN
4. Refactor if needed - REFACTOR
5. Run end-to-end tests to verify real-world usage

## Directory Structure

```
test-plans/
├── README.md                           # This file
├── pluggable-tools-architecture.md     # Pluggable tools system (current)
└── [future test plans...]
```

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
