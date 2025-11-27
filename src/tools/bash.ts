// src/tools/bash.ts
// Execute bash commands with foreground/background support

import { exec } from 'child_process';
import type { Tool, ToolContext, ToolResult } from '../types/tool';

// Process registry for background processes
interface BackgroundProcess {
  process: ReturnType<typeof exec>;
  output: string[];
  lastReadIndex: number;
  status: 'running' | 'completed' | 'failed' | 'killed';
  exitCode?: number;
  startTime: number;
}

// Global process registry (shared with bash_output and kill_bash)
export const backgroundProcesses = new Map<string, BackgroundProcess>();

// Generate unique bash_id
function generateBashId(): string {
  return `bash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Auto-cleanup on process exit
process.on('exit', () => {
  for (const [id, proc] of backgroundProcesses.entries()) {
    if (proc.status === 'running') {
      try {
        proc.process.kill();
      } catch (e) {
        // Ignore errors during cleanup
      }
    }
  }
  backgroundProcesses.clear();
});

export const bashTool: Tool = {
  name: 'bash',
  description: 'Execute bash commands. Supports foreground (blocking) and background execution. Returns output for foreground commands, bash_id for background commands.',
  parameters: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'The bash command to execute'
      },
      timeout: {
        type: 'number',
        description: 'Timeout in milliseconds (default: 30000). Only applies to foreground commands.'
      },
      run_in_background: {
        type: 'boolean',
        description: 'If true, run command in background and return immediately with bash_id. Use bash_output to read output.'
      }
    },
    required: ['command']
  },

  async execute(params: any, context: ToolContext): Promise<ToolResult> {
    const start = Date.now();

    // Validation
    if (!params.command || typeof params.command !== 'string') {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Command is required and must be a string'
        }
      };
    }

    if (params.command.trim() === '') {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Command cannot be empty'
        }
      };
    }

    const timeout = params.timeout || 30000; // Default 30 seconds
    const runInBackground = params.run_in_background || false;

    // Background execution
    if (runInBackground) {
      const bashId = generateBashId();
      const childProc = exec(params.command, {
        cwd: context.workingDir || process.cwd(),
        timeout: undefined // No timeout for background processes
      });

      const bgProcess: BackgroundProcess = {
        process: childProc,
        output: [],
        lastReadIndex: 0,
        status: 'running',
        startTime: Date.now()
      };

      // Capture output
      childProc.stdout?.on('data', (data) => {
        bgProcess.output.push(data.toString());
      });

      childProc.stderr?.on('data', (data) => {
        bgProcess.output.push(data.toString());
      });

      // Handle completion
      childProc.on('exit', (code) => {
        bgProcess.exitCode = code || 0;
        bgProcess.status = code === 0 ? 'completed' : 'failed';
      });

      childProc.on('error', (error) => {
        bgProcess.output.push(`Error: ${error.message}`);
        bgProcess.status = 'failed';
        bgProcess.exitCode = 1;
      });

      backgroundProcesses.set(bashId, bgProcess);

      return {
        success: true,
        data: {
          bash_id: bashId,
          message: 'Command started in background'
        },
        metadata: {
          executionTime: Date.now() - start
        }
      };
    }

    // Foreground execution with timeout
    return new Promise((resolve) => {
      let hasResolved = false;
      let childProcess: ReturnType<typeof exec>;

      const timeoutId = setTimeout(() => {
        if (!hasResolved) {
          hasResolved = true;
          try {
            childProcess?.kill();
          } catch (e) {
            // Ignore
          }

          resolve({
            success: false,
            error: {
              code: 'TIMEOUT',
              message: `Command timed out after ${timeout}ms`
            },
            metadata: {
              executionTime: Date.now() - start,
              timeout: timeout
            }
          });
        }
      }, timeout);

      childProcess = exec(params.command, {
        cwd: context.workingDir || process.cwd(),
        timeout: timeout
      }, (error, stdout, stderr) => {
        if (hasResolved) {
          return; // Already resolved by timeout
        }

        clearTimeout(timeoutId);
        hasResolved = true;

        const exitCode = error ? (error.code || 1) : 0;

        resolve({
          success: true,
          data: {
            stdout: stdout,
            stderr: stderr,
            exitCode: exitCode,
            output: stdout + stderr
          },
          metadata: {
            executionTime: Date.now() - start,
            command: params.command,
            exitCode: exitCode
          }
        });
      });
    });
  }
};
