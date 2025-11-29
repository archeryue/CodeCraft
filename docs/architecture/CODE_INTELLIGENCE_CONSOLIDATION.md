# Code Intelligence Consolidation Plan

> Consolidate 5 AST-based tools into 1 unified CodeSearch (symbol/definition/references only).

## Problem Statement

**Current State:**
- 5 AST-based tools exposed to LLM:
  - `SearchCode` - Fuzzy symbol search
  - `InspectSymbol` - Symbol info/resolution
  - `GetCodebaseMap` - Structural overview
  - `GetImportsExports` - File dependencies
  - `FindReferences` - Symbol usages

**Issues:**
1. LLM must choose between similar tools → often picks wrong one (Grep vs SearchCode)
2. No shared state → each tool re-parses files
3. Complex system prompt needed to guide tool selection
4. Tests fail when LLM picks "wrong" but valid tool

## Key Insight

**We don't need all these tools.** The LLM already has:
- `ReadFile` - If you know the file, just read it
- `Grep` - For text/pattern search

What's actually useful from AST analysis:
- **Symbol search** - Find where something is defined
- **Definition info** - Get signature/type info for a symbol
- **References** - Find all usages of a symbol

Everything else (codebase structure, imports/exports, dependency graphs) can be done by just reading files.

## Solution: Simplified CodeSearch

### Tools to Remove
| Tool | Why Remove |
|------|------------|
| `GetCodebaseMap` | Just read files - LLM can understand structure |
| `GetImportsExports` | Just read the file - imports are at the top |
| `BuildDependencyGraph` | Not exposed to LLM anyway |

### Tools to Keep (Consolidated)
| Current Tool | → CodeSearch Mode |
|--------------|-------------------|
| `SearchCode` | `mode: 'search'` (default) |
| `InspectSymbol` | `mode: 'definition'` |
| `FindReferences` | `mode: 'references'` |

### Single Tool API

```typescript
interface CodeSearchParams {
  query: string;        // Symbol name to search
  mode?: 'search' | 'definition' | 'references';  // Default: 'search'
  file?: string;        // Required for 'definition' mode
  path?: string;        // Search directory (default: ".")
}
```

### Usage Examples

| Query | Mode | What It Does |
|-------|------|--------------|
| `CodeSearch("Agent")` | search | Fuzzy find symbols matching "Agent" |
| `CodeSearch("Agent", mode="definition", file="src/agent.ts")` | definition | Get Agent class signature/info |
| `CodeSearch("Agent", mode="references")` | references | Find all files using Agent |

## Tool Count Impact

| Before | After |
|--------|-------|
| 13 tools | 9 tools |
| 5 AST tools | 1 CodeSearch |

**Removed:** SearchCode, InspectSymbol, GetCodebaseMap, GetImportsExports, FindReferences
**Added:** CodeSearch (unified)

## Implementation Plan

### Phase 1: Create CodeSearch Tool
1. Create `src/tools/code-search.ts`
2. Combine logic from SearchCode, InspectSymbol, FindReferences
3. Single tool with mode parameter

### Phase 2: Remove Old Tools
1. Delete: `search-code.ts`, `inspect-symbol.ts`, `get-codebase-map.ts`, `get-imports-exports.ts`, `find-references.ts`
2. Update `tools/index.ts`
3. Update `tool-setup.ts`

### Phase 3: Update Tests
1. Remove old tool tests
2. Create CodeSearch tests
3. Update E2E tests to expect CodeSearch

### Phase 4: Simplify System Prompt
Remove tool selection guidance - tool descriptions should be self-explanatory.

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| AST tools exposed to LLM | 5 | 1 |
| Total tools | 13 | 9 |
| Tool selection confusion | Common | Rare |

---

*Philosophy: If the LLM knows the file, just read it. Only use AST tools for symbol discovery.*
