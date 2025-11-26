# Manual Testing Guide - Week 1 Features

This guide provides step-by-step instructions to test all Week 1 features interactively.

## Setup

```bash
export GEMINI_API_KEY=your_api_key_here
npx tsx index.ts
```

You should see:
```
CodeCraft Agent Started. Type "exit" to quit.
>
```

---

## Feature 1: Intent Classification

**What it does:** Classifies your query into intent types (explain/implement/refactor/debug/test/analyze)

### Test 1.1: Explain Intent
```
> What is the Agent class?
```

**Expected:**
- See: `[Intent] explain (scope: single_file, confidence: X.XX)`
- Tool called: `read_file` for src/agent.ts
- Response: Explanation of what Agent class does

### Test 1.2: Implement Intent
```
> Add a function to greet users
```

**Expected:**
- See: `[Intent] implement (scope: whole_project, confidence: X.XX)`
- Should ask clarifying questions OR create todos for implementation

### Test 1.3: Analyze Intent
```
> Tell me about this project
```

**Expected:**
- See: `[Intent] analyze (scope: whole_project, confidence: X.XX)`
- Tool called: `run_command` or `get_codebase_map`
- Response: Overview of the project

### Test 1.4: Debug Intent
```
> Fix any issues in the code
```

**Expected:**
- See: `[Intent] debug`
- Should search for issues or ask what to fix

---

## Feature 2: read_file with offset/limit

**What it does:** Reads specific line ranges from files

### Test 2.1: Read First 5 Lines
```
> Show me the first 5 lines of package.json
```

**Expected:**
- Tool called: `read_file({"path":"package.json","offset":0,"limit":5})`
- Response: Shows only first 5 lines of package.json

### Test 2.2: Read Specific Line Range
```
> Show me lines 10-20 of src/agent.ts
```

**Expected:**
- Tool called: `read_file` with offset=9, limit=11 (or similar)
- Response: Shows only that line range

### Test 2.3: Read Whole File
```
> Show me the entire README.md file
```

**Expected:**
- Tool called: `read_file({"path":"README.md"})` (no offset/limit)
- Response: Shows full README content

---

## Feature 3: edit_file Tool

**What it does:** Efficiently edits files using string replacement

### Test 3.1: Create a Test File First
```
> Create a file called test_edit.txt with content "Hello World"
```

**Expected:**
- Tool called: `write_file({"path":"test_edit.txt","content":"Hello World"})`
- File created successfully

### Test 3.2: Edit the File
```
> Change "Hello" to "Goodbye" in test_edit.txt
```

**Expected:**
- Tool called: `edit_file({"path":"test_edit.txt","old_string":"Hello","new_string":"Goodbye"})`
- Response: Confirms edit was made

### Test 3.3: Verify the Edit
```
> Show me test_edit.txt
```

**Expected:**
- Content should now be "Goodbye World"

### Test 3.4: Clean Up
```
> Delete test_edit.txt
```

Or manually: `rm test_edit.txt`

---

## Feature 4: todo_write Tool (Multi-step Task Tracking)

**What it does:** Tracks tasks for multi-step operations

### Test 4.1: Simple Multi-Step Task
```
> Create a new file hello.ts with a function that returns "hello", write a test for it, and run the tests
```

**Expected:**
- Tool called: `todo_write` with multiple tasks
- See todos created (e.g., "Create hello.ts", "Write tests", "Run tests")
- Agent executes each step
- Todos marked as completed progressively
- Final response confirms all steps done

### Test 4.2: Verify Todos are Used
Watch for these tool calls in sequence:
1. `todo_write` - Creates task list
2. `write_file` - Creates hello.ts
3. `todo_write` - Marks first task complete
4. `write_file` - Creates test file
5. `todo_write` - Marks second task complete
6. `run_command` - Runs tests
7. `todo_write` - Marks final task complete

### Test 4.3: Clean Up
```
> Delete hello.ts and the test file
```

Or manually: `rm hello.ts hello.test.ts`

---

## Feature 5: Production System Prompt

**What it does:** Makes agent concise, proactive with tools, and helpful

### Test 5.1: Concise Responses
```
> What is 2+2?
```

**Expected:**
- Short, direct answer: "4" or "2 + 2 = 4"
- No lengthy explanation unless you ask

### Test 5.2: Proactive Tool Usage
```
> What files are in the src directory?
```

**Expected:**
- Immediately uses `run_command("ls src")` or similar
- Doesn't refuse or ask for permission
- Shows the file list

### Test 5.3: Following Conventions
```
> Add a new tool to tools.ts
```

**Expected:**
- Should read tools.ts first to understand the pattern
- Tool called: `read_file({"path":"src/tools.ts"})`
- Then implements following existing patterns

---

## Feature 6: REPL Continuation

**What it does:** REPL continues after each response (doesn't exit)

### Test 6.1: Multiple Queries in One Session
```
> hello
```
Wait for response.

**Verify:** See `>` prompt again (CRITICAL!)

```
> what files are in src?
```
Wait for response.

**Verify:** See `>` prompt again

```
> show me package.json
```
Wait for response.

**Verify:** See `>` prompt again

```
> exit
```

**Expected:** Clean exit

**If REPL exits after first query, the REPL is BROKEN!**

---

## Feature 7: Built-in Commands

### Test 7.1: Help Command
```
> /help
```

**Expected:**
- Shows available commands
- Lists /clear, /help, /save, exit

### Test 7.2: Clear Command
```
> /clear
```

**Expected:**
- Response: "Context cleared."
- Chat history is reset
- Next query starts fresh

### Test 7.3: Save Command
```
> /save
```

**Expected:**
- Shows JSON of conversation history
- Contains previous messages and tool calls

---

## Complete Test Session Example

Here's a full session testing everything:

```bash
npx tsx index.ts
```

```
> hello
# Verify: Gets response, REPL continues

> what files are in src?
# Verify: Shows [Intent] analyze, uses run_command, lists files, REPL continues

> show me the first 10 lines of package.json
# Verify: Uses read_file with offset/limit, shows 10 lines, REPL continues

> create a file demo.txt with content "test"
# Verify: Uses write_file, file created, REPL continues

> change "test" to "demo" in demo.txt
# Verify: Uses edit_file, content changed, REPL continues

> show me demo.txt
# Verify: Shows "demo", REPL continues

> create a function add(a, b) in math.ts, write tests, and run them
# Verify: See todo_write calls, files created, tests run, REPL continues

> /help
# Verify: Shows commands, REPL continues

> exit
# Verify: Clean exit
```

Then verify files were created:
```bash
ls demo.txt math.ts math.test.ts
cat demo.txt  # Should show "demo"
```

Clean up:
```bash
rm demo.txt math.ts math.test.ts
```

---

## Success Criteria

For Week 1 features to be working correctly:

✅ Intent classification logs appear for each query
✅ read_file works with and without offset/limit
✅ edit_file changes file content correctly
✅ todo_write creates and tracks multi-step tasks
✅ Responses are concise and helpful
✅ Tools are used proactively
✅ **REPL continues after each response (doesn't exit)**
✅ Built-in commands work (/help, /clear, /save)
✅ Can handle multiple queries in one session
✅ Clean exit with "exit" command

---

## Common Issues and Fixes

### Issue: REPL exits after first query
**Fix:** The async loop is broken. Check index.ts

### Issue: Intent not showing
**Fix:** Check src/agent.ts line 114-115 for intent logging

### Issue: Tools not called
**Fix:** System prompt may be too restrictive, check src/agent.ts:24-49

### Issue: edit_file not working
**Fix:** Check old_string matches exactly (including whitespace)

### Issue: Responses are empty
**Fix:** System prompt may be confusing the model

---

## Testing Checklist

Before marking Week 1 as complete, verify:

- [ ] Run `npm test` - all 60 tests pass
- [ ] Test intent classification for all 6 types
- [ ] Test read_file with offset/limit
- [ ] Test edit_file creates and modifies files
- [ ] Test multi-step task creates todos
- [ ] Test REPL continues for at least 3 queries
- [ ] Test /help, /clear, /save commands
- [ ] No crashes or errors during session
- [ ] Clean exit with "exit" command

---

## Notes

- Always test interactively, not with scripts!
- Type queries manually and wait for responses
- Watch for tool call logs: `[Tool Call] tool_name(...)`
- Watch for intent logs: `[Intent] type (scope: ...)`
- REPL continuation is CRITICAL - if it exits after 1 query, stop and fix it!
