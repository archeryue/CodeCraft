// src/tools/bash_output.ts
// Read output from background bash processes

import type { Tool, ToolContext, ToolResult } from '../types/tool';
import { backgroundProcesses } from './bash';

export const bashOutputTool: Tool = {
  name: 'bash_output',
  description: 'Read output from a background bash process. Returns new output since last read (incremental). Use the bash_id returned by bash tool with run_in_background=true.',
  parameters: {
    type: 'object',
    properties: {
      bash_id: {
        type: 'string',
        description: 'The bash process ID returned from bash tool when run_in_background=true'
      }
    },
    required: ['bash_id']
  },

  async execute(params: any, context: ToolContext): Promise<ToolResult> {
    const start = Date.now();

    // Validation
    if (!params.bash_id || typeof params.bash_id !== 'string') {
      return {
        success: false,
        error: {
          code: 'INVALID_PARAMS',
          message: 'bash_id is required and must be a string'
        }
      };
    }

    // Find process
    const bgProcess = backgroundProcesses.get(params.bash_id);
    if (!bgProcess) {
      return {
        success: false,
        error: {
          code: 'BASH_NOT_FOUND',
          message: `Background process with ID '${params.bash_id}' not found`
        }
      };
    }

    // Get new output since last read (incremental)
    const newOutput = bgProcess.output.slice(bgProcess.lastReadIndex);
    bgProcess.lastReadIndex = bgProcess.output.length;

    // Combine new output
    const outputText = newOutput.join('');

    return {
      success: true,
      data: {
        bash_id: params.bash_id,
        status: bgProcess.status,
        output: outputText,
        exitCode: bgProcess.exitCode,
        hasMore: bgProcess.status === 'running'
      },
      metadata: {
        executionTime: Date.now() - start,
        processStartTime: bgProcess.startTime,
        outputLines: newOutput.length
      }
    };
  }
};
