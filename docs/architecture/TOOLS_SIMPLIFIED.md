# CodeCraft Tools Architecture (Simplified & Realistic)

Based on production systems like Claude Code - simple, composable tools, not specialized complexity.

---

## Philosophy: Simple Tools + Smart Agent = Complex Capabilities

**Wrong Approach:**
- 40+ specialized tools (`edit_function`, `rename_symbol`, `analyze_quality`...)
- Each tool does one specific task
- Agent just calls the right tool

**Right Approach:**
- ~15 fundamental, composable tools
- Agent combines them intelligently
- LLM provides the "smarts", tools provide the "hands"

**Example - Renaming a Symbol:**
```
❌ Complex tool approach:
rename_symbol('oldName', 'newName')  // One magic tool

✅ Simple tool approach:
1. Grep to find all occurrences
2. Read each file to understand context
3. Edit each occurrence
4. Bash to run tests
5. Verify success
```

The **agent** orchestrates this workflow, not a specialized tool.

---

## CodeCraft Core Tools (Target: 12-15 tools)

### Category 1: File Operations (5 tools)

#### 1. `read_file(path: string, offset?: number, limit?: number) -> string`
**Status:** ✅ Implemented
**What:** Read file contents
**Enhancements needed:**
- Add offset/limit support for large files
- Add metadata (size, modified time)

#### 2. `write_file(path: string, content: string) -> string`
**Status:** ✅ Implemented (with confirmation)
**What:** Create or overwrite file
**Keep:** User confirmation for existing files

#### 3. `edit_file(path: string, old_string: string, new_string: string) -> string`
**Status:** ❌ Need to add
**What:** Replace text in file (like Claude Code's Edit)
**Why:** More efficient than rewriting entire file
**Implementation:**
```typescript
case "edit_file":
  const content = fs.readFileSync(args.path, 'utf-8');
  if (!content.includes(args.old_string)) {
    return `Error: old_string not found in ${args.path}`;
  }
  const newContent = content.replace(args.old_string, args.new_string);
  fs.writeFileSync(args.path, newContent);
  return `Edited ${args.path}`;
```

#### 4. `list_directory(path: string) -> DirEntry[]`
**Status:** ❌ Need to add
**What:** List files and directories
**Why:** Browse project structure
**Note:** Can use `run_command('ls -la')` as fallback, but dedicated tool is cleaner

#### 5. `delete_file(path: string) -> string`
**Status:** ❌ Need to add
**What:** Delete file (with confirmation)
**Why:** Cleanup, refactoring

---

### Category 2: Code Search (3 tools)

#### 6. `glob(pattern: string, path?: string) -> string[]`
**Status:** ❌ Need to add
**What:** Find files by pattern (`**/*.ts`, `src/**/*.test.ts`)
**Why:** Fast file discovery
**Implementation:** Use Node.js `glob` or `fast-glob` library

#### 7. `grep(pattern: string, path?: string, options?: GrepOptions) -> Match[]`
**Status:** ❌ Need to add
**What:** Search file contents (like ripgrep)
**Why:** Find code, find references
**Options:**
```typescript
{
  filePattern?: string;   // '*.ts'
  caseSensitive?: boolean;
  contextLines?: number;  // lines before/after match
  maxResults?: number;
}
```
**Implementation:** Use Node.js or call ripgrep via Bash

#### 8. `get_codebase_map(path: string) -> string`
**Status:** ✅ Implemented (Rust engine)
**What:** AST-based skeleton of codebase
**Keep:** This is unique to CodeCraft, very useful
**Enhancement:** Add filtering by relevance

---

### Category 3: Code Understanding (1 tool - Rust Enhanced)

#### 9. `search_code(query: string, path?: string) -> SearchResult[]`
**Status:** ✅ Implemented (Rust engine)
**What:** Fuzzy search for symbols
**Keep:** Leverages our Rust+tree-sitter strength
**Enhancement:** Return more than 10 results, add relevance scores

---

### Category 4: Execution (1 tool)

#### 10. `run_command(command: string, background?: boolean) -> string`
**Status:** ✅ Implemented
**What:** Execute shell commands
**Enhancements needed:**
- Add timeout (default 2 minutes)
- Add background execution support
- Stream output for long-running commands
**Use cases:**
- `npm test`
- `npm run build`
- `tsc --noEmit` (typecheck)
- `eslint src/`
- `git status`
- `git diff`

---

### Category 5: Task Management (1 tool)

#### 11. `todo_write(todos: Todo[]) -> string`
**Status:** ❌ Need to add
**What:** Track task progress (TodoWrite from Claude Code)
**Why:** Give user visibility, prevent forgotten steps
**Mandatory:** Use for all multi-step tasks

---

### Category 6: Web Access (2 tools - Optional)

#### 12. `web_fetch(url: string, prompt: string) -> string`
**Status:** ❌ Optional
**What:** Fetch web page and analyze with LLM
**Priority:** LOW (nice to have for docs lookup)

#### 13. `web_search(query: string) -> SearchResult[]`
**Status:** ❌ Optional
**What:** Search web
**Priority:** LOW

---

### Category 7: Sub-Agents (1 tool - Advanced)

#### 14. `launch_agent(task: string, type: string) -> string`
**Status:** ❌ Advanced feature
**What:** Launch sub-agent for complex research/implementation
**Priority:** MEDIUM (Week 3-4)
**Types:**
- `explore` - Research codebase, answer questions
- `implement` - Implement feature autonomously
- `debug` - Debug issue autonomously

---

## Total: 14 Core Tools

**Implemented (5):**
1. ✅ read_file
2. ✅ write_file
3. ✅ get_codebase_map
4. ✅ search_code
5. ✅ run_command

**Need to Add (6) - PRIORITY:**
6. 🆕 edit_file - **CRITICAL**
7. 🆕 glob - **HIGH**
8. 🆕 grep - **HIGH**
9. 🆕 list_directory - **MEDIUM**
10. 🆕 todo_write - **HIGH**
11. 🆕 delete_file - **LOW**

**Optional (3):**
12. 🆕 launch_agent - **MEDIUM** (advanced)
13. 🆕 web_fetch - **LOW**
14. 🆕 web_search - **LOW**

---

## What We DON'T Need (Removed from my over-complex plan)

All of these can be done with simple tools + agent intelligence:

### ❌ Specialized Editing Tools
- ~~`edit_function`~~ → Use grep + read + edit
- ~~`edit_class`~~ → Use grep + read + edit
- ~~`rename_symbol`~~ → Use grep + edit (multiple files)
- ~~`extract_function`~~ → Agent does this with read + edit
- ~~`move_function`~~ → Agent does this with read + edit + delete

### ❌ Specialized Analysis Tools
- ~~`analyze_code_quality`~~ → Agent reads code and analyzes
- ~~`get_call_graph`~~ → Agent can trace this by reading code
- ~~`find_unused_code`~~ → Use grep to find references
- ~~`check_security`~~ → Agent reviews code for vulnerabilities
- ~~`analyze_complexity`~~ → Agent analyzes code

### ❌ Specialized Git Tools
- ~~`git_status`~~ → Use `run_command('git status')`
- ~~`git_diff`~~ → Use `run_command('git diff')`
- ~~`git_commit`~~ → Use `run_command('git commit ...')`
- All git operations → Use run_command + Bash

### ❌ Specialized Build/Test Tools
- ~~`run_tests`~~ → Use `run_command('npm test')`
- ~~`build_project`~~ → Use `run_command('npm run build')`
- ~~`lint_code`~~ → Use `run_command('eslint .')`
- ~~`typecheck`~~ → Use `run_command('tsc --noEmit')`

### ❌ Code Generation Tools
- ~~`generate_tests`~~ → Agent writes tests using read + write
- ~~`create_from_template`~~ → Agent does this
- ~~`generate_docs`~~ → Agent writes docs

**Key Insight:** If it can be done by combining basic tools, don't make a specialized tool.

---

## Implementation Plan (Revised)

### Week 1: Essential Tools + Better Prompt

**Goal:** Production-quality basics

**Tools (3):**
1. ✅ Enhance `read_file` (add offset/limit)
2. 🆕 Add `edit_file` (string replacement)
3. 🆕 Add `todo_write` (task tracking)

**System Prompt:**
4. ✅ Implement concise, production-style prompt
5. ✅ Add task-specific guidance (implement/refactor/debug/explain)
6. ✅ Mandatory TodoWrite usage
7. ✅ Mandatory test verification

**Testing:**
8. ✅ Write tests for new tools
9. ✅ Test complete workflows (implement feature end-to-end)

### Week 2: Search & Discovery

**Goal:** Efficient code navigation

**Tools (3):**
10. 🆕 Add `glob` (file pattern matching)
11. 🆕 Add `grep` (content search)
12. 🆕 Add `list_directory` (browse structure)

**Rust Engine Enhancement:**
13. ✅ Improve `search_code` (more results, better scoring)
14. ✅ Add filtering to `get_codebase_map`

**Agent Intelligence:**
15. ✅ Add intent classification (explain vs implement)
16. ✅ Add simple planning for multi-step tasks

### Week 3: Smart Context Selection

**Goal:** Token efficiency

**Rust Engine:**
17. 🆕 Build dependency graph (imports/exports)
18. 🆕 Implement `resolve_symbol` (find definition)
19. 🆕 Implement `find_references` (find usages)

**Context Builder:**
20. 🆕 Implement tiered context (⭐⭐⭐ / ⭐⭐ / ⭐)
21. 🆕 Token counting and budget management
22. 🆕 Relevance ranking

### Week 4: Execution & Verification

**Goal:** Quality and reliability

**Tools:**
23. ✅ Enhance `run_command` (timeout, background, streaming)
24. 🆕 Add background process management

**Workflow:**
25. ✅ Auto-run tests after implementation
26. ✅ Auto-check lint/types before completion
27. ✅ Pattern extraction from existing code
28. ✅ Convention detection (coding style)

### Week 5-6: Advanced Features (Optional)

**Tools:**
29. 🆕 `launch_agent` (sub-agents for complex tasks)
30. 🆕 `web_fetch` / `web_search` (optional)

**Rust Engine:**
31. 🆕 Support more languages (Python, Go, Java)
32. 🆕 Incremental parsing (only re-parse changed files)

### Week 7-8: Polish & Optimization

33. ✅ Performance optimization (caching, parallel processing)
34. ✅ Error recovery (retry with different approach)
35. ✅ Loop detection and breaking
36. ✅ Comprehensive testing

---

## Tool Design Guidelines

### 1. Keep It Simple
```typescript
// Good: Simple, composable
await grep('TODO', '.', { filePattern: '*.ts' });
await edit_file('src/app.ts', 'old code', 'new code');

// Bad: Over-specialized
await find_todos_and_create_issues({ assignee: 'user', labels: ['bug'] });
```

### 2. Let the Agent Be Smart
```typescript
// Agent orchestrates workflow:
User: "Rename function foo to bar"

Agent thinks:
1. Use grep to find all occurrences of 'foo'
2. Read each file to verify it's the right symbol
3. Edit each file to rename
4. Run tests to verify
5. Report success

// Not: call rename_symbol('foo', 'bar')
```

### 3. Prefer Bash for One-Offs
```typescript
// Good: Use run_command
await run_command('git status');
await run_command('npm test');
await run_command('tsc --noEmit');

// Bad: Create specialized tools
await git_status();
await run_tests();
await typecheck();
```

### 4. Only Add Tools That Save Tokens
```typescript
// Good: get_codebase_map
// Returns compact AST skeleton, saves 90% tokens vs reading all files

// Good: search_code
// Returns only relevant matches, saves grep + filter work

// Bad: analyze_code_quality
// Agent can read code and analyze, doesn't save tokens
```

---

## Success Metrics

### Tool Quality
- [ ] All tools have <1% error rate
- [ ] Clear error messages with suggestions
- [ ] Tools compose well (grep → read → edit workflow)

### Agent Capability
- [ ] Can implement simple features (single file) 90%+ accuracy
- [ ] Can refactor across files safely
- [ ] Follows project conventions 95%+ of time
- [ ] Tests pass on first try 70%+ of time

### Performance
- [ ] Tools respond in <500ms (except long operations)
- [ ] Total tokens per task <5000 (average)
- [ ] Task completion in <10 tool calls (average)

### User Experience
- [ ] Responses are concise (1-4 lines)
- [ ] TodoWrite used for all multi-step tasks
- [ ] No unnecessary preamble
- [ ] Tests always run before marking complete

---

## Comparison: Original Plan vs Simplified

| Aspect | Original (Over-complex) | Simplified (Realistic) |
|--------|------------------------|------------------------|
| **Total Tools** | 40+ | 14 |
| **Specialized Tools** | 30+ | 0 |
| **Core Philosophy** | "Tool for everything" | "Simple tools + Smart agent" |
| **edit_function** | Dedicated tool | grep + read + edit |
| **rename_symbol** | Dedicated tool | grep + edit (x N files) |
| **analyze_quality** | Dedicated tool | Agent reads and analyzes |
| **run_tests** | Dedicated tool | run_command('npm test') |
| **Git ops** | 7 dedicated tools | run_command('git ...') |
| **Implementation Time** | 12 weeks | 4-6 weeks |
| **Maintenance Burden** | High (40+ tools) | Low (14 tools) |
| **Flexibility** | Rigid (one tool = one task) | High (tools combine) |

---

## Next Steps (This Week)

1. ✅ Implement `edit_file` tool
2. ✅ Implement `todo_write` tool
3. ✅ Enhance `read_file` (offset/limit)
4. ✅ Update system prompt (concise, production-style)
5. ✅ Add intent classification
6. ✅ Write tests for new tools
7. ✅ Test end-to-end workflow

**Focus:** Get the basics right, not everything at once.

---

## Conclusion

**Key Realization:** Production systems succeed with **simple, composable tools** + **intelligent agent orchestration**, not with dozens of specialized tools.

**CodeCraft's Strength:**
- Rust + tree-sitter for fast AST parsing
- Smart search (fuzzy symbol search)
- Codebase understanding (dependency graphs)

**Let the LLM be smart about:**
- How to combine tools
- How to analyze code
- How to structure refactorings
- How to generate tests

**Total tools needed:** ~14 (not 40+)
**Implementation time:** 4-6 weeks (not 12)
**Result:** More maintainable, more flexible, production-ready.
