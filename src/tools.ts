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
        description: "Search file contents using regex patterns. Returns file paths, line numbers, matching lines, and optional context. Ignores node_modules by default.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            pattern: { type: SchemaType.STRING, description: "Regex pattern to search for" },
            path: { type: SchemaType.STRING, description: "Directory to search in (default '.')" },
            include: { type: SchemaType.STRING, description: "File pattern to include (e.g., '*.ts')" },
            ignoreCase: { type: SchemaType.BOOLEAN, description: "Case-insensitive search (default false)" },
            contextLines: { type: SchemaType.NUMBER, description: "Number of lines to show before and after each match (like grep -C)" },
            beforeContext: { type: SchemaType.NUMBER, description: "Number of lines to show before each match (like grep -B)" },
            afterContext: { type: SchemaType.NUMBER, description: "Number of lines to show after each match (like grep -A)" }
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
      },
      {
        name: "build_dependency_graph",
        description: "Build a project-wide dependency graph showing imports/exports between files. Returns nodes (files with exports) and edges (import relationships).",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            path: { type: SchemaType.STRING, description: "Directory to analyze (default '.')" }
          },
          required: ["path"]
        }
      },
      {
        name: "resolve_symbol",
        description: "Find where a symbol is defined. Resolves local definitions and follows imports to source files.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            symbol: { type: SchemaType.STRING, description: "Name of the symbol to resolve" },
            file: { type: SchemaType.STRING, description: "File where the symbol is used" }
          },
          required: ["symbol", "file"]
        }
      },
      {
        name: "find_references",
        description: "Find all usages of a symbol across the codebase. Returns file, line, and context for each reference.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            symbol: { type: SchemaType.STRING, description: "Name of the symbol to find" },
            path: { type: SchemaType.STRING, description: "Directory to search in (default '.')" }
          },
          required: ["symbol", "path"]
        }
      },
      {
        name: "delete_file",
        description: "Delete a file. Use with caution. Returns error if file doesn't exist or is a directory.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            path: { type: SchemaType.STRING, description: "Path to the file to delete" }
          },
          required: ["path"]
        }
      },
      {
        name: "detect_project_type",
        description: "Detect project type (node, rust, python) and tooling (test framework, linter). Reads package.json, Cargo.toml, etc.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            path: { type: SchemaType.STRING, description: "Directory to analyze (default '.')" }
          },
          required: ["path"]
        }
      },
      {
        name: "extract_conventions",
        description: "Extract coding conventions from codebase (naming style, indentation, quotes, test patterns).",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            path: { type: SchemaType.STRING, description: "Directory to analyze" }
          },
          required: ["path"]
        }
      },
      {
        name: "get_project_overview",
        description: "Get comprehensive project overview by reading README, package.json, architecture docs, and analyzing codebase. Returns purpose, architecture, tech stack, usage instructions, and entry points.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            path: { type: SchemaType.STRING, description: "Project directory to analyze (default '.')" }
          },
          required: ["path"]
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

          // Determine context settings
          const contextBefore = args.contextLines ?? args.beforeContext ?? 0;
          const contextAfter = args.contextLines ?? args.afterContext ?? 0;

          const matches: Array<{
            file: string;
            line: number;
            content: string;
            contextBefore?: Array<{ line: number; content: string }>;
            contextAfter?: Array<{ line: number; content: string }>;
          }> = [];

          for (const file of filesToSearch) {
            const fullPath = path.join(grepPath, file);
            try {
              const content = fs.readFileSync(fullPath, 'utf-8');
              const lines = content.split('\n');

              lines.forEach((lineContent, index) => {
                if (regex.test(lineContent)) {
                  const match: any = {
                    file: file,
                    line: index + 1,
                    content: lineContent.trim()
                  };

                  // Add context lines if requested
                  if (contextBefore > 0 || contextAfter > 0) {
                    // Before context
                    if (contextBefore > 0) {
                      match.contextBefore = [];
                      const startLine = Math.max(0, index - contextBefore);
                      for (let i = startLine; i < index; i++) {
                        match.contextBefore.push({
                          line: i + 1,
                          content: lines[i]
                        });
                      }
                    }

                    // After context
                    if (contextAfter > 0) {
                      match.contextAfter = [];
                      const endLine = Math.min(lines.length, index + contextAfter + 1);
                      for (let i = index + 1; i < endLine; i++) {
                        match.contextAfter.push({
                          line: i + 1,
                          content: lines[i]
                        });
                      }
                    }
                  }

                  matches.push(match);
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
      case "build_dependency_graph":
        const graphPath = args.path || '.';

        if (!fs.existsSync(graphPath)) {
          return `Error: Directory not found: ${graphPath}`;
        }

        try {
          const engine = require(enginePath);
          if (engine.buildDependencyGraph) {
            const graph = engine.buildDependencyGraph(graphPath);
            if (graph) {
              return JSON.stringify(graph);
            } else {
              return `Error: Could not build dependency graph for ${graphPath}`;
            }
          } else {
            return "Error: build_dependency_graph not implemented in this version of rust_engine.";
          }
        } catch (err: any) {
          return `Error: ${err.message}`;
        }
      case "resolve_symbol":
        if (!fs.existsSync(args.file)) {
          return `Error: File not found: ${args.file}`;
        }

        try {
          const engine = require(enginePath);
          if (engine.resolveSymbol) {
            const location = engine.resolveSymbol(args.symbol, args.file);
            if (location) {
              return JSON.stringify(location);
            } else {
              return `Error: Symbol "${args.symbol}" not found in ${args.file}`;
            }
          } else {
            return "Error: resolve_symbol not implemented in this version of rust_engine.";
          }
        } catch (err: any) {
          return `Error: ${err.message}`;
        }
      case "find_references":
        const refsPath = args.path || '.';

        if (!fs.existsSync(refsPath)) {
          return `Error: Directory not found: ${refsPath}`;
        }

        try {
          const engine = require(enginePath);
          if (engine.findReferences) {
            const refs = engine.findReferences(args.symbol, refsPath);
            return JSON.stringify(refs || []);
          } else {
            return "Error: find_references not implemented in this version of rust_engine.";
          }
        } catch (err: any) {
          return `Error: ${err.message}`;
        }
      case "delete_file":
        const deletePath = args.path;

        // Security check: prevent path traversal
        if (deletePath.includes('..')) {
          return `Error: Path traversal not allowed: ${deletePath}`;
        }

        if (!fs.existsSync(deletePath)) {
          return `Error: File not found: ${deletePath}`;
        }

        const stats = fs.statSync(deletePath);
        if (stats.isDirectory()) {
          return `Error: Cannot delete directory with delete_file. Use run_command with rm -r instead: ${deletePath}`;
        }

        try {
          fs.unlinkSync(deletePath);
          return `Successfully deleted file: ${deletePath}`;
        } catch (err: any) {
          return `Error deleting file: ${err.message}`;
        }
      case "detect_project_type":
        const detectPath = args.path || '.';

        if (!fs.existsSync(detectPath)) {
          return `Error: Directory not found: ${detectPath}`;
        }

        try {
          const projectInfo: any = {
            type: 'unknown',
            typescript: false,
            testFramework: null,
            linter: null,
            packageManager: null
          };

          // Check for Node.js project
          const packageJsonPath = path.join(detectPath, 'package.json');
          if (fs.existsSync(packageJsonPath)) {
            projectInfo.type = 'node';
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

            // Check for TypeScript
            if (packageJson.devDependencies?.typescript || packageJson.dependencies?.typescript) {
              projectInfo.typescript = true;
            }
            // Check tsconfig.json
            if (fs.existsSync(path.join(detectPath, 'tsconfig.json'))) {
              projectInfo.typescript = true;
            }

            // Detect test framework
            const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
            if (deps.vitest) projectInfo.testFramework = 'vitest';
            else if (deps.jest) projectInfo.testFramework = 'jest';
            else if (deps.mocha) projectInfo.testFramework = 'mocha';

            // Detect linter
            if (deps.eslint) projectInfo.linter = 'eslint';
            else if (deps.prettier) projectInfo.linter = 'prettier';

            // Detect package manager
            if (fs.existsSync(path.join(detectPath, 'yarn.lock'))) {
              projectInfo.packageManager = 'yarn';
            } else if (fs.existsSync(path.join(detectPath, 'pnpm-lock.yaml'))) {
              projectInfo.packageManager = 'pnpm';
            } else if (fs.existsSync(path.join(detectPath, 'package-lock.json'))) {
              projectInfo.packageManager = 'npm';
            }
          }

          // Check for Rust project
          const cargoPath = path.join(detectPath, 'Cargo.toml');
          if (fs.existsSync(cargoPath)) {
            if (projectInfo.type === 'node') {
              projectInfo.type = 'node+rust';
            } else {
              projectInfo.type = 'rust';
            }
            projectInfo.testFramework = projectInfo.testFramework || 'cargo test';
          }

          // Check for Python project
          const pythonIndicators = ['setup.py', 'pyproject.toml', 'requirements.txt'];
          for (const indicator of pythonIndicators) {
            if (fs.existsSync(path.join(detectPath, indicator))) {
              if (projectInfo.type === 'unknown') {
                projectInfo.type = 'python';
              }
              break;
            }
          }

          return JSON.stringify(projectInfo);
        } catch (err: any) {
          return `Error detecting project type: ${err.message}`;
        }
      case "extract_conventions":
        const convPath = args.path || '.';

        if (!fs.existsSync(convPath)) {
          return `Error: Directory not found: ${convPath}`;
        }

        try {
          const conventions: any = {
            functionNaming: 'camelCase',
            classNaming: 'PascalCase',
            constantNaming: 'UPPER_SNAKE_CASE',
            indentStyle: 'spaces',
            indentSize: 2,
            quoteStyle: 'single',
            useSemicolons: true,
            testLocation: 'tests',
            testPattern: '.test.ts'
          };

          // Find TypeScript/JavaScript files
          const files = await fg('**/*.{ts,tsx,js,jsx}', {
            cwd: convPath,
            ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts'],
            onlyFiles: true
          });

          if (files.length === 0) {
            return JSON.stringify(conventions);
          }

          // Analyze first few files
          let singleQuotes = 0;
          let doubleQuotes = 0;
          let semicolons = 0;
          let noSemicolons = 0;
          let twoSpaces = 0;
          let fourSpaces = 0;
          let tabs = 0;

          const filesToAnalyze = files.slice(0, 10);
          for (const file of filesToAnalyze) {
            const content = fs.readFileSync(path.join(convPath, file), 'utf-8');
            const lines = content.split('\n');

            // Check quotes
            const singleMatches = content.match(/'/g) || [];
            const doubleMatches = content.match(/"/g) || [];
            singleQuotes += singleMatches.length;
            doubleQuotes += doubleMatches.length;

            // Check semicolons (at end of statements)
            const semiLines = lines.filter(l => l.trim().endsWith(';')).length;
            const nonSemiLines = lines.filter(l => {
              const trimmed = l.trim();
              return trimmed.length > 0 &&
                !trimmed.endsWith('{') &&
                !trimmed.endsWith('}') &&
                !trimmed.endsWith(',') &&
                !trimmed.startsWith('//') &&
                !trimmed.startsWith('*') &&
                !trimmed.endsWith(';');
            }).length;
            semicolons += semiLines;
            noSemicolons += nonSemiLines;

            // Check indentation
            for (const line of lines) {
              if (line.startsWith('  ') && !line.startsWith('    ')) twoSpaces++;
              else if (line.startsWith('    ')) fourSpaces++;
              else if (line.startsWith('\t')) tabs++;
            }
          }

          // Determine conventions
          conventions.quoteStyle = singleQuotes > doubleQuotes ? 'single' : 'double';
          conventions.useSemicolons = semicolons > noSemicolons;

          if (tabs > twoSpaces && tabs > fourSpaces) {
            conventions.indentStyle = 'tabs';
            conventions.indentSize = 1;
          } else if (fourSpaces > twoSpaces) {
            conventions.indentSize = 4;
          } else {
            conventions.indentSize = 2;
          }

          // Detect test location
          if (fs.existsSync(path.join(convPath, 'tests'))) {
            conventions.testLocation = 'tests';
          } else if (fs.existsSync(path.join(convPath, '__tests__'))) {
            conventions.testLocation = '__tests__';
          } else if (fs.existsSync(path.join(convPath, 'test'))) {
            conventions.testLocation = 'test';
          }

          // Detect test pattern
          const testFiles = await fg('**/*.{test,spec}.{ts,tsx,js,jsx}', {
            cwd: convPath,
            ignore: ['**/node_modules/**'],
            onlyFiles: true
          });
          if (testFiles.length > 0) {
            if (testFiles[0].includes('.spec.')) {
              conventions.testPattern = '.spec.ts';
            } else {
              conventions.testPattern = '.test.ts';
            }
          }

          return JSON.stringify(conventions);
        } catch (err: any) {
          return `Error extracting conventions: ${err.message}`;
        }
      case "get_project_overview":
        const projPath = args.path || '.';

        if (!fs.existsSync(projPath)) {
          return `Error: Directory not found: ${projPath}`;
        }

        try {
          const overview: any = {
            sources: []
          };

          // 1. Read package.json for metadata
          const packageJsonPath = path.join(projPath, 'package.json');
          if (fs.existsSync(packageJsonPath)) {
            const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
            overview.techStack = {
              name: pkg.name,
              version: pkg.version,
              description: pkg.description,
              languages: []
            };
            overview.purpose = pkg.description || '';
            overview.sources.push('package.json');

            // Detect languages from dependencies
            const allDeps = {
              ...pkg.dependencies,
              ...pkg.devDependencies
            };
            if (allDeps.typescript || pkg.devDependencies?.typescript) {
              overview.techStack.languages.push('TypeScript');
            }
            if (allDeps['@types/node']) {
              overview.techStack.languages.push('Node.js');
            }
          }

          // 2. Read README.md for project overview
          const readmePath = path.join(projPath, 'README.md');
          if (fs.existsSync(readmePath)) {
            const readme = fs.readFileSync(readmePath, 'utf-8');
            const lines = readme.split('\n').slice(0, 50); // First 50 lines

            // Extract first paragraph as purpose if not already set
            if (!overview.purpose || overview.purpose.length < 20) {
              const firstPara = lines.find(line => line.trim().length > 20 && !line.startsWith('#'));
              if (firstPara) {
                overview.purpose = firstPara.trim();
              }
            }

            overview.sources.push('README.md');
          }

          // 3. Read CLAUDE.md for architecture details
          const claudeMdPath = path.join(projPath, 'CLAUDE.md');
          if (fs.existsSync(claudeMdPath)) {
            const claudeMd = fs.readFileSync(claudeMdPath, 'utf-8');

            // Extract architecture section
            overview.architecture = {
              details: 'See CLAUDE.md for comprehensive architecture documentation'
            };

            // Look for key architecture terms
            if (claudeMd.toLowerCase().includes('hybrid')) {
              overview.architecture.type = 'Hybrid';
            }
            if (claudeMd.toLowerCase().includes('rust')) {
              if (!overview.techStack.languages.includes('Rust')) {
                overview.techStack.languages.push('Rust');
              }
              if (claudeMd.toLowerCase().includes('napi')) {
                overview.architecture.notes = 'Uses Rust engine via NAPI-RS bindings';
              }
            }

            overview.sources.push('CLAUDE.md');
          }

          // 4. Detect entry points
          overview.entryPoints = [];
          const commonEntryPoints = ['index.ts', 'index.js', 'main.ts', 'main.js', 'src/index.ts', 'src/main.ts'];
          for (const entry of commonEntryPoints) {
            if (fs.existsSync(path.join(projPath, entry))) {
              overview.entryPoints.push(entry);
            }
          }

          // 5. Check for usage instructions
          if (fs.existsSync(readmePath)) {
            const readme = fs.readFileSync(readmePath, 'utf-8');
            const usageMatch = readme.match(/##\s*Usage[\s\S]{0,500}/i) ||
                              readme.match(/##\s*Getting Started[\s\S]{0,500}/i) ||
                              readme.match(/##\s*Quick Start[\s\S]{0,500}/i);
            if (usageMatch) {
              overview.usage = {
                instructions: usageMatch[0].split('\n').slice(0, 10).join('\n')
              };
            }
          }

          // 6. Detect package manager
          if (fs.existsSync(path.join(projPath, 'package-lock.json'))) {
            if (!overview.techStack) overview.techStack = {};
            overview.techStack.packageManager = 'npm';
          } else if (fs.existsSync(path.join(projPath, 'yarn.lock'))) {
            if (!overview.techStack) overview.techStack = {};
            overview.techStack.packageManager = 'yarn';
          } else if (fs.existsSync(path.join(projPath, 'pnpm-lock.yaml'))) {
            if (!overview.techStack) overview.techStack = {};
            overview.techStack.packageManager = 'pnpm';
          }

          return JSON.stringify(overview);
        } catch (err: any) {
          return `Error getting project overview: ${err.message}`;
        }
      default:
        return `Unknown tool: ${name}`;
    }
  } catch (err: any) {
    return `Error executing tool ${name}: ${err.message}`;
  }
}