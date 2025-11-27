# Pluggable Tools Architecture

**Status:** ✅ **IMPLEMENTED** (as of 2025-11-26, optimized 2025-11-27)
**Test Coverage:** 428/428 tests passing (100%)
**Implementation:** 17 tools in pluggable architecture (optimized from 19)

## Executive Summary

This document describes the pluggable tools architecture that has been implemented in CodeCraft. The architecture transformed the monolithic tool system (950-line switch statement) into a modular, testable architecture where tools can be developed, tested, and evaluated in isolation while maintaining seamless integration with the agent runtime.

## Previous Architecture Analysis

### Problems with the Previous Architecture (Now Resolved)

The previous `src/tools.ts` implementation had several limitations (all now resolved):

1. **Monolithic Switch Statement**: All 18 tools are implemented in a single 950-line file with a giant switch statement in `executeTool()`.

2. **Tight Coupling**: Tools cannot be tested without the full agent context. Adding a new tool requires modifying the central file.

3. **No Isolation**: Tools share global state (e.g., the Rust engine). Side effects from one tool can affect others.

4. **Limited Reusability**: Tools cannot be easily shared between projects or used outside CodeCraft.

5. **Difficult Testing**: Unit testing requires mocking the entire tool infrastructure.

6. **No Versioning**: Tools cannot be versioned independently.

### Current Tool Categories

| Category | Tools | Characteristics |
|----------|-------|-----------------|
| File Operations | read_file, write_file, edit_file, delete_file | Side effects on filesystem |
| Search & Discovery | glob, grep, list_directory | Read-only, filesystem access |
| AST-Based (Rust) | search_code, get_codebase_map, get_symbol_info, get_imports_exports, build_dependency_graph, resolve_symbol, find_references | Depends on Rust engine |
| Project Analysis | detect_project_type, extract_conventions, get_project_overview | Read-only, aggregates data |
| Execution | run_command | Side effects, security sensitive |
| State Management | todo_write | In-memory state |

---

## Implemented Architecture

### Design Principles

1. **Single Responsibility**: Each tool is a self-contained module with one purpose.
2. **Dependency Injection**: Tools receive dependencies (fs, engine) via context.
3. **Schema-First**: Tool interfaces are defined by schemas, enabling validation and documentation.
4. **Testable by Default**: Every tool can be tested in isolation with mocked dependencies.
5. **Backward Compatible**: The new architecture must work with the existing agent without breaking changes.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Agent Runtime                               │
│                     (src/agent.ts - unchanged)                       │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Tool Executor                                │
│                    (src/tool-executor.ts)                            │
│  - Resolves tool by name from registry                               │
│  - Validates input against schema                                    │
│  - Injects context and executes                                      │
│  - Handles errors and timeouts                                       │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Tool Registry                                │
│                     (src/tool-registry.ts)                           │
│  - Registers tools by name                                           │
│  - Provides tool lookup                                              │
│  - Manages tool lifecycle (init/shutdown)                            │
│  - Generates LLM-compatible tool declarations                        │
└─────────────────────────────────────────────────────────────────────┘
                                  │
            ┌─────────────────────┼─────────────────────┐
            ▼                     ▼                     ▼
     ┌───────────┐         ┌───────────┐         ┌───────────┐
     │   Tool    │         │   Tool    │         │   Tool    │
     │ read_file │         │   grep    │         │ search_   │
     │           │         │           │         │   code    │
     └───────────┘         └───────────┘         └───────────┘
```

---

## Core Interfaces

### Tool Interface

```typescript
// src/types/tool.ts

import { SchemaType } from '@google/generative-ai';

/**
 * Parameter schema for a tool (Gemini-compatible)
 */
export interface ToolParameterSchema {
  type: SchemaType;
  description: string;
  properties?: Record<string, ToolParameterSchema>;
  items?: ToolParameterSchema;
  required?: string[];
  enum?: string[];
}

/**
 * Result returned by tool execution
 */
export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata?: {
    executionTimeMs: number;
    bytesRead?: number;
    bytesWritten?: number;
    filesAccessed?: string[];
  };
}

/**
 * Context provided to tools during execution
 */
export interface ToolContext {
  // Filesystem abstraction (can be mocked)
  fs: {
    readFileSync: (path: string, encoding: string) => string;
    writeFileSync: (path: string, content: string) => void;
    existsSync: (path: string) => boolean;
    unlinkSync: (path: string) => void;
    readdirSync: (path: string, options?: any) => any[];
    statSync: (path: string) => any;
  };

  // Rust engine (can be mocked)
  rustEngine?: {
    generateRepoMap: (path: string) => string;
    search: (path: string, query: string) => any[];
    getSymbolInfo: (file: string, symbol: string) => any;
    getImportsExports: (file: string) => any;
    buildDependencyGraph: (path: string) => any;
    resolveSymbol: (symbol: string, file: string) => any;
    findReferences: (symbol: string, path: string) => any[];
  };

  // Working directory
  cwd: string;

  // Confirmation callback for destructive operations
  confirm?: (message: string) => Promise<boolean>;

  // Logger for debugging
  logger?: {
    debug: (msg: string, ...args: any[]) => void;
    info: (msg: string, ...args: any[]) => void;
    warn: (msg: string, ...args: any[]) => void;
    error: (msg: string, ...args: any[]) => void;
  };

  // Abort signal for cancellation
  signal?: AbortSignal;
}

/**
 * Tool capability flags
 */
export interface ToolCapabilities {
  // Does this tool modify the filesystem?
  writesFiles: boolean;

  // Does this tool execute external commands?
  executesCommands: boolean;

  // Does this tool require the Rust engine?
  requiresRustEngine: boolean;

  // Does this tool access the network?
  accessesNetwork: boolean;

  // Is this tool idempotent?
  idempotent: boolean;

  // Can this tool be safely retried on failure?
  retryable: boolean;
}

/**
 * Main tool interface that all tools must implement
 */
export interface Tool {
  // Unique identifier for the tool
  name: string;

  // Human-readable description for LLM
  description: string;

  // Version string (semver)
  version: string;

  // Parameter schema
  parameters: ToolParameterSchema;

  // Capability flags
  capabilities: ToolCapabilities;

  // Execute the tool
  execute(params: unknown, context: ToolContext): Promise<ToolResult>;

  // Optional: Validate parameters before execution
  validate?(params: unknown): { valid: boolean; errors?: string[] };

  // Optional: Initialize the tool (called once at startup)
  initialize?(context: ToolContext): Promise<void>;

  // Optional: Cleanup resources (called at shutdown)
  shutdown?(): Promise<void>;

  // Optional: Dry run without side effects (for preview)
  dryRun?(params: unknown, context: ToolContext): Promise<ToolResult>;
}
```

### Tool Registry Interface

```typescript
// src/types/registry.ts

import { Tool, ToolContext } from './tool';

export interface ToolRegistry {
  // Register a tool
  register(tool: Tool): void;

  // Unregister a tool by name
  unregister(name: string): boolean;

  // Get a tool by name
  get(name: string): Tool | undefined;

  // Check if a tool exists
  has(name: string): boolean;

  // Get all registered tools
  getAll(): Tool[];

  // Get tool names
  getNames(): string[];

  // Generate Gemini-compatible declarations
  getDeclarations(): any[];

  // Initialize all tools
  initializeAll(context: ToolContext): Promise<void>;

  // Shutdown all tools
  shutdownAll(): Promise<void>;
}
```

### Tool Executor Interface

```typescript
// src/types/executor.ts

import { Tool, ToolContext, ToolResult } from './tool';

export interface ExecutionOptions {
  // Timeout in milliseconds
  timeout?: number;

  // Skip validation
  skipValidation?: boolean;

  // Retry configuration
  retry?: {
    maxAttempts: number;
    delayMs: number;
    backoffMultiplier?: number;
  };
}

export interface ToolExecutor {
  // Execute a tool by name
  execute(
    name: string,
    params: unknown,
    options?: ExecutionOptions
  ): Promise<ToolResult>;

  // Execute with custom context
  executeWithContext(
    name: string,
    params: unknown,
    context: ToolContext,
    options?: ExecutionOptions
  ): Promise<ToolResult>;

  // Validate parameters without executing
  validate(name: string, params: unknown): { valid: boolean; errors?: string[] };

  // Get execution statistics
  getStats(): {
    totalExecutions: number;
    successCount: number;
    errorCount: number;
    averageExecutionTimeMs: number;
    executionsByTool: Record<string, number>;
  };
}
```

---

## Tool Implementation Pattern

### Example: read_file Tool

```typescript
// src/tools/read_file.ts

import { Tool, ToolContext, ToolResult, ToolCapabilities, ToolParameterSchema } from '../types/tool';
import { SchemaType } from '@google/generative-ai';

export const readFileTool: Tool = {
  name: 'read_file',

  description: 'Reads the content of a file. Use this to examine code. Supports offset/limit for large files.',

  version: '1.0.0',

  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for reading a file',
    properties: {
      path: {
        type: SchemaType.STRING,
        description: 'The relative path to the file'
      },
      offset: {
        type: SchemaType.NUMBER,
        description: 'Line number to start reading from (0-based, optional)'
      },
      limit: {
        type: SchemaType.NUMBER,
        description: 'Number of lines to read (optional)'
      }
    },
    required: ['path']
  },

  capabilities: {
    writesFiles: false,
    executesCommands: false,
    requiresRustEngine: false,
    accessesNetwork: false,
    idempotent: true,
    retryable: true
  },

  validate(params: unknown): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];
    const p = params as any;

    if (!p.path || typeof p.path !== 'string') {
      errors.push('path is required and must be a string');
    }

    if (p.offset !== undefined && typeof p.offset !== 'number') {
      errors.push('offset must be a number');
    }

    if (p.limit !== undefined && typeof p.limit !== 'number') {
      errors.push('limit must be a number');
    }

    if (p.offset !== undefined && p.offset < 0) {
      errors.push('offset must be non-negative');
    }

    if (p.limit !== undefined && p.limit <= 0) {
      errors.push('limit must be positive');
    }

    return { valid: errors.length === 0, errors };
  },

  async execute(params: unknown, context: ToolContext): Promise<ToolResult> {
    const startTime = Date.now();
    const p = params as { path: string; offset?: number; limit?: number };

    try {
      // Check if file exists
      if (!context.fs.existsSync(p.path)) {
        return {
          success: false,
          error: {
            code: 'FILE_NOT_FOUND',
            message: `File not found: ${p.path}`
          }
        };
      }

      // Read file content
      const content = context.fs.readFileSync(p.path, 'utf-8');
      const lines = content.split('\n');

      // Apply offset and limit
      let selectedLines: string[];
      const offset = p.offset ?? 0;

      if (p.limit !== undefined) {
        selectedLines = lines.slice(offset, offset + p.limit);
      } else {
        selectedLines = lines.slice(offset);
      }

      const result = selectedLines.join('\n');

      return {
        success: true,
        data: result,
        metadata: {
          executionTimeMs: Date.now() - startTime,
          bytesRead: Buffer.byteLength(result, 'utf-8'),
          filesAccessed: [p.path]
        }
      };
    } catch (err: any) {
      return {
        success: false,
        error: {
          code: 'READ_ERROR',
          message: err.message,
          details: { path: p.path }
        },
        metadata: {
          executionTimeMs: Date.now() - startTime
        }
      };
    }
  }
};

export default readFileTool;
```

### Example: Tool with Rust Engine Dependency

```typescript
// src/tools/search_code.ts

import { Tool, ToolContext, ToolResult } from '../types/tool';
import { SchemaType } from '@google/generative-ai';

export const searchCodeTool: Tool = {
  name: 'search_code',

  description: 'AST-based semantic search for code patterns and symbols...',

  version: '1.0.0',

  parameters: {
    type: SchemaType.OBJECT,
    description: 'Parameters for code search',
    properties: {
      query: {
        type: SchemaType.STRING,
        description: 'Pattern or symbol to search for'
      },
      path: {
        type: SchemaType.STRING,
        description: 'Directory to search (default ".")'
      }
    },
    required: ['query']
  },

  capabilities: {
    writesFiles: false,
    executesCommands: false,
    requiresRustEngine: true,  // Requires Rust engine
    accessesNetwork: false,
    idempotent: true,
    retryable: true
  },

  async execute(params: unknown, context: ToolContext): Promise<ToolResult> {
    const startTime = Date.now();
    const p = params as { query: string; path?: string };

    // Check for Rust engine
    if (!context.rustEngine?.search) {
      return {
        success: false,
        error: {
          code: 'ENGINE_NOT_AVAILABLE',
          message: 'Rust engine search function not available'
        }
      };
    }

    try {
      const results = context.rustEngine.search(p.path || '.', p.query);

      return {
        success: true,
        data: results,
        metadata: {
          executionTimeMs: Date.now() - startTime
        }
      };
    } catch (err: any) {
      return {
        success: false,
        error: {
          code: 'SEARCH_ERROR',
          message: err.message
        },
        metadata: {
          executionTimeMs: Date.now() - startTime
        }
      };
    }
  }
};

export default searchCodeTool;
```

---

## Registry Implementation

```typescript
// src/tool-registry.ts

import { Tool, ToolContext } from './types/tool';
import { ToolRegistry } from './types/registry';

export class DefaultToolRegistry implements ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered`);
    }
    this.tools.set(tool.name, tool);
  }

  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  getNames(): string[] {
    return Array.from(this.tools.keys());
  }

  getDeclarations(): any[] {
    const declarations = this.getAll().map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }));

    return [{ functionDeclarations: declarations }];
  }

  async initializeAll(context: ToolContext): Promise<void> {
    for (const tool of this.tools.values()) {
      if (tool.initialize) {
        await tool.initialize(context);
      }
    }
  }

  async shutdownAll(): Promise<void> {
    for (const tool of this.tools.values()) {
      if (tool.shutdown) {
        await tool.shutdown();
      }
    }
  }
}
```

---

## Executor Implementation

```typescript
// src/tool-executor.ts

import { ToolContext, ToolResult } from './types/tool';
import { ToolExecutor, ExecutionOptions } from './types/executor';
import { ToolRegistry } from './types/registry';

export class DefaultToolExecutor implements ToolExecutor {
  private registry: ToolRegistry;
  private defaultContext: ToolContext;
  private stats = {
    totalExecutions: 0,
    successCount: 0,
    errorCount: 0,
    totalExecutionTimeMs: 0,
    executionsByTool: {} as Record<string, number>
  };

  constructor(registry: ToolRegistry, context: ToolContext) {
    this.registry = registry;
    this.defaultContext = context;
  }

  async execute(
    name: string,
    params: unknown,
    options?: ExecutionOptions
  ): Promise<ToolResult> {
    return this.executeWithContext(name, params, this.defaultContext, options);
  }

  async executeWithContext(
    name: string,
    params: unknown,
    context: ToolContext,
    options?: ExecutionOptions
  ): Promise<ToolResult> {
    const tool = this.registry.get(name);

    if (!tool) {
      return {
        success: false,
        error: {
          code: 'TOOL_NOT_FOUND',
          message: `Unknown tool: ${name}`
        }
      };
    }

    // Validate parameters
    if (!options?.skipValidation && tool.validate) {
      const validation = tool.validate(params);
      if (!validation.valid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid parameters',
            details: validation.errors
          }
        };
      }
    }

    // Execute with timeout
    const timeout = options?.timeout ?? 30000;
    const startTime = Date.now();

    try {
      const result = await Promise.race([
        tool.execute(params, context),
        new Promise<ToolResult>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), timeout)
        )
      ]);

      // Update stats
      this.stats.totalExecutions++;
      this.stats.executionsByTool[name] = (this.stats.executionsByTool[name] || 0) + 1;
      this.stats.totalExecutionTimeMs += Date.now() - startTime;

      if (result.success) {
        this.stats.successCount++;
      } else {
        this.stats.errorCount++;
      }

      return result;
    } catch (err: any) {
      this.stats.totalExecutions++;
      this.stats.errorCount++;

      return {
        success: false,
        error: {
          code: err.message === 'Timeout' ? 'TIMEOUT' : 'EXECUTION_ERROR',
          message: err.message
        },
        metadata: {
          executionTimeMs: Date.now() - startTime
        }
      };
    }
  }

  validate(name: string, params: unknown): { valid: boolean; errors?: string[] } {
    const tool = this.registry.get(name);

    if (!tool) {
      return { valid: false, errors: [`Unknown tool: ${name}`] };
    }

    if (!tool.validate) {
      return { valid: true };
    }

    return tool.validate(params);
  }

  getStats() {
    return {
      ...this.stats,
      averageExecutionTimeMs: this.stats.totalExecutions > 0
        ? this.stats.totalExecutionTimeMs / this.stats.totalExecutions
        : 0
    };
  }
}
```

---

## File Structure

```
src/
├── types/
│   ├── tool.ts           # Tool, ToolContext, ToolResult interfaces
│   ├── registry.ts       # ToolRegistry interface
│   └── executor.ts       # ToolExecutor interface
├── tools/
│   ├── index.ts          # Exports all tools
│   ├── read_file.ts
│   ├── write_file.ts
│   ├── edit_file.ts
│   ├── delete_file.ts
│   ├── glob.ts
│   ├── grep.ts
│   ├── list_directory.ts
│   ├── run_command.ts
│   ├── todo_write.ts
│   ├── search_code.ts
│   ├── get_codebase_map.ts
│   ├── get_symbol_info.ts
│   ├── get_imports_exports.ts
│   ├── build_dependency_graph.ts
│   ├── resolve_symbol.ts
│   ├── find_references.ts
│   ├── detect_project_type.ts
│   ├── extract_conventions.ts
│   └── get_project_overview.ts
├── tool-registry.ts      # DefaultToolRegistry implementation
├── tool-executor.ts      # DefaultToolExecutor implementation
├── tool-context.ts       # Default context factory
└── tools.ts              # Backward compatibility shim (deprecated)
```

---

## Migration Strategy

### Phase 1: Create Infrastructure (Non-Breaking)

1. Create `src/types/` with all interfaces
2. Create `src/tool-registry.ts` and `src/tool-executor.ts`
3. Create `src/tool-context.ts` for default context

### Phase 2: Extract Tools (Non-Breaking)

1. Create `src/tools/` directory
2. Extract each tool to its own file, implementing the Tool interface
3. Create `src/tools/index.ts` that exports all tools
4. Tools still work via original `executeTool()` during transition

### Phase 3: Wire Up Registry (Non-Breaking)

1. Update `src/tools.ts` to use registry internally
2. Keep `TOOLS` export and `executeTool()` function for backward compatibility
3. Both old and new paths work

### Phase 4: Update Agent (Breaking)

1. Update `src/agent.ts` to use `ToolExecutor` directly
2. Remove dependency on legacy `executeTool()`
3. Deprecate old `src/tools.ts` exports

### Phase 5: Cleanup

1. Remove deprecated code
2. Update documentation
3. Update tests to use new patterns

---

## Backward Compatibility Shim

```typescript
// src/tools.ts (backward compatibility)

import { DefaultToolRegistry } from './tool-registry';
import { DefaultToolExecutor } from './tool-executor';
import { createDefaultContext } from './tool-context';
import * as allTools from './tools/index';

// Create registry and register all tools
const registry = new DefaultToolRegistry();
Object.values(allTools).forEach(tool => registry.register(tool));

// Create executor with default context
const context = createDefaultContext();
const executor = new DefaultToolExecutor(registry, context);

// Legacy exports for backward compatibility
export const TOOLS = registry.getDeclarations();

export async function executeTool(
  name: string,
  args: any,
  confirm?: (diff: string) => Promise<boolean>
): Promise<string> {
  // Create context with confirm callback
  const ctx = { ...context, confirm };
  const result = await executor.executeWithContext(name, args, ctx);

  // Convert to legacy string format
  if (result.success) {
    return typeof result.data === 'string'
      ? result.data
      : JSON.stringify(result.data, null, 2);
  } else {
    return `Error: ${result.error?.message}`;
  }
}
```

---

## Testing Isolated Tools

```typescript
// tests/tools/read_file.test.ts

import { describe, it, expect, vi } from 'vitest';
import { readFileTool } from '../../src/tools/read_file';
import { ToolContext } from '../../src/types/tool';

describe('read_file tool', () => {
  // Create mock context
  const createMockContext = (files: Record<string, string>): ToolContext => ({
    fs: {
      readFileSync: vi.fn((path: string) => {
        if (files[path]) return files[path];
        throw new Error(`ENOENT: ${path}`);
      }),
      writeFileSync: vi.fn(),
      existsSync: vi.fn((path: string) => path in files),
      unlinkSync: vi.fn(),
      readdirSync: vi.fn(),
      statSync: vi.fn()
    },
    cwd: '/test'
  });

  describe('validation', () => {
    it('should require path parameter', () => {
      const result = readFileTool.validate!({});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('path is required and must be a string');
    });

    it('should reject negative offset', () => {
      const result = readFileTool.validate!({ path: 'test.txt', offset: -1 });
      expect(result.valid).toBe(false);
    });

    it('should accept valid parameters', () => {
      const result = readFileTool.validate!({ path: 'test.txt', offset: 0, limit: 10 });
      expect(result.valid).toBe(true);
    });
  });

  describe('execution', () => {
    it('should read entire file when no offset/limit', async () => {
      const ctx = createMockContext({ 'test.txt': 'line1\nline2\nline3' });
      const result = await readFileTool.execute({ path: 'test.txt' }, ctx);

      expect(result.success).toBe(true);
      expect(result.data).toBe('line1\nline2\nline3');
    });

    it('should apply offset and limit', async () => {
      const ctx = createMockContext({ 'test.txt': 'line1\nline2\nline3\nline4' });
      const result = await readFileTool.execute(
        { path: 'test.txt', offset: 1, limit: 2 },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe('line2\nline3');
    });

    it('should return error for missing file', async () => {
      const ctx = createMockContext({});
      const result = await readFileTool.execute({ path: 'missing.txt' }, ctx);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('FILE_NOT_FOUND');
    });
  });
});
```

---

## Benefits of New Architecture

1. **Isolated Testing**: Each tool can be tested with mocked dependencies
2. **Easy Evaluation**: Tools can be evaluated independently against datasets
3. **Hot Reloading**: Tools could be loaded/unloaded at runtime
4. **Versioning**: Each tool has its own version, enabling gradual upgrades
5. **Metrics**: Built-in execution statistics per tool
6. **Type Safety**: Full TypeScript interfaces for tools and context
7. **Documentation**: Self-documenting via schemas and capabilities
8. **Security**: Capabilities flags enable fine-grained permission control

---

## Next Steps

1. Review and approve this architecture
2. Create `src/types/` interfaces
3. Implement `ToolRegistry` and `ToolExecutor`
4. Extract tools one by one (start with simple ones like `read_file`)
5. Create backward compatibility shim
6. Update agent to use new system
7. Build evaluation system on top of this architecture
