import { describe, it, expect } from 'vitest';
import { executeTool } from '../src/tools.js';

describe('list_directory tool', () => {
    describe('Happy Path Tests', () => {
        it('should list files in a directory', async () => {
            const result = await executeTool('list_directory', { path: 'src' });
            const entries = JSON.parse(result);

            expect(Array.isArray(entries)).toBe(true);
            expect(entries.length).toBeGreaterThan(0);
        });

        it('should list subdirectories', async () => {
            const result = await executeTool('list_directory', { path: '.' });
            const entries = JSON.parse(result);

            // Should include src directory
            const hasSrc = entries.some((e: any) => e.name === 'src' && e.type === 'directory');
            expect(hasSrc).toBe(true);
        });

        it('should include file/directory type indicator', async () => {
            const result = await executeTool('list_directory', { path: '.' });
            const entries = JSON.parse(result);

            expect(entries.length).toBeGreaterThan(0);
            expect(entries[0]).toHaveProperty('name');
            expect(entries[0]).toHaveProperty('type');
            expect(['file', 'directory']).toContain(entries[0].type);
        });

        it('should work with current directory (.)', async () => {
            const result = await executeTool('list_directory', { path: '.' });
            const entries = JSON.parse(result);

            expect(Array.isArray(entries)).toBe(true);
            expect(entries.length).toBeGreaterThan(0);
        });
    });

    describe('Edge Cases', () => {
        it('should handle non-existent directory', async () => {
            const result = await executeTool('list_directory', { path: './nonexistent_dir_99999' });

            expect(result).toContain('Error');
        });

        it('should not recurse by default (single level only)', async () => {
            const result = await executeTool('list_directory', { path: 'src' });
            const entries = JSON.parse(result);

            // Should not include nested files like src/ui/renderer.ts
            // Only direct children of src/
            expect(entries.every((e: any) => !e.name.includes('/'))).toBe(true);
        });
    });

    describe('Output Format', () => {
        it('should clearly distinguish files from directories', async () => {
            const result = await executeTool('list_directory', { path: '.' });
            const entries = JSON.parse(result);

            const files = entries.filter((e: any) => e.type === 'file');
            const dirs = entries.filter((e: any) => e.type === 'directory');

            // Should have both files and directories in root
            expect(files.length).toBeGreaterThan(0);
            expect(dirs.length).toBeGreaterThan(0);
        });

        it('should sort entries alphabetically', async () => {
            const result = await executeTool('list_directory', { path: '.' });
            const entries = JSON.parse(result);
            const names = entries.map((e: any) => e.name);

            const sorted = [...names].sort((a, b) => a.localeCompare(b));
            expect(names).toEqual(sorted);
        });
    });
});
