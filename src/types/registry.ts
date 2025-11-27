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
