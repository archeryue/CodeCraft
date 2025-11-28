// tests/tools/list_directory.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { listDirectoryTool } from '../../src/tools/list_directory';
import { createMockContext } from '../helpers/mock_context';

describe('list_directory Tool', () => {
  let mockContext: any;

  beforeEach(() => {
    mockContext = createMockContext({ files: { '.': 'dir' } });
    mockContext.fs.existsSync = vi.fn(() => true);
    mockContext.fs.readdirSync = vi.fn(() => [
      { name: 'file1.txt', isDirectory: () => false },
      { name: 'dir1', isDirectory: () => true },
      { name: '.hidden', isDirectory: () => false }
    ]);
  });

  it('should have name: list_directory', () => {
    expect(listDirectoryTool.name).toBe('list_directory');
  });

  it('should list directory contents', async () => {
    const result = await listDirectoryTool.execute({ path: '.' }, mockContext);

    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('should filter hidden files', async () => {
    const result = await listDirectoryTool.execute({ path: '.' }, mockContext);

    const names = (result.data as any[]).map(e => e.name);
    expect(names).not.toContain('.hidden');
  });

  it('should use "." as default path', async () => {
    const result = await listDirectoryTool.execute({}, mockContext);

    expect(result.success).toBe(true);
  });
});
