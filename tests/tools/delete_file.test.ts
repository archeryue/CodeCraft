// tests/tools/delete_file.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { deleteFileTool } from '../../src/tools/delete_file';
import { createMockContext } from '../helpers/mock_context';
import { ToolContext } from '../../src/types/tool';

describe('delete_file Tool', () => {
  let mockContext: ToolContext;

  beforeEach(() => {
    mockContext = createMockContext({
      files: {
        'test.txt': 'content',
        'another.txt': 'more content'
      }
    });

    // Mock statSync to return file info
    mockContext.fs.statSync = vi.fn((path: string) => ({
      isDirectory: () => false,
      isFile: () => true
    }));
  });

  describe('Tool Metadata', () => {
    it('should have name: delete_file', () => {
      expect(deleteFileTool.name).toBe('delete_file');
    });

    it('should have capabilities.writesFiles: true', () => {
      expect(deleteFileTool.capabilities.writesFiles).toBe(true);
    });

    it('should mark path as required', () => {
      expect(deleteFileTool.parameters.required).toContain('path');
    });
  });

  describe('Validation', () => {
    it('should reject missing path', () => {
      const result = deleteFileTool.validate!({});
      expect(result.valid).toBe(false);
    });

    it('should reject path with ..', () => {
      const result = deleteFileTool.validate!({ path: '../etc/passwd' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Path traversal not allowed');
    });

    it('should accept valid path', () => {
      const result = deleteFileTool.validate!({ path: 'test.txt' });
      expect(result.valid).toBe(true);
    });
  });

  describe('Execution', () => {
    it('should delete existing file', async () => {
      const result = await deleteFileTool.execute({ path: 'test.txt' }, mockContext);

      expect(result.success).toBe(true);
      expect(mockContext.fs.unlinkSync).toHaveBeenCalledWith('test.txt');
    });

    it('should return FILE_NOT_FOUND for missing file', async () => {
      const result = await deleteFileTool.execute({ path: 'missing.txt' }, mockContext);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('FILE_NOT_FOUND');
    });

    it('should return error for directory', async () => {
      mockContext.fs.statSync = vi.fn(() => ({
        isDirectory: () => true,
        isFile: () => false
      }));

      const result = await deleteFileTool.execute({ path: 'test.txt' }, mockContext);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('IS_DIRECTORY');
    });
  });
});
