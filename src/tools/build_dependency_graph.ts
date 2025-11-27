// src/tools/build_dependency_graph.ts

import { Tool, ToolContext, ToolResult } from '../types/tool';
import { SchemaType } from '@google/generative-ai';

export const buildDependencyGraphTool: Tool = {
  name: 'build_dependency_graph',
  description: 'Builds project-wide dependency graph. Shows file relationships.',
  version: '1.0.0',

  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      path: { type: SchemaType.STRING, description: 'Project path (default: ".")' }
    },
    required: []
  },

  capabilities: {
    writesFiles: false,
    executesCommands: false,
    requiresRustEngine: true,
    accessesNetwork: false,
    idempotent: true,
    retryable: true
  },

  async execute(params: unknown, context: ToolContext): Promise<ToolResult> {
    const startTime = Date.now();
    const p = params as { path?: string };

    if (!context.rustEngine?.buildDependencyGraph) {
      return { success: false, error: { code: 'ENGINE_NOT_AVAILABLE', message: 'Rust engine not available' } };
    }

    try {
      const graph = context.rustEngine.buildDependencyGraph(p.path || '.');
      if (!graph) {
        return {
          success: false,
          error: { code: 'PATH_NOT_FOUND', message: `Could not build dependency graph for ${p.path || '.'}. Path may not exist or contain no supported files.` },
          metadata: { executionTimeMs: Date.now() - startTime }
        };
      }
      return {
        success: true,
        data: graph,
        metadata: { executionTimeMs: Date.now() - startTime }
      };
    } catch (err: any) {
      return { success: false, error: { code: 'GRAPH_ERROR', message: err.message }, metadata: { executionTimeMs: Date.now() - startTime } };
    }
  }
};

export default buildDependencyGraphTool;
