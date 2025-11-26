import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeTool } from '../src/tools.js';
import * as fs from 'fs';

// Mock fs
vi.mock('fs', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...(actual as any),
        readFileSync: vi.fn(),
        writeFileSync: vi.fn(),
        existsSync: vi.fn()
    };
});

describe('edit_file tool', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should replace old_string with new_string', async () => {
        const originalContent = 'function foo() {\n  return "old";\n}';
        const expectedContent = 'function foo() {\n  return "new";\n}';

        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(originalContent);

        const result = await executeTool('edit_file', {
            path: 'test.ts',
            old_string: 'return "old";',
            new_string: 'return "new";'
        });

        expect(fs.writeFileSync).toHaveBeenCalledWith('test.ts', expectedContent);
        expect(result).toContain('Edited test.ts');
    });

    it('should return error when old_string not found', async () => {
        const originalContent = 'function foo() {\n  return "bar";\n}';

        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(originalContent);

        const result = await executeTool('edit_file', {
            path: 'test.ts',
            old_string: 'return "nonexistent";',
            new_string: 'return "new";'
        });

        expect(fs.writeFileSync).not.toHaveBeenCalled();
        expect(result).toContain('Error');
        expect(result).toContain('not found');
    });

    it('should return error when file does not exist', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);

        const result = await executeTool('edit_file', {
            path: 'nonexistent.ts',
            old_string: 'old',
            new_string: 'new'
        });

        expect(fs.readFileSync).not.toHaveBeenCalled();
        expect(fs.writeFileSync).not.toHaveBeenCalled();
        expect(result).toContain('Error');
        expect(result).toContain('not found');
    });

    it('should handle multiline replacements', async () => {
        const originalContent = 'function foo() {\n  const x = 1;\n  const y = 2;\n  return x + y;\n}';
        const expectedContent = 'function foo() {\n  const sum = 1 + 2;\n  return sum;\n}';

        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(originalContent);

        const result = await executeTool('edit_file', {
            path: 'test.ts',
            old_string: '  const x = 1;\n  const y = 2;\n  return x + y;',
            new_string: '  const sum = 1 + 2;\n  return sum;'
        });

        expect(fs.writeFileSync).toHaveBeenCalledWith('test.ts', expectedContent);
        expect(result).toContain('Edited test.ts');
    });

    it('should preserve exact whitespace and indentation', async () => {
        const originalContent = '    function indented() {\n      return true;\n    }';
        const expectedContent = '    function indented() {\n      return false;\n    }';

        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(originalContent);

        const result = await executeTool('edit_file', {
            path: 'test.ts',
            old_string: '      return true;',
            new_string: '      return false;'
        });

        expect(fs.writeFileSync).toHaveBeenCalledWith('test.ts', expectedContent);
    });

    it('should replace only first occurrence by default', async () => {
        const originalContent = 'const a = 1;\nconst b = 1;\nconst c = 1;';
        const expectedContent = 'const a = 2;\nconst b = 1;\nconst c = 1;';

        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(originalContent);

        const result = await executeTool('edit_file', {
            path: 'test.ts',
            old_string: 'const a = 1;',
            new_string: 'const a = 2;'
        });

        expect(fs.writeFileSync).toHaveBeenCalledWith('test.ts', expectedContent);
    });
});
