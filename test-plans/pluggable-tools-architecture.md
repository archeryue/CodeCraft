# Test Plan: Pluggable Tools Architecture

**Purpose:** Transform CodeCraft's monolithic tool system into a pluggable, modular architecture where tools are isolated, testable, and independently versioned.

**Status:** 🟢 GREEN (99/99 tests passing!)

**Created:** 2025-11-26

---

## Architecture Goals

1. **Isolation**: Each tool is a self-contained module
2. **Testability**: Tools can be tested with mocked dependencies
3. **Modularity**: Tools can be developed/deployed independently
4. **Backward Compatible**: Existing agent continues to work during migration
5. **Type Safe**: Full TypeScript interfaces for all components

---

## Part 1: Core Type Definitions

**File:** `src/types/tool.ts`

### Test Plan (Written BEFORE Implementation)

**Type Interface Tests:**
1. ❌ ToolResult should have success, data, error, and metadata fields
2. ❌ ToolResult.error should have code, message, and optional details
3. ❌ ToolResult.metadata should track executionTimeMs
4. ❌ ToolContext should provide fs abstraction
5. ❌ ToolContext should provide optional rustEngine
6. ❌ ToolContext should provide cwd string
7. ❌ ToolContext should provide optional confirm callback
8. ❌ ToolCapabilities should have all required boolean flags

**Tool Interface Tests:**
9. ❌ Tool should require name, description, version fields
10. ❌ Tool should require parameters schema
11. ❌ Tool should require capabilities object
12. ❌ Tool should require execute function
13. ❌ Tool should allow optional validate function
14. ❌ Tool should allow optional initialize function
15. ❌ Tool should allow optional shutdown function

### Implementation Status
- ❌ Types not yet created
- ❌ Tests not yet written
- ❌ Implementation not started

### Files
- Types: `src/types/tool.ts`
- Tests: `tests/types/tool.test.ts`

---

## Part 2: Tool Registry

**File:** `src/tool-registry.ts`

### Test Plan (Written BEFORE Implementation)

**Registration Tests:**
1. ❌ Should register a tool successfully
2. ❌ Should throw error when registering duplicate tool name
3. ❌ Should unregister a tool and return true
4. ❌ Should return false when unregistering non-existent tool
5. ❌ Should check if tool exists with has()
6. ❌ Should get tool by name with get()
7. ❌ Should return undefined for non-existent tool

**Bulk Operations:**
8. ❌ Should return all registered tools with getAll()
9. ❌ Should return all tool names with getNames()
10. ❌ Should return empty array when no tools registered

**LLM Declaration Generation:**
11. ❌ Should generate Gemini-compatible declarations
12. ❌ Should include name, description, and parameters for each tool
13. ❌ Should wrap declarations in functionDeclarations array
14. ❌ Should handle empty registry (return empty declarations)

**Lifecycle Management:**
15. ❌ Should call initialize on all tools with initializeAll()
16. ❌ Should skip tools without initialize method
17. ❌ Should call shutdown on all tools with shutdownAll()
18. ❌ Should handle errors in initialize gracefully
19. ❌ Should handle errors in shutdown gracefully

**Edge Cases:**
20. ❌ Should handle tool with all optional methods undefined
21. ❌ Should preserve tool order in getAll()

### Implementation Status
- ❌ Implementation not started
- ❌ Tests not written

### Files
- Implementation: `src/tool-registry.ts`
- Types: `src/types/registry.ts`
- Tests: `tests/tool-registry.test.ts`

---

## Part 3: Tool Executor

**File:** `src/tool-executor.ts`

### Test Plan (Written BEFORE Implementation)

**Basic Execution:**
1. ❌ Should execute tool by name with valid params
2. ❌ Should return ToolResult with success true
3. ❌ Should include execution metadata
4. ❌ Should return error if tool not found
5. ❌ Should pass context to tool.execute()

**Validation:**
6. ❌ Should validate params before execution (if tool has validate)
7. ❌ Should skip validation if skipValidation option true
8. ❌ Should return validation error if params invalid
9. ❌ Should execute if validation passes
10. ❌ Should handle tools without validate method

**Timeout Handling:**
11. ❌ Should timeout after default 30 seconds
12. ❌ Should respect custom timeout option
13. ❌ Should return TIMEOUT error code
14. ❌ Should still record execution time on timeout

**Error Handling:**
15. ❌ Should catch errors from tool.execute()
16. ❌ Should return EXECUTION_ERROR code
17. ❌ Should include error message in result
18. ❌ Should record execution time even on error

**Statistics Tracking:**
19. ❌ Should track totalExecutions count
20. ❌ Should track successCount
21. ❌ Should track errorCount
22. ❌ Should track executionsByTool per tool
23. ❌ Should calculate averageExecutionTimeMs
24. ❌ Should initialize stats to zero

**Context Management:**
25. ❌ Should use default context if not provided
26. ❌ Should use custom context with executeWithContext()
27. ❌ Should merge context options properly

**Validation-Only:**
28. ❌ Should validate without executing using validate()
29. ❌ Should return error for unknown tool in validate()
30. ❌ Should return valid:true for tools without validate method

### Implementation Status
- ❌ Implementation not started
- ❌ Tests not written

### Files
- Implementation: `src/tool-executor.ts`
- Types: `src/types/executor.ts`
- Tests: `tests/tool-executor.test.ts`

---

## Part 4: Context Factory

**File:** `src/tool-context.ts`

### Test Plan (Written BEFORE Implementation)

**Default Context Creation:**
1. ❌ Should create context with real fs functions
2. ❌ Should include readFileSync, writeFileSync, existsSync
3. ❌ Should include unlinkSync, readdirSync, statSync
4. ❌ Should set cwd to process.cwd()
5. ❌ Should include rustEngine if available
6. ❌ Should handle missing rustEngine gracefully

**Mock Context Creation:**
7. ❌ Should create mock context for testing
8. ❌ Mock fs should be fully mockable (vitest.fn())
9. ❌ Should allow custom file fixtures
10. ❌ Should allow custom cwd

**Context Merging:**
11. ❌ Should merge custom confirm callback into context
12. ❌ Should merge custom logger into context
13. ❌ Should merge abort signal into context

### Implementation Status
- ❌ Implementation not started
- ❌ Tests not written

### Files
- Implementation: `src/tool-context.ts`
- Tests: `tests/tool-context.test.ts`

---

## Part 5: Sample Tool Migration (read_file)

**File:** `src/tools/read_file.ts`

### Test Plan (Written BEFORE Implementation)

**Tool Metadata:**
1. ❌ Should have name: 'read_file'
2. ❌ Should have version: '1.0.0'
3. ❌ Should have clear description
4. ❌ Should define parameters schema with path, offset, limit
5. ❌ Should mark path as required
6. ❌ Should mark offset and limit as optional

**Capabilities:**
7. ❌ Should set writesFiles: false
8. ❌ Should set executesCommands: false
9. ❌ Should set requiresRustEngine: false
10. ❌ Should set idempotent: true
11. ❌ Should set retryable: true

**Validation:**
12. ❌ Should reject missing path
13. ❌ Should reject non-string path
14. ❌ Should reject non-number offset
15. ❌ Should reject non-number limit
16. ❌ Should reject negative offset
17. ❌ Should reject non-positive limit
18. ❌ Should accept valid params

**Execution - Happy Path:**
19. ❌ Should read entire file when no offset/limit
20. ❌ Should read from offset to end when only offset
21. ❌ Should read limited lines from start when only limit
22. ❌ Should read range when both offset and limit
23. ❌ Should include bytesRead in metadata
24. ❌ Should include filesAccessed in metadata
25. ❌ Should include executionTimeMs in metadata

**Execution - Error Cases:**
26. ❌ Should return FILE_NOT_FOUND error for missing file
27. ❌ Should return READ_ERROR for fs errors
28. ❌ Should include error details in result

**Edge Cases:**
29. ❌ Should handle empty file
30. ❌ Should handle single line file
31. ❌ Should handle offset beyond file length
32. ❌ Should handle limit larger than remaining lines

**Integration with Mocked FS:**
33. ❌ Should work with mock fs context
34. ❌ Should not access real filesystem in tests
35. ❌ Should respect mock file contents

### Implementation Status
- ❌ Implementation not started
- ❌ Tests not written
- ✅ Current implementation exists in src/tools.ts (to be migrated)

### Files
- New implementation: `src/tools/read_file.ts`
- Tests: `tests/tools/read_file.test.ts`
- Old implementation: `src/tools.ts` (will be deprecated)

---

## Part 6: Backward Compatibility Shim

**File:** `src/tools.ts` (updated)

### Test Plan (Written BEFORE Implementation)

**Legacy Compatibility:**
1. ❌ Should export TOOLS array for agent compatibility
2. ❌ Should export executeTool function
3. ❌ Should executeTool() work exactly like before
4. ❌ Should handle confirm callback in legacy format
5. ❌ Should convert ToolResult to legacy string format
6. ❌ Should convert errors to "Error: ..." string format

**Registry Integration:**
7. ❌ Should register all tools on module load
8. ❌ Should use registry internally for tool lookup
9. ❌ Should use executor for tool execution
10. ❌ Should pass through tool names unchanged

**Format Conversion:**
11. ❌ Should convert ToolResult.data to string
12. ❌ Should JSON.stringify non-string data
13. ❌ Should preserve string data as-is
14. ❌ Should format errors consistently

### Implementation Status
- ❌ Implementation not started
- ❌ Tests not written
- ✅ Current implementation exists (will be refactored)

### Files
- Updated: `src/tools.ts`
- Tests: `tests/tools-compat.test.ts`

---

## Part 7: Tools Index

**File:** `src/tools/index.ts`

### Test Plan (Written BEFORE Implementation)

**Export Tests:**
1. ❌ Should export read_file tool
2. ❌ Should export all migrated tools
3. ❌ Should export tools as named exports
4. ❌ Should allow import * as allTools

**Type Safety:**
5. ❌ All exports should satisfy Tool interface
6. ❌ Should provide proper TypeScript types

### Implementation Status
- ❌ Implementation not started
- ❌ Tests not written

### Files
- Implementation: `src/tools/index.ts`
- Tests: `tests/tools/index.test.ts`

---

## Part 8: Agent Integration

**File:** `src/agent.ts` (updated)

### Test Plan (Written BEFORE Implementation)

**Backward Compatibility:**
1. ❌ Should continue to use TOOLS export (via shim)
2. ❌ Should continue to use executeTool (via shim)
3. ❌ Should work without any changes to agent.ts
4. ❌ Should maintain same LLM tool declarations

**Future Migration Path:**
5. ❌ Document path to use ToolExecutor directly
6. ❌ Document how to get declarations from registry
7. ❌ Plan for deprecating legacy exports

### Implementation Status
- ❌ No changes needed initially (backward compatible)
- ❌ Future migration path documented

### Files
- No changes: `src/agent.ts` (works via shim)
- Migration guide: `docs/PLUGGABLE_TOOLS_MIGRATION.md`

---

## End-to-End Tests

### E2E Test 1: Verify Existing Functionality
```bash
npx tsx index.ts
```

**Test:**
```
> read package.json
```

**Expected:**
- ✅ Tool executes successfully
- ✅ Returns file contents
- ✅ No breaking changes observed
- ✅ Same output as before migration

### E2E Test 2: Verify Tool Isolation
```typescript
// Manual test in tests/
import { readFileTool } from '../src/tools/read_file';
import { createMockContext } from '../src/tool-context';

// Should work completely isolated from agent
```

**Expected:**
- ✅ Tool works without agent
- ✅ Tool works with mock context
- ✅ No dependencies on global state

### E2E Test 3: Verify Statistics Tracking
```bash
npx tsx index.ts
```

**Test multiple commands:**
```
> read package.json
> read src/agent.ts
> read nonexistent.txt  # Should error
```

**Expected:**
- ✅ Statistics tracked per tool
- ✅ Success/error counts correct
- ✅ Average execution time calculated

---

## Migration Checklist

**Phase 1: Infrastructure (Non-Breaking)**
- [ ] Create `src/types/tool.ts`
- [ ] Create `src/types/registry.ts`
- [ ] Create `src/types/executor.ts`
- [ ] Create `src/tool-registry.ts`
- [ ] Create `src/tool-executor.ts`
- [ ] Create `src/tool-context.ts`
- [ ] Write all unit tests (should fail - RED)
- [ ] Implement all infrastructure (tests pass - GREEN)

**Phase 2: Extract First Tool (Non-Breaking)**
- [ ] Create `src/tools/` directory
- [ ] Create `src/tools/read_file.ts`
- [ ] Write tests for read_file tool
- [ ] Implement read_file tool
- [ ] Create `src/tools/index.ts`
- [ ] Export read_file from index

**Phase 3: Backward Compatibility Shim (Non-Breaking)**
- [ ] Update `src/tools.ts` to use registry
- [ ] Register read_file in registry
- [ ] Keep TOOLS and executeTool exports
- [ ] Test that agent still works
- [ ] Run all existing tests (should pass)

**Phase 4: Verification**
- [ ] Run `npm test` - all tests pass
- [ ] Run E2E test with CLI
- [ ] Verify no breaking changes
- [ ] Verify tool isolation works
- [ ] Verify statistics tracking works

**Phase 5: Documentation**
- [ ] Update this test plan with ✅ status
- [ ] Document migration path
- [ ] Add examples to README
- [ ] Update CLAUDE.md

---

## Success Criteria

**Unit Tests:**
- ✅ All 120+ unit tests pass
- ✅ Test coverage > 90% for new code
- ✅ All edge cases covered

**Integration:**
- ✅ Backward compatibility maintained
- ✅ Existing agent tests pass
- ✅ No changes needed to agent.ts initially

**End-to-End:**
- ✅ CLI works exactly as before
- ✅ Tools execute successfully
- ✅ Error handling unchanged
- ✅ Performance not degraded

**Code Quality:**
- ✅ Full TypeScript type safety
- ✅ No `any` types in public APIs
- ✅ Clear interfaces and documentation
- ✅ Follows CodeCraft conventions

---

## Files Summary

**New Files:**
- `src/types/tool.ts`
- `src/types/registry.ts`
- `src/types/executor.ts`
- `src/tool-registry.ts`
- `src/tool-executor.ts`
- `src/tool-context.ts`
- `src/tools/index.ts`
- `src/tools/read_file.ts`
- `tests/types/tool.test.ts`
- `tests/tool-registry.test.ts` (21 tests)
- `tests/tool-executor.test.ts` (30 tests)
- `tests/tool-context.test.ts` (13 tests)
- `tests/tools/read_file.test.ts` (35 tests)
- `tests/tools/index.test.ts` (6 tests)
- `tests/tools-compat.test.ts` (14 tests)

**Modified Files:**
- `src/tools.ts` (refactored to use registry)

**Total New Tests:** ~120 tests

---

## Timeline Estimate

- **Day 1:** Types + Registry (2-3 hours) - 21 tests
- **Day 2:** Executor + Context (3-4 hours) - 43 tests
- **Day 3:** Tool Migration (2-3 hours) - 35 tests
- **Day 4:** Shim + Integration (2-3 hours) - 14 tests
- **Day 5:** Documentation + Polish (1-2 hours)

**Total:** 2-3 days of focused work
