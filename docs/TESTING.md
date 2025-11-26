# How to Test CodeCraft

## Prerequisites

Make sure you have your Gemini API key exported:
```bash
export GEMINI_API_KEY=your_api_key_here
```

## Testing Levels

### Level 1: Unit Tests (Automated)
```bash
npm test
```
Should show: **60 tests passing**

**What this tests:** Individual functions and tools in isolation

**What this does NOT test:** Real user experience, REPL flow, actual CLI behavior

### Level 2: End-to-End Tests (Manual - REQUIRED)

**CRITICAL:** You MUST test the actual CLI interactively, not with scripts!

**❌ WRONG - This is NOT E2E testing:**
```bash
echo "hello" | npx tsx index.ts  # Piped input is not real usage!
```

**✅ CORRECT - This IS E2E testing:**

Start the interactive REPL:
```bash
export GEMINI_API_KEY=your_api_key_here
npx tsx index.ts
```

Then TYPE these queries manually, one at a time, and WAIT for each response:

**Test Session (type these one by one):**

```
> hello
```
**Wait for response.** Should reply "Hello! How can I help you today?"
**Verify:** REPL shows `>` prompt again (CRITICAL - if it exits, REPL is broken!)

```
> what files are in src?
```
**Wait for response.** Should use `run_command` and list files.
**Verify:** See `[Intent] analyze` and `[Tool Call] run_command(...)`
**Verify:** REPL shows `>` prompt again

```
> show me package.json
```
**Wait for response.** Should use `read_file` and show content.
**Verify:** REPL shows `>` prompt again

```
> exit
```
**Verify:** Clean exit without errors

**If REPL exits after first query → REPL is BROKEN!**

### More Test Commands:

**Explain Intent:**
```
> How does the edit_file tool work?
```
Should see `[Intent] explain`

**Implement Intent:**
```
> Create a file test.txt with content "hello"
```
Should see `[Intent] implement` and use `write_file`

**Built-in Commands:**
```
> /help      # Show available commands
> /clear     # Clear chat history
```

## 3. Test Tool Usage

You should see tool calls logged in yellow when the agent uses tools:

```
> What's in the package.json?
[Tool Call] read_file({"path":"package.json"}...)
```

```
> Run ls to show files
[Tool Call] run_command({"command":"ls"}...)
```

## 4. What You Should See

When working correctly, you'll see:

1. **Intent Classification** (cyan):
   ```
   [Intent] explain (scope: single_file, confidence: 0.83)
   ```

2. **Tool Calls** (yellow):
   ```
   [Tool Call] read_file({"path":"src/agent.ts"}...)
   ```

3. **Tool Call Count** (magenta):
   ```
   [Tool Calls] 2 tool(s) called
   ```

4. **Response** (formatted markdown):
   The agent's answer to your question

## 5. Test Multi-Step Workflow

Try a complex task:
```
> Create a new file hello.ts with a function that prints hello world, then run tests
```

You should see:
- Todos created with `todo_write`
- Files created with `write_file`
- Tests run with `run_command`
- Todos marked completed

## 6. Common Issues

### "GEMINI_API_KEY not set"
```bash
export GEMINI_API_KEY=your_key_here
```

### Empty responses
- Check that system prompt isn't too restrictive
- Verify API key is valid
- Look for errors in console

### Tests failing
```bash
npm test
```
All 60 tests should pass. If not, check:
- Dependencies installed (`npm install`)
- Rust engine built (`npm run build`)

## 7. End-to-End Test Script

Quick test of all features:

```bash
export GEMINI_API_KEY=your_key_here

# Test 1: Simple query
echo "What files are in src?" | timeout 10 npx tsx index.ts 2>&1 | grep -A 5 "Intent"

# Test 2: Check tests pass
npm test | tail -5

# Test 3: Interactive
npx tsx index.ts
# Then manually type queries
```

## Success Criteria

✅ All 60 unit tests pass
✅ Intent classification works (see cyan log)
✅ Tools are called (see yellow/magenta logs)
✅ Agent gives helpful responses
✅ Multi-step tasks create todos
✅ No crashes or errors
