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
        description: "Reads the content of a file. Use this to examine code.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            path: { type: SchemaType.STRING, description: "The relative path to the file" }
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
        return fs.readFileSync(args.path, 'utf-8');
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
            if (error) resolve(`Error: ${error.message}\nStderr: ${stderr}`);
            else resolve(stdout || stderr || "Command executed successfully with no output.");
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
      default:
        return `Unknown tool: ${name}`;
    }
  } catch (err: any) {
    return `Error executing tool ${name}: ${err.message}`;
  }
}