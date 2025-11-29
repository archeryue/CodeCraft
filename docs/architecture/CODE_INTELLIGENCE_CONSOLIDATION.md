# Code Intelligence Consolidation Plan

> Consolidate 6 AST-based tools into 1 intelligent CodeSearch with automatic background indexing.

## Problem Statement

**Current State:**
- 6 AST-based tools exposed to LLM:
  - `SearchCode` - Fuzzy symbol search
  - `InspectSymbol` - Symbol info/resolution
  - `GetCodebaseMap` - Structural overview
  - `GetImportsExports` - File dependencies
  - `FindReferences` - Symbol usages
  - `BuildDependencyGraph` - Project-wide dependencies

**Issues:**
1. LLM must choose between similar tools → often picks wrong one (Grep vs SearchCode)
2. No shared state → each tool re-parses files
3. Complex system prompt needed to guide tool selection
4. Tests fail when LLM picks "wrong" but valid tool

## Solution: Unified Code Intelligence

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Code Intelligence Service                        │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                      Background Indexer                            │  │
│  │  • Runs on agent startup                                           │  │
│  │  • Watches for file changes                                        │  │
│  │  • Incremental updates                                             │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                    │                                     │
│                                    ▼                                     │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                      Code Knowledge Base                           │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐│  │
│  │  │   Symbols   │  │   Graphs    │  │         Mappings            ││  │
│  │  │ • Functions │  │ • Call      │  │ • File → Symbols            ││  │
│  │  │ • Classes   │  │ • Import    │  │ • Symbol → Definition       ││  │
│  │  │ • Types     │  │ • Inherit   │  │ • Symbol → References       ││  │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────────┘│  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                    │                                     │
│                                    ▼                                     │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                     Single Tool: CodeSearch                        │  │
│  │  CodeSearch(query, options?) → results                             │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Single Tool API

```typescript
interface CodeSearchParams {
  query: string;           // "Agent class", "handleError function", "imports in agent.ts"
  type?: 'symbol' | 'definition' | 'references' | 'structure' | 'dependencies';
  scope?: string;          // File or directory to search in
  limit?: number;          // Max results (default: 20)
}

interface CodeSearchResult {
  type: 'symbol' | 'definition' | 'reference' | 'structure' | 'dependency';
  name: string;
  file: string;
  line: number;
  snippet: string;
  metadata?: {
    kind: 'function' | 'class' | 'interface' | 'type' | 'variable';
    signature?: string;
    imports?: string[];
    exports?: string[];
  };
}
```

### Query Examples

| User Query | Type Detection | What It Does |
|------------|----------------|--------------|
| "Agent class" | symbol | Fuzzy search for symbols matching "Agent" |
| "where is handleError defined" | definition | Find definition of handleError |
| "who uses the Agent class" | references | Find all references to Agent |
| "structure of src/" | structure | Return codebase map for src/ |
| "what does agent.ts import" | dependencies | Return imports/exports of file |

### Background Indexer

```typescript
class CodeIntelligenceService {
  private index: CodeIndex;
  private watcher: FSWatcher;

  async initialize(projectRoot: string): Promise<void> {
    // 1. Build initial index (using Rust engine)
    this.index = await this.buildIndex(projectRoot);

    // 2. Start file watcher for incremental updates
    this.watcher = watch(projectRoot, {
      ignored: /node_modules|\.git|target|dist/,
      persistent: true
    });

    this.watcher.on('change', (path) => this.updateFile(path));
    this.watcher.on('add', (path) => this.addFile(path));
    this.watcher.on('unlink', (path) => this.removeFile(path));
  }

  search(params: CodeSearchParams): CodeSearchResult[] {
    // Query pre-built index - instant response
    return this.index.query(params);
  }
}
```

## Tool Consolidation

### Before (6 tools)

| Tool | Lines of Code | Purpose |
|------|--------------|---------|
| SearchCode | 57 | Fuzzy symbol search |
| InspectSymbol | 100+ | Symbol info/resolution |
| GetCodebaseMap | 47 | Structural overview |
| GetImportsExports | 80+ | File dependencies |
| FindReferences | 70+ | Symbol usages |
| BuildDependencyGraph | 60+ | Project dependencies |
| **Total** | **~400+ lines** | 6 tools to maintain |

### After (1 tool)

| Tool | Purpose |
|------|---------|
| CodeSearch | All code intelligence queries |

**Benefits:**
- LLM can't pick wrong tool
- Single description to understand
- Shared index = faster responses
- Simpler system prompt
- Easier to test

## Implementation Plan

### Phase 1: Background Indexer
1. Create `CodeIntelligenceService` class
2. Initialize on agent startup
3. Build index using existing Rust engine
4. Add file watcher for updates

### Phase 2: Unified CodeSearch Tool
1. Create new `CodeSearch` tool
2. Implement query type detection
3. Route to appropriate index queries
4. Return unified result format

### Phase 3: Remove Old Tools
1. Remove 6 individual AST tools
2. Update system prompt (simpler!)
3. Update tests
4. Update documentation

### Phase 4: Enhancements
1. Incremental indexing (only changed files)
2. Persistent cache (survive restarts)
3. Relevance ranking improvements
4. Cross-file relationship tracking

## System Prompt Impact

### Before
```
Tool Selection Strategy:
- Code structure questions → AST-based tools (SearchCode, InspectSymbol, GetCodebaseMap)
- Text/string search → Pattern matching (Grep)
...
```

### After
```
Code Search:
- Use CodeSearch for any code-related queries (symbols, definitions, references, structure)
- Use Grep for literal text search
```

**Simpler = fewer wrong choices**

## Migration Path

1. **Build new system alongside old** - CodeSearch coexists with old tools
2. **Test thoroughly** - Ensure CodeSearch covers all use cases
3. **Switch over** - Update system prompt to prefer CodeSearch
4. **Remove old tools** - Clean up deprecated tools
5. **Update tests** - E2E tests use CodeSearch

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| AST tools exposed to LLM | 6 | 1 |
| Tool selection errors | ~20% | ~0% |
| Average query time | 100-500ms | <50ms (indexed) |
| System prompt complexity | High | Low |
| E2E test reliability | Variable | Stable |

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Index memory usage | Lazy loading, limit index size |
| Startup time | Async indexing, show progress |
| Stale index | File watcher, periodic refresh |
| Query complexity | Smart defaults, simple API |

---

*This consolidation aligns with the philosophy: **simple tools + smart agent = complex capabilities**.*
