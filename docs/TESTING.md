# Testing Guide (For Claude Code)

This document describes the testing infrastructure and TDD process for CodeCraft.

## Test Suite Overview

- **Framework:** Vitest
- **Total Tests:** 272
- **Location:** `tests/` directory

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npx vitest

# Run specific test file
npx vitest tests/tools.test.ts

# Run tests matching pattern
npx vitest -t "read_file"
```

## Test File Structure

| Test File | Module | Tests |
|-----------|--------|-------|
| `tests/tools.test.ts` | Core tools | 1 |
| `tests/read_file.test.ts` | read_file tool | 9 |
| `tests/edit_file.test.ts` | edit_file tool | 6 |
| `tests/delete_file.test.ts` | delete_file tool | 8 |
| `tests/glob.test.ts` | glob tool | 12 |
| `tests/grep.test.ts` | grep tool | 10 |
| `tests/list_directory.test.ts` | list_directory tool | 8 |
| `tests/resolve_symbol.test.ts` | resolve_symbol tool | 11 |
| `tests/get_symbol_info.test.ts` | get_symbol_info tool | 8 |
| `tests/get_imports_exports.test.ts` | get_imports_exports tool | 12 |
| `tests/find_references.test.ts` | find_references tool | 13 |
| `tests/dependency_graph.test.ts` | build_dependency_graph tool | 13 |
| `tests/detect_project_type.test.ts` | detect_project_type tool | 10 |
| `tests/extract_conventions.test.ts` | extract_conventions tool | 12 |
| `tests/todo_write.test.ts` | todo_write tool | 6 |
| `tests/intent_classifier.test.ts` | Intent classification | 20 |
| `tests/context_manager.test.ts` | Context manager | 20 |
| `tests/planning_engine.test.ts` | Planning engine | 17 |
| `tests/error_recovery.test.ts` | Error recovery | 20 |
| `tests/lru_cache.test.ts` | LRU cache | 10 |
| `tests/colors.test.ts` | Colors module | 12 |
| `tests/error_formatter.test.ts` | Error formatter | 10 |
| `tests/agent.test.ts` | Agent class | 3 |
| `tests/agent_commands.test.ts` | Slash commands | 2 |
| `tests/tools_diff.test.ts` | Diff/confirmation | 3 |
| `tests/workflow.test.ts` | Workflow tests | 6 |
| `tests/rust_engine.test.ts` | Rust bindings | 2 |
| `tests/ui.test.ts` | UI rendering | 2 |
| `tests/e2e.test.ts` | E2E integration | 5 |

## TDD Process

**CRITICAL: Always follow RED → GREEN → REFACTOR**

### Before Writing Any Code:

1. **Write test plan** in `TEST_PLANS.md`
2. **Write tests** (they should fail - RED)
3. **Implement feature** (make tests pass - GREEN)
4. **Refactor** while keeping tests green
5. **E2E test** with `npx tsx index.ts`

### Test Plan Template

See `docs/TEST_PLAN_TEMPLATE.md` for the standard format.

## Mocking Patterns

### Mock File System
```typescript
import { vi } from 'vitest';
import * as fs from 'fs';

vi.mock('fs', () => ({
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
}));
```

### Mock External APIs
```typescript
vi.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: vi.fn(() => ({
        getGenerativeModel: vi.fn(() => ({
            startChat: vi.fn(() => ({
                sendMessage: vi.fn()
            }))
        }))
    }))
}));
```

## Module Imports

Use `.js` extension for ES module imports in tests:
```typescript
import { executeTool } from '../src/tools.js';
```

## After Any Code Change

1. Run `npm test` - all 272 tests must pass
2. For Rust changes, run `npm run build` first
3. Run E2E test: `npx tsx index.ts`

## Test Categories

### Unit Tests
- Test individual functions in isolation
- Mock external dependencies
- Fast execution

### Integration Tests
- Test module interactions
- `tests/e2e.test.ts` tests full agent loop

### E2E Tests (Manual)
- See `docs/MANUAL_TESTING_GUIDE.md` for user instructions
- Test real CLI interactively

## Common Test Utilities

### Check Tool Output
```typescript
const result = await executeTool('read_file', { path: 'test.txt' });
expect(result).toContain('expected content');
```

### Check Error Handling
```typescript
const result = await executeTool('read_file', { path: 'nonexistent.txt' });
expect(result).toContain('Error');
```

## CI/CD

Tests run automatically:
- On every commit
- Before merging PRs
- `npm test` in CI pipeline

## Coverage

To check coverage:
```bash
npx vitest --coverage
```

## Debugging Tests

```bash
# Run with verbose output
npx vitest --reporter=verbose

# Run single test with debugging
npx vitest tests/tools.test.ts --reporter=verbose
```
