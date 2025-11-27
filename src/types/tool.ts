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
