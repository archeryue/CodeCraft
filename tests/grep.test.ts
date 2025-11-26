import { describe, it, expect } from 'vitest';
import { executeTool } from '../src/tools.js';

describe('grep tool', () => {
    describe('Happy Path Tests', () => {
        it('should find lines matching a simple string', async () => {
            const result = await executeTool('grep', { pattern: 'executeTool', path: '.' });
            const matches = JSON.parse(result);

            expect(Array.isArray(matches)).toBe(true);
            expect(matches.length).toBeGreaterThan(0);
        });

        it('should find lines matching a regex pattern', async () => {
            const result = await executeTool('grep', { pattern: 'function.*async', path: '.' });
            const matches = JSON.parse(result);

            expect(Array.isArray(matches)).toBe(true);
        });

        it('should return file path and line number with matches', async () => {
            const result = await executeTool('grep', { pattern: 'import.*from', path: 'src' });
            const matches = JSON.parse(result);

            expect(Array.isArray(matches)).toBe(true);
            expect(matches.length).toBeGreaterThan(0);
            // Each match should have file, line, and content
            expect(matches[0]).toHaveProperty('file');
            expect(matches[0]).toHaveProperty('line');
            expect(matches[0]).toHaveProperty('content');
        });

        it('should search recursively by default', async () => {
            const result = await executeTool('grep', { pattern: 'describe', path: '.' });
            const matches = JSON.parse(result);

            expect(Array.isArray(matches)).toBe(true);
            // Should find matches in tests/ subdirectory
            const hasTestFiles = matches.some((m: any) => m.file.includes('tests/'));
            expect(hasTestFiles).toBe(true);
        });
    });

    describe('Options Tests', () => {
        it('should support case-insensitive search', async () => {
            const result = await executeTool('grep', {
                pattern: 'EXECUTETOOL',
                path: '.',
                ignoreCase: true
            });
            const matches = JSON.parse(result);

            expect(Array.isArray(matches)).toBe(true);
            expect(matches.length).toBeGreaterThan(0);
        });

        it('should support file pattern filtering with include', async () => {
            const result = await executeTool('grep', {
                pattern: 'import',
                path: '.',
                include: '*.ts'
            });
            const matches = JSON.parse(result);

            expect(Array.isArray(matches)).toBe(true);
            expect(matches.every((m: any) => m.file.endsWith('.ts'))).toBe(true);
        });

        it('should return empty array when no matches', async () => {
            const result = await executeTool('grep', {
                pattern: 'thispatterndoesnotexistanywhere99999',
                path: 'src',
                include: '*.ts'
            });
            const matches = JSON.parse(result);

            expect(matches).toEqual([]);
        });
    });

    describe('Edge Cases', () => {
        it('should ignore node_modules by default', async () => {
            const result = await executeTool('grep', { pattern: 'function', path: '.' });
            const matches = JSON.parse(result);

            expect(matches.every((m: any) => !m.file.includes('node_modules'))).toBe(true);
        });

        it('should handle non-existent directory gracefully', async () => {
            const result = await executeTool('grep', {
                pattern: 'test',
                path: './nonexistent_dir_12345'
            });

            expect(result).toContain('Error');
        });

        it('should handle invalid regex gracefully', async () => {
            const result = await executeTool('grep', {
                pattern: '[invalid(regex',
                path: '.'
            });

            // Should either return error or empty array, not throw
            expect(typeof result).toBe('string');
        });
    });
});
