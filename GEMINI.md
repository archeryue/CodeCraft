# Gemini CLI Coding Assistant

This project is an MVP (Minimum Viable Product) for a high-performance CLI coding assistant that leverages Google Gemini as its intelligent backend. It's designed to provide contextual coding assistance directly from your command line.

## Architectural Overview

The assistant employs a hybrid architecture to combine the strengths of different technologies:

*   **Node.js (TypeScript)**: Handles the CLI interface, agent logic, and communication with the Gemini API.
*   **Rust**: Provides high-performance indexing capabilities, particularly for generating a "Repo Map" of the codebase.

These two parts are seamlessly connected using `napi-rs`, which allows Rust code to be compiled into a Node.js addon.

## Tech Stack

*   **Bridge**: `napi-rs` (for Node.js-Rust interoperability).
*   **Core Engine (Rust)**:
    *   `walkdir`: For ultra-fast and efficient file system traversal.
    *   `regex`: Used for simple pattern matching to extract function/class signatures from code files. (In a full implementation, `tree-sitter` would be used for more robust parsing).
*   **Agent Interface (Node.js/TypeScript)**:
    *   `cac`: A minimalist framework for building command-line applications.
    *   `@google/generative-ai`: The official Google Gemini SDK for interacting with Gemini 1.5 Flash/Pro models.

## Features (MVP)

*   **Codebase Indexing**: Scans the project directory (excluding `node_modules` and `.git`) to create a lightweight "Repo Map" – a skeleton of the codebase including file paths and extracted function/class signatures.
*   **AI Chat Interface**: Allows users to interact with the Gemini AI through a simple `chat` command.
*   **Contextual Assistance**: Sends the generated Repo Map along with the user's query to Gemini, enabling the AI to provide context-aware responses.
*   **Streaming Responses**: Streams the AI's responses directly to the console for a more interactive experience.

## Setup

Follow these steps to set up the project locally:

1.  **Install Rust**:
    If you don't have Rust installed, use `rustup` (the recommended Rust installer):
    ```bash
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
    ```
    Follow the on-screen instructions. You may need to restart your terminal or `source "$HOME/.cargo/env"` for `cargo` to be available in your PATH.

2.  **Install Node.js Dependencies**:
    Navigate to the project root and install the required npm packages:
    ```bash
    npm install
    ```

3.  **Build the Rust Addon**:
    The Rust code needs to be compiled into a Node.js addon. Use the provided build script:
    ```bash
    npm run build
    ```
    This command compiles the Rust code in `rust_engine/` and places the resulting `.node` file in the project root.

4.  **Install the CLI Globally (Optional but Recommended)**:
    To run the `codecraft` command from any directory:
    ```bash
    npm install -g .
    ```

## Usage

1.  **Set your Gemini API Key**:
    Obtain a Gemini API key from the Google AI Studio. Set it as an environment variable:
    ```bash
    export GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
    ```
    Replace `"YOUR_GEMINI_API_KEY"` with your actual key. For persistent access, add this line to your shell's profile file (e.g., `.bashrc`, `.zshrc`).

2.  **Chat with the AI**:
    Now you can use the `codecraft chat` command with your query:
    ```bash
    codecraft chat "Explain the main function in index.ts"
    ```
    The AI will use the generated Repo Map as context to provide relevant answers.

## Future Enhancements

*   **Tree-sitter Integration**: Replace `regex` with `tree-sitter` for more accurate and robust code parsing and signature extraction.
*   **Configuration**: Allow users to configure ignored directories, file types, and Gemini model parameters.
*   **More Sophisticated Repo Map**: Include more detailed information in the Repo Map, such as dependencies, call graphs, and code relationships.
*   **Interactive UI**: Potentially add a terminal UI (TUI) for a richer interactive experience.
*   **Error Handling**: Improve error handling and user feedback.
*   **Testing**: Add comprehensive unit and integration tests.

## Development Rules

*   **TDD (Test-Driven Development)**: Always adopt TDD. Think about how to test the code *before* developing a new feature.
*   **Verification**: Always run unit tests and end-to-end tests after developing or modifying code to ensure stability.
