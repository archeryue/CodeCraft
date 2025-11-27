// src/tool-context.ts

import { ToolContext } from './types/tool';
import * as fs from 'fs';

/**
 * Create default context with real filesystem access
 */
export function createDefaultContext(rustEngine?: any): ToolContext {
  const context: ToolContext = {
    fs: {
      readFileSync: fs.readFileSync as any,
      writeFileSync: fs.writeFileSync as any,
      existsSync: fs.existsSync as any,
      unlinkSync: fs.unlinkSync as any,
      readdirSync: fs.readdirSync as any,
      statSync: fs.statSync as any
    },
    cwd: process.cwd()
  };

  if (rustEngine) {
    context.rustEngine = rustEngine;
  }

  return context;
}
