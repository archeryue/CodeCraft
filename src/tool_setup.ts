// src/tool-setup.ts
// Central tool registry and executor setup

import path from 'path';
import { createRequire } from 'module';
import { DefaultToolRegistry } from './tool_registry';
import { DefaultToolExecutor } from './tool_executor';
import { createDefaultContext } from './tool_context';
import type { ToolContext } from './types/tool';

// Import all tools
import {
  readFileTool,
  writeFileTool,
  deleteFileTool,
  editFileTool,
  listDirectoryTool,
  globTool,
  grepTool,
  todoWriteTool,
  bashTool,
  bashOutputTool,
  killBashTool,
  searchCodeTool,
  getCodebaseMapTool,
  inspectSymbolTool,
  getImportsExportsTool,
  buildDependencyGraphTool,
  findReferencesTool
  // Note: Analysis tools (detect_project_type, extract_conventions, get_project_overview)
  // are imported directly in agent.ts for /init command only, not registered here
} from './tools/index';

const require = createRequire(import.meta.url);

// Load the Rust engine
const enginePath = path.resolve(process.cwd(), 'rust_engine.linux-x64-gnu.node');

let rustEngine: any = null;

try {
  rustEngine = require(enginePath);
} catch (e) {
  console.error("Failed to load rust engine at", enginePath);
  rustEngine = null;
}

// Create and configure the registry
const registry = new DefaultToolRegistry();

// Register all tools (17 total - analysis tools moved to /init only)
registry.register(readFileTool);
registry.register(writeFileTool);
registry.register(deleteFileTool);
registry.register(editFileTool);
registry.register(listDirectoryTool);
registry.register(globTool);
registry.register(grepTool);
registry.register(todoWriteTool);
registry.register(bashTool);
registry.register(bashOutputTool);
registry.register(killBashTool);
registry.register(searchCodeTool);
registry.register(getCodebaseMapTool);
registry.register(inspectSymbolTool);
registry.register(getImportsExportsTool);
registry.register(buildDependencyGraphTool);
registry.register(findReferencesTool);

// Create executor
const executor = new DefaultToolExecutor(registry);

// Get TOOLS declarations for Gemini
const TOOLS = registry.getDeclarations();

/**
 * Create a tool execution context
 * @param confirm Optional confirmation callback for file operations
 */
export function createToolContext(confirm?: (diff: string) => Promise<boolean>): ToolContext {
  const context = createDefaultContext(rustEngine);
  if (confirm) {
    context.confirm = confirm;
  }
  return context;
}

/**
 * Backward-compatible executeTool function for tests
 * @deprecated Use executor.executeWithContext directly
 */
export async function executeTool(
  name: string,
  args: any,
  confirm?: (diff: string) => Promise<boolean>
): Promise<string> {
  try {
    const context = createToolContext(confirm);
    const result = await executor.executeWithContext(name, args, context);

    // Format result as string
    if (!result.success) {
      if (result.error?.code === 'USER_CANCELLED') {
        return result.error.message;
      }
      if (result.error?.code === 'VALIDATION_ERROR' && result.error?.details) {
        const errors = Array.isArray(result.error.details) ? result.error.details : [result.error.details];
        return `Error: ${result.error.message}: ${errors.join(', ')}`;
      }
      return `Error: ${result.error?.message || 'Unknown error'}`;
    }

    if (typeof result.data === 'string') {
      return result.data;
    }
    if (typeof result.data === 'object') {
      return JSON.stringify(result.data, null, 2);
    }
    if (result.data === undefined || result.data === null) {
      return JSON.stringify(null);
    }
    return String(result.data);
  } catch (err: any) {
    return `Error executing tool ${name}: ${err.message}`;
  }
}

// Export configured instances
export { registry, executor, TOOLS, rustEngine };
