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

**Implemented:**
- ✅ Basic agent loop (simple while loop)
- ✅ 5 tools: read_file, write_file, run_command, get_codebase_map, search_code
- ✅ Rust engine with tree-sitter (TypeScript, Rust)
- ✅ Fuzzy symbol search
- ✅ Interactive REPL

**Limitations:**
- ❌ Generic, verbose responses
- ❌ No planning or task breakdown
- ❌ No verification (doesn't run tests)
- ❌ No convention following
- ❌ Inefficient whole-file editing
- ❌ Poor context management (dumps everything)

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

## Week 1: Production Basics

**Focus:** Concise responses, basic workflow, verification

### System Prompt
- [ ] Replace generic prompt with production-style (concise, no preamble)
- [ ] Add task-specific guidance (implement/refactor/debug/explain)
- [ ] Add quality standards (test before complete, follow conventions)
- [ ] Add project context injection (CodeCraft-specific)

### Tools (3 new)
- [ ] **edit_file**(path, old_string, new_string) - String replacement editing
- [ ] **todo_write**(todos) - Task tracking (mandatory for multi-step)
- [ ] **Enhance read_file** - Add offset/limit for large files

### Agent Workflow
- [ ] Add intent classification (explain vs implement vs refactor vs debug)
- [ ] Add simple planning (create todos for multi-step tasks)
- [ ] Add verification step (run tests after implementation)
- [ ] Add convention checking (read similar code before implementing)

### Tests
- [ ] Test edit_file (basic edits, not found, multiple matches)
- [ ] Test todo_write (create, update, complete)
- [ ] Test workflow: implement → verify → complete

**Deliverable:** Agent that gives concise responses, tracks tasks, runs tests

**Success Metrics:**
- Responses < 4 lines (excluding code)
- TodoWrite used for all multi-step tasks
- Tests run automatically after changes
- 70%+ test pass rate on first try

---

## Week 2: Search & Discovery

**Focus:** Efficient code navigation

### Tools (3 new)
- [ ] **glob**(pattern, path?) - File pattern matching (`**/*.ts`)
- [ ] **grep**(pattern, path?, options?) - Content search (ripgrep)
- [ ] **list_directory**(path) - Browse structure

### Rust Engine Enhancement
- [ ] Improve search_code (return more than 10 results)
- [ ] Add relevance scoring to search results
- [ ] Add filtering to get_codebase_map (don't return everything)

### Agent Intelligence
- [ ] Use glob to find files before reading
- [ ] Use grep to find code patterns before editing
- [ ] Combine tools: glob → grep → read → edit workflow

### Tests
- [ ] Test glob with various patterns
- [ ] Test grep with regex, file patterns, context
- [ ] Test combined workflows (find → read → edit)

**Deliverable:** Agent can efficiently navigate and search codebase

**Success Metrics:**
- Find relevant code in <3 tool calls
- Use search before reading files
- Token usage reduced by 50%

---

## Week 3: Smart Context Selection + AST Power

**Focus:** Token efficiency, relevance, leverage tree-sitter strength

### AST-Based Tools (CodeCraft's Differentiator)

These tools leverage our Rust+tree-sitter engine - capabilities that basic grep/glob can't provide:

#### 12. `get_symbol_info(symbol: string, file: string) -> SymbolInfo`
**Why:** Deep understanding of symbols beyond grep
**Returns:**
```typescript
{
  name: string;
  kind: 'function' | 'class' | 'interface' | 'type' | 'variable';
  signature: string;      // full signature with types
  parameters?: Param[];   // typed parameters
  returnType?: string;
  documentation?: string; // JSDoc, rustdoc, etc.
  location: { file: string; line: number; column: number };
  visibility: 'public' | 'private' | 'exported';
}
```
**Use case:** "What does this function do? What are its parameters?"
**Rust implementation:** Parse AST, extract all metadata

#### 13. `get_imports_exports(file: string) -> ImportExportInfo`
**Why:** Understand file dependencies (grep can't reliably parse imports)
**Returns:**
```typescript
{
  imports: {
    source: string;        // '@google/generative-ai'
    symbols: string[];     // ['GoogleGenerativeAI', 'GenerativeModel']
    isDefault: boolean;
    isNamespace: boolean;
  }[];
  exports: {
    name: string;
    kind: 'function' | 'class' | 'type' | 'const';
    isDefault: boolean;
  }[];
}
```
**Use case:** "What does this file depend on? What does it provide?"
**Rust implementation:** Parse import/export statements from AST

### Rust Engine (Major Enhancement)
- [ ] Build import/export graph
  - Parse import statements
  - Track what imports what
  - Bi-directional graph (file → imports, file → imported by)
- [ ] Implement resolve_symbol(symbol, file) → Location
  - Find where symbol is defined
  - Return file, line, column
- [ ] Implement find_references(symbol) → Reference[]
  - Find all usages of symbol
  - Critical for refactoring

### Context Manager (New)
- [ ] Implement tiered context structure (⭐⭐⭐ / ⭐⭐ / ⭐)
  - Tier 1: Directly relevant (60% of budget)
  - Tier 2: Related symbols/files (30% of budget)
  - Tier 3: Background context (10% of budget)
- [ ] Token counting (use tiktoken or similar)
- [ ] Budget management (default 8000 tokens max)
- [ ] Relevance ranking algorithm
  - Exact match > fuzzy match > related > peripheral

### System Prompt Enhancement
- [ ] Dynamic context injection
- [ ] Show token usage ("Budget: 8000, Used: 2500, Remaining: 5500")
- [ ] Show relevance indicators (⭐⭐⭐ high, ⭐⭐ medium, ⭐ low)

### Tests
- [ ] Test dependency graph building
- [ ] Test symbol resolution
- [ ] Test reference finding
- [ ] Test context selection (stays within budget)
- [ ] Test relevance ranking

**Deliverable:** Smart context selection that fits token budget

**Success Metrics:**
- Context stays within 8000 token budget 100% of time
- Most relevant code prioritized
- Token usage reduced by 75% vs. dump-all approach
- Still finds relevant code 95%+ of time

---

## Week 4: Verification & Quality

**Focus:** Reliability, convention following

### Tools Enhancement
- [ ] **Enhance run_command**
  - Add timeout (default 120s)
  - Add background execution
  - Add output streaming for long commands
- [ ] **delete_file**(path) - With confirmation

### Pattern Extraction (New)
- [ ] **detect_project_type**() → ProjectInfo
  - Detect: node, rust, python, mixed
  - Identify: framework, test framework, linter
  - Read: package.json, Cargo.toml, etc.
- [ ] **extract_conventions**() → Conventions
  - Naming: camelCase, PascalCase, snake_case
  - Style: indent, quotes, semicolons
  - Patterns: test location, test naming
  - Read existing code to learn conventions

### Agent Workflow Enhancement
- [ ] Before implementing: check project type + conventions
- [ ] Before editing: read similar code to understand patterns
- [ ] After editing: run lint/typecheck automatically
- [ ] Only mark complete if tests + lint + typecheck pass

### Tests
- [ ] Test project type detection (CodeCraft, various projects)
- [ ] Test convention extraction (various codebases)
- [ ] Test workflow: detect → learn → implement → verify
- [ ] Test quality gates (fails if tests fail)

**Deliverable:** Agent that follows conventions and verifies quality

**Success Metrics:**
- Detects project type 100% of time
- Extracts conventions 90%+ accuracy
- Generated code matches project style 95%+ of time
- Tests + lint + typecheck run before completion 100% of time

---

## Week 5: Advanced Agent Loop

**Focus:** Planning, error recovery, intelligence

### Agent Loop Enhancement (ReAct+)
- [ ] **Phase 1: Understand**
  - Parse user intent deeply
  - Extract entities, constraints, success criteria
- [ ] **Phase 2: Plan**
  - Create multi-step execution plan
  - Estimate tokens per step
  - Identify dependencies between steps
- [ ] **Phase 3: Execute**
  - Execute steps in order
  - Build context from previous steps
  - Retry on error (max 3 attempts)
  - Ask user if stuck
- [ ] **Phase 4: Reflect** (Optional)
  - Learn from execution
  - Update pattern library
  - Note lessons learned

### Error Recovery
- [ ] Detect loops (repeating same action)
- [ ] Try alternative approach after failure
- [ ] Ask user for help after 3 failures
- [ ] Never mark task complete with errors

### Tests
- [ ] Test planning for complex tasks
- [ ] Test step execution with dependencies
- [ ] Test error recovery (retry with new strategy)
- [ ] Test loop detection

**Deliverable:** Intelligent agent that plans and recovers from errors

**Success Metrics:**
- Plans created for 100% of multi-step tasks
- Error recovery works (retry with new approach)
- Doesn't get stuck in loops
- Asks for help when truly stuck

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

### Implemented (5)
1. ✅ `read_file` - Read file contents
2. ✅ `write_file` - Create/overwrite file
3. ✅ `run_command` - Execute shell commands
4. ✅ `get_codebase_map` - AST skeleton
5. ✅ `search_code` - Fuzzy symbol search

### Week 1 (3)
6. 🆕 `edit_file` - String replacement editing
7. 🆕 `todo_write` - Task tracking
8. ✅ `read_file` (enhanced with offset/limit)

### Week 2 (3)
9. 🆕 `glob` - File pattern matching
10. 🆕 `grep` - Content search
11. 🆕 `list_directory` - Browse structure

### Week 3 (AST-based - CodeCraft's strength) (2)
12. 🆕 `get_symbol_info` - Get symbol details (type, params, docs)
13. 🆕 `get_imports_exports` - Show what file imports/exports

### Week 4 (1)
14. 🆕 `delete_file` - Delete with confirmation

### Optional (2) - Week 5+
15. 🆕 `web_fetch` - Fetch web content (optional)
16. 🆕 `web_search` - Search web (optional)

**Total: 14-16 core tools** (not 40+)

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

**Week 1 (Basics):**
- Production prompt + edit_file + todo_write + verification

**Week 2 (Search):**
- glob + grep + list_directory + better search_code

**Week 3 (Context):**
- Dependency graph + resolve_symbol + find_references + tiered context

**Week 4 (Quality):**
- detect_project_type + extract_conventions + auto verify (test/lint)

**Week 5 (Intelligence):**
- ReAct+ loop + planning + error recovery + reflection

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
