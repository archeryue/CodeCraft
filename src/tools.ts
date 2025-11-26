import * as fs from 'fs';
import { exec } from 'child_process';
import path from 'path';
import { createRequire } from 'module';
import { SchemaType } from '@google/generative-ai';
import { createTwoFilesPatch } from 'diff';

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
      default:
        return `Unknown tool: ${name}`;
    }
  } catch (err: any) {
    return `Error executing tool ${name}: ${err.message}`;
  }
}