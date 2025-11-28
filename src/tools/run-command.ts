// src/tools/run_command.ts

import { Tool, ToolContext, ToolResult } from '../types/tool';
import { SchemaType } from '@google/generative-ai';
import { exec } from 'child_process';

export const runCommandTool: Tool = {
  name: 'RunCommand',
  description: 'Executes a shell command. Use for npm, git, tests, builds, etc.',
  version: '1.0.0',

  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      command: { type: SchemaType.STRING, description: 'Shell command to execute' }
    },
    required: ['command']
  },

  capabilities: {
    writesFiles: false,
    executesCommands: true,
    requiresRustEngine: false,
    accessesNetwork: false,
    idempotent: false,
    retryable: false
  },

  async execute(params: unknown, context: ToolContext): Promise<ToolResult> {
    const startTime = Date.now();
    const p = params as { command: string };

    return new Promise((resolve) => {
      exec(p.command, (error, stdout, stderr) => {
        const output = error
          ? `Error: ${error.message}\nStderr: ${stderr}`
          : (stdout || stderr || 'Command executed successfully with no output.');

        const lines = output.split('\n').slice(0, 3);
        const preview = lines.join('\n') + (output.split('\n').length > 3 ? '\n...' : '');

        resolve({
          success: !error,
          data: preview,
          metadata: { executionTimeMs: Date.now() - startTime }
        });
      });
    });
  }
};

export default runCommandTool;
