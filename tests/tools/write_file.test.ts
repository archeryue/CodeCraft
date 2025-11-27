// tests/tools/write_file.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { writeFileTool } from '../../src/tools/write_file';
import { createMockContext } from '../helpers/mock-context';
import { ToolContext } from '../../src/types/tool';

describe('write_file Tool', () => {
  let mockContext: ToolContext;

  beforeEach(() => {
    mockContext = createMockContext({
      files: {
        'existing.txt': 'old content'
      }
    });
  });

  describe('Tool Metadata', () => {
    it('should have name: write_file', () => {
      expect(writeFileTool.name).toBe('write_file');
    });

    it('should have version: 1.0.0', () => {
      expect(writeFileTool.version).toBe('1.0.0');
    });

    it('should have clear description', () => {
      expect(writeFileTool.description).toBeDefined();
      expect(writeFileTool.description.length).toBeGreaterThan(10);
    });

    it('should define parameters schema with path and content', () => {
      expect(writeFileTool.parameters.properties).toHaveProperty('path');
      expect(writeFileTool.parameters.properties).toHaveProperty('content');
    });

    it('should mark path and content as required', () => {
      expect(writeFileTool.parameters.required).toContain('path');
      expect(writeFileTool.parameters.required).toContain('content');
    });
  });

  describe('Capabilities', () => {
    it('should set writesFiles: true', () => {
      expect(writeFileTool.capabilities.writesFiles).toBe(true);
    });

    it('should set executesCommands: false', () => {
      expect(writeFileTool.capabilities.executesCommands).toBe(false);
    });

    it('should set requiresRustEngine: false', () => {
      expect(writeFileTool.capabilities.requiresRustEngine).toBe(false);
    });

    it('should set idempotent: true', () => {
      expect(writeFileTool.capabilities.idempotent).toBe(true);
    });

    it('should set retryable: true', () => {
      expect(writeFileTool.capabilities.retryable).toBe(true);
    });
  });

  describe('Validation', () => {
    it('should reject missing path', () => {
      const result = writeFileTool.validate!({ content: 'test' });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('path is required and must be a string');
    });

    it('should reject non-string path', () => {
      const result = writeFileTool.validate!({ path: 123, content: 'test' });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('path is required and must be a string');
    });

    it('should reject missing content', () => {
      const result = writeFileTool.validate!({ path: 'test.txt' });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('content is required and must be a string');
    });

    it('should reject non-string content', () => {
      const result = writeFileTool.validate!({ path: 'test.txt', content: 123 });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('content is required and must be a string');
    });

    it('should accept valid params', () => {
      const result = writeFileTool.validate!({ path: 'test.txt', content: 'content' });

      expect(result.valid).toBe(true);
    });
  });

  describe('Execution - New File', () => {
    it('should write to new file without confirmation', async () => {
      const result = await writeFileTool.execute(
        { path: 'new.txt', content: 'new content' },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data).toContain('new.txt');
      expect(mockContext.fs.writeFileSync).toHaveBeenCalledWith('new.txt', 'new content');
    });

    it('should include bytesWritten in metadata', async () => {
      const result = await writeFileTool.execute(
        { path: 'new.txt', content: 'new content' },
        mockContext
      );

      expect(result.metadata?.bytesWritten).toBeGreaterThan(0);
    });

    it('should include filesAccessed in metadata', async () => {
      const result = await writeFileTool.execute(
        { path: 'new.txt', content: 'new content' },
        mockContext
      );

      expect(result.metadata?.filesAccessed).toContain('new.txt');
    });

    it('should include executionTimeMs in metadata', async () => {
      const result = await writeFileTool.execute(
        { path: 'new.txt', content: 'new content' },
        mockContext
      );

      expect(result.metadata?.executionTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Execution - Existing File with Confirmation', () => {
    it('should request confirmation when overwriting existing file', async () => {
      const confirmCallback = vi.fn().mockResolvedValue(true);
      const contextWithConfirm = createMockContext({
        files: { 'existing.txt': 'old content' },
        confirm: confirmCallback
      });

      await writeFileTool.execute(
        { path: 'existing.txt', content: 'new content' },
        contextWithConfirm
      );

      expect(confirmCallback).toHaveBeenCalled();
      expect(confirmCallback.mock.calls[0][0]).toContain('existing.txt');
    });

    it('should write file if user confirms', async () => {
      const confirmCallback = vi.fn().mockResolvedValue(true);
      const contextWithConfirm = createMockContext({
        files: { 'existing.txt': 'old content' },
        confirm: confirmCallback
      });

      const result = await writeFileTool.execute(
        { path: 'existing.txt', content: 'new content' },
        contextWithConfirm
      );

      expect(result.success).toBe(true);
      expect(contextWithConfirm.fs.writeFileSync).toHaveBeenCalledWith('existing.txt', 'new content');
    });

    it('should not write file if user cancels', async () => {
      const confirmCallback = vi.fn().mockResolvedValue(false);
      const contextWithConfirm = createMockContext({
        files: { 'existing.txt': 'old content' },
        confirm: confirmCallback
      });

      const result = await writeFileTool.execute(
        { path: 'existing.txt', content: 'new content' },
        contextWithConfirm
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('USER_CANCELLED');
      expect(contextWithConfirm.fs.writeFileSync).not.toHaveBeenCalled();
    });

    it('should write without confirmation if no confirm callback', async () => {
      // Even if file exists, if no confirm callback, just write
      const result = await writeFileTool.execute(
        { path: 'existing.txt', content: 'new content' },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(mockContext.fs.writeFileSync).toHaveBeenCalledWith('existing.txt', 'new content');
    });
  });

  describe('Execution - Error Cases', () => {
    it('should return WRITE_ERROR for fs errors', async () => {
      mockContext.fs.writeFileSync = vi.fn(() => {
        throw new Error('Permission denied');
      });

      const result = await writeFileTool.execute(
        { path: 'test.txt', content: 'content' },
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('WRITE_ERROR');
      expect(result.error?.message).toContain('Permission denied');
    });

    it('should include error details in result', async () => {
      mockContext.fs.writeFileSync = vi.fn(() => {
        throw new Error('Disk full');
      });

      const result = await writeFileTool.execute(
        { path: 'test.txt', content: 'content' },
        mockContext
      );

      expect(result.error?.details).toHaveProperty('path', 'test.txt');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content', async () => {
      const result = await writeFileTool.execute(
        { path: 'empty.txt', content: '' },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(mockContext.fs.writeFileSync).toHaveBeenCalledWith('empty.txt', '');
    });

    it('should handle very long content', async () => {
      const longContent = 'x'.repeat(1000000); // 1MB
      const result = await writeFileTool.execute(
        { path: 'large.txt', content: longContent },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.metadata?.bytesWritten).toBeGreaterThan(999000);
    });

    it('should handle special characters in content', async () => {
      const specialContent = 'Line1\nLine2\tTab\r\nWindows\0Null';
      const result = await writeFileTool.execute(
        { path: 'special.txt', content: specialContent },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(mockContext.fs.writeFileSync).toHaveBeenCalledWith('special.txt', specialContent);
    });

    it('should handle nested directory paths', async () => {
      const result = await writeFileTool.execute(
        { path: 'dir/subdir/file.txt', content: 'content' },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(mockContext.fs.writeFileSync).toHaveBeenCalledWith('dir/subdir/file.txt', 'content');
    });
  });

  describe('Integration with Mocked FS', () => {
    it('should work with mock fs context', async () => {
      const result = await writeFileTool.execute(
        { path: 'test.txt', content: 'test content' },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(vi.isMockFunction(mockContext.fs.writeFileSync)).toBe(true);
    });

    it('should respect mock existsSync behavior', async () => {
      const confirmCallback = vi.fn().mockResolvedValue(true);
      mockContext.confirm = confirmCallback;

      // File exists in mock
      await writeFileTool.execute(
        { path: 'existing.txt', content: 'new' },
        mockContext
      );

      expect(confirmCallback).toHaveBeenCalled();

      // File doesn't exist in mock
      await writeFileTool.execute(
        { path: 'new.txt', content: 'content' },
        mockContext
      );

      // Should have been called once (only for existing.txt)
      expect(confirmCallback).toHaveBeenCalledTimes(1);
    });
  });
});
