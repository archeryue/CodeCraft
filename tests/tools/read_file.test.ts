// tests/tools/read_file.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileTool } from '../../src/tools/read_file';
import { createMockContext } from '../helpers/mock-context';
import { ToolContext } from '../../src/types/tool';

describe('read_file Tool', () => {
  let mockContext: ToolContext;

  beforeEach(() => {
    mockContext = createMockContext({
      files: {
        'test.txt': 'line1\nline2\nline3\nline4\nline5',
        'empty.txt': '',
        'single.txt': 'single line',
        'package.json': '{\n  "name": "test",\n  "version": "1.0.0"\n}'
      }
    });
  });

  describe('Tool Metadata', () => {
    it('should have name: read_file', () => {
      expect(readFileTool.name).toBe('read_file');
    });

    it('should have version: 1.0.0', () => {
      expect(readFileTool.version).toBe('1.0.0');
    });

    it('should have clear description', () => {
      expect(readFileTool.description).toBeDefined();
      expect(readFileTool.description.length).toBeGreaterThan(10);
    });

    it('should define parameters schema with path, offset, limit', () => {
      expect(readFileTool.parameters.properties).toHaveProperty('path');
      expect(readFileTool.parameters.properties).toHaveProperty('offset');
      expect(readFileTool.parameters.properties).toHaveProperty('limit');
    });

    it('should mark path as required', () => {
      expect(readFileTool.parameters.required).toContain('path');
    });

    it('should mark offset and limit as optional', () => {
      expect(readFileTool.parameters.required).not.toContain('offset');
      expect(readFileTool.parameters.required).not.toContain('limit');
    });
  });

  describe('Capabilities', () => {
    it('should set writesFiles: false', () => {
      expect(readFileTool.capabilities.writesFiles).toBe(false);
    });

    it('should set executesCommands: false', () => {
      expect(readFileTool.capabilities.executesCommands).toBe(false);
    });

    it('should set requiresRustEngine: false', () => {
      expect(readFileTool.capabilities.requiresRustEngine).toBe(false);
    });

    it('should set idempotent: true', () => {
      expect(readFileTool.capabilities.idempotent).toBe(true);
    });

    it('should set retryable: true', () => {
      expect(readFileTool.capabilities.retryable).toBe(true);
    });
  });

  describe('Validation', () => {
    it('should reject missing path', () => {
      const result = readFileTool.validate!({});

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('path is required and must be a string');
    });

    it('should reject non-string path', () => {
      const result = readFileTool.validate!({ path: 123 });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('path is required and must be a string');
    });

    it('should reject non-number offset', () => {
      const result = readFileTool.validate!({ path: 'test.txt', offset: 'invalid' });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('offset must be a number');
    });

    it('should reject non-number limit', () => {
      const result = readFileTool.validate!({ path: 'test.txt', limit: 'invalid' });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('limit must be a number');
    });

    it('should reject negative offset', () => {
      const result = readFileTool.validate!({ path: 'test.txt', offset: -1 });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('offset must be non-negative');
    });

    it('should reject non-positive limit', () => {
      const result = readFileTool.validate!({ path: 'test.txt', limit: 0 });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('limit must be positive');
    });

    it('should accept valid params', () => {
      const result = readFileTool.validate!({ path: 'test.txt', offset: 0, limit: 10 });

      expect(result.valid).toBe(true);
    });
  });

  describe('Execution - Happy Path', () => {
    it('should read entire file when no offset/limit', async () => {
      const result = await readFileTool.execute({ path: 'test.txt' }, mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toBe('line1\nline2\nline3\nline4\nline5');
    });

    it('should read from offset to end when only offset', async () => {
      const result = await readFileTool.execute({ path: 'test.txt', offset: 2 }, mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toBe('line3\nline4\nline5');
    });

    it('should read limited lines from start when only limit', async () => {
      const result = await readFileTool.execute({ path: 'test.txt', limit: 2 }, mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toBe('line1\nline2');
    });

    it('should read range when both offset and limit', async () => {
      const result = await readFileTool.execute(
        { path: 'test.txt', offset: 1, limit: 2 },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe('line2\nline3');
    });

    it('should include bytesRead in metadata', async () => {
      const result = await readFileTool.execute({ path: 'test.txt' }, mockContext);

      expect(result.metadata?.bytesRead).toBeGreaterThan(0);
    });

    it('should include filesAccessed in metadata', async () => {
      const result = await readFileTool.execute({ path: 'test.txt' }, mockContext);

      expect(result.metadata?.filesAccessed).toContain('test.txt');
    });

    it('should include executionTimeMs in metadata', async () => {
      const result = await readFileTool.execute({ path: 'test.txt' }, mockContext);

      expect(result.metadata?.executionTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Execution - Error Cases', () => {
    it('should return FILE_NOT_FOUND error for missing file', async () => {
      const result = await readFileTool.execute({ path: 'nonexistent.txt' }, mockContext);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('FILE_NOT_FOUND');
      expect(result.error?.message).toContain('nonexistent.txt');
    });

    it('should return READ_ERROR for fs errors', async () => {
      // Mock readFileSync to throw a different error
      mockContext.fs.readFileSync = () => {
        throw new Error('Permission denied');
      };

      const result = await readFileTool.execute({ path: 'test.txt' }, mockContext);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('READ_ERROR');
      expect(result.error?.message).toContain('Permission denied');
    });

    it('should include error details in result', async () => {
      const result = await readFileTool.execute({ path: 'nonexistent.txt' }, mockContext);

      expect(result.error?.details).toHaveProperty('path', 'nonexistent.txt');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty file', async () => {
      const result = await readFileTool.execute({ path: 'empty.txt' }, mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toBe('');
    });

    it('should handle single line file', async () => {
      const result = await readFileTool.execute({ path: 'single.txt' }, mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toBe('single line');
    });

    it('should handle offset beyond file length', async () => {
      const result = await readFileTool.execute({ path: 'test.txt', offset: 100 }, mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toBe('');
    });

    it('should handle limit larger than remaining lines', async () => {
      const result = await readFileTool.execute(
        { path: 'test.txt', offset: 3, limit: 100 },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe('line4\nline5');
    });
  });

  describe('Integration with Mocked FS', () => {
    it('should work with mock fs context', async () => {
      const result = await readFileTool.execute({ path: 'package.json' }, mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toContain('"name": "test"');
    });

    it('should not access real filesystem in tests', async () => {
      // This test verifies that we're using the mock, not real fs
      // The mock only has files we defined
      const result = await readFileTool.execute({ path: '/etc/passwd' }, mockContext);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('FILE_NOT_FOUND');
    });

    it('should respect mock file contents', async () => {
      const customContext = createMockContext({
        files: {
          'custom.txt': 'custom content'
        }
      });

      const result = await readFileTool.execute({ path: 'custom.txt' }, customContext);

      expect(result.success).toBe(true);
      expect(result.data).toBe('custom content');
    });
  });
});
