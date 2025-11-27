# Test Plan: Remove Analysis Tools from Registry

**Purpose:** Remove `detect_project_type`, `extract_conventions`, `get_project_overview` from tool registry (keep logic for `/init` command only)

**Related Issue/Task:** Tools Improvement Plan - Analysis Tools Optimization

---

### Test Plan (Written BEFORE Implementation)

#### Happy Path Tests

1. [ ] **Test Case 1: /init command still works**
   - **Input:** User runs `/init`
   - **Expected:**
     - CRAFT.md is generated successfully
     - Contains all 3 sections (overview, tech stack, conventions)
     - No errors

2. [ ] **Test Case 2: Analysis tools not in registry**
   - **Input:** Check registry.getNames()
   - **Expected:**
     - `detect_project_type` NOT in list
     - `extract_conventions` NOT in list
     - `get_project_overview` NOT in list
     - Total tools = 15

3. [ ] **Test Case 3: Analysis tools not available to LLM**
   - **Input:** Check TOOLS declarations
   - **Expected:**
     - Only 15 tools in function declarations
     - Analysis tools not exposed to Gemini

#### Implementation Tests

4. [ ] **Test Case 4: /init calls tool logic directly**
   - **Input:** Examine `/init` implementation
   - **Expected:**
     - Imports tool functions directly
     - Calls `execute()` method directly with context
     - No `executeTool()` calls for analysis tools

5. [ ] **Test Case 5: Tool files still exist**
   - **Input:** Check file system
   - **Expected:**
     - `src/tools/detect_project_type.ts` exists
     - `src/tools/extract_conventions.ts` exists
     - `src/tools/get_project_overview.ts` exists
     - Logic preserved for `/init` use

#### Error Handling

6. [ ] **Test Case 6: /init handles tool errors gracefully**
   - **Input:** Analysis tool throws error
   - **Expected:**
     - `/init` returns error message
     - No crash
     - Partial CRAFT.md not created

#### End-to-End Tests

7. [ ] **E2E Test 1: Fresh /init**
   - **User Action:**
     ```bash
     rm CRAFT.md
     npx tsx index.ts
     > /init
     ```
   - **Expected Result:**
     - CRAFT.md created
     - Contains project data
     - No errors

8. [ ] **E2E Test 2: Agent doesn't see analysis tools**
   - **User Action:**
     ```bash
     npx tsx index.ts
     > use detect_project_type
     ```
   - **Expected Result:**
     - Agent says tool doesn't exist or is unavailable
     - Agent can't call it

---

### Implementation Checklist

#### Phase 1: Plan
- [x] Test plan written
- [x] Refactoring approach identified
- [x] Tests identified

#### Phase 2: Refactor /init
- [x] Import analysis tool objects in agent.ts
- [x] Call tool.execute() directly in /init
- [x] Create tool context for execution
- [x] Handle errors appropriately
- [x] Test /init still works

#### Phase 3: Remove from Registry
- [x] Remove from tool-setup.ts imports (or comment)
- [x] Remove registry.register() calls
- [x] Verify tools not in registry
- [x] Run tests

#### Phase 4: Verify
- [x] Run /init tests
- [x] Run E2E tests
- [x] Verify tool count = 15
- [x] No regressions

#### Phase 5: Document
- [x] Update CLAUDE.md
- [x] Update test plan status
- [x] Update Tools Improvement Plan

---

### Implementation Status

**Status:** ✅ COMPLETE

**Tool Count:** 18 → 15 (-16.7%)

**Test Results:**
- Implementation Tests: 6/6 ✅
- E2E Tests: 2/2 ✅
- All unit tests passing (13/13 in agent_commands.test.ts)

**Implementation Date:** 2025-11-27

**Known Issues:**
- None

---

### Success Criteria

- [x] `/init` command works identically
- [x] CRAFT.md generation unchanged
- [x] Tool count reduced to 15
- [x] Analysis tools not in registry
- [x] All tests pass
- [x] No breaking changes

---

### Notes

**Why keep the files?**
- `/init` command needs the logic
- Tests remain useful
- Could be reused later
- Cleaner than duplicating code

**Why remove from registry?**
- LLM doesn't need them during chat
- CRAFT.md provides context instead
- Reduces tool selection overhead
- Cleaner API surface
