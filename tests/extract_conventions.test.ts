import { describe, it, expect } from 'vitest';
import { executeTool } from '../src/tools';

describe('extract_conventions tool', () => {
    describe('Naming Convention Tests', () => {
        it('should detect camelCase naming for functions', async () => {
            const result = await executeTool('extract_conventions', { path: 'src' });
            const conventions = JSON.parse(result);

            expect(conventions.functionNaming).toBe('camelCase');
        });

        it('should detect PascalCase for classes', async () => {
            const result = await executeTool('extract_conventions', { path: 'src' });
            const conventions = JSON.parse(result);

            expect(conventions.classNaming).toBe('PascalCase');
        });

        it('should detect constant naming style', async () => {
            const result = await executeTool('extract_conventions', { path: 'src' });
            const conventions = JSON.parse(result);

            // TOOLS is UPPER_SNAKE_CASE
            expect(conventions.constantNaming).toBeDefined();
        });
    });

    describe('Style Detection', () => {
        it('should detect indentation style (spaces)', async () => {
            const result = await executeTool('extract_conventions', { path: 'src' });
            const conventions = JSON.parse(result);

            expect(conventions.indentStyle).toBe('spaces');
        });

        it('should detect indent size', async () => {
            const result = await executeTool('extract_conventions', { path: 'src' });
            const conventions = JSON.parse(result);

            // TypeScript typically uses 2 or 4 spaces
            expect([2, 4]).toContain(conventions.indentSize);
        });

        it('should detect quote style', async () => {
            const result = await executeTool('extract_conventions', { path: 'src' });
            const conventions = JSON.parse(result);

            expect(['single', 'double']).toContain(conventions.quoteStyle);
        });

        it('should detect semicolon usage', async () => {
            const result = await executeTool('extract_conventions', { path: 'src' });
            const conventions = JSON.parse(result);

            expect(typeof conventions.useSemicolons).toBe('boolean');
        });
    });

    describe('Pattern Detection', () => {
        it('should detect test file location', async () => {
            const result = await executeTool('extract_conventions', { path: '.' });
            const conventions = JSON.parse(result);

            expect(conventions.testLocation).toContain('tests');
        });

        it('should detect test file naming pattern', async () => {
            const result = await executeTool('extract_conventions', { path: '.' });
            const conventions = JSON.parse(result);

            expect(conventions.testPattern).toContain('.test.');
        });
    });

    describe('Edge Cases', () => {
        it('should handle directory with few files', async () => {
            const result = await executeTool('extract_conventions', { path: 'src/ui' });
            const conventions = JSON.parse(result);

            expect(conventions).toBeDefined();
        });

        it('should return error for non-existent path', async () => {
            const result = await executeTool('extract_conventions', { path: './nonexistent_dir_12345' });

            expect(result).toContain('Error');
        });
    });

    describe('Output Format', () => {
        it('should return JSON with naming and style fields', async () => {
            const result = await executeTool('extract_conventions', { path: 'src' });
            const conventions = JSON.parse(result);

            expect(conventions).toHaveProperty('functionNaming');
            expect(conventions).toHaveProperty('indentStyle');
            expect(conventions).toHaveProperty('quoteStyle');
        });
    });
});
