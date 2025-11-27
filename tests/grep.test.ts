import { describe, it, expect } from 'vitest';
import { executeTool } from '../src/tool-setup.js';

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

    describe('Context Line Tests', () => {
        it('should return context lines when contextLines specified', async () => {
            const result = await executeTool('grep', {
                pattern: 'executeTool',
                path: 'src',
                contextLines: 2
            });
            const matches = JSON.parse(result);

            expect(Array.isArray(matches)).toBe(true);
            expect(matches.length).toBeGreaterThan(0);

            // Each match should have contextBefore and contextAfter
            expect(matches[0]).toHaveProperty('contextBefore');
            expect(matches[0]).toHaveProperty('contextAfter');
            expect(Array.isArray(matches[0].contextBefore)).toBe(true);
            expect(Array.isArray(matches[0].contextAfter)).toBe(true);
        });

        it('should support before context only', async () => {
            const result = await executeTool('grep', {
                pattern: 'function',
                path: 'src',
                beforeContext: 3
            });
            const matches = JSON.parse(result);

            expect(matches.length).toBeGreaterThan(0);
            expect(matches[0]).toHaveProperty('contextBefore');
            expect(matches[0].contextBefore.length).toBeLessThanOrEqual(3);
        });

        it('should support after context only', async () => {
            const result = await executeTool('grep', {
                pattern: 'import',
                path: 'src',
                afterContext: 5
            });
            const matches = JSON.parse(result);

            expect(matches.length).toBeGreaterThan(0);
            expect(matches[0]).toHaveProperty('contextAfter');
            expect(matches[0].contextAfter.length).toBeLessThanOrEqual(5);
        });

        it('should handle context at file boundaries', async () => {
            // Find a match near the beginning of a file
            const result = await executeTool('grep', {
                pattern: 'import',
                path: 'tests',
                include: '*.ts',
                beforeContext: 10  // More than available lines at start
            });
            const matches = JSON.parse(result);

            if (matches.length > 0) {
                const firstMatch = matches.find((m: any) => m.line <= 5);
                if (firstMatch) {
                    // Should not have more before context than available
                    expect(firstMatch.contextBefore.length).toBeLessThan(10);
                }
            }
        });

        it('should include line numbers in context', async () => {
            const result = await executeTool('grep', {
                pattern: 'describe',
                path: 'tests',
                contextLines: 2
            });
            const matches = JSON.parse(result);

            expect(matches.length).toBeGreaterThan(0);

            if (matches[0].contextBefore && matches[0].contextBefore.length > 0) {
                expect(matches[0].contextBefore[0]).toHaveProperty('line');
                expect(matches[0].contextBefore[0]).toHaveProperty('content');
                expect(typeof matches[0].contextBefore[0].line).toBe('number');
            }

            if (matches[0].contextAfter && matches[0].contextAfter.length > 0) {
                expect(matches[0].contextAfter[0]).toHaveProperty('line');
                expect(matches[0].contextAfter[0]).toHaveProperty('content');
                expect(typeof matches[0].contextAfter[0].line).toBe('number');
            }
        });

        it('should work without context parameters (backward compatible)', async () => {
            const result = await executeTool('grep', {
                pattern: 'import',
                path: 'src'
            });
            const matches = JSON.parse(result);

            expect(Array.isArray(matches)).toBe(true);
            expect(matches.length).toBeGreaterThan(0);
            // Without context params, should still work (may or may not have context fields)
        });

        it('should work with all grep parameters together', async () => {
            const result = await executeTool('grep', {
                pattern: 'function',
                path: 'src',
                include: '*.ts',
                ignoreCase: true,
                contextLines: 3
            });
            const matches = JSON.parse(result);

            expect(Array.isArray(matches)).toBe(true);
            expect(matches.every((m: any) => m.file.endsWith('.ts'))).toBe(true);
        });
    });
});
