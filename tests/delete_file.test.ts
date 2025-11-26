import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { executeTool } from '../src/tools';
import * as fs from 'fs';
import * as path from 'path';

describe('delete_file tool', () => {
    const testDir = './test_delete_temp';
    const testFile = path.join(testDir, 'test_file.txt');

    beforeEach(() => {
        // Create test directory and file
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }
        fs.writeFileSync(testFile, 'test content');
    });

    afterEach(() => {
        // Cleanup
        if (fs.existsSync(testFile)) {
            fs.unlinkSync(testFile);
        }
        if (fs.existsSync(testDir)) {
            fs.rmdirSync(testDir, { recursive: true });
        }
    });

    describe('Happy Path Tests', () => {
        it('should delete an existing file', async () => {
            expect(fs.existsSync(testFile)).toBe(true);

            const result = await executeTool('delete_file', { path: testFile });

            expect(fs.existsSync(testFile)).toBe(false);
            expect(result).toContain('deleted');
        });

        it('should return success message after deletion', async () => {
            const result = await executeTool('delete_file', { path: testFile });

            expect(result.toLowerCase()).toContain('success');
        });

        it('should work with relative paths', async () => {
            const relativePath = testFile;
            const result = await executeTool('delete_file', { path: relativePath });

            expect(fs.existsSync(relativePath)).toBe(false);
            expect(result).toContain('deleted');
        });

        it('should work with absolute paths', async () => {
            const absolutePath = path.resolve(testFile);
            const result = await executeTool('delete_file', { path: absolutePath });

            expect(fs.existsSync(absolutePath)).toBe(false);
            expect(result).toContain('deleted');
        });
    });

    describe('Safety Tests', () => {
        it('should return error when file does not exist', async () => {
            const result = await executeTool('delete_file', { path: './nonexistent_file_12345.txt' });

            expect(result).toContain('Error');
            expect(result).toContain('not found');
        });

        it('should return error when path is a directory', async () => {
            const result = await executeTool('delete_file', { path: testDir });

            expect(result).toContain('Error');
            expect(result.toLowerCase()).toContain('directory');
        });

        it('should not delete files with dangerous paths', async () => {
            // Attempting to delete with path traversal
            const result = await executeTool('delete_file', { path: '../../../etc/passwd' });

            expect(result).toContain('Error');
        });
    });

    describe('Output Format', () => {
        it('should return confirmation message with file path', async () => {
            const result = await executeTool('delete_file', { path: testFile });

            expect(result).toContain(testFile.replace('./', ''));
        });
    });
});
