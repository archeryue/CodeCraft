// tests/tool-context.test.ts

import { describe, it, expect, vi } from 'vitest';
import { createDefaultContext, createMockContext } from './helpers/mock-context';
import * as fs from 'fs';

describe('ToolContext Factory', () => {
  describe('createDefaultContext', () => {
    it('should create context with real fs functions', () => {
      const context = createDefaultContext();

      expect(context.fs).toBeDefined();
      expect(context.fs.readFileSync).toBeDefined();
      expect(context.fs.writeFileSync).toBeDefined();
      expect(context.fs.existsSync).toBeDefined();
      expect(context.fs.unlinkSync).toBeDefined();
      expect(context.fs.readdirSync).toBeDefined();
      expect(context.fs.statSync).toBeDefined();
    });

    it('should include readFileSync, writeFileSync, existsSync', () => {
      const context = createDefaultContext();

      expect(typeof context.fs.readFileSync).toBe('function');
      expect(typeof context.fs.writeFileSync).toBe('function');
      expect(typeof context.fs.existsSync).toBe('function');
    });

    it('should include unlinkSync, readdirSync, statSync', () => {
      const context = createDefaultContext();

      expect(typeof context.fs.unlinkSync).toBe('function');
      expect(typeof context.fs.readdirSync).toBe('function');
      expect(typeof context.fs.statSync).toBe('function');
    });

    it('should set cwd to process.cwd()', () => {
      const context = createDefaultContext();

      expect(context.cwd).toBe(process.cwd());
    });

    it('should include rustEngine if available', () => {
      const mockRustEngine = {
        generateRepoMap: () => 'mock',
        search: () => [],
        getSymbolInfo: () => ({}),
        getImportsExports: () => ({}),
        buildDependencyGraph: () => ({}),
        resolveSymbol: () => ({}),
        findReferences: () => []
      };

      const context = createDefaultContext(mockRustEngine);

      expect(context.rustEngine).toBe(mockRustEngine);
    });

    it('should handle missing rustEngine gracefully', () => {
      const context = createDefaultContext();

      expect(context.rustEngine).toBeUndefined();
    });
  });

  describe('createMockContext', () => {
    it('should create mock context for testing', () => {
      const context = createMockContext();

      expect(context.fs).toBeDefined();
      expect(context.cwd).toBeDefined();
    });

    it('mock fs should be fully mockable (vitest.fn())', () => {
      const context = createMockContext();

      // All fs methods should be mock functions
      expect(vi.isMockFunction(context.fs.readFileSync)).toBe(true);
      expect(vi.isMockFunction(context.fs.writeFileSync)).toBe(true);
      expect(vi.isMockFunction(context.fs.existsSync)).toBe(true);
      expect(vi.isMockFunction(context.fs.unlinkSync)).toBe(true);
      expect(vi.isMockFunction(context.fs.readdirSync)).toBe(true);
      expect(vi.isMockFunction(context.fs.statSync)).toBe(true);
    });

    it('should allow custom file fixtures', () => {
      const files = {
        'test.txt': 'content',
        'data.json': '{"key": "value"}'
      };

      const context = createMockContext({ files });

      // Configure mock to return file contents
      context.fs.readFileSync = vi.fn((path: string) => {
        if (path in files) return files[path as keyof typeof files];
        throw new Error('File not found');
      });

      expect(context.fs.readFileSync('test.txt', 'utf-8')).toBe('content');
      expect(context.fs.readFileSync('data.json', 'utf-8')).toBe('{"key": "value"}');
    });

    it('should allow custom cwd', () => {
      const context = createMockContext({ cwd: '/custom/path' });

      expect(context.cwd).toBe('/custom/path');
    });

    it('should merge custom confirm callback into context', () => {
      const confirmCallback = vi.fn().mockResolvedValue(true);
      const context = createMockContext({ confirm: confirmCallback });

      expect(context.confirm).toBe(confirmCallback);
    });

    it('should merge custom logger into context', () => {
      const logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
      };

      const context = createMockContext({ logger });

      expect(context.logger).toBe(logger);
    });

    it('should merge abort signal into context', () => {
      const controller = new AbortController();
      const context = createMockContext({ signal: controller.signal });

      expect(context.signal).toBe(controller.signal);
    });
  });
});
