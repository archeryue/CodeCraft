# Bad Cases

This document tracks problematic scenarios and edge cases discovered during development and testing.

## Format

Each case includes:
- **Case ID**: Unique identifier
- **Date Discovered**: When the issue was found
- **Input/Scenario**: What triggered the bad behavior
- **Actual Behavior**: What the system did (unwanted)
- **Expected Behavior**: What should have happened
- **Status**: documented | investigating | fixed
- **Related Files**: Relevant source files

---

## BC-001: Empty Prompt Triggers Unnecessary Tool Calls ✅ FIXED

**Date Discovered**: 2025-11-26
**Date Fixed**: 2025-11-26

**Input/Scenario**: User submitted an empty prompt (just pressed Enter with no text)

**Actual Behavior** (BEFORE FIX):
1. Intent classifier classified it as "analyze" with 50% confidence
2. System made 4 tool calls:
   - `search_code({"query":"validate"}...)`
   - `list_directory({"path":"./src"}...)`
   - `grep({"ignoreCase":true,"pattern":"validate","path":"./src","include":"*.ts"}...)`
   - `read_file({"offset":289,"path":"./src/tools.ts","limit":100}...)`
3. Returned information about a validation function in tools.ts (irrelevant response)
4. Wasted tokens and time on meaningless operations

**Expected Behavior**:
- Reject empty input with message: "Please enter a query"
- Re-prompt without executing any tools
- Do not trigger intent classification for empty input
- Do not trigger agent or make any API calls

**Impact** (BEFORE FIX):
- Wastes API tokens on unnecessary LLM calls
- Wastes time on tool execution
- Confuses user with irrelevant response
- Poor user experience

**Status**: ✅ fixed

**Fix Implementation**:
- Added `validateInput()` function in `index.ts:9-14`
- Added validation check in REPL loop at `index.ts:72-77`
- Empty/whitespace inputs now show error and re-prompt immediately
- No LLM calls or tool executions for invalid input

**Tests**:
- Unit tests: `tests/input_validation.test.ts` (12 tests, all passing)
- E2E tests: Verified with `test_bc001_e2e.js` (4 tests, all passing)
- Test plan: `docs/TEST_PLANS.md` (BC-001 section)

**Files Modified**:
- `index.ts:9-14, 72-77` - Input validation added
- `tests/input_validation.test.ts` - 12 unit tests
- `docs/TEST_PLANS.md` - Test plan documented

**Verification**:
```bash
# Empty input now shows error immediately:
> [Enter]
Please enter a query.
>

# No [Intent] classification, no tool calls, no API usage
```

---

## BC-002: Code Search Returns Incomplete Results ✅ FIXED

**Date Discovered**: 2025-11-26
**Date Fixed**: 2025-11-26

**Input/Scenario**: User asked: "Search for 'async function' in the codebase"

**Actual Behavior** (BEFORE FIX):
1. System made grep call: `grep({"ignoreCase":true,"pattern":"async function","include":"*.ts"}...)`
2. Returned only ONE result: "I found one instance of 'async function' in index.ts on line 21: async function main() {"
3. Minimal context provided - just the opening line of the function
4. No indication if there are more async functions in the codebase

**Expected Behavior**:
For each match, return:
1. **File name**: Full path to the file
2. **Line number**: Exact line where match occurs
3. **Function definition**: Complete signature including parameters, return type
4. **Context**: A few lines of the function body or surrounding context to understand what it does
5. **All matches**: Not just one, but ALL async functions found in the codebase

**Impact** (BEFORE FIX):
- Incomplete information makes it hard to understand codebase structure
- User has to make follow-up queries to get full context
- Wastes time and tokens on multiple back-and-forth interactions
- Poor developer experience for code exploration

**Status**: ✅ fixed

**Fix Implementation**:
- Enhanced grep tool with context line parameters: `contextLines`, `beforeContext`, `afterContext`
- Returns structured context with line numbers: `{contextBefore: [{line, content}], contextAfter: [{line, content}]}`
- Grep tool now returns ALL matches (not just one)
- Backward compatible: works without context params

**Tests**:
- Unit tests: Extended `tests/grep.test.ts` (+7 context tests, all passing)
- E2E tests: Verified with `test_bc002_e2e.js`
  - ✅ Returns multiple matches (5 async functions found)
  - ✅ Includes code context in results
  - Note: Agent response formatting can be improved separately

**Files Modified**:
- `src/tools.ts:136-150` - Added context parameters to grep tool definition
- `src/tools.ts:411-472` - Implemented context line extraction
- `tests/grep.test.ts:109-221` - Added 7 context-related tests
- `docs/TEST_PLANS.md` - Test plan documented

**Usage Example**:
```typescript
// Search with context
await grep({
  pattern: "async function",
  contextLines: 3  // 3 lines before and after each match
});

// Returns:
[
  {
    file: "index.ts",
    line: 32,
    content: "async function main() {",
    contextBefore: [
      {line: 29, content: "..."},
      {line: 30, content: "..."},
      {line: 31, content: "..."}
    ],
    contextAfter: [
      {line: 33, content: "    if (!process.env.GEMINI_API_KEY) {"},
      {line: 34, content: "        console.error(...);"},
      {line: 35, content: "        process.exit(1);"}
    ]
  },
  // ... more matches
]
```

**Verification**:
- grep tool returns ALL matches (not just one) ✅
- Context parameters work correctly ✅
- Backward compatible (old code still works) ✅
- Agent now shows multiple results when searching ✅

---

## BC-003: Project Type Detection Misses Purpose and Architecture ⚠️ PARTIALLY FIXED

**Date Discovered**: 2025-11-26
**Date Partially Fixed**: 2025-11-26

**Input/Scenario**: User asked: "What type of project is this?"

**Actual Behavior** (BEFORE FIX):
1. System called `detect_project_type({"path":"."}...)`
2. Returned superficial information:
   - "Node.js project, specifically using TypeScript"
   - "Utilizes Vitest for testing framework"
   - "npm as package manager"
   - "No linter detected"
3. Completely missed:
   - **Purpose**: It's CodeCraft - an agentic CLI coding assistant
   - **Architecture**: Hybrid Node.js + Rust design
   - **Key technology**: Uses Rust engine via NAPI-RS for code parsing/indexing with tree-sitter
   - **What it does**: Interactive REPL that helps with coding using Gemini LLM and tool execution
   - **Entry point**: `npx tsx index.ts`

**Expected Behavior**:
When asked "What type of project is this?", provide comprehensive information:

1. **Purpose/Goal**: What does this project do?
   - "CodeCraft is a high-performance agentic CLI coding assistant"

2. **Architecture**: How is it built?
   - "Hybrid Node.js/TypeScript + Rust design"
   - "Rust engine for code parsing (tree-sitter) exposed via NAPI-RS"
   - "Node.js layer for agent logic and interactive REPL"

3. **Key Technologies**:
   - "Uses Gemini 2.5 Flash model for LLM reasoning"
   - "Rust with tree-sitter for TypeScript and Rust parsing"
   - "18 tools including file ops, code search, AST analysis"

4. **How to Use**:
   - "Run `npx tsx index.ts` after setting GEMINI_API_KEY"
   - "Interactive REPL with slash commands (/clear, /help, /save)"

5. **Tech Stack Summary**:
   - Language: TypeScript + Rust
   - Testing: Vitest
   - Package Manager: npm
   - Build: cargo for Rust, tsc for TypeScript

**Impact** (BEFORE FIX):
- User doesn't understand what the project actually does
- Misses critical architectural details (Rust engine)
- Can't see the value proposition or use cases
- Poor onboarding experience for new developers
- Doesn't help users understand how to use or contribute to the project

**Status**: ⚠️ partially fixed

**Fix Implementation**:
- ✅ Created new `get_project_overview` tool in `src/tools.ts:254-264, 824-953`
- ✅ Tool reads README.md, package.json, CLAUDE.md for comprehensive info
- ✅ Extracts purpose, architecture, tech stack, entry points, usage instructions
- ✅ Returns structured JSON with all project details
- ✅ Fixed critical infinite recursion bug (was calling detect_project_type ↔ get_project_overview)
- ⚠️ Agent behavior: Currently prefers simpler `detect_project_type` tool over comprehensive `get_project_overview`

**Tests**:
- Unit tests: `tests/project_overview.test.ts` (14 tests, all passing) ✅
- E2E tests: `test_bc003_e2e.js` (1/4 passing) ⚠️
  - ✅ No infinite recursion (fixed!)
  - ✅ Tool works correctly in isolation
  - ⚠️ Agent doesn't use comprehensive tool by default
  - Test plan: `docs/TEST_PLANS.md` (BC-003 section)

**Files Modified**:
- `src/tools.ts:254-264` - Added get_project_overview tool definition
- `src/tools.ts:824-953` - Implemented comprehensive project analysis
- `src/tools.ts:706-715` - Removed recursive call (fixed infinite loop)
- `tests/project_overview.test.ts` - 14 comprehensive tests
- `docs/TEST_PLANS.md` - Test plan documented

**Remaining Issues**:
1. **Agent Behavior**: When asked "What type of project is this?", agent calls `detect_project_type` instead of `get_project_overview`
2. **Possible Solutions**:
   - Update tool descriptions to guide agent toward comprehensive tool
   - Update system prompt to encourage using comprehensive tools
   - Add examples/hints in tool descriptions
   - Consider deprecating or limiting `detect_project_type` for basic queries

**Verification**:
```bash
# Tool works correctly:
npm test project_overview.test.ts  # 14/14 passing ✅

# No infinite recursion:
node test_bc003_e2e.js  # Only 1 tool call (not 100+) ✅

# Agent behavior needs improvement:
# Currently calls detect_project_type, not get_project_overview ⚠️
```

---

## BC-004: Agent Gets Stuck in Tool Call Loop, Fails Simple Task ✅ FIXED

**Date Discovered**: 2025-11-26
**Date Fixed**: 2025-11-26

**Input/Scenario**: User requested: "we have created a greetUser() function. but we didn't use it in the product, use it."

**Actual Behavior**:
1. Made **10 tool calls** attempting to complete the task:
   - `search_code({"query":"greetUser"}...)`
   - `list_directory({"path":"src"}...)`
   - `read_file` on `src/agent.ts` (offset 70, limit 30)
   - `read_file` on `src/agent.ts` (offset 40, limit 10)
   - `grep({"pattern":"start\\(\\)"}...)`
   - `read_file` on `src/agent.ts` (offset 22, limit 20)
   - `read_file` on `src/agent.ts` (offset 34, limit 15)
   - `edit_file` on `src/agent.ts` (attempted edit)
   - `read_file` on `src/agent.ts` (offset 51, limit 1)
   - `read_file` on `src/agent.ts` (full file)
2. Hit the **10 tool iteration limit**
3. Returned: **"[Warning] Empty response from model after 10 tool iterations"**
4. Task was **NOT completed**
5. No explanation of what went wrong or what was attempted

**Expected Behavior**:
For this simple task, agent should:

1. **Plan first** (ideally use TodoWrite):
   - Find greetUser() definition
   - Understand what it does
   - Identify where to call it
   - Make the edit
   - Verify the change

2. **Execute efficiently** (~4-6 tool calls max):
   - Search for greetUser() definition (1 call)
   - Read the file containing greetUser() to see its signature/purpose (1 call)
   - Search for/identify appropriate call site (1-2 calls)
   - Make the edit to add the function call (1 call)
   - Optionally verify the edit worked (1 call)

3. **Provide clear response**:
   - "I found greetUser() in [file:line]"
   - "I added a call to greetUser() in [location] because [reason]"
   - Show the diff
   - "The function is now being used in the product"

4. **Detect when stuck**:
   - If same approach fails 2-3 times, try different strategy
   - If approaching iteration limit, summarize progress and ask for help
   - Never return empty response

**Impact**:
- Simple task fails to complete
- Wastes 10 tool calls and significant API tokens
- User gets cryptic warning message instead of helpful response
- No visibility into what went wrong
- Poor user experience and lack of trust in agent capabilities
- No recovery mechanism or fallback

**Status**: ✅ fixed

**Fix Implementation**:

**1. Iteration Limit Warnings** (`src/agent.ts:135-139`):
- ✅ Warning at iteration 7: "7 tool calls made - consider summarizing progress"
- ✅ Warning at iteration 8: "8 tool calls made - please wrap up soon"
- ✅ Warnings logged to console for user visibility
```typescript
if (iterations === 7) {
    console.log('[Iteration Warning] 7 tool calls made - consider summarizing progress');
} else if (iterations === 8) {
    console.log('[Iteration Warning] 8 tool calls made - please wrap up soon');
}
```

**2. Better Error Messages** (`src/agent.ts:227-287`):
- ✅ Generate helpful structured message instead of empty response
- ✅ Summarizes all tool calls made (e.g., "Called read_file 5 times")
- ✅ Explains issue (loop detected vs iteration limit)
- ✅ Provides context-aware suggestions based on last tool used
- ✅ Example output:
```
I attempted to complete your request but encountered difficulties:

**Attempted:**
- Called read_file 5 times
- Called edit_file 2 times

**Issue:**
Loop detected: Repeatedly using same tools without making progress

**Suggestion:**
Try using grep to search for specific patterns instead of reading entire files

Would you like me to try that, or would you prefer to provide more guidance?
```

**3. Enhanced Loop Detection** (`src/error_recovery.ts:121-146`):
- ✅ Detects parameter similarity (same file, different offsets)
- ✅ Catches patterns like: read_file(foo.ts, offset=10), read_file(foo.ts, offset=20), read_file(foo.ts, offset=30)
- ✅ Works alongside existing repetition and alternation detection
```typescript
private detectParameterSimilarity(): boolean {
    // Detects when same file read 3+ times with different offsets
}
```

**4. Guardrails** (`src/agent.ts:20, 124, 169-178`):
- ✅ Track file read counts per file
- ✅ Reset counts on each new user message
- ✅ Warn when same file read 3+ times
- ✅ Message: "File X has been read N times - consider using grep or different approach"

**Tests**:
- Unit tests: 47/47 passing across 5 test files
  - `tests/iteration_limits.test.ts` (10 tests)
  - `tests/loop_detection.test.ts` (12 tests)
  - `tests/strategy_suggestions.test.ts` (8 tests)
  - `tests/error_messages.test.ts` (7 tests)
  - `tests/guardrails.test.ts` (10 tests)
- Test plan: `docs/TEST_PLANS.md` (BC-004 section)

**Files Modified**:
- `src/agent.ts:20, 124, 131, 135-139, 169-178, 227-287` - Iteration tracking, guardrails, error messages
- `src/error_recovery.ts:90-146` - Enhanced loop detection with parameter similarity
- `tests/*` - 5 comprehensive test files

**Behavior After Fix**:
- ✅ No more empty responses when hitting iteration limit
- ✅ Clear warnings before limit is reached
- ✅ Helpful error messages explaining what was attempted
- ✅ Detects and warns about loops (repetition, alternation, parameter similarity)
- ✅ Guardrails prevent excessive file reads
- ✅ Suggestions provided for alternative approaches

---

## Template for New Cases

```markdown
## BC-XXX: Brief Description

**Date Discovered**: YYYY-MM-DD

**Input/Scenario**:

**Actual Behavior**:

**Expected Behavior**:

**Impact**:

**Status**: documented | investigating | fixed

**Related Files**:

**Suggested Fix**:
```
