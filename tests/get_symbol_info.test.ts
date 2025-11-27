import { describe, it, expect } from 'vitest';
import { executeTool } from '../src/tool-setup.js';

describe('get_symbol_info tool', () => {
    describe('Happy Path Tests', () => {
        it('should return info for a function', async () => {
            const result = await executeTool('get_symbol_info', {
                file: 'src/tool-setup.ts',
                symbol: 'executeTool'
            });
            const info = JSON.parse(result);

            expect(info.name).toBe('executeTool');
            expect(info.kind).toBe('function');
            expect(info.line).toBeGreaterThan(0);
            expect(info.signature).toContain('executeTool');
        });

        it('should return info for a class', async () => {
            const result = await executeTool('get_symbol_info', {
                file: 'src/agent.ts',
                symbol: 'Agent'
            });
            const info = JSON.parse(result);

            expect(info.name).toBe('Agent');
            expect(info.kind).toBe('class');
        });

        it('should return info for an interface', async () => {
            const result = await executeTool('get_symbol_info', {
                file: 'src/intent_classifier.ts',
                symbol: 'Intent'
            });
            const info = JSON.parse(result);

            expect(info.name).toBe('Intent');
            expect(info.kind).toBe('interface');
        });

        it('should return parameters for functions', async () => {
            const result = await executeTool('get_symbol_info', {
                file: 'src/tool-setup.ts',
                symbol: 'executeTool'
            });
            const info = JSON.parse(result);

            expect(info.signature).toContain('name');
            expect(info.signature).toContain('args');
        });
    });

    describe('Edge Cases', () => {
        it('should return error when symbol not found', async () => {
            const result = await executeTool('get_symbol_info', {
                file: 'src/tool-setup.ts',
                symbol: 'nonExistentSymbol12345'
            });

            expect(result).toContain('Error');
            expect(result).toContain('not found');
        });

        it('should return error when file not found', async () => {
            const result = await executeTool('get_symbol_info', {
                file: 'nonexistent/file.ts',
                symbol: 'foo'
            });

            expect(result).toContain('Error');
        });

        it('should work with TypeScript files', async () => {
            const result = await executeTool('get_symbol_info', {
                file: 'src/tool-setup.ts',
                symbol: 'TOOLS'
            });
            const info = JSON.parse(result);

            expect(info.name).toBe('TOOLS');
        });
    });

    describe('Output Format', () => {
        it('should return structured JSON with required fields', async () => {
            const result = await executeTool('get_symbol_info', {
                file: 'src/tool-setup.ts',
                symbol: 'executeTool'
            });
            const info = JSON.parse(result);

            expect(info).toHaveProperty('name');
            expect(info).toHaveProperty('kind');
            expect(info).toHaveProperty('signature');
            expect(info).toHaveProperty('line');
            expect(info).toHaveProperty('file');
        });
    });
});
