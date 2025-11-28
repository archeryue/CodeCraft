// src/tools/kill_bash.ts
// Terminate background bash processes

import type { Tool, ToolContext, ToolResult } from '../types/tool';
import { backgroundProcesses } from './bash';

export const killBashTool: Tool = {
  name: 'KillBash',
  description: 'Terminate a background bash process. Takes the bash_id from bash tool. Idempotent - safe to call on already completed processes.',
  parameters: {
    type: 'object',
    properties: {
      bash_id: {
        type: 'string',
        description: 'The bash process ID to terminate'
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

    // Kill process if still running
    if (bgProcess.status === 'running') {
      try {
        bgProcess.process.kill();
        bgProcess.status = 'killed';

        return {
          success: true,
          data: `Process ${params.bash_id} terminated successfully`,
          metadata: {
            executionTime: Date.now() - start,
            bash_id: params.bash_id,
            previousStatus: 'running'
          }
        };
      } catch (error: any) {
        return {
          success: false,
          error: {
            code: 'KILL_FAILED',
            message: `Failed to kill process: ${error.message}`
          }
        };
      }
    } else {
      // Already completed/failed/killed - idempotent success
      return {
        success: true,
        data: `Process ${params.bash_id} already ${bgProcess.status}`,
        metadata: {
          executionTime: Date.now() - start,
          bash_id: params.bash_id,
          previousStatus: bgProcess.status
        }
      };
    }
  }
};
