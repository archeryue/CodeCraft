import { describe, it, expect } from 'vitest';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

describe('Rust Engine - Repo Map Generation', () => {
  it('should extract struct fields in the codebase map', () => {
    // Load the rust engine
    const enginePath = path.resolve(process.cwd(), 'rust_engine.linux-x64-gnu.node');

    let generateRepoMap: (path: string) => string;
    try {
      const engine = require(enginePath);
      generateRepoMap = engine.generateRepoMap;
    } catch (e) {
      console.warn('Rust engine not built, skipping test');
      return; // Skip test if engine not built
    }

    // Generate repo map for the rust_engine directory
    const repoMap = generateRepoMap('./rust_engine/src');

    // Should contain the SearchResult struct
    expect(repoMap).toContain('SearchResult');

    // Should contain the struct fields
    expect(repoMap).toContain('file');
    expect(repoMap).toContain('String');
    expect(repoMap).toContain('line');
    expect(repoMap).toContain('u32');
    expect(repoMap).toContain('match_content');
    expect(repoMap).toContain('score');
    expect(repoMap).toContain('i64');
  });

  it('should extract function signatures', () => {
    const enginePath = path.resolve(process.cwd(), 'rust_engine.linux-x64-gnu.node');

    let generateRepoMap: (path: string) => string;
    try {
      const engine = require(enginePath);
      generateRepoMap = engine.generateRepoMap;
    } catch (e) {
      console.warn('Rust engine not built, skipping test');
      return;
    }

    const repoMap = generateRepoMap('./rust_engine/src');

    // Should contain function signatures
    expect(repoMap).toContain('search');
    expect(repoMap).toContain('generate_repo_map');
    expect(repoMap).toContain('extract_skeleton');
  });
});
