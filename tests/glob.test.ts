import { describe, it, expect } from 'vitest';
import { executeTool } from '../src/tool-setup.js';

describe('glob tool', () => {
    describe('Happy Path Tests', () => {
        it('should find all TypeScript files with **/*.ts', async () => {
            const result = await executeTool('Glob', { pattern: '**/*.ts', path: '.' });
            const files = JSON.parse(result);

            expect(Array.isArray(files)).toBe(true);
            expect(files.length).toBeGreaterThan(0);
            expect(files.every((f: string) => f.endsWith('.ts'))).toBe(true);
        });

        it('should find files in specific directory with src/*.ts', async () => {
            const result = await executeTool('Glob', { pattern: 'src/*.ts', path: '.' });
            const files = JSON.parse(result);

            expect(Array.isArray(files)).toBe(true);
            expect(files.length).toBeGreaterThan(0);
            expect(files.every((f: string) => f.startsWith('src/') && f.endsWith('.ts'))).toBe(true);
        });

        it('should find files with multiple extensions **/*.{ts,md}', async () => {
            const result = await executeTool('Glob', { pattern: '**/*.{ts,md}', path: '.' });
            const files = JSON.parse(result);

            expect(Array.isArray(files)).toBe(true);
            expect(files.length).toBeGreaterThan(0);
            const hasTs = files.some((f: string) => f.endsWith('.ts'));
            const hasMd = files.some((f: string) => f.endsWith('.md'));
            expect(hasTs || hasMd).toBe(true);
        });

        it('should return empty array when no matches', async () => {
            const result = await executeTool('Glob', { pattern: '**/*.nonexistent', path: '.' });
            const files = JSON.parse(result);

            expect(files).toEqual([]);
        });
    });

    describe('Edge Cases', () => {
        it('should ignore node_modules by default', async () => {
            const result = await executeTool('Glob', { pattern: '**/*.ts', path: '.' });
            const files = JSON.parse(result);

            expect(files.every((f: string) => !f.includes('node_modules'))).toBe(true);
        });

        it('should ignore hidden files by default', async () => {
            const result = await executeTool('Glob', { pattern: '**/*', path: '.' });
            const files = JSON.parse(result);

            expect(files.every((f: string) => {
                const parts = f.split('/');
                return parts.every(part => !part.startsWith('.'));
            })).toBe(true);
        });

        it('should handle non-existent directory gracefully', async () => {
            const result = await executeTool('Glob', { pattern: '**/*.ts', path: './nonexistent_dir_12345' });

            expect(result).toContain('Error');
        });

        it('should work with relative paths', async () => {
            const result = await executeTool('Glob', { pattern: '*.ts', path: './src' });
            const files = JSON.parse(result);

            expect(Array.isArray(files)).toBe(true);
            expect(files.length).toBeGreaterThan(0);
        });
    });

    describe('Pattern Tests', () => {
        it('should support * wildcard (single level)', async () => {
            const result = await executeTool('Glob', { pattern: 'src/*', path: '.' });
            const files = JSON.parse(result);

            expect(Array.isArray(files)).toBe(true);
            // Should only match direct children of src, not nested
            expect(files.every((f: string) => {
                const afterSrc = f.replace('src/', '');
                return !afterSrc.includes('/');
            })).toBe(true);
        });

        it('should support ** wildcard (recursive)', async () => {
            const result = await executeTool('Glob', { pattern: 'src/**/*.ts', path: '.' });
            const files = JSON.parse(result);

            expect(Array.isArray(files)).toBe(true);
            expect(files.length).toBeGreaterThan(0);
        });

        it('should support ? wildcard (single character)', async () => {
            const result = await executeTool('Glob', { pattern: 'src/?.ts', path: '.' });

            // Just verify it doesn't throw - specific results depend on filesystem
            expect(typeof result).toBe('string');
        });

        it('should support brace expansion {ts,md}', async () => {
            const result = await executeTool('Glob', { pattern: '**/*.{ts,md}', path: '.' });
            const files = JSON.parse(result);

            expect(Array.isArray(files)).toBe(true);
            expect(files.length).toBeGreaterThan(0);
        });
    });
});
