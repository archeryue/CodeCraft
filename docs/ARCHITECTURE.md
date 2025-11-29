# CodeCraft Architecture

> A hybrid Node.js + Rust CLI coding assistant that combines agentic workflows with deep code understanding.

## Executive Summary

CodeCraft is a terminal-based AI coding assistant designed to bridge the gap between two paradigms in AI-assisted development:

1. **Agentic CLI tools** (like Claude Code) - Direct terminal operation, autonomous task execution, read/write/execute capabilities
2. **Code intelligence platforms** (like Augment Code) - Deep codebase understanding through AST parsing and semantic analysis

By combining these approaches, CodeCraft delivers an assistant that can both *act* autonomously and *understand* code deeply.

**Key Metrics:**
- 17 registered tools + 3 analysis tools
- 527 unit tests (100% pass rate)
- 20 E2E tests (100% pass rate)
- Hybrid Node.js + Rust architecture for performance

---

## Table of Contents

1. [Project Vision](#1-project-vision)
2. [System Architecture](#2-system-architecture)
3. [Component Deep Dives](#3-component-deep-dives)
4. [Agent Loop (ReAct+)](#4-agent-loop-react)
5. [Tool System](#5-tool-system)
6. [Testing & Evaluation](#6-testing--evaluation)
7. [Design Decisions](#7-design-decisions)
8. [Future Directions](#8-future-directions)

---

## 1. Project Vision

### The Problem

Modern AI coding assistants fall into two camps:

| Approach | Strengths | Weaknesses |
|----------|-----------|------------|
| **Agentic CLI** (Claude Code) | Autonomous execution, direct file access, terminal integration | Limited codebase understanding, no semantic analysis |
| **Code Intelligence** (Augment Code) | Deep AST analysis, symbol resolution, dependency tracking | Often IDE-bound, less autonomous |

### Our Solution

CodeCraft combines both:

```
┌─────────────────────────────────────────────────────────────────┐
│                        CodeCraft                                 │
│  ┌─────────────────────┐     ┌─────────────────────────────┐   │
│  │   Agentic Layer     │     │   Intelligence Layer        │   │
│  │   (Node.js)         │────▶│   (Rust + Tree-sitter)      │   │
│  │                     │     │                             │   │
│  │  • Tool execution   │     │  • AST parsing              │   │
│  │  • LLM orchestration│     │  • Symbol extraction        │   │
│  │  • User interaction │     │  • Fuzzy search             │   │
│  │  • Planning/Recovery│     │  • Dependency analysis      │   │
│  └─────────────────────┘     └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. System Architecture

### High-Level Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                              User Terminal                              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                           index.ts (Entry Point)                        │
│  • REPL interface (readline)                                           │
│  • Input validation                                                     │
│  • Confirmation dialogs for file writes                                │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                           Agent (src/agent.ts)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │   Intent     │  │   Planning   │  │   Context    │  │   Error    │ │
│  │  Classifier  │  │   Engine     │  │   Manager    │  │  Recovery  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘ │
│                              │                                          │
│                              ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    LLM (Gemini 2.5 Flash)                        │  │
│  │  • Chat session management                                        │  │
│  │  • Function calling                                               │  │
│  │  • Retry logic with exponential backoff                          │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Tool Execution Layer                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐│
│  │  Tool Registry  │  │  Tool Executor  │  │  Tool Context           ││
│  │  (17 tools)     │──▶│  (validation)   │──▶│  (fs, rustEngine, cwd) ││
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
┌───────────────────────────────┐   ┌───────────────────────────────────┐
│      Node.js Tools            │   │      Rust Engine (NAPI-RS)        │
│  • File operations            │   │  • generate_repo_map()            │
│  • Bash execution             │   │  • search() (fuzzy)               │
│  • Glob/Grep                  │   │  • AST extraction                 │
│  • Todo tracking              │   │  • Tree-sitter (TS, Rust)         │
└───────────────────────────────┘   └───────────────────────────────────┘
```

### Directory Structure

```
CodeCraft/
├── index.ts                 # Entry point - REPL interface
├── src/
│   ├── agent.ts             # Main agent with ReAct+ loop
│   ├── llm.ts               # LLM initialization and configuration
│   ├── tool-setup.ts        # Tool registry and executor setup
│   ├── tool-registry.ts     # Tool registration and lookup
│   ├── tool-executor.ts     # Tool execution with validation
│   ├── tool-context.ts      # Execution context (fs, cwd, etc.)
│   │
│   ├── intent-classifier.ts # Intent classification (6 types)
│   ├── planning-engine.ts   # Multi-step task planning
│   ├── context-manager.ts   # Context budget management
│   ├── error-recovery.ts    # Loop detection and recovery
│   │
│   ├── tools/               # Individual tool implementations
│   │   ├── read-file.ts
│   │   ├── write-file.ts
│   │   ├── edit-file.ts
│   │   ├── glob.ts
│   │   ├── grep.ts
│   │   ├── bash.ts
│   │   ├── inspect-symbol.ts
│   │   └── ... (17+ tools)
│   │
│   ├── eval/                # Evaluation framework
│   │   ├── dataset-loader.ts
│   │   ├── unit-runner.ts
│   │   ├── llm-runner.ts
│   │   └── scorer.ts
│   │
│   └── ui/
│       └── renderer.ts      # Markdown terminal rendering
│
├── rust_engine/
│   └── src/
│       └── lib.rs           # Rust native addon (tree-sitter)
│
├── evals/
│   ├── datasets/            # Tool evaluation datasets
│   ├── run-all-evals.ts     # Tool evaluation runner
│   └── run-llm-evals.ts     # LLM evaluation runner
│
└── tests/
    ├── *.test.ts            # Unit tests
    └── e2e/                 # End-to-end tests
```

---

## 3. Component Deep Dives

### 3.1 Entry Point (index.ts)

The entry point provides:

1. **Interactive REPL** using Node.js readline
2. **Input validation** before sending to agent
3. **Confirmation flow** for file modifications (shows diff, asks y/n)
4. **Spinner animation** during LLM thinking

```typescript
// Simplified flow
const cli = new Agent(process.env.GEMINI_API_KEY);
cli.start();

while (true) {
    const msg = await prompt('> ');
    if (msg === 'exit') break;

    const response = await cli.chat(msg, confirmChange);
    console.log(renderer.render(response));
}
```

### 3.2 Agent (src/agent.ts)

The Agent orchestrates the entire interaction:

**Responsibilities:**
- Manages LLM chat session
- Coordinates intelligent subsystems (Intent, Planning, Context, Recovery)
- Executes tool calls in a loop
- Handles slash commands (/clear, /help, /init, /save)
- Applies guardrails (iteration limits, file read warnings)

**Key Configuration:**
```typescript
const DEFAULT_ITERATION_CONFIG = {
    maxIterations: 16,
    warningThresholds: {
        first: 10,   // "Consider summarizing..."
        second: 13,  // "Please wrap up soon..."
        final: 15    // "Must provide response"
    }
};
```

### 3.3 LLM Layer (src/llm.ts)

Centralized LLM configuration:

```typescript
export const DEFAULT_MODEL = 'gemini-2.5-flash';

// For agent: full tools, system prompt with CRAFT.md context
createAgentLLM(apiKey, tools, toolDeclarations, craftContext);

// For evaluation: temperature=0 for determinism
createEvalLLM(apiKey, tools, toolDeclarations);
```

**Features:**
- Dynamic system prompt generation
- CRAFT.md context injection
- Tool declarations for function calling
- Retry logic with exponential backoff (3 attempts)

### 3.4 Intent Classifier (src/intent-classifier.ts)

Classifies user messages before processing:

**Intent Types:**
| Intent | Pattern Examples |
|--------|-----------------|
| `explain` | "what is", "how does", "show me" |
| `implement` | "add", "create", "implement", "build" |
| `refactor` | "refactor", "improve", "optimize", "clean up" |
| `debug` | "fix bug", "debug", "why is", "not working" |
| `test` | "test", "verify", "run tests" |
| `analyze` | "analyze", "review", "audit" |

**Scope Types:**
| Scope | Determination |
|-------|---------------|
| `single_file` | One file entity mentioned |
| `multi_file` | Multiple file entities |
| `whole_project` | No files, or keywords like "application", "codebase" |

**Output:**
```typescript
{
    intent: 'implement',
    scope: 'multi_file',
    entities: ['src/agent.ts', 'UserService'],
    confidence: 0.85
}
```

### 3.5 Planning Engine (src/planning-engine.ts)

Creates execution plans for complex tasks:

**Three Phases:**
1. **Understand** - Parse intent, extract entities, constraints, success criteria
2. **Plan** - Generate ordered steps with token estimates
3. **Execute** - Run steps with dependency ordering, retry on failure

**Example Plan (implement intent):**
```typescript
{
    steps: [
        { id: '1', description: 'Analyze requirements', tokens: 500 },
        { id: '2', description: 'Search for relevant files', tokens: 300, deps: ['1'] },
        { id: '3', description: 'Read existing code', tokens: 1000, deps: ['2'] },
        { id: '4', description: 'Implement feature', tokens: 2000, deps: ['3'] },
        { id: '5', description: 'Run tests', tokens: 500, deps: ['4'] }
    ],
    totalEstimatedTokens: 4300
}
```

### 3.6 Context Manager (src/context-manager.ts)

Manages context window budget:

**Tiered Priority:**
```
HIGH (3)   - Current file, direct dependencies
MEDIUM (2) - Related files, imports
LOW (1)    - Other project files
```

**Budget Enforcement:**
- Default budget: 8000 tokens
- Truncates low-priority content first
- High-priority content truncated only as last resort

**Token Counting:**
```typescript
// Approximation: hybrid of word count and character count
countTokens(text) {
    const words = text.split(/\s+/).length;
    const chars = text.length;
    return Math.ceil((words + chars / 4) / 2);
}
```

### 3.7 Error Recovery (src/error-recovery.ts)

Detects problems and suggests alternatives:

**Loop Detection:**
```
Repetition:  A → A → A (same action 3+ times)
Alternation: A → B → A → B → A (ping-pong pattern)
```

**Error Types:**
- FILE_NOT_FOUND, INVALID_PATH
- SYNTAX_ERROR, EDIT_CONFLICT
- NETWORK_ERROR, TIMEOUT
- NO_MATCHES, AMBIGUOUS
- PERMISSION_DENIED, COMMAND_FAILED

**Recovery Strategies:**
| Error Type | Strategy | Suggested Action |
|------------|----------|------------------|
| FILE_NOT_FOUND | SEARCH_FIRST | Use glob to find file |
| NO_MATCHES | BROADEN_SEARCH | Simplify search pattern |
| AMBIGUOUS | ASK_USER | Request clarification |
| NETWORK_ERROR | RETRY | Wait and retry |
| SYNTAX_ERROR | ABORT | Cannot recover |

### 3.8 Rust Engine (rust_engine/src/lib.rs)

High-performance code analysis via NAPI-RS:

**Exported Functions:**
```rust
#[napi]
pub fn generate_repo_map(path: String) -> String
// Returns structural skeleton with signatures only

#[napi]
pub fn search(path: String, query: String) -> Vec<SearchResult>
// Fuzzy symbol search using SkimMatcherV2 (threshold: 60)
```

**Tree-sitter Support:**
- TypeScript (.ts, .tsx)
- Rust (.rs)

**Extracted Node Types:**
- Functions, methods
- Classes, interfaces
- Structs, traits, impls

**File Filtering:**
- Ignores: hidden files, node_modules, target, dist
- Only processes supported language files

---

## 4. Agent Loop (ReAct+)

The agent implements an enhanced ReAct (Reasoning + Acting) loop:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           User Message                                   │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 1: UNDERSTAND                                                     │
│  ├── Intent Classification (explain/implement/refactor/debug/test)      │
│  ├── Scope Detection (single_file/multi_file/whole_project)             │
│  └── Entity Extraction (files, classes, functions)                      │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 2: PLAN (for multi_file or whole_project scope)                  │
│  ├── Generate execution steps                                           │
│  ├── Estimate token usage                                               │
│  └── Order by dependencies                                              │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Phase 3: EXECUTE                                                        │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                      Tool Execution Loop                           │ │
│  │                      (max 16 iterations)                           │ │
│  │                                                                    │ │
│  │   ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐   │ │
│  │   │ LLM Response│───▶│Tool Calls?  │─No─▶│ Return Text Response│   │ │
│  │   └─────────────┘    └──────┬──────┘    └─────────────────────┘   │ │
│  │                             │ Yes                                  │ │
│  │                             ▼                                      │ │
│  │   ┌───────────────────────────────────────────────────────────┐   │ │
│  │   │  For each tool call:                                      │   │ │
│  │   │  1. Check for loops (Error Recovery)                      │   │ │
│  │   │  2. Track context (Context Manager)                       │   │ │
│  │   │  3. Apply guardrails (file read limits)                   │   │ │
│  │   │  4. Execute tool                                          │   │ │
│  │   │  5. Record success/failure                                │   │ │
│  │   └───────────────────────────────────────────────────────────┘   │ │
│  │                             │                                      │ │
│  │                             ▼                                      │ │
│  │   ┌─────────────────────────────────────────────────────────────┐ │ │
│  │   │  Send tool results back to LLM                              │ │ │
│  │   │  (continue loop)                                            │ │ │
│  │   └─────────────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### Guardrails

1. **Iteration Limits**: Max 16 tool calls per turn, with warnings at 10, 13, 15
2. **File Read Tracking**: Warns after 3+ reads of same file
3. **Loop Detection**: Detects repetition and alternation patterns
4. **Retry Logic**: 3 attempts with exponential backoff for LLM calls

---

## 5. Tool System

### Tool Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Tool Registry                                   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  register(tool: Tool)                                            │   │
│  │  get(name: string): Tool                                         │   │
│  │  getAll(): Tool[]                                                │   │
│  │  getDeclarations(): GeminiToolDeclaration[]                      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────┬─────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          Tool Executor                                   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  executeWithContext(name, args, context): ToolResult             │   │
│  │  1. Look up tool in registry                                     │   │
│  │  2. Validate arguments against schema                            │   │
│  │  3. Execute tool with context                                    │   │
│  │  4. Return structured result                                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────┬─────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          Tool Context                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  cwd: string           // Current working directory              │   │
│  │  fs: FileSystem        // File system interface                  │   │
│  │  rustEngine: RustEngine // Native addon for AST operations       │   │
│  │  confirm?: Function    // Confirmation callback for writes       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Tool Catalog

#### File Operations (5 tools)

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `read_file` | Read file contents | `path`, `offset?`, `limit?` |
| `write_file` | Write/create file | `path`, `content` |
| `edit_file` | String replacement | `path`, `old_string`, `new_string` |
| `delete_file` | Delete file | `path` |
| `list_directory` | List directory | `path` |

#### Search & Discovery (4 tools)

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `glob` | Pattern matching | `pattern`, `path?` |
| `grep` | Content search | `pattern`, `path?`, `options?` |
| `get_codebase_map` | AST skeleton | `path` |
| `search_code` | Fuzzy symbol search | `query`, `path?` |

#### AST-Based Analysis (4 tools)

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `inspect_symbol` | Symbol info/resolution | `symbol`, `file`, `mode?` |
| `get_imports_exports` | Module dependencies | `file` |
| `build_dependency_graph` | Project dependency map | `path` |
| `find_references` | Symbol usage search | `symbol`, `path` |

#### Execution & Process (4 tools)

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `bash` | Execute commands | `command`, `timeout?`, `run_in_background?` |
| `bash_output` | Read background output | `bash_id` |
| `kill_bash` | Terminate process | `bash_id` |
| `todo_write` | Track tasks | `todos[]` |

#### Analysis (3 tools, /init only)

| Tool | Description |
|------|-------------|
| `detect_project_type` | Identify tech stack |
| `extract_conventions` | Discover code patterns |
| `get_project_overview` | Generate summary |

### Tool Interface

```typescript
interface Tool {
    name: string;
    description: string;
    parameters: JSONSchema;
    execute(args: any, context: ToolContext): Promise<ToolResult>;
}

interface ToolResult {
    success: boolean;
    data?: any;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
}
```

---

## 6. Testing & Evaluation

### Three-Layer Testing Philosophy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  Layer 3: EVALUATIONS (Intelligence Quality)                            │
│  "How well does it work?"                                               │
│  ├── Tool Evals: 161/300 passing (53.7%)                                │
│  └── LLM Evals: 47/72 passing (65.3%)                                   │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Layer 2: E2E TESTS (System Integration)                                │
│  "Does it work end-to-end?"                                             │
│  ├── 20 tests, 100% pass rate                                           │
│  ├── Real LLM calls with retry logic                                    │
│  └── ~5 minutes execution time                                          │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Layer 1: UNIT TESTS (Functional Correctness)                           │
│  "Does each piece work correctly?"                                      │
│  ├── 527 tests, 100% pass rate                                          │
│  ├── Mocked dependencies                                                │
│  └── <1 minute execution time                                           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Unit Tests

**Location:** `tests/*.test.ts`

**Philosophy:**
- Test pure functions and deterministic logic
- Mock external dependencies (fs, LLM, Rust engine)
- Fast feedback loop (<1 minute full suite)

**Running:**
```bash
npm test           # Run all unit tests
npx vitest         # Watch mode
```

### E2E Tests

**Location:** `tests/e2e/*.test.ts`

**Philosophy:**
- Test real system with actual LLM calls
- Verify tool execution works correctly
- Don't test if LLM made "smart" choices (that's for evals)

**Test Files:**
| File | Coverage |
|------|----------|
| `file-tools.test.ts` | Glob, Grep, ListDirectory |
| `file-read-operations.test.ts` | ReadFile, ListDirectory |
| `search-operations.test.ts` | Search workflows |
| `code-analysis.test.ts` | InspectSymbol, GetImportsExports |
| `advanced-code-analysis.test.ts` | GetCodebaseMap, SearchCode |
| `multi-step-workflows.test.ts` | Complex multi-tool tasks |
| `integration-scenarios.test.ts` | Real-world scenarios |

**Running:**
```bash
npm run test:e2e   # Run E2E tests (~5 min)
npm run test:all   # Run both unit and E2E
```

### Evaluation System

**Purpose:** Measure AI intelligence quality over time.

#### Tool Evaluations

**Location:** `evals/datasets/*.json`, `evals/run-all-evals.ts`

**Metrics:**
- Correctness of tool output
- Edge case handling
- Error conditions

**Running:**
```bash
npx tsx evals/run-all-evals.ts
```

#### LLM Evaluations

**Location:** `evals/datasets/llm/*.json`, `evals/run-llm-evals.ts`

**What it measures:**
- Did the LLM select the correct tool?
- Are the parameters correct?
- Did it avoid forbidden tools?

**Metrics:**
```
Exact Matches      - Selected exactly the right tool
Acceptable Matches - Selected acceptable alternative
Wrong Tool         - Selected incorrect tool
No Tool            - Failed to call any tool
Forbidden Tool     - Called explicitly forbidden tool
Parameter Quality  - Quality of parameters when tool was correct
```

**Running:**
```bash
export GEMINI_API_KEY=your_key
npx tsx evals/run-llm-evals.ts
```

---

## 7. Design Decisions

### Why Hybrid Node.js + Rust?

| Concern | Node.js | Rust |
|---------|---------|------|
| **Interactive I/O** | Excellent (readline, streams) | Awkward |
| **LLM SDKs** | First-class support | Limited |
| **Async operations** | Native (async/await) | More complex |
| **Code parsing** | Slow (tree-sitter-node) | Fast (native tree-sitter) |
| **Memory safety** | GC pauses possible | Guaranteed |
| **Deployment** | npm install | Cross-compile complexity |

**Decision:** Use Node.js for orchestration and user interaction, Rust for CPU-intensive parsing.

**Bridge:** NAPI-RS compiles Rust to a `.node` native addon, loaded via `require()`.

### Why Gemini 2.5 Flash?

1. **Function calling** - Native support for tool use
2. **Speed** - Faster than larger models for iterative workflows
3. **Cost** - Lower cost for high-iteration agent loops
4. **Quality** - Sufficient for code tasks

### Why ReAct+ Instead of Simple Tool Loop?

**Basic ReAct:** LLM decides → tool call → observe → repeat

**ReAct+ additions:**
- **Intent Classification:** Better prompt engineering per task type
- **Planning:** Token budgeting, step ordering
- **Context Management:** Prevent context overflow
- **Error Recovery:** Escape infinite loops, suggest alternatives

### Why Separate Analysis Tools from Registry?

The 3 analysis tools (`detect_project_type`, `extract_conventions`, `get_project_overview`) are:
- Only used by `/init` command
- Not useful during normal conversations
- Would clutter tool selection

**Decision:** Import directly in agent.ts, don't register in tool registry.

### Why CRAFT.md?

**Problem:** Each conversation starts with no project context.

**Solution:** Generate a project analysis file that:
1. Persists across sessions
2. Commits to git (team sharing)
3. Loads automatically into system prompt
4. Refreshable via `/init`

---

## 8. Future Directions

### Short-Term

- [ ] **Expand language support** - Python, Go, Java in Rust engine
- [ ] **Streaming responses** - Show partial responses during generation
- [ ] **Better context pruning** - Semantic similarity for context ranking

### Medium-Term

- [ ] **Multi-model support** - Claude, GPT-4, local models
- [ ] **Project memory** - Persistent conversation history per project
- [ ] **Custom tool plugins** - User-defined tools via config

### Long-Term

- [ ] **Collaborative mode** - Multiple agents working together
- [ ] **IDE integration** - VS Code extension using same backend
- [ ] **Self-improvement** - Agent learns from evaluation results

---

## Appendix

### A. Configuration Files

| File | Purpose |
|------|---------|
| `vitest.config.ts` | Unit test config |
| `vitest.e2e.config.ts` | E2E test config (90s timeout) |
| `vitest.setup.ts` | Global test setup |
| `tsconfig.json` | TypeScript config |
| `package.json` | Dependencies, scripts |

### B. Key Dependencies

| Package | Purpose |
|---------|---------|
| `@google/generative-ai` | Gemini LLM SDK |
| `fast-glob` | File pattern matching |
| `diff` | Unified diff generation |
| `marked` + `marked-terminal` | Markdown rendering |
| `inquirer` | Interactive prompts |
| `vitest` | Testing framework |
| `@napi-rs/cli` | Rust-Node.js bridge |

### C. Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google AI API key |

---

*Last updated: 2024*
