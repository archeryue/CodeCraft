import * as fs from 'fs';
import { exec } from 'child_process';
import path from 'path';
import { createRequire } from 'module';
import { SchemaType } from '@google/generative-ai';
import { createTwoFilesPatch } from 'diff';
import fg from 'fast-glob';

const require = createRequire(import.meta.url);

// Load the rust engine
// If running from src/ via ts-node:
const enginePath = path.resolve(process.cwd(), 'rust_engine.linux-x64-gnu.node');

let generateRepoMap: (path: string) => string;
try {
    const engine = require(enginePath);
    generateRepoMap = engine.generateRepoMap;
} catch (e) {
    console.error("Failed to load rust engine at", enginePath);
    // console.error(e);
    generateRepoMap = () => "Rust engine not loaded.";
}

export const TOOLS = [
  {
    functionDeclarations: [
      {
        name: "read_file",
        description: "Reads the content of a file. Use this to examine code. Supports offset/limit for large files.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            path: { type: SchemaType.STRING, description: "The relative path to the file" },
            offset: { type: SchemaType.NUMBER, description: "Line number to start reading from (0-based, optional)" },
            limit: { type: SchemaType.NUMBER, description: "Number of lines to read (optional)" }
          },
          required: ["path"]
        }
      },
      {
        name: "write_file",
        description: "Writes content to a file. Overwrites existing content.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            path: { type: SchemaType.STRING, description: "The relative path to the file" },
            content: { type: SchemaType.STRING, description: "The content to write" }
          },
          required: ["path", "content"]
        }
      },
      {
        name: "run_command",
        description: "Runs a shell command. Use for git, testing, listing files, etc.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            command: { type: SchemaType.STRING, description: "The shell command to execute" }
          },
          required: ["command"]
        }
      },
      {
        name: "get_codebase_map",
        description: "Returns a high-level map/skeleton of the codebase (signatures only).",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            path: { type: SchemaType.STRING, description: "The directory to map (usually '.')" }
          },
          required: ["path"]
        }
      },
      {
        name: "search_code",
        description: "Fuzzy searches for symbols (functions, classes) in the codebase.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            query: { type: SchemaType.STRING, description: "The symbol name to search for" },
            path: { type: SchemaType.STRING, description: "The directory to search (default '.')"}
          },
          required: ["query"]
        }
      },
      {
        name: "edit_file",
        description: "Replaces old_string with new_string in a file. More efficient than rewriting entire file.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            path: { type: SchemaType.STRING, description: "The relative path to the file" },
            old_string: { type: SchemaType.STRING, description: "The exact text to replace" },
            new_string: { type: SchemaType.STRING, description: "The replacement text" }
          },
          required: ["path", "old_string", "new_string"]
        }
      },
      {
        name: "todo_write",
        description: "Track task progress. Use for all multi-step tasks (3+ steps). Mark in_progress before starting, completed immediately after finishing.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            todos: {
              type: SchemaType.ARRAY,
              description: "Array of tasks",
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  content: { type: SchemaType.STRING, description: "Task description" },
                  status: { type: SchemaType.STRING, description: "pending | in_progress | completed" },
                  activeForm: { type: SchemaType.STRING, description: "Present continuous form (e.g., 'Implementing feature')" }
                },
                required: ["content", "status", "activeForm"]
              }
            }
          },
          required: ["todos"]
        }
      },
      {
        name: "glob",
        description: "Find files matching a glob pattern. Use to discover files before reading. Ignores node_modules and hidden files by default.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            pattern: { type: SchemaType.STRING, description: "Glob pattern (e.g., '**/*.ts', 'src/*.tsx', '**/*.{ts,js}')" },
            path: { type: SchemaType.STRING, description: "Directory to search in (default '.')" }
          },
          required: ["pattern"]
        }
      },
      {
        name: "grep",
        description: "Search file contents using regex patterns. Returns file paths, line numbers, and matching lines. Ignores node_modules by default.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            pattern: { type: SchemaType.STRING, description: "Regex pattern to search for" },
            path: { type: SchemaType.STRING, description: "Directory to search in (default '.')" },
            include: { type: SchemaType.STRING, description: "File pattern to include (e.g., '*.ts')" },
            ignoreCase: { type: SchemaType.BOOLEAN, description: "Case-insensitive search (default false)" }
          },
          required: ["pattern"]
        }
      },
      {
        name: "list_directory",
        description: "List contents of a directory. Returns files and subdirectories with type indicators. Does not recurse.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            path: { type: SchemaType.STRING, description: "Directory path to list (default '.')" }
          },
          required: ["path"]
        }
      },
      {
        name: "get_symbol_info",
        description: "Get detailed information about a symbol (function, class, interface) using AST parsing. Returns name, kind, signature, and location.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            file: { type: SchemaType.STRING, description: "Path to the file containing the symbol" },
            symbol: { type: SchemaType.STRING, description: "Name of the symbol to look up" }
          },
          required: ["file", "symbol"]
        }
      },
      {
        name: "get_imports_exports",
        description: "Analyze a file's imports and exports using AST. Returns detailed import sources and exported symbols.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            file: { type: SchemaType.STRING, description: "Path to the TypeScript file to analyze" }
          },
          required: ["file"]
        }
      }
    ]
  }
];

export async function executeTool(
    name: string, 
    args: any, 
    confirm?: (diff: string) => Promise<boolean>
): Promise<string> {
  console.log(`\x1b[33m[Tool Call] ${name}(${JSON.stringify(args).slice(0, 100)}...)\x1b[0m`);
  
  try {
    switch (name) {
      case "read_file":
        const fileContent = fs.readFileSync(args.path, 'utf-8');

        // If no offset/limit, return entire file
        if (args.offset === undefined && args.limit === undefined) {
          return fileContent;
        }

        // Split into lines
        const lines = fileContent.split('\n');

        // Apply offset and limit
        const offset = args.offset || 0;
        const limit = args.limit;

        let selectedLines;
        if (limit !== undefined) {
          selectedLines = lines.slice(offset, offset + limit);
        } else {
          selectedLines = lines.slice(offset);
        }

        return selectedLines.join('\n');
      case "write_file":
        if (confirm && fs.existsSync(args.path)) {
            const oldContent = fs.readFileSync(args.path, 'utf-8');
            const diff = createTwoFilesPatch(args.path, args.path, oldContent, args.content);
            const allowed = await confirm(diff);
            if (!allowed) return "User cancelled the operation.";
        }
        fs.writeFileSync(args.path, args.content);
        return `Successfully wrote to ${args.path}`;
      case "run_command":
        return new Promise((resolve) => {
          exec(args.command, (error, stdout, stderr) => {
            const output = error ? `Error: ${error.message}\nStderr: ${stderr}` : (stdout || stderr || "Command executed successfully with no output.");

            // Show first 1-3 lines to user immediately
            const lines = output.split('\n').filter(line => line.trim().length > 0);
            const preview = lines.slice(0, 3).join('\n');
            if (preview) {
              console.log(`\x1b[90m${preview}\x1b[0m`);
              if (lines.length > 3) {
                console.log(`\x1b[90m... (${lines.length - 3} more lines)\x1b[0m`);
              }
            }

            resolve(output);
          });
        });
      case "get_codebase_map":
        return generateRepoMap(args.path || '.');
      case "search_code":
        // Check if engine has search
        const engine = require(enginePath);
        if (engine.search) {
            const results = engine.search(args.path || '.', args.query);
            return JSON.stringify(results, null, 2);
        } else {
            return "Search not implemented in this version of rust_engine.";
        }
      case "edit_file":
        if (!fs.existsSync(args.path)) {
            return `Error: File not found: ${args.path}`;
        }
        const content = fs.readFileSync(args.path, 'utf-8');
        if (!content.includes(args.old_string)) {
            return `Error: old_string not found in ${args.path}`;
        }
        const newContent = content.replace(args.old_string, args.new_string);
        fs.writeFileSync(args.path, newContent);
        return `Edited ${args.path}`;
      case "todo_write":
        const todos = args.todos || [];

        // Validate todos
        const validStatuses = ['pending', 'in_progress', 'completed'];
        for (const todo of todos) {
          if (!todo.content || !todo.status || !todo.activeForm) {
            return `Error: Each todo must have content, status, and activeForm fields`;
          }
          if (!validStatuses.includes(todo.status)) {
            return `Error: Invalid status "${todo.status}". Must be: pending, in_progress, or completed`;
          }
        }

        // Count by status
        const completed = todos.filter((t: any) => t.status === 'completed').length;
        const inProgress = todos.filter((t: any) => t.status === 'in_progress').length;
        const pending = todos.filter((t: any) => t.status === 'pending').length;

        const taskWord = todos.length === 1 ? 'task' : 'tasks';
        let result = `Updated todo list: ${todos.length} ${taskWord}`;

        if (todos.length > 0) {
          result += ` (${completed} completed, ${inProgress} in progress, ${pending} pending)`;
        }

        return result;
      case "glob":
        const searchPath = args.path || '.';

        // Check if directory exists
        if (!fs.existsSync(searchPath)) {
          return `Error: Directory not found: ${searchPath}`;
        }

        try {
          const files = await fg(args.pattern, {
            cwd: searchPath,
            ignore: ['**/node_modules/**', '**/.*/**', '**/.git/**'],
            dot: false,
            onlyFiles: true
          });
          return JSON.stringify(files);
        } catch (err: any) {
          return `Error: ${err.message}`;
        }
      case "grep":
        const grepPath = args.path || '.';

        // Check if directory exists
        if (!fs.existsSync(grepPath)) {
          return `Error: Directory not found: ${grepPath}`;
        }

        try {
          // Build regex
          let regex: RegExp;
          try {
            regex = new RegExp(args.pattern, args.ignoreCase ? 'i' : '');
          } catch (regexErr: any) {
            return `Error: Invalid regex pattern: ${regexErr.message}`;
          }

          // Find files to search
          const filePattern = args.include || '**/*';
          const filesToSearch = await fg(filePattern, {
            cwd: grepPath,
            ignore: ['**/node_modules/**', '**/.*/**', '**/.git/**', '**/dist/**', '**/target/**'],
            dot: false,
            onlyFiles: true
          });

          const matches: Array<{ file: string; line: number; content: string }> = [];

          for (const file of filesToSearch) {
            const fullPath = path.join(grepPath, file);
            try {
              const content = fs.readFileSync(fullPath, 'utf-8');
              const lines = content.split('\n');

              lines.forEach((lineContent, index) => {
                if (regex.test(lineContent)) {
                  matches.push({
                    file: file,
                    line: index + 1,
                    content: lineContent.trim()
                  });
                }
              });
            } catch (readErr) {
              // Skip binary files or files we can't read
            }
          }

          return JSON.stringify(matches);
        } catch (err: any) {
          return `Error: ${err.message}`;
        }
      case "list_directory":
        const dirPath = args.path || '.';

        // Check if directory exists
        if (!fs.existsSync(dirPath)) {
          return `Error: Directory not found: ${dirPath}`;
        }

        try {
          const entries = fs.readdirSync(dirPath, { withFileTypes: true });

          const result = entries
            .filter(entry => !entry.name.startsWith('.')) // Ignore hidden files
            .map(entry => ({
              name: entry.name,
              type: entry.isDirectory() ? 'directory' : 'file'
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

          return JSON.stringify(result);
        } catch (err: any) {
          return `Error: ${err.message}`;
        }
      case "get_symbol_info":
        if (!fs.existsSync(args.file)) {
          return `Error: File not found: ${args.file}`;
        }

        try {
          const engine = require(enginePath);
          if (engine.getSymbolInfo) {
            const symbolInfo = engine.getSymbolInfo(args.file, args.symbol);
            if (symbolInfo) {
              return JSON.stringify(symbolInfo);
            } else {
              return `Error: Symbol "${args.symbol}" not found in ${args.file}`;
            }
          } else {
            return "Error: get_symbol_info not implemented in this version of rust_engine.";
          }
        } catch (err: any) {
          return `Error: ${err.message}`;
        }
      case "get_imports_exports":
        if (!fs.existsSync(args.file)) {
          return `Error: File not found: ${args.file}`;
        }

        try {
          const engine = require(enginePath);
          if (engine.getImportsExports) {
            const importsExports = engine.getImportsExports(args.file);
            if (importsExports) {
              return JSON.stringify(importsExports);
            } else {
              return `Error: Could not analyze imports/exports in ${args.file}`;
            }
          } else {
            return "Error: get_imports_exports not implemented in this version of rust_engine.";
          }
        } catch (err: any) {
          return `Error: ${err.message}`;
        }
      default:
        return `Unknown tool: ${name}`;
    }
  } catch (err: any) {
    return `Error executing tool ${name}: ${err.message}`;
  }
}