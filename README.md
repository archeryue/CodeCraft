# CodeCraft

CodeCraft aims to combine the strengths of both **Claude Code** and **Augment Code**:

- **Claude Code's Advantage**: Direct command-line operation with an agentic workflow that can read, write, and execute code autonomously
- **Augment Code's Advantage**: Real-time code analysis and indexing capabilities for large codebases

The goal is to create a CLI coding assistant that operates directly in the terminal (like Claude Code) while also providing deep, real-time understanding of large codebases through AST-based indexing and analysis (like Augment Code).

---

CodeCraft is a high-performance, agentic CLI coding assistant that combines the interactive capabilities of an AI agent with deep, local codebase understanding powered by Rust. It allows you to explore, edit, and understand your code through a natural language interface.

## Key Features

*   **Local-First Context**: Uses a custom Rust engine (`tree-sitter` & `fuzzy-matcher`) to parse and index your code instantly.
*   **Agentic Workflow**: The AI isn't just a chatbot; it can read files, search symbols, and modify code (with your permission).
*   **Safety**: Includes a built-in diff viewer and confirmation prompt before applying any changes to your files.
*   **Hybrid Architecture**: Node.js for the Agent logic + Rust (via NAPI-RS) for heavy-duty parsing and searching.

## Architecture

```mermaid
graph TD
    User[User Terminal] <--> CLI[Node.js Agent]
    CLI <--> Rust["Rust Engine (NAPI)"]
    Rust <--> FS[File System]
    CLI -- "Gemini API" --> LLM[Google Gemini]
```

## Installation

### Prerequisites
*   Node.js v18+
*   Rust (latest stable)
*   A Google Gemini API Key

### Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-repo/codecraft.git
    cd codecraft
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Build the Rust Engine:**
    ```bash
    npm run build
    ```

4.  **Set your API Key:**
    ```bash
    export GEMINI_API_KEY="your_gemini_api_key_here"
    ```

## Usage

Start the interactive session:

```bash
npx tsx index.ts
```

### Slash Commands

*   `/init` - Generate CRAFT.md with comprehensive project analysis
*   `/clear` - Clear context memory
*   `/save` - Dump chat history to JSON
*   `/help` - Show help
*   `exit` - Quit

### Examples

**1. Understanding Code Structure:**
> "Show me the structure of the rust_engine folder."
*(CodeCraft calls `get_codebase_map` via Rust)*

**2. Finding Symbols:**
> "Where is the `executeTool` function defined?"
*(CodeCraft calls `search_code` via Rust fuzzy-matcher)*

**3. Refactoring Code:**
> "Update `src/tools.ts` to add a new parameter to executeTool."
*(CodeCraft reads the file, proposes a change, shows a diff, and asks for confirmation)*

## Development

*   **Testing**:
    - `npm test` - Run unit tests (525 tests)
    - `npm run test:e2e` - Run E2E tests (requires GEMINI_API_KEY)
    - `npm run test:all` - Run both unit and E2E tests
*   **TDD**: We strictly follow Test-Driven Development. See `CLAUDE.md` for development rules
*   **Documentation**: See `docs/` folder for architecture, testing guides, and workflow documentation
    - `docs/README.md` - Documentation index
    - `docs/E2E_TESTING_GUIDE.md` - Comprehensive E2E testing procedures
    - `docs/WORKFLOW.md` - Agent workflow documentation
    - `docs/PLUGGABLE_TOOLS_ARCHITECTURE.md` - Tools architecture

## License
MIT
