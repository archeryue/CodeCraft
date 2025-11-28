// E2E Test Helper
// Provides utilities for running CLI commands and managing test processes

import { spawn, ChildProcess } from 'child_process';

// Track all spawned processes for cleanup
const activeProcesses: Set<ChildProcess> = new Set();

// Cleanup all active processes
export function cleanupProcesses(): void {
  for (const proc of activeProcesses) {
    try {
      proc.kill('SIGKILL');
    } catch {
      // Ignore
    }
  }
  activeProcesses.clear();
}

// Register cleanup on process exit
process.on('exit', cleanupProcesses);
process.on('SIGINT', cleanupProcesses);
process.on('SIGTERM', cleanupProcesses);

export interface CLIResult {
  output: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
}

/**
 * Run the CLI with a query and capture output
 * @param query - The query to send to the CLI
 * @param timeoutMs - Maximum time to wait (default 60s)
 */
export function runCLI(query: string, timeoutMs = 60000): Promise<CLIResult> {
  return new Promise((resolve) => {
    const proc = spawn('npx', ['tsx', 'index.ts'], {
      cwd: process.cwd(),
      env: { ...process.env, FORCE_COLOR: '0' }, // Disable colors for easier parsing
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    activeProcesses.add(proc);

    let output = '';
    let stderr = '';
    let resolved = false;
    let timedOut = false;

    const cleanup = (exitCode: number | null = null) => {
      if (resolved) return;
      resolved = true;
      activeProcesses.delete(proc);

      try {
        proc.kill('SIGKILL');
      } catch {
        // Ignore
      }

      resolve({
        output,
        stderr,
        exitCode,
        timedOut,
      });
    };

    proc.stdout.on('data', (data) => {
      output += data.toString();
      // Check if we got a response (look for tool calls or second prompt)
      if (output.includes('[Tool Call]') && output.includes('\n> ')) {
        // Got tool response, wait a bit more for full output
        setTimeout(() => {
          if (!resolved) cleanup(0);
        }, 2000);
      }
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    // Send query after a brief delay to ensure process is ready
    setTimeout(() => {
      try {
        proc.stdin.write(query + '\n');
        // Send exit after query to help process terminate
        setTimeout(() => {
          try {
            proc.stdin.write('exit\n');
          } catch {
            // Ignore
          }
        }, 5000);
      } catch {
        cleanup(null);
      }
    }, 500);

    const timeout = setTimeout(() => {
      timedOut = true;
      cleanup(null);
    }, timeoutMs);

    proc.on('close', (code) => {
      clearTimeout(timeout);
      cleanup(code);
    });

    proc.on('error', () => {
      clearTimeout(timeout);
      cleanup(null);
    });
  });
}

/**
 * Check if API key is available
 */
export function hasAPIKey(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

/**
 * Skip test if no API key
 */
export function skipIfNoAPIKey(): void {
  if (!hasAPIKey()) {
    throw new Error('GEMINI_API_KEY not set - skipping E2E test');
  }
}

/**
 * Run CLI with retry for flaky LLM responses
 * @param query - The query to send
 * @param retries - Number of retries (default 2)
 * @param timeoutMs - Timeout per attempt
 */
export async function runCLIWithRetry(
  query: string,
  retries = 2,
  timeoutMs = 60000
): Promise<CLIResult> {
  let lastResult: CLIResult | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const result = await runCLI(query, timeoutMs);
    lastResult = result;

    // Check if we got a meaningful response (not empty/error)
    if (
      result.output.includes('[Tool Call]') ||
      (result.output.length > 500 && !result.output.includes('Empty response'))
    ) {
      return result;
    }

    // Wait before retry
    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return lastResult!;
}
