// tests/helpers/mock-context.ts
// Mock context helper for tests

import { ToolContext } from '../../src/types/tool';
import { vi } from 'vitest';

// Re-export createDefaultContext for convenience
export { createDefaultContext } from '../../src/tool-context';

/**
 * Options for creating mock context
 */
export interface MockContextOptions {
  files?: Record<string, string>;
  cwd?: string;
  confirm?: (message: string) => Promise<boolean>;
  logger?: {
    debug: (msg: string, ...args: any[]) => void;
    info: (msg: string, ...args: any[]) => void;
    warn: (msg: string, ...args: any[]) => void;
    error: (msg: string, ...args: any[]) => void;
  };
  signal?: AbortSignal;
  rustEngine?: any;
}

/**
 * Create mock context for testing
 */
export function createMockContext(options?: MockContextOptions): ToolContext {
  const files = options?.files || {};

  const context: ToolContext = {
    fs: {
      readFileSync: vi.fn((path: string, encoding?: string) => {
        if (path in files) {
          return files[path];
        }
        throw new Error(`ENOENT: no such file or directory, open '${path}'`);
      }),
      writeFileSync: vi.fn(),
      existsSync: vi.fn((path: string) => path in files),
      unlinkSync: vi.fn(),
      readdirSync: vi.fn(),
      statSync: vi.fn()
    },
    cwd: options?.cwd || '/test'
  };

  if (options?.confirm) {
    context.confirm = options.confirm;
  }

  if (options?.logger) {
    context.logger = options.logger;
  }

  if (options?.signal) {
    context.signal = options.signal;
  }

  if (options?.rustEngine) {
    context.rustEngine = options.rustEngine;
  }

  return context;
}
