// src/analysis/build-dependency-graph.ts
// Builds project-wide dependency graph for code intelligence
// This is a utility for future indexing/retrieval features

import * as path from 'path';

export interface DependencyGraph {
  nodes: Array<{
    file: string;
    imports: string[];
    exports: string[];
  }>;
  edges: Array<{
    from: string;
    to: string;
    symbols: string[];
  }>;
}

// Type for the Rust engine interface
interface RustEngine {
  buildDependencyGraph(path: string): DependencyGraph | null;
}

/**
 * Builds a dependency graph for the project.
 * Requires the Rust engine to be loaded.
 *
 * @param projectPath - Path to analyze (default: current directory)
 * @param rustEngine - The loaded Rust engine instance
 * @returns DependencyGraph or null if path not found/no supported files
 */
export function buildDependencyGraph(
  projectPath: string = '.',
  rustEngine: RustEngine
): DependencyGraph | null {
  if (!rustEngine?.buildDependencyGraph) {
    throw new Error('Rust engine not available or buildDependencyGraph not exposed');
  }

  const absolutePath = projectPath.startsWith('/')
    ? projectPath
    : path.resolve(process.cwd(), projectPath);

  return rustEngine.buildDependencyGraph(absolutePath);
}
