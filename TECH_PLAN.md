# CodeCraft: Tech Plan & Architecture

## Objective
Build a high-performance, agentic CLI coding tool that combines the interactive capabilities of **Claude Code** with the deep codebase understanding of **Augment Code**.

## Core Philosophy
- **Hybrid Architecture:** Node.js for the interactive CLI and Agent Logic (Orchestration), Rust for heavy lifting (Parsing, Indexing, Search).
- **Local-First Context:** Rely on fast, local AST analysis (Rust) to feed the most relevant context to the LLM, minimizing token usage and latency.
- **Agentic Workflow:** The CLI isn't just a chatbot; it's an agent with tools to Read, Search, Edit, and Execute.

---

## 1. Architecture Overview

```mermaid
graph TD
    User[User Terminal] <--> CLI[Node.js CLI (Index.ts)]
    CLI <--> Agent[Agent Loop (LLM Client)]
    Agent <--> Tools[Toolbox]
    
    subgraph "Rust Engine (NAPI-RS)"
        Tools -- "calls" --> RustLib[Rust Library]
        RustLib -- "uses" --> TreeSitter[Tree-sitter Parsers]
        RustLib -- "uses" --> Index[Symbol Index / Graph]
        RustLib -- "uses" --> Grep[Ripgrep / Search]
    end

    subgraph "External"
        Agent -- "API" --> Gemini[Gemini API]
        Tools -- "FS/Shell" --> OS[Operating System]
    end
```

---

## 2. Component Details

### A. The Rust Engine (`rust_engine/`)
*Goal: Provide sub-millisecond access to codebase structure and content.*

1.  **AST Parsing (Tree-sitter):**
    -   Replace the current Regex-based `generateRepoMap` with `tree-sitter`.
    -   Support initial languages: TypeScript/JavaScript, Rust, Python.
    -   **Feature:** `generate_outline(file_path)` - Returns a structural skeleton (classes, functions, interfaces) without method bodies.

2.  **Symbol Indexing:**
    -   **Feature:** `index_repository(root_path)` - Walks the ASTs and builds a lightweight in-memory index of symbols.
    -   **Feature:** `search_symbols(query)` - Fuzzy match against function/class names to find definitions instantly.

3.  **Context Management:**
    -   **Feature:** `get_related_files(file_path)` - (Future) Use import graph analysis to suggest relevant files.

### B. The Node.js CLI (`index.ts`)
*Goal: Provide a fluid, "thinking" user interface.*

1.  **Interactive REPL:**
    -   Instead of a single command `codecraft chat`, launch an interactive session.
    -   Maintain `history` context array.
    -   Support slash commands (e.g., `/clear`, `/add <file>`, `/diff`).

2.  **Agent Loop:**
    -   Implement a **ReAct** or **Tool-Use** loop.
    -   **System Prompt:** Define persona, safety rails, and formatting rules.
    -   **Tool Execution:**
        -   `read_file`: Read content (calls FS).
        -   `search_code`: Semantic/Fuzzy search (calls Rust Engine).
        -   `write_file`: Edit code (calls FS).
        -   `run_command`: Execute shell commands (calls Child Process).

3.  **UI/UX:**
    -   Streaming responses with Markdown rendering.
    -   Spinners for tool execution states ("Thinking...", "Searching rust_engine...").
    -   Diff views for proposed code changes.

---

## 3. Implementation Roadmap

### Phase 1: Foundation (Current Focus)
- [ ] **Rust:** Integrate `tree-sitter` crate.
- [ ] **Rust:** Implement `get_file_skeleton` to return optimized context (signatures only).
- [ ] **Node:** Update `chat` command to use the new Rust-based skeleton instead of regex.
- [ ] **Node:** Basic tool definitions for the LLM (Read/Write/Search).

### Phase 2: The Agent
- [ ] **Node:** Refactor `index.ts` into a stateful REPL class.
- [ ] **Node:** Implement the Agent Loop (LLM -> Tool Call -> Result -> LLM).
- [ ] **Rust:** Implement `search` (simulated "Augment" capability).

### Phase 3: Polish
- [ ] **UI:** Add color, spinners, and markdown rendering to the terminal output.
- [ ] **Safety:** Add user confirmation prompts for `write_file` and `run_command`.

---

## 4. Tech Stack
- **Runtime:** Node.js (v20+)
- **Language:** TypeScript
- **Native Extension:** Rust (NAPI-RS)
- **Parsing:** `tree-sitter` (Rust bindings)
- **LLM:** Google Gemini (via `@google/generative-ai`)
- **CLI Libs:** `cac` (args), `inquirer` (prompts), `ora` (spinners), `marked-terminal` (markdown).
