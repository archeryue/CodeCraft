# Manual Testing Guide

A step-by-step guide for users to test all CodeCraft features interactively.

## Quick Start

```bash
export GEMINI_API_KEY=your_api_key_here
npx tsx index.ts
```

You should see:
```
CodeCraft Agent Started. Type "exit" to quit.
>
```

**Important:** Type queries manually and wait for each response. The REPL should show `>` after every response.

---

## Part 1: Basic Features

### 1.1 Simple Conversation
```
> hello
```
**Expected:** Friendly greeting, REPL continues with `>`

```
> what is 2+2?
```
**Expected:** "4" - short, direct answer

### 1.2 Built-in Commands
```
> /help
```
**Expected:** Shows available commands (/clear, /help, /save, exit)

```
> /clear
```
**Expected:** "Context cleared." - chat history reset

```
> /save
```
**Expected:** JSON dump of conversation history

---

## Part 2: File Operations (18 Tools)

### 2.1 Reading Files
```
> Show me package.json
```
**Expected:**
- See `[Tool Call] read_file({"path":"package.json"}...)`
- File contents displayed

```
> Show me the first 10 lines of src/agent.ts
```
**Expected:**
- See `read_file` with `offset` and `limit` parameters
- Only 10 lines shown

### 2.2 Creating Files
```
> Create a file test_demo.txt with content "Hello World"
```
**Expected:**
- See `[Tool Call] write_file(...)`
- "File created successfully"

### 2.3 Editing Files
```
> Change "Hello" to "Goodbye" in test_demo.txt
```
**Expected:**
- See `[Tool Call] edit_file(...)`
- "Edit successful"

```
> Show me test_demo.txt
```
**Expected:** Content now shows "Goodbye World"

### 2.4 Deleting Files
```
> Delete test_demo.txt
```
**Expected:**
- See `[Tool Call] delete_file(...)`
- "File deleted successfully"

### 2.5 Listing Directories
```
> List files in the src directory
```
**Expected:**
- See `[Tool Call] list_directory({"path":"src"}...)`
- Shows files and subdirectories with type indicators

---

## Part 3: Search Tools

### 3.1 Glob (Find Files by Pattern)
```
> Find all TypeScript files in src/
```
**Expected:**
- See `[Tool Call] glob({"pattern":"**/*.ts","path":"src"}...)`
- List of .ts files

```
> Find all test files
```
**Expected:** Files matching `*.test.ts` pattern

### 3.2 Grep (Search File Contents)
```
> Search for "async function" in the codebase
```
**Expected:**
- See `[Tool Call] grep({"pattern":"async function"...})`
- File paths and line numbers with matches

```
> Find all imports of GoogleGenerativeAI
```
**Expected:** Shows files importing that module

---

## Part 4: Code Understanding Tools

### 4.1 Get Symbol Info
```
> What does the executeTool function do?
```
**Expected:**
- See `[Tool Call] get_symbol_info(...)`
- Shows function signature, parameters, return type

### 4.2 Resolve Symbol
```
> Where is the Agent class defined?
```
**Expected:**
- See `[Tool Call] resolve_symbol(...)`
- Shows file path and line number

### 4.3 Imports/Exports
```
> What does src/agent.ts import and export?
```
**Expected:**
- See `[Tool Call] get_imports_exports(...)`
- Lists all imports with sources
- Lists all exports

### 4.4 Find References
```
> Find all usages of the TOOLS constant
```
**Expected:**
- See `[Tool Call] find_references(...)`
- List of files and line numbers where TOOLS is used

### 4.5 Dependency Graph
```
> Show the dependency graph for src/
```
**Expected:**
- See `[Tool Call] build_dependency_graph(...)`
- Shows nodes (files) and edges (import relationships)

### 4.6 Codebase Map
```
> Generate a map of the codebase
```
**Expected:**
- See `[Tool Call] get_codebase_map(...)`
- Structural overview with functions, classes, interfaces

---

## Part 5: Project Understanding Tools

### 5.1 Detect Project Type
```
> What type of project is this?
```
**Expected:**
- See `[Tool Call] detect_project_type(...)`
- Shows: Node.js, TypeScript, test framework (vitest), etc.

### 5.2 Extract Conventions
```
> What coding conventions does this project use?
```
**Expected:**
- See `[Tool Call] extract_conventions(...)`
- Shows: naming (camelCase), indentation (spaces), quotes (single), etc.

---

## Part 6: Intent Classification

Watch for `[Intent]` logs showing how your query is classified:

### 6.1 Explain Intent
```
> How does the edit_file tool work?
```
**Expected:** `[Intent] explain (scope: single_file, confidence: X.XX)`

### 6.2 Implement Intent
```
> Add a function to greet users
```
**Expected:** `[Intent] implement (scope: ...)`

### 6.3 Analyze Intent
```
> Tell me about this project structure
```
**Expected:** `[Intent] analyze (scope: whole_project, ...)`

### 6.4 Debug Intent
```
> Why might the tests be failing?
```
**Expected:** `[Intent] debug (...)`

### 6.5 Refactor Intent
```
> Clean up the error handling in tools.ts
```
**Expected:** `[Intent] refactor (...)`

### 6.6 Test Intent
```
> Write tests for the Agent class
```
**Expected:** `[Intent] test (...)`

---

## Part 7: Advanced Agent Features (Week 5)

### 7.1 Planning Engine

For complex tasks, the agent creates execution plans:

```
> Refactor all error messages to use a consistent format
```
**Expected:**
- See `[Plan] Created X steps (est. Y tokens)` in **yellow**
- Agent breaks down task into multiple steps
- Multiple tool calls in sequence

```
> Add a new feature to log all tool calls to a file
```
**Expected:**
- Planning kicks in for multi-file tasks
- See estimated token usage

### 7.2 Context Manager

The agent tracks files accessed and manages context:

```
> Read src/agent.ts and src/tools.ts and explain how they work together
```
**Expected:**
- See `[Context] X files accessed, Y tokens used` in **cyan**
- Agent maintains context across file reads

```
> Now also read src/intent_classifier.ts
```
**Expected:**
- Context accumulates
- Token count increases

### 7.3 Error Recovery

The agent handles errors gracefully:

```
> Edit the file nonexistent.ts to add a comment
```
**Expected:**
- Rich error message in **red**
- Suggestion: "Use glob() to search for files"

### 7.4 Task Management (todo_write)
```
> Create a new file hello.ts with a greeting function, write tests for it, then run the tests
```
**Expected:**
- See `[Tool Call] todo_write(...)` creating task list
- Tasks executed in order
- Each task marked complete as it finishes

---

## Part 8: Polish Features (Week 6)

### 8.1 Colorized Output

All output should be colorized:

| Element | Color |
|---------|-------|
| `[Intent]` | Cyan |
| `[Tool Call]` | Yellow |
| `[Plan]` | Yellow |
| `[Context]` | Cyan |
| `[Tool Calls]` | Magenta |
| Errors | Red |
| Success | Green |

### 8.2 NO_COLOR Mode
```bash
NO_COLOR=1 npx tsx index.ts
```
Then run any query - output should have **no color codes**.

### 8.3 Error Formatting

Test various error scenarios:

```
> Read /nonexistent/path/file.ts
```
**Expected:**
- `Error: File not found: /nonexistent/path/file.ts` (red)
- `Suggestion: Use glob() to search for files` (yellow)

```
> Edit src/agent.ts and replace "xyz123nonexistent" with "abc"
```
**Expected:**
- `Error: Edit failed - string not found in src/agent.ts` (red)
- `Suggestion: Use read_file(...) to see current content` (yellow)

### 8.4 LRU Cache (Performance)

```
> Search for "executeTool" in the codebase
```
(Note the response time)

```
> Search for "executeTool" again
```
**Expected:**
- Second search should be faster (cached)
- Results identical

---

## Part 9: Complete Test Session

Run through this full session to verify everything works:

```bash
npx tsx index.ts
```

```
> hello
# Verify: Response, REPL continues

> /help
# Verify: Shows commands

> what files are in src?
# Verify: [Intent] analyze, [Tool Call] list_directory or run_command

> show me the first 5 lines of package.json
# Verify: [Tool Call] read_file with limit

> create a file test_session.txt with content "testing 123"
# Verify: [Tool Call] write_file

> change "123" to "456" in test_session.txt
# Verify: [Tool Call] edit_file

> show me test_session.txt
# Verify: Content is "testing 456"

> delete test_session.txt
# Verify: [Tool Call] delete_file

> find all TypeScript files
# Verify: [Tool Call] glob

> search for "import" in src/
# Verify: [Tool Call] grep

> where is the Agent class defined?
# Verify: [Tool Call] resolve_symbol or get_symbol_info

> what type of project is this?
# Verify: [Tool Call] detect_project_type

> read src/agent.ts and src/tools.ts and summarize them
# Verify: [Context] tracking, multiple read_file calls

> /clear
# Verify: Context cleared

> exit
# Verify: Clean exit
```

---

## Success Criteria

All these should work correctly:

- [ ] REPL continues after each response (shows `>`)
- [ ] Intent classification appears for queries
- [ ] All 18 tools work when appropriate
- [ ] Planning appears for complex tasks
- [ ] Context tracking shows file/token counts
- [ ] Errors are formatted with suggestions
- [ ] Colors display correctly
- [ ] NO_COLOR mode disables colors
- [ ] Multi-step tasks use todo_write
- [ ] Clean exit with "exit" command

---

## Troubleshooting

### REPL exits after first query
The async loop is broken. This is critical - report immediately.

### "GEMINI_API_KEY not set"
```bash
export GEMINI_API_KEY=your_key_here
```

### No colors showing
- Check terminal supports ANSI colors
- Make sure `NO_COLOR` is not set

### Tools not being called
- Check query phrasing
- Some queries may not need tools

### Empty or strange responses
- Try `/clear` to reset context
- Check API key is valid

### Cache not working
- Only applies to search operations
- First search populates, second uses cache
