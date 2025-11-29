// src/tools/todo_write.ts

import { Tool, ToolContext, ToolResult } from '../types/tool';
import { SchemaType } from '@google/generative-ai';

export const todoWriteTool: Tool = {
  name: 'TodoWrite',
  description: 'Tracks multi-step tasks. Required for tasks with 3+ steps.',
  version: '1.0.0',

  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      todos: {
        type: SchemaType.ARRAY,
        description: 'Array of todo items',
        items: {
          type: SchemaType.OBJECT,
          properties: {
            content: { type: SchemaType.STRING, description: 'Task description' },
            status: { type: SchemaType.STRING, description: 'pending|in_progress|completed' },
            activeForm: { type: SchemaType.STRING, description: 'Active form of task' }
          }
        }
      }
    },
    required: ['todos']
  },

  capabilities: {
    writesFiles: false,
    executesCommands: false,
    requiresRustEngine: false,
    accessesNetwork: false,
    idempotent: false,
    retryable: true
  },

  validate(params: unknown): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];
    const p = params as { todos?: any[] };

    if (!Array.isArray(p.todos)) {
      errors.push('todos must be an array');
      return { valid: false, errors };
    }

    let inProgressCount = 0;
    for (const todo of p.todos) {
      if (!todo.content || typeof todo.content !== 'string') {
        errors.push('Each todo must have a content string');
      }
      if (!todo.status || !['pending', 'in_progress', 'completed'].includes(todo.status)) {
        errors.push('Each todo must have a valid status: pending, in_progress, or completed');
      } else if (todo.status === 'in_progress') {
        inProgressCount++;
      }
      if (!todo.activeForm || typeof todo.activeForm !== 'string') {
        errors.push('Each todo must have an activeForm string');
      }
    }

    if (inProgressCount > 1) {
      errors.push('Only one todo can be in_progress at a time');
    }

    return { valid: errors.length === 0, errors };
  },

  async execute(params: unknown, context: ToolContext): Promise<ToolResult> {
    const startTime = Date.now();
    const p = params as { todos: any[] };
    const todos = p.todos || [];

    const pending = todos.filter(t => t.status === 'pending').length;
    const inProgress = todos.filter(t => t.status === 'in_progress').length;
    const completed = todos.filter(t => t.status === 'completed').length;
    const total = todos.length;

    const taskWord = total === 1 ? 'task' : 'tasks';
    let message = `Updated ${total} ${taskWord}`;

    if (total > 0) {
      const parts = [];
      if (completed > 0) parts.push(`${completed} completed`);
      if (inProgress > 0) parts.push(`${inProgress} in progress`);
      if (pending > 0) parts.push(`${pending} pending`);
      if (parts.length > 0) {
        message += `: ${parts.join(', ')}`;
      }
    }

    return {
      success: true,
      data: message,
      metadata: { executionTimeMs: Date.now() - startTime }
    };
  }
};

export default todoWriteTool;
