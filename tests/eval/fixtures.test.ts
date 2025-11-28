// tests/eval/fixtures.test.ts

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FixtureManager } from '../../src/eval/fixtures';
import * as fs from 'fs';
import * as path from 'path';
import type { InlineFixture, DirectoryFixture, PresetFixture } from '../../src/eval/types';

describe('FixtureManager', () => {
  let fixtureManager: FixtureManager;
  const cleanupFunctions: Array<() => Promise<void>> = [];

  beforeEach(() => {
    fixtureManager = new FixtureManager();
  });

  afterEach(async () => {
    // Cleanup all fixtures created during tests
    for (const cleanup of cleanupFunctions) {
      await cleanup();
    }
    cleanupFunctions.length = 0;
    await fixtureManager.cleanupAll();
  });

  describe('Inline Fixtures', () => {
    it('TC-001: should create inline fixture with single file', async () => {
      const spec: InlineFixture = {
        type: 'inline',
        files: { 'test.txt': 'Hello' }
      };

      const { context, cleanup } = await fixtureManager.setup(spec);
      cleanupFunctions.push(cleanup);

      // Verify temp directory exists
      expect(fs.existsSync(context.cwd)).toBe(true);

      // Verify file exists and has correct content
      const filePath = path.join(context.cwd, 'test.txt');
      expect(fs.existsSync(filePath)).toBe(true);
      expect(fs.readFileSync(filePath, 'utf-8')).toBe('Hello');

      // Verify context works
      const content = context.fs.readFileSync('test.txt', 'utf-8');
      expect(content).toBe('Hello');
    });

    it('TC-002: should create inline fixture with multiple files', async () => {
      const spec: InlineFixture = {
        type: 'inline',
        files: {
          'a.txt': 'A',
          'b.txt': 'B',
          'dir/c.txt': 'C'
        }
      };

      const { context, cleanup } = await fixtureManager.setup(spec);
      cleanupFunctions.push(cleanup);

      // Verify all files exist
      expect(context.fs.existsSync('a.txt')).toBe(true);
      expect(context.fs.existsSync('b.txt')).toBe(true);
      expect(context.fs.existsSync('dir/c.txt')).toBe(true);

      // Verify content
      expect(context.fs.readFileSync('a.txt', 'utf-8')).toBe('A');
      expect(context.fs.readFileSync('dir/c.txt', 'utf-8')).toBe('C');
    });

    it('TC-003: should create inline fixture with directories', async () => {
      const spec: InlineFixture = {
        type: 'inline',
        files: {},
        directories: ['src', 'tests']
      };

      const { context, cleanup } = await fixtureManager.setup(spec);
      cleanupFunctions.push(cleanup);

      // Verify directories exist
      const srcPath = path.join(context.cwd, 'src');
      const testsPath = path.join(context.cwd, 'tests');
      expect(fs.existsSync(srcPath)).toBe(true);
      expect(fs.existsSync(testsPath)).toBe(true);
      expect(fs.statSync(srcPath).isDirectory()).toBe(true);
      expect(fs.statSync(testsPath).isDirectory()).toBe(true);
    });
  });

  describe('ToolContext Creation', () => {
    it('TC-013: should create ToolContext with correct cwd', async () => {
      const spec: InlineFixture = {
        type: 'inline',
        files: { 'test.txt': 'content' }
      };

      const { context, cleanup } = await fixtureManager.setup(spec);
      cleanupFunctions.push(cleanup);

      expect(context.cwd).toBeDefined();
      expect(path.isAbsolute(context.cwd)).toBe(true);
      expect(fs.existsSync(context.cwd)).toBe(true);
    });

    it('TC-014: should create ToolContext with working fs', async () => {
      const spec: InlineFixture = {
        type: 'inline',
        files: { 'test.txt': 'original' }
      };

      const { context, cleanup } = await fixtureManager.setup(spec);
      cleanupFunctions.push(cleanup);

      // Test read
      const content = context.fs.readFileSync('test.txt', 'utf-8');
      expect(content).toBe('original');

      // Test write
      context.fs.writeFileSync('test.txt', 'modified');
      const newContent = context.fs.readFileSync('test.txt', 'utf-8');
      expect(newContent).toBe('modified');

      // Test exists
      expect(context.fs.existsSync('test.txt')).toBe(true);
      expect(context.fs.existsSync('does-not-exist.txt')).toBe(false);
    });
  });

  describe('Fixture Cleanup', () => {
    it('TC-017: should remove temp directory on cleanup', async () => {
      const spec: InlineFixture = {
        type: 'inline',
        files: { 'test.txt': 'content' }
      };

      const { context, cleanup } = await fixtureManager.setup(spec);
      const tempDir = context.cwd;

      // Verify it exists
      expect(fs.existsSync(tempDir)).toBe(true);

      // Cleanup
      await cleanup();

      // Verify it's gone
      expect(fs.existsSync(tempDir)).toBe(false);
    });

    it('TC-018: should cleanup even if files were modified', async () => {
      const spec: InlineFixture = {
        type: 'inline',
        files: { 'test.txt': 'original' }
      };

      const { context, cleanup } = await fixtureManager.setup(spec);
      const tempDir = context.cwd;

      // Modify files
      context.fs.writeFileSync('test.txt', 'modified');
      context.fs.writeFileSync('new-file.txt', 'new content');

      // Cleanup should still work
      await cleanup();
      expect(fs.existsSync(tempDir)).toBe(false);
    });

    it('TC-020: cleanupAll should remove all fixtures', async () => {
      const tempDirs: string[] = [];

      // Create 3 fixtures
      for (let i = 0; i < 3; i++) {
        const spec: InlineFixture = {
          type: 'inline',
          files: { [`file${i}.txt`]: `content${i}` }
        };
        const { context } = await fixtureManager.setup(spec);
        tempDirs.push(context.cwd);
      }

      // Verify all exist
      tempDirs.forEach(dir => {
        expect(fs.existsSync(dir)).toBe(true);
      });

      // Cleanup all
      await fixtureManager.cleanupAll();

      // Verify all gone
      tempDirs.forEach(dir => {
        expect(fs.existsSync(dir)).toBe(false);
      });
    });
  });

  describe('Isolation', () => {
    it('TC-021: multiple fixtures should not interfere', async () => {
      const spec1: InlineFixture = {
        type: 'inline',
        files: { 'test.txt': 'fixture1' }
      };
      const spec2: InlineFixture = {
        type: 'inline',
        files: { 'test.txt': 'fixture2' }
      };

      const fixture1 = await fixtureManager.setup(spec1);
      const fixture2 = await fixtureManager.setup(spec2);
      cleanupFunctions.push(fixture1.cleanup, fixture2.cleanup);

      // Different directories
      expect(fixture1.context.cwd).not.toBe(fixture2.context.cwd);

      // Different content
      const content1 = fixture1.context.fs.readFileSync('test.txt', 'utf-8');
      const content2 = fixture2.context.fs.readFileSync('test.txt', 'utf-8');
      expect(content1).toBe('fixture1');
      expect(content2).toBe('fixture2');
    });
  });

  describe('Integration', () => {
    it('TC-029: context should work with actual tools', async () => {
      const spec: InlineFixture = {
        type: 'inline',
        files: { 'test.txt': 'Hello from fixture!' }
      };

      const { context, cleanup } = await fixtureManager.setup(spec);
      cleanupFunctions.push(cleanup);

      // Import and execute a real tool
      const { readFileTool } = await import('../../src/tools/read_file');
      const result = await readFileTool.execute({ path: 'test.txt' }, context);

      expect(result.success).toBe(true);
      expect(result.data).toBe('Hello from fixture!');
    });
  });
});
