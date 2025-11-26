# CodeCraft Project Roadmap

## Current State Analysis

### What Works
- ✅ Basic agent loop with tool calling
- ✅ Tree-sitter AST parsing for TypeScript and Rust
- ✅ Fuzzy symbol search
- ✅ File read/write with diff confirmation
- ✅ Shell command execution
- ✅ Interactive REPL with slash commands

### Critical Limitations

**1. Poor Code Understanding**
- Only extracts signatures (no bodies, no logic understanding)
- No semantic understanding of what code does
- No understanding of code relationships (calls, dependencies, inheritance)
- Cannot follow imports or resolve symbols across files

**2. Weak Code Generation**
- LLM receives minimal context (just signatures)
- System prompt is too generic
- No examples or patterns to guide generation
- Whole-file replacement only (cannot edit specific functions)

**3. No Project Intelligence**
- Doesn't understand project structure or conventions
- No dependency graph or import analysis
- Cannot identify entry points, tests, or core modules
- No awareness of build system, package manager, or tooling

**4. Limited Context Management**
- Shows ALL signatures (no relevance ranking)
- No chunking or prioritization
- Token limits not considered
- Cannot identify what's relevant to a query

**5. Basic Tool Set**
- Cannot edit multiple files atomically
- No code analysis tools (complexity, test coverage, etc.)
- No refactoring capabilities
- No integration with linters/formatters

---

## Vision & Goals

### 6-Month Vision
Build CodeCraft into a **production-grade AI coding assistant** that:
1. Deeply understands your codebase architecture and patterns
2. Generates high-quality, contextually-aware code
3. Performs intelligent refactoring across multiple files
4. Integrates seamlessly with development workflows
5. Provides actionable insights about code quality and architecture

### Success Metrics
- Can implement a feature request across 5+ files correctly
- Understands and follows project coding conventions
- Generates code that passes existing tests 80%+ of the time
- Provides accurate answers about complex code relationships
- Refactors code while maintaining functionality

---

## Implementation Roadmap

## Phase 1: Enhanced Context & Understanding (Weeks 1-3)

### Goal
Make CodeCraft **understand** the codebase deeply, not just parse it.

### 1.1 Dependency Graph Analysis
**Rust Engine Enhancement**

```rust
// New functions to add
pub fn build_import_graph(path: String) -> ImportGraph;
pub fn resolve_symbol(symbol: String, file: String) -> SymbolLocation;
pub fn find_references(symbol: String) -> Vec<Reference>;
pub fn get_call_graph(function: String) -> CallGraph;
```

**What it provides:**
- Full import/export graph across files
- Symbol resolution (find where a function/class is defined)
- Find all usages of a symbol
- Understand which functions call which

**Implementation:**
- Parse import statements with tree-sitter
- Build bi-directional graph (file → imports, file → imported by)
- Cache in memory for fast lookups
- Expose as tools to the LLM

### 1.2 Semantic Code Understanding
**Extract More Than Signatures**

Currently we only extract: `function foo(x: number): string`

Should extract:
```typescript
// Function: foo
// Parameters: x: number
// Returns: string
// Calls: bar(), baz()
// Uses imports: lodash.map, utils.helper
// Complexity: 5 (cyclomatic)
// Side effects: modifies global state, makes HTTP calls
```

**Implementation:**
- Analyze function bodies (not just signatures)
- Track function calls within bodies
- Identify imports used
- Calculate complexity metrics
- Detect side effects (I/O, mutations, etc.)

### 1.3 Smart Context Selection
**Tool: `get_relevant_context`**

Instead of dumping all signatures, intelligently select what's relevant:

```typescript
get_relevant_context(query: string, max_tokens: number) -> Context
```

**Algorithm:**
1. Parse user query to extract key terms
2. Find matching symbols via fuzzy search
3. Get related symbols via dependency graph
4. Rank by relevance (direct match > imports > callers > callees)
5. Fit within token budget, prioritizing highest-ranked

**Implementation:**
- TF-IDF or embedding-based relevance scoring
- Graph traversal to find related code
- Token counting and budget management
- Return prioritized, chunked context

### 1.4 Project Structure Analysis
**Tool: `analyze_project_structure`**

```json
{
  "type": "node_typescript_npm",
  "entry_points": ["index.ts", "src/agent.ts"],
  "test_files": ["tests/*.test.ts"],
  "config_files": ["package.json", "tsconfig.json"],
  "core_modules": ["src/agent.ts", "src/tools.ts"],
  "conventions": {
    "test_framework": "vitest",
    "module_system": "ESM",
    "naming": "camelCase"
  }
}
```

**Provides:**
- Automatic project type detection
- Entry point identification
- Test file locations
- Coding conventions
- Directory structure patterns

---

## Phase 2: Intelligent Code Generation (Weeks 4-6)

### Goal
Enable CodeCraft to **write** high-quality, context-aware code.

### 2.1 Enhanced System Prompt
**Current Problem:** Generic prompt doesn't guide code generation.

**Solution:** Dynamic, context-aware system prompt:

```
You are CodeCraft, a coding assistant for a {project_type} project.

PROJECT CONTEXT:
- Framework: {framework}
- Test Framework: {test_framework}
- Coding Conventions: {conventions}

CURRENT FILE: {current_file}
- Purpose: {file_purpose}
- Related Files: {related_files}
- Imported By: {imported_by}

CODING RULES:
{project_specific_rules}

When writing code:
1. Follow the existing patterns in {similar_files}
2. Maintain consistency with {related_modules}
3. Write tests in {test_directory} using {test_framework}
4. Match the style of existing code
```

### 2.2 Example-Based Learning
**Tool: `find_similar_code`**

```typescript
find_similar_code(task: string) -> CodeExample[]
```

When asked to implement a feature:
1. Search codebase for similar implementations
2. Extract patterns and structure
3. Provide as examples to LLM

**Example:**
```
User: "Add a new tool for formatting code"
CodeCraft:
- Finds: existing tool definitions in tools.ts
- Extracts: tool definition pattern
- Shows LLM: "Here's how tools are defined in this project: ..."
- Generates: new tool following same pattern
```

### 2.3 Partial File Editing
**Tool: `edit_function` / `edit_class`**

Instead of rewriting entire files:

```typescript
edit_function(file: string, function_name: string, new_body: string)
edit_class(file: string, class_name: string, new_methods: Method[])
insert_import(file: string, import_statement: string)
```

**Benefits:**
- Reduces token usage
- Minimizes diff size
- Less chance of breaking unrelated code
- Easier to review changes

**Implementation:**
- Use tree-sitter to locate exact AST nodes
- Replace only the target node
- Preserve formatting and comments
- Smart import management

### 2.4 Multi-File Code Generation
**Tool: `create_feature`**

```typescript
create_feature(description: string) -> FileChanges[]
```

**Workflow:**
1. Analyze what files need to be created/modified
2. Determine dependencies between changes
3. Generate code for each file
4. Ensure consistency (shared types, imports, etc.)
5. Present all changes together for review

**Example:**
```
User: "Add user authentication"
CodeCraft:
1. Creates: src/auth.ts (auth logic)
2. Modifies: src/agent.ts (add auth middleware)
3. Creates: tests/auth.test.ts (tests)
4. Modifies: package.json (add dependencies)
5. Shows: unified diff of all changes
6. Asks: confirmation before applying
```

---

## Phase 3: Advanced Capabilities (Weeks 7-10)

### 3.1 Intelligent Refactoring
**Tools:**
```typescript
extract_function(file: string, selection: Range, new_name: string)
rename_symbol(symbol: string, new_name: string) // across all files
move_function(from: string, to: string, function_name: string)
split_file(file: string, split_criteria: string)
```

**Implementation:**
- Use dependency graph to find all references
- Update imports automatically
- Maintain type correctness
- Run tests after refactoring

### 3.2 Code Quality Analysis
**Tool: `analyze_code_quality`**

```json
{
  "complexity": {
    "high_complexity_functions": ["processData: 45", "handleRequest: 38"]
  },
  "test_coverage": {
    "overall": "67%",
    "untested_files": ["src/utils.ts"]
  },
  "code_smells": [
    "Large function: processData (200 lines)",
    "Duplicated code: auth logic in 3 files"
  ],
  "suggestions": [
    "Split processData into smaller functions",
    "Extract auth logic to shared module"
  ]
}
```

**Provides:**
- Cyclomatic complexity per function
- Test coverage analysis
- Code smell detection
- Actionable refactoring suggestions

### 3.3 Test Generation
**Tool: `generate_tests`**

```typescript
generate_tests(file: string, functions?: string[]) -> TestCode
```

**Workflow:**
1. Analyze function signatures and bodies
2. Identify edge cases and input types
3. Generate comprehensive test cases
4. Follow project's test patterns
5. Mock external dependencies

**Example:**
```typescript
// Given function:
function divide(a: number, b: number): number {
  return a / b;
}

// Generates:
describe('divide', () => {
  it('should divide two numbers', () => {
    expect(divide(10, 2)).toBe(5);
  });

  it('should handle division by zero', () => {
    expect(divide(10, 0)).toBe(Infinity);
  });

  it('should handle negative numbers', () => {
    expect(divide(-10, 2)).toBe(-5);
  });
});
```

### 3.4 Documentation Generation
**Tool: `generate_docs`**

Auto-generate:
- Function/class docstrings
- API documentation
- Architecture diagrams (Mermaid)
- README sections

---

## Phase 4: Production Readiness (Weeks 11-12)

### 4.1 Performance Optimization
- Incremental indexing (only re-parse changed files)
- Caching of dependency graphs
- Parallel processing for large codebases
- Streaming responses for long operations

### 4.2 Error Handling & Recovery
- Graceful degradation when tools fail
- Automatic retry with backoff
- Clear error messages for users
- Fallback strategies (e.g., if AST parsing fails, use regex)

### 4.3 Configuration & Customization
**`.codecraft.json`**
```json
{
  "excluded_paths": ["generated/", "vendor/"],
  "max_context_tokens": 8000,
  "conventions": {
    "indent": 2,
    "quotes": "single",
    "naming": "camelCase"
  },
  "custom_rules": [
    "Always add type annotations",
    "Prefer functional style"
  ]
}
```

### 4.4 Integration with Development Workflow
- Git integration (create branches, commits, PRs)
- Run tests automatically after changes
- Format code with project's formatter
- Lint and fix issues
- Pre-commit hook integration

---

## Technical Implementation Details

### Rust Engine Architecture (Enhanced)

```
rust_engine/
├── src/
│   ├── lib.rs              # NAPI exports
│   ├── parser/             # Tree-sitter parsing
│   │   ├── typescript.rs
│   │   ├── rust.rs
│   │   └── generic.rs
│   ├── graph/              # Dependency graph
│   │   ├── import_graph.rs
│   │   ├── call_graph.rs
│   │   └── symbol_table.rs
│   ├── analysis/           # Code analysis
│   │   ├── complexity.rs
│   │   ├── patterns.rs
│   │   └── quality.rs
│   ├── search/             # Advanced search
│   │   ├── fuzzy.rs
│   │   ├── semantic.rs
│   │   └── relevance.rs
│   └── index/              # Caching & indexing
│       ├── cache.rs
│       └── incremental.rs
```

### Node.js Layer Architecture (Enhanced)

```
src/
├── agent.ts                # Agent orchestration
├── tools/                  # Tool implementations
│   ├── code_tools.ts       # Read, write, edit
│   ├── analysis_tools.ts   # Analyze, refactor
│   ├── search_tools.ts     # Search, find
│   └── test_tools.ts       # Generate tests, run
├── context/                # Context management
│   ├── selector.ts         # Smart context selection
│   ├── ranker.ts           # Relevance ranking
│   └── chunker.ts          # Token budget management
├── prompts/                # Prompt engineering
│   ├── system_prompt.ts    # Dynamic system prompts
│   ├── examples.ts         # Example extraction
│   └── templates.ts        # Prompt templates
├── ui/
│   ├── renderer.ts         # Markdown rendering
│   └── diff_viewer.ts      # Interactive diffs
└── utils/
    ├── project_detector.ts # Project type detection
    └── convention_parser.ts # Extract coding conventions
```

---

## Testing Strategy

### For Each Phase
1. **Unit Tests** - Test each new function/module
2. **Integration Tests** - Test tool interactions
3. **End-to-End Tests** - Test complete workflows
4. **Regression Tests** - Ensure old features still work

### Example E2E Tests
```typescript
describe('Feature Generation', () => {
  it('should generate a new tool with tests', async () => {
    const result = await agent.chat('Add a tool to list directory contents');

    expect(result.filesChanged).toContain('src/tools.ts');
    expect(result.filesCreated).toContain('tests/directory_tool.test.ts');

    // Run the generated tests
    const testResult = await runCommand('npm test');
    expect(testResult.exitCode).toBe(0);
  });
});
```

---

## Success Criteria Per Phase

### Phase 1 Completion
- [ ] Dependency graph built for entire codebase
- [ ] Can resolve any symbol to its definition
- [ ] Context selection reduces tokens by 70% while maintaining relevance
- [ ] Project structure auto-detected correctly

### Phase 2 Completion
- [ ] Can implement simple features (single file) with 90% accuracy
- [ ] Generated code matches project style
- [ ] Partial editing works without breaking code
- [ ] Multi-file changes coordinated correctly

### Phase 3 Completion
- [ ] Can refactor across 10+ files safely
- [ ] Test generation covers 80%+ of edge cases
- [ ] Code quality analysis identifies real issues
- [ ] Documentation generated is useful

### Phase 4 Completion
- [ ] Handles 10,000+ file codebases
- [ ] Error rate < 1%
- [ ] User-configurable for any project type
- [ ] Full development workflow integration

---

## Resources & Dependencies

### Additional Libraries Needed

**Rust:**
- `rayon` - Parallel processing
- `serde_json` - JSON serialization
- `petgraph` - Graph algorithms
- `lru` - LRU caching

**Node.js:**
- `tiktoken` - Token counting
- `simple-git` - Git operations
- `chokidar` - File watching
- `prettier` - Code formatting

### Team & Timeline
- **1 Developer**: 3 months (12 weeks)
- **2 Developers**: 6 weeks
- **3+ Developers**: 4 weeks

### Risk Mitigation
1. **LLM API Costs** - Implement aggressive caching, use smaller models for analysis
2. **Performance** - Profile early, optimize hot paths
3. **Accuracy** - Build comprehensive test suite, iterate based on feedback
4. **Scope Creep** - Strict phase gates, don't move to next phase until current is done

---

## Next Steps

### Immediate Actions (This Week)
1. Set up proper project structure for enhanced Rust engine
2. Implement dependency graph extraction (Phase 1.1)
3. Write tests for import graph functionality
4. Create `get_relevant_context` tool prototype

### Month 1 Goals
- Complete Phase 1
- Begin Phase 2
- Have working demo of "intelligent context selection"

### Milestone Markers
- **Week 3**: Show context selection working on CodeCraft itself
- **Week 6**: Generate a new tool from scratch that works
- **Week 10**: Refactor a real feature across multiple files
- **Week 12**: Public beta release

---

## Conclusion

This roadmap transforms CodeCraft from a **basic AST parser** to a **production-grade AI coding assistant**. Each phase builds on the previous, with clear goals and success criteria.

The key insight: **Better understanding → Better generation**

By investing heavily in Phase 1 (understanding the codebase deeply), we enable much better code generation in Phase 2+. The dependency graph, symbol resolution, and context selection are foundational capabilities that everything else builds upon.

**Let's build something remarkable.** 🚀
