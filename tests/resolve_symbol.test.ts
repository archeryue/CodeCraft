import { describe, it, expect } from 'vitest';
import { executeTool } from '../src/tools';

describe('resolve_symbol tool', () => {
    describe('Happy Path Tests', () => {
        it('should resolve locally defined function', async () => {
            const result = await executeTool('resolve_symbol', {
                symbol: 'executeTool',
                file: 'src/tools.ts'
            });
            const location = JSON.parse(result);

            expect(location).toHaveProperty('file');
            expect(location.file).toContain('tools.ts');
            expect(location).toHaveProperty('line');
            expect(location.line).toBeGreaterThan(0);
        });

        it('should resolve imported symbol to source file', async () => {
            // In agent.ts, executeTool is imported from tools.ts
            const result = await executeTool('resolve_symbol', {
                symbol: 'executeTool',
                file: 'src/agent.ts'
            });
            const location = JSON.parse(result);

            // Should resolve to tools.ts where it's defined
            expect(location.file).toContain('tools.ts');
        });

        it('should resolve class definitions', async () => {
            const result = await executeTool('resolve_symbol', {
                symbol: 'Agent',
                file: 'src/agent.ts'
            });
            const location = JSON.parse(result);

            expect(location.file).toContain('agent.ts');
            expect(location.kind).toBe('class');
        });

        it('should return file path and line number', async () => {
            const result = await executeTool('resolve_symbol', {
                symbol: 'TOOLS',
                file: 'src/tools.ts'
            });
            const location = JSON.parse(result);

            expect(location).toHaveProperty('file');
            expect(location).toHaveProperty('line');
            expect(typeof location.line).toBe('number');
        });
    });

    describe('Import Resolution Tests', () => {
        it('should resolve named imports', async () => {
            // SchemaType is imported from @google/generative-ai in tools.ts
            const result = await executeTool('resolve_symbol', {
                symbol: 'SchemaType',
                file: 'src/tools.ts'
            });
            const location = JSON.parse(result);

            // External package - should indicate it's from a package
            expect(location.external).toBe(true);
            expect(location.package).toContain('@google/generative-ai');
        });

        it('should resolve default imports', async () => {
            // path is a default import in tools.ts
            const result = await executeTool('resolve_symbol', {
                symbol: 'path',
                file: 'src/tools.ts'
            });
            const location = JSON.parse(result);

            expect(location.external).toBe(true);
            expect(location.package).toBe('path');
        });

        it('should resolve namespace imports', async () => {
            // fs is imported as * as fs in tools.ts
            const result = await executeTool('resolve_symbol', {
                symbol: 'fs',
                file: 'src/tools.ts'
            });
            const location = JSON.parse(result);

            expect(location.external).toBe(true);
            expect(location.package).toBe('fs');
        });
    });

    describe('Edge Cases', () => {
        it('should return null when symbol not found', async () => {
            const result = await executeTool('resolve_symbol', {
                symbol: 'nonExistentSymbol12345',
                file: 'src/tools.ts'
            });

            expect(result).toContain('not found');
        });

        it('should handle file not found', async () => {
            const result = await executeTool('resolve_symbol', {
                symbol: 'foo',
                file: 'nonexistent/file.ts'
            });

            expect(result).toContain('Error');
        });

        it('should handle external packages', async () => {
            const result = await executeTool('resolve_symbol', {
                symbol: 'GoogleGenerativeAI',
                file: 'src/agent.ts'
            });
            const location = JSON.parse(result);

            expect(location.external).toBe(true);
        });
    });

    describe('Output Format', () => {
        it('should return structured JSON with file, line, kind', async () => {
            const result = await executeTool('resolve_symbol', {
                symbol: 'executeTool',
                file: 'src/tools.ts'
            });
            const location = JSON.parse(result);

            expect(location).toHaveProperty('file');
            expect(location).toHaveProperty('line');
            expect(location).toHaveProperty('kind');
        });
    });
});
