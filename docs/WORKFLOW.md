# CodeCraft Agent Workflow

This document defines the workflows that CodeCraft follows when handling user requests.

## Core Workflow

### 1. Intent Classification

When a user sends a message, CodeCraft first classifies the intent:

- **explain**: User wants to understand code
- **implement**: User wants to add new functionality
- **refactor**: User wants to improve existing code
- **debug**: User wants to fix a bug
- **test**: User wants to test functionality
- **analyze**: User wants to review/audit code

Intent classification also determines:
- **scope**: single_file, multi_file, or whole_project
- **entities**: Mentioned files, classes, functions
- **confidence**: How confident the classifier is

### 2. Task Planning

For multi-step tasks (3+ steps), CodeCraft uses `todo_write` to create a task plan:

```
User: "Add authentication to the CLI"

Agent creates todos:
1. Search for existing auth patterns
2. Read current Agent class
3. Implement auth module
4. Write tests for auth
5. Run tests to verify
6. Mark complete
```

### 3. Execution

CodeCraft executes tasks in order, using available tools:

**File Operations:**
- `read_file` - Read code to understand context
- `write_file` - Create new files
- `edit_file` - Modify existing files efficiently

**Search Operations:**
- `get_codebase_map` - Get high-level project structure
- `search_code` - Find symbols (functions, classes)

**Execution Operations:**
- `run_command` - Run shell commands (tests, builds, git)
- `todo_write` - Track task progress

### 4. Verification

**Critical Step:** After making code changes, CodeCraft MUST verify:

```typescript
// After implement/refactor/debug
await run_command('npm test');  // or appropriate test command
```

This ensures:
- No regressions introduced
- New code works as expected
- Existing tests still pass

### 5. Completion

Mark todos as completed and report results to user.

## Workflow Examples

### Example 1: Explain Request

```
User: "What does the Agent class do?"

Workflow:
1. Classify intent: explain (scope: single_file)
2. No todos needed (simple query)
3. Read src/agent.ts
4. Explain functionality concisely
5. Done
```

### Example 2: Implement Request

```
User: "Add a new tool for file search"

Workflow:
1. Classify intent: implement (scope: multi_file)
2. Create todos:
   - Write tests for new tool
   - Add tool declaration to TOOLS array
   - Implement tool logic
   - Run tests to verify
3. Execute each todo in order:
   - Mark as in_progress before starting
   - Do the work
   - Mark as completed after finishing
4. Verify: run_command('npm test')
5. Report results
```

### Example 3: Debug Request

```
User: "Fix the bug where edit_file fails on missing files"

Workflow:
1. Classify intent: debug (scope: single_file)
2. Create todos:
   - Read edit_file implementation
   - Identify the bug
   - Write test case for the bug
   - Fix the bug
   - Run tests to verify fix
3. Execute todos
4. Verify: run_command('npm test')
5. Report fix
```

### Example 4: Refactor Request

```
User: "Refactor the agent loop"

Workflow:
1. Classify intent: refactor (scope: single_file)
2. Create todos:
   - Read current agent loop
   - Read similar code for patterns
   - Plan refactoring approach
   - Make changes using edit_file
   - Run tests to ensure no regressions
3. Execute todos
4. Verify: run_command('npm test')
5. Report improvements
```

## Workflow Rules

### When to Use TodoWrite

Use `todo_write` for:
- Tasks with 3+ steps
- Multi-file changes
- Complex implementations
- Any refactoring or debugging

Do NOT use for:
- Simple queries
- Single file reads
- Trivial one-step tasks

### When to Run Tests

**ALWAYS** run tests after:
- Creating new files with code
- Editing existing code files
- Refactoring any code
- Fixing bugs

**NEVER** skip test verification when:
- Making implementation changes
- User explicitly asked for tests
- Modifying critical files

### How to Run Tests

1. Check README or package.json for test command
2. Common commands:
   - `npm test` (Node.js)
   - `cargo test` (Rust)
   - `pytest` (Python)
   - `go test` (Go)
3. Always use `run_command` tool
4. Report results to user

## Quality Standards

### Code Conventions

Before making changes:
1. Read existing code in the same file/directory
2. Check imports to understand library choices
3. Follow existing patterns (naming, structure, style)
4. Use existing utilities instead of creating new ones

### Security

- NEVER log or expose secrets/API keys
- NEVER commit secrets to repository
- Always validate user input at boundaries
- Follow OWASP security best practices

### Testing

- Write tests BEFORE implementing (TDD)
- Ensure tests are specific and meaningful
- Run tests after every change
- Fix any failures before completing task

## Success Metrics

A successful workflow includes:
- ✅ Intent correctly classified
- ✅ Multi-step tasks tracked with todos
- ✅ Code follows existing conventions
- ✅ Tests run after changes
- ✅ All tests passing
- ✅ Concise response (< 4 lines, excluding code)
- ✅ Tasks marked completed

## Workflow Testing

To test the workflow manually:

1. **Test Intent Classification:**
   ```
   > What is the Agent class?
   > Add a new tool
   > Fix the bug in edit_file
   > Refactor the agent loop
   ```
   Verify intent is logged correctly.

2. **Test Multi-Step Planning:**
   ```
   > Add authentication to the CLI
   ```
   Verify todos are created.

3. **Test Verification:**
   ```
   > Create a new file greeting.ts with a hello function
   ```
   Verify tests are run after creation.

4. **Test Completion:**
   Verify todos are marked completed after work is done.
