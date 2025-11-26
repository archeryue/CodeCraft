# CodeCraft Master Development Plan

**Unified, realistic plan combining agent architecture + tools + implementation timeline**

Based on production learnings from Claude Code and CodeCraft's hybrid Node.js+Rust strengths.

---

## Vision

Transform CodeCraft from a basic AST parser into a **production-grade AI coding assistant** that:
- Deeply understands your codebase
- Generates high-quality, context-aware code
- Follows project conventions automatically
- Provides concise, actionable responses
- Verifies all changes with tests

**Timeline:** 6 weeks
**Philosophy:** Simple tools + Smart agent = Complex capabilities

---

## Core Principles

### 1. **Simplicity Over Specialization**
- ❌ 40+ specialized tools (`edit_function`, `rename_symbol`, `analyze_quality`)
- ✅ 14 fundamental, composable tools
- Let agent intelligence combine tools, not specialized tools for everything

### 2. **Agent Intelligence > Tool Complexity**
```
Complex task: "Rename function foo to bar across the codebase"

❌ Wrong: Create rename_symbol() tool
✅ Right: Agent orchestrates:
  1. grep('foo') to find occurrences
  2. read_file() each file to verify context
  3. edit_file() each occurrence
  4. run_command('npm test') to verify
```

### 3. **Production-Quality Fundamentals**
- Concise responses (1-4 lines, no preamble)
- Follow project conventions (check existing code first)
- Verify with tests (mandatory, not optional)
- Track progress (TodoWrite for all multi-step tasks)

---

## Current State

**Implemented (Weeks 1-3 Complete):**
- ✅ Basic agent loop (simple while loop)
- ✅ 12 tools: read_file (with offset/limit), write_file, run_command, get_codebase_map, search_code, edit_file, todo_write, glob, grep, list_directory, get_symbol_info, get_imports_exports
- ✅ Rust engine with tree-sitter (TypeScript, Rust)
- ✅ Fuzzy symbol search
- ✅ Interactive REPL
- ✅ Intent classification (explain/implement/refactor/debug/test/analyze)
- ✅ Task tracking with todo_write
- ✅ Efficient string replacement editing (edit_file)
- ✅ File pattern matching (glob)
- ✅ Content search with regex (grep)
- ✅ Directory listing (list_directory)
- ✅ AST-based symbol info (get_symbol_info)
- ✅ Import/export analysis (get_imports_exports)
- ✅ 111 unit tests passing
- ✅ E2E tests with result verification

**Remaining Limitations:**
- ❌ No context manager (token budgeting)
- ❌ No dependency graph
- ❌ No convention following
- ❌ No automatic verification (test running)

---

## Target Architecture

### Component Stack

```
┌─────────────────────────────────────────────┐
│  User (CLI REPL)                            │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│  Agent Loop (Node.js)                       │
│  ┌─────────────────────────────────────┐   │
│  │ 1. Understand Intent                │   │
│  │ 2. Plan (TodoWrite)                 │   │
│  │ 3. Execute (Tools)                  │   │
│  │ 4. Verify (Tests/Lint)              │   │
│  └─────────────────────────────────────┘   │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│  System Prompt (Dynamic)                    │
│  ┌─────────────────────────────────────┐   │
│  │ - Core identity (concise, direct)   │   │
│  │ - Project context (type, conventions)│  │
│  │ - Task guidance (implement/debug)   │   │
│  │ - Quality standards                 │   │
│  └─────────────────────────────────────┘   │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│  Context Manager                            │
│  ┌─────────────────────────────────────┐   │
│  │ - Smart selection (⭐⭐⭐/⭐⭐/⭐)      │   │
│  │ - Token budgeting (8000 max)        │   │
│  │ - Relevance ranking                 │   │
│  └─────────────────────────────────────┘   │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│  Tools (14 Core)                            │
│  ┌──────────┬──────────┬──────────────┐    │
│  │ Files    │ Search   │ Execution    │    │
│  │ - read   │ - glob   │ - run_cmd    │    │
│  │ - write  │ - grep   │ - todo_write │    │
│  │ - edit   │ - search │              │    │
│  │ - list   │          │              │    │
│  └──────────┴──────────┴──────────────┘    │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│  Rust Engine (NAPI-RS)                      │
│  ┌─────────────────────────────────────┐   │
│  │ - Tree-sitter parsing (AST)         │   │
│  │ - Fuzzy search (SkimMatcherV2)      │   │
│  │ - Dependency graph                  │   │
│  │ - Symbol resolution                 │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

---

## 6-Week Implementation Roadmap

## Week 1: Production Basics ✅ COMPLETED

**Focus:** Concise responses, basic workflow, verification

### System Prompt
- [x] Replace generic prompt with production-style (concise, no preamble)
- [x] Add task-specific guidance (implement/refactor/debug/explain)
- [ ] Add quality standards (test before complete, follow conventions) - moved to Week 4
- [ ] Add project context injection (CodeCraft-specific) - moved to Week 4

### Tools (3 new)
- [x] **edit_file**(path, old_string, new_string) - String replacement editing (6 tests)
- [x] **todo_write**(todos) - Task tracking (mandatory for multi-step) (6 tests)
- [x] **Enhance read_file** - Add offset/limit for large files (9 tests)

### Agent Workflow
- [x] Add intent classification (explain vs implement vs refactor vs debug vs test vs analyze) (20 tests)
- [x] Add simple planning (create todos for multi-step tasks)
- [ ] Add verification step (run tests after implementation) - moved to Week 4
- [ ] Add convention checking (read similar code before implementing) - moved to Week 4

### Tests
- [x] Test edit_file (basic edits, not found, multiple matches)
- [x] Test todo_write (create, update, complete)
- [ ] Test workflow: implement → verify → complete - moved to Week 4

**Deliverable:** ✅ Agent that gives concise responses, tracks tasks

---

## Week 2: Search & Discovery ✅ COMPLETED

**Focus:** Efficient code navigation

### Tools (3 new)
- [x] **glob**(pattern, path?) - File pattern matching (`**/*.ts`) (12 tests)
- [x] **grep**(pattern, path?, options?) - Content search with regex (10 tests)
- [x] **list_directory**(path) - Browse structure (8 tests)

### Rust Engine Enhancement
- [ ] Improve search_code (return more than 10 results) - deferred
- [ ] Add relevance scoring to search results - deferred
- [ ] Add filtering to get_codebase_map (don't return everything) - deferred

### Agent Intelligence
- [x] Use glob to find files before reading
- [x] Use grep to find code patterns before editing
- [x] Combine tools: glob → grep → read → edit workflow

### Tests
- [x] Test glob with various patterns (12 tests)
- [x] Test grep with regex, file patterns, case sensitivity (10 tests)
- [x] Test list_directory with various paths (8 tests)

**Deliverable:** ✅ Agent can efficiently navigate and search codebase

---

## Week 3: Smart Context Selection + AST Power ✅ COMPLETED

**Focus:** Token efficiency, relevance, leverage tree-sitter strength

### AST-Based Tools (CodeCraft's Differentiator) ✅ COMPLETED

These tools leverage our Rust+tree-sitter engine - capabilities that basic grep/glob can't provide:

#### 12. `get_symbol_info(symbol: string, file: string) -> SymbolInfo` ✅
**Why:** Deep understanding of symbols beyond grep
**Rust implementation:** ✅ Parse AST, extract all metadata (8 tests)

#### 13. `get_imports_exports(file: string) -> ImportExportInfo` ✅
**Why:** Understand file dependencies (grep can't reliably parse imports)
**Rust implementation:** ✅ Parse import/export statements from AST (12 tests)

#### 14. `build_dependency_graph(path: string) -> DependencyGraph` ✅
**Why:** Project-wide understanding of file relationships
**Rust implementation:** ✅ Build nodes/edges graph with import resolution (13 tests)

#### 15. `resolve_symbol(symbol: string, file: string) -> SymbolLocation` ✅
**Why:** Find where symbols are defined, follow imports
**Rust implementation:** ✅ Local + import resolution (11 tests)

#### 16. `find_references(symbol: string, path: string) -> Reference[]` ✅
**Why:** Find all usages across codebase, critical for refactoring
**Rust implementation:** ✅ AST-based identifier matching (13 tests)

### Tests ✅
- [x] Test get_symbol_info (8 tests)
- [x] Test get_imports_exports (12 tests)
- [x] Test build_dependency_graph (13 tests)
- [x] Test resolve_symbol (11 tests)
- [x] Test find_references (13 tests)

### Context Manager - MOVED TO WEEK 4
- [ ] Implement tiered context structure (⭐⭐⭐ / ⭐⭐ / ⭐)
- [ ] Token counting (use tiktoken or similar)
- [ ] Budget management (default 8000 tokens max)
- [ ] Relevance ranking algorithm

**Deliverable:** ✅ Complete AST toolset for code intelligence
**Total:** 57 tests for Week 3 features

---

## Week 4: Verification & Quality ✅ COMPLETED

**Focus:** Reliability, convention following

### Tools Implemented ✅
- [x] **delete_file**(path) - Delete with safety checks (8 tests)
- [x] **detect_project_type**(path) - Detect node/rust/python, frameworks, linters (10 tests)
- [x] **extract_conventions**(path) - Extract naming, indent, quotes, test patterns (12 tests)

### Tools Enhancement - DEFERRED
- [ ] **Enhance run_command** - Add timeout, background execution (moved to Week 5+)

### Agent Workflow Enhancement - DEFERRED
- [ ] Before implementing: check project type + conventions
- [ ] After editing: run lint/typecheck automatically
- [ ] Only mark complete if tests pass

### Tests ✅
- [x] Test delete_file (8 tests)
- [x] Test project type detection (10 tests)
- [x] Test convention extraction (12 tests)
- [x] E2E tests verified

**Deliverable:** ✅ Tools for project analysis and safe file deletion
**Total:** 30 tests for Week 4 features

---

## Week 5: Advanced Agent Loop ✅ COMPLETED

**Focus:** Planning, error recovery, intelligence

### Agent Loop Enhancement (ReAct+)
- [x] **Phase 1: Understand**
  - Parse user intent deeply
  - Extract entities, constraints, success criteria
- [x] **Phase 2: Plan**
  - Create multi-step execution plan
  - Estimate tokens per step
  - Identify dependencies between steps
- [x] **Phase 3: Execute**
  - Execute steps in order
  - Build context from previous steps
  - Retry on error (max 3 attempts)
  - Ask user if stuck
- [x] **Phase 4: Reflect** (Optional)
  - Learn from execution
  - Update pattern library
  - Note lessons learned

### Context Manager
- [x] Token counting and budgeting
- [x] Tiered context (high/medium/low priority)
- [x] Relevance ranking by query
- [x] Budget enforcement (default 8000 tokens)

### Error Recovery
- [x] Detect loops (repeating same action)
- [x] Try alternative approach after failure
- [x] Ask user for help after 3 failures
- [x] Never mark task complete with errors

### Tests
- [x] Context manager tests (20 tests)
- [x] Planning engine tests (17 tests)
- [x] Error recovery tests (20 tests)

### Integration ✅
All modules integrated into `src/agent.ts`:
- [x] PlanningEngine - Creates plans for complex tasks
- [x] ContextManager - Tracks file reads and token usage
- [x] ErrorRecovery - Detects loops and tracks failures

### E2E Verification ✅
- [x] Multi-step planning shows `[Plan] Created X steps`
- [x] Context tracking shows `[Context] X files, Y tokens`
- [x] Error recovery handles failures gracefully
- [x] Loop detection triggers `[Loop Detected]` warnings

**Deliverable:** ✅ Intelligent agent framework with planning and error recovery

**Files:**
- `src/context_manager.ts` - Token budgeting and context prioritization
- `src/planning_engine.ts` - ReAct+ planning phases
- `src/error_recovery.ts` - Loop detection and error handling
- `src/agent.ts` - Integration point (lines 104-200)

---

## Week 6: Polish & Production Ready

**Focus:** Performance, reliability, user experience

### Performance Optimization
- [ ] Cache parsed ASTs (don't re-parse unchanged files)
- [ ] Parallel tool execution where possible
- [ ] Incremental dependency graph updates
- [ ] LRU cache for search results

### Rust Engine Polish
- [ ] Add support for more languages (Python, Go, Java)
- [ ] Optimize search performance (handle 10K+ files)
- [ ] Better error messages

### User Experience
- [ ] Colorized output (errors red, success green, info blue)
- [ ] Progress indicators for long operations
- [ ] Better diff viewer for edits
- [ ] Confirmation prompts for destructive operations

### Documentation
- [ ] Update CLAUDE.md with all new features
- [ ] Add examples to system prompt
- [ ] Create user guide
- [ ] API documentation for tools

### Comprehensive Testing
- [ ] End-to-end tests for all workflows
- [ ] Performance benchmarks
- [ ] Edge case testing
- [ ] Regression testing

**Deliverable:** Production-ready CodeCraft v1.0

**Success Metrics:**
- All tools <1% error rate
- Search handles 10K+ files in <1s
- Agent completes 85%+ of tasks successfully
- User satisfaction: concise, helpful, reliable

---

## Tool Inventory (Final)

### Implemented (18 tools + 3 modules - 240 tests)

#### Original (5)
1. ✅ `read_file` - Read file contents (with offset/limit) - 9 tests
2. ✅ `write_file` - Create/overwrite file - 3 tests
3. ✅ `run_command` - Execute shell commands
4. ✅ `get_codebase_map` - AST skeleton - 2 tests
5. ✅ `search_code` - Fuzzy symbol search

#### Week 1 (2)
6. ✅ `edit_file` - String replacement editing - 6 tests
7. ✅ `todo_write` - Task tracking - 6 tests

#### Week 2 (3)
8. ✅ `glob` - File pattern matching - 12 tests
9. ✅ `grep` - Content search with regex - 10 tests
10. ✅ `list_directory` - Browse structure - 8 tests

#### Week 3 (5)
11. ✅ `get_symbol_info` - Get symbol details (type, signature, location) - 8 tests
12. ✅ `get_imports_exports` - Show what file imports/exports - 12 tests
13. ✅ `build_dependency_graph` - Project-wide dependency graph - 13 tests
14. ✅ `resolve_symbol` - Find where symbol is defined - 11 tests
15. ✅ `find_references` - Find all usages of a symbol - 13 tests

#### Week 4 (3)
16. ✅ `delete_file` - Delete with safety checks - 8 tests
17. ✅ `detect_project_type` - Detect node/rust/python, frameworks - 10 tests
18. ✅ `extract_conventions` - Extract naming, indent, style patterns - 12 tests

#### Week 5 (3 modules)
19. ✅ `ContextManager` - Token budgeting and context prioritization - 20 tests
20. ✅ `PlanningEngine` - ReAct+ planning phases - 17 tests
21. ✅ `ErrorRecovery` - Loop detection and error handling - 20 tests

### Optional (Week 6+)
22. 🆕 `web_fetch` - Fetch web content (optional)
23. 🆕 `web_search` - Search web (optional)

**Total: 18 tools + 3 modules, 240 tests passing**

---

## Success Criteria

### Agent Quality
- [ ] Responses are concise (avg <4 lines excluding code)
- [ ] No unnecessary preamble ("Here is...", "Let me...")
- [ ] Follows project conventions 95%+ of time
- [ ] Generated code passes tests 80%+ of time
- [ ] No comments added unless asked

### Agent Intelligence
- [ ] Plans multi-step tasks with TodoWrite
- [ ] Searches before reading (efficient)
- [ ] Reads similar code before implementing
- [ ] Runs tests before marking complete
- [ ] Recovers from errors (doesn't repeat failures)

### Code Quality
- [ ] Matches project style 95%+ of time
- [ ] Uses same libraries as existing code
- [ ] No security vulnerabilities introduced
- [ ] Tests pass 80%+ on first attempt
- [ ] Lint/typecheck passes 90%+ of time

### Performance
- [ ] Tools respond in <500ms (except long ops)
- [ ] Context selection <5000 tokens (average)
- [ ] Task completion in <10 tool calls (average)
- [ ] Search handles 10K+ files in <1s

### User Experience
- [ ] Clear, actionable responses
- [ ] TodoWrite shows progress clearly
- [ ] Confirmation for destructive operations
- [ ] Helpful error messages with suggestions

---

## Comparison: Before vs After

| Aspect | Before (Current) | After (Week 6) |
|--------|-----------------|----------------|
| **Response Style** | Verbose, explanatory | Concise (1-4 lines) |
| **Planning** | None | TodoWrite for multi-step |
| **Verification** | Manual | Auto (tests/lint/typecheck) |
| **Conventions** | Generic code | Follows project style |
| **Editing** | Whole file | Targeted (edit_file) |
| **Context** | Dumps everything | Smart selection (⭐⭐⭐/⭐⭐/⭐) |
| **Search** | Fuzzy symbols only | glob + grep + symbols |
| **Token Usage** | ~15K/task | ~3-5K/task (70% savings) |
| **Tool Count** | 5 basic | 12-14 composable |
| **Success Rate** | ~40% (estimate) | 85%+ target |
| **Error Recovery** | None | Retry + alternative approach |

---

## Development Guidelines

### Daily Workflow
1. Morning: Pick task from current week
2. Write test first (TDD)
3. Implement minimal code to pass
4. Run full test suite
5. Update documentation
6. Commit with meaningful message

### Testing Requirements
- [ ] Unit tests for every tool
- [ ] Integration tests for workflows
- [ ] Performance benchmarks for Rust code
- [ ] Manual testing in REPL
- [ ] Edge case testing

### Code Quality
- [ ] Follow CodeCraft conventions (ESM, TypeScript strict)
- [ ] No comments (self-documenting code)
- [ ] Run `npm test` before commit
- [ ] Keep functions small (<50 lines)
- [ ] One purpose per function

### Git Workflow
- [ ] Branch per feature: `feat/edit-file-tool`
- [ ] Commit frequently with clear messages
- [ ] Don't break main branch
- [ ] Create PR when week's work is done

---

## Risk Mitigation

### Technical Risks

**Risk 1: LLM API Costs**
- Mitigation: Aggressive context compaction (75% reduction)
- Mitigation: Caching of search results
- Mitigation: Use smaller model for analysis tasks

**Risk 2: Performance (Large Codebases)**
- Mitigation: Incremental parsing (only changed files)
- Mitigation: Parallel processing in Rust
- Mitigation: LRU caching

**Risk 3: Code Quality**
- Mitigation: Mandatory test verification
- Mitigation: Convention extraction
- Mitigation: Pattern learning from existing code

**Risk 4: Scope Creep**
- Mitigation: Strict 6-week timeline
- Mitigation: Focus on 14 tools, not 40+
- Mitigation: Weekly deliverables, no skipping ahead

### Process Risks

**Risk 1: Falling Behind Schedule**
- Mitigation: Weekly goals, not monthly
- Mitigation: Can skip optional tools (web_fetch, web_search)
- Mitigation: Focus on MVP, polish later

**Risk 2: Over-Engineering**
- Mitigation: Keep tools simple
- Mitigation: Agent intelligence > specialized tools
- Mitigation: Review: "Does this save tokens?"

---

## Post-Week 6: Future Enhancements

### Nice-to-Haves (Not Critical)
- [ ] Sub-agent system (launch_agent tool)
- [ ] More languages (Python, Go, Java, C++)
- [ ] LSP integration (use language servers)
- [ ] Visual diff viewer (better than text)
- [ ] Web UI (in addition to CLI)
- [ ] Plugin system (user extensions)

### Long-Term Vision
- [ ] Multi-file refactoring across 100+ files
- [ ] Architectural analysis and suggestions
- [ ] Automated code reviews
- [ ] Performance profiling and optimization
- [ ] Security vulnerability scanning
- [ ] Technical debt analysis

**But for now:** Focus on the 6-week plan. Ship a production-quality v1.0.

---

## Quick Reference: What to Build When

**Week 1 (Basics):** ✅ DONE
- ✅ Production prompt + edit_file + todo_write + intent classification

**Week 2 (Search):** ✅ DONE
- ✅ glob + grep + list_directory

**Week 3 (AST Tools):** ✅ DONE
- ✅ get_symbol_info + get_imports_exports
- ✅ build_dependency_graph + resolve_symbol + find_references

**Week 4 (Quality):** ✅ DONE
- ✅ delete_file + detect_project_type + extract_conventions

**Week 5 (Intelligence):** ✅ DONE
- ✅ Context manager (tiered context, token budgeting)
- ✅ Planning engine (ReAct+ phases)
- ✅ Error recovery (loop detection, retry logic)

**Week 6 (Polish):**
- Performance + UX + docs + testing

---

## Getting Started (This Week)

### Day 1-2: System Prompt
1. Replace current prompt with production-style (concise, no preamble)
2. Add task-specific guidance templates
3. Test: responses should be 1-4 lines

### Day 3-4: Tools
4. Implement edit_file tool
5. Implement todo_write tool
6. Write tests for both

### Day 5: Workflow
7. Add intent classification
8. Add simple planning (create todos)
9. Add verification (run npm test after changes)

### Weekend: Testing
10. Test complete workflows
11. Measure: response length, test pass rate, token usage
12. Iterate based on metrics

---

## Conclusion

**Philosophy:** Simple tools + Smart agent = Production-grade assistant

**Timeline:** 6 weeks to v1.0

**Tools:** 12-14 (not 40+)

**Focus Areas:**
1. **Week 1-2:** Basics + Search (foundation)
2. **Week 3-4:** Context + Quality (intelligence)
3. **Week 5-6:** Advanced Loop + Polish (production-ready)

**Success = Ship v1.0 that:**
- Gives concise, helpful responses
- Follows project conventions
- Verifies all changes with tests
- Handles 85%+ of coding tasks successfully

Let's build it. 🚀
