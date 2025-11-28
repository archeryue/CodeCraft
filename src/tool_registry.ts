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
        try {
          await tool.initialize(context);
        } catch (error) {
          // Handle errors gracefully - log but continue
          if (context.logger) {
            context.logger.error(`Failed to initialize tool ${tool.name}:`, error);
          }
        }
      }
    }
  }

  async shutdownAll(): Promise<void> {
    for (const tool of this.tools.values()) {
      if (tool.shutdown) {
        try {
          await tool.shutdown();
        } catch (error) {
          // Handle errors gracefully - log but continue
          console.error(`Failed to shutdown tool ${tool.name}:`, error);
        }
      }
    }
  }
}
