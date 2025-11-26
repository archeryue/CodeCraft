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

## BC-001: Empty Prompt Triggers Unnecessary Tool Calls

**Date Discovered**: 2025-11-26

**Input/Scenario**: User submitted an empty prompt (just pressed Enter with no text)

**Actual Behavior**:
1. Intent classifier classified it as "analyze" with 50% confidence
2. System made 4 tool calls:
   - `search_code({"query":"validate"}...)`
   - `list_directory({"path":"./src"}...)`
   - `grep({"ignoreCase":true,"pattern":"validate","path":"./src","include":"*.ts"}...)`
   - `read_file({"offset":289,"path":"./src/tools.ts","limit":100}...)`
3. Returned information about a validation function in tools.ts (irrelevant response)
4. Wasted tokens and time on meaningless operations

**Expected Behavior**:
One of the following:
- Reject empty input with message: "Please enter a query"
- Prompt user: "What would you like help with?"
- Simply re-prompt without executing any tools
- Do not trigger intent classification for empty input

**Impact**:
- Wastes API tokens on unnecessary LLM calls
- Wastes time on tool execution
- Confuses user with irrelevant response
- Poor user experience

**Status**: documented

**Related Files**:
- `index.ts` - Input handling and REPL logic
- `src/intent_classifier.ts` - Intent classification (should not run on empty input)
- `src/agent.ts` - Agent loop (should handle empty messages gracefully)

**Suggested Fix**:
Add input validation in `index.ts` before passing to agent:
```typescript
if (!userMessage.trim()) {
  console.log('Please enter a query.');
  continue;
}
```

---

## BC-002: Code Search Returns Incomplete Results

**Date Discovered**: 2025-11-26

**Input/Scenario**: User asked: "Search for 'async function' in the codebase"

**Actual Behavior**:
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

Example desired output:
```
Found 5 async functions:

1. index.ts:21
   async function main() {
     const agent = new Agent(apiKey);
     await agent.start();
     ...
   }

2. src/agent.ts:45
   async start(): Promise<void> {
     this.chat = this.model.startChat({
       history: [],
     });
   }

[etc.]
```

**Impact**:
- Incomplete information makes it hard to understand codebase structure
- User has to make follow-up queries to get full context
- Wastes time and tokens on multiple back-and-forth interactions
- Poor developer experience for code exploration

**Status**: documented

**Related Files**:
- `src/tools.ts` - grep tool implementation (should return more context)
- `src/agent.ts` - Response formatting (should present results better)
- `src/ui/renderer.ts` - Output rendering (should format code search results)

**Suggested Fix**:
1. Modify grep tool to return multiple lines of context (use -A and -B flags)
2. Format results to show file:line and code block for each match
3. Consider using `search_code` tool instead of `grep` for symbol searches
4. Agent should request full function definitions after finding matches

---

## BC-003: Project Type Detection Misses Purpose and Architecture

**Date Discovered**: 2025-11-26

**Input/Scenario**: User asked: "What type of project is this?"

**Actual Behavior**:
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

**Impact**:
- User doesn't understand what the project actually does
- Misses critical architectural details (Rust engine)
- Can't see the value proposition or use cases
- Poor onboarding experience for new developers
- Doesn't help users understand how to use or contribute to the project

**Status**: documented

**Related Files**:
- `src/tools.ts` - `detect_project_type` tool (too limited in scope)
- `README.md` - Should be read for project overview
- `CLAUDE.md` - Contains comprehensive architecture documentation
- `package.json` - Contains project description and metadata
- `index.ts` - Entry point that shows it's a REPL/CLI tool

**Suggested Fix**:
When asked about project type, the agent should:
1. Read `README.md` first for project overview
2. Read `package.json` for description and metadata
3. Check for architecture docs (CLAUDE.md, ARCHITECTURE.md, etc.)
4. Use `detect_project_type` for tech stack details
5. Use `get_codebase_map` to understand structure
6. Read entry point file (index.ts, main.ts, etc.) to understand what it does
7. Synthesize all information into comprehensive answer covering purpose, architecture, and usage

Consider creating a new tool: `get_project_overview` that does all of the above automatically.

---

## BC-004: Agent Gets Stuck in Tool Call Loop, Fails Simple Task

**Date Discovered**: 2025-11-26

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

**Status**: documented

**Related Files**:
- `src/agent.ts` - Main agent loop (needs better iteration management)
- `src/planning_engine.ts` - Should be used for multi-step tasks
- `src/error_recovery.ts` - Should detect loops and suggest alternatives
- `index.ts` - Could show better error messages when hitting iteration limit

**Suggested Fix**:

1. **Add iteration limit warnings**:
   - At 7 iterations: Show internal warning to agent
   - At 8 iterations: Agent should summarize progress and ask user for guidance
   - At 10 iterations: Return helpful message explaining what was attempted

2. **Require planning for multi-step tasks**:
   - If task requires >3 steps, force use of planning_engine
   - TodoWrite should be mandatory for tasks like this

3. **Improve loop detection**:
   - error_recovery.ts should detect when same tool is called repeatedly with similar params
   - Suggest alternative approach after 2-3 failed attempts
   - Example: "I've tried reading src/agent.ts multiple times. Let me try searching the entire codebase instead."

4. **Better error messages**:
   - Never return empty response
   - Always explain what was attempted and why it failed
   - Provide actionable next steps for user

5. **Add guardrails**:
   - Limit consecutive reads of same file to 2-3
   - Detect when making no progress toward goal
   - Escalate to user before hitting hard limit

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
