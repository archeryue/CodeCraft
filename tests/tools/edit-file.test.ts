// tests/tools/edit_file.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { editFileTool } from '../../src/tools/edit-file';
import { createMockContext } from '../helpers/mock-context';

describe('edit_file Tool', () => {
  let mockContext: any;

  beforeEach(() => {
    mockContext = createMockContext({
      files: { 'test.txt': 'hello world' }
    });
  });

  it('should have name: EditFile', () => {
    expect(editFileTool.name).toBe('EditFile');
  });

  it('should edit file successfully', async () => {
    const result = await editFileTool.execute(
      { path: 'test.txt', old_string: 'world', new_string: 'CodeCraft' },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(mockContext.fs.writeFileSync).toHaveBeenCalledWith('test.txt', 'hello CodeCraft');
  });

  it('should return error if file not found', async () => {
    const result = await editFileTool.execute(
      { path: 'missing.txt', old_string: 'x', new_string: 'y' },
      mockContext
    );

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('FILE_NOT_FOUND');
  });

  it('should return error if old_string not found', async () => {
    const result = await editFileTool.execute(
      { path: 'test.txt', old_string: 'notfound', new_string: 'y' },
      mockContext
    );

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('STRING_NOT_FOUND');
  });
});
