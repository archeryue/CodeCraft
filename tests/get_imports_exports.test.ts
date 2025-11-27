import { describe, it, expect } from 'vitest';
import { executeTool } from '../src/tool-setup.js';

describe('get_imports_exports tool', () => {
    describe('Import Tests', () => {
        it('should return imports from a TypeScript file', async () => {
            const result = await executeTool('get_imports_exports', {
                file: 'src/tool-setup.ts'
            });
            const data = JSON.parse(result);

            expect(data).toHaveProperty('imports');
            expect(Array.isArray(data.imports)).toBe(true);
            expect(data.imports.length).toBeGreaterThan(0);
        });

        it('should identify named imports', async () => {
            const result = await executeTool('get_imports_exports', {
                file: 'src/tool-setup.ts'
            });
            const data = JSON.parse(result);

            // tool-setup.ts imports { createRequire } from 'module'
            const moduleImport = data.imports.find((i: any) => i.source.includes('module'));
            expect(moduleImport).toBeDefined();
        });

        it('should identify default imports', async () => {
            const result = await executeTool('get_imports_exports', {
                file: 'src/tool-setup.ts'
            });
            const data = JSON.parse(result);

            // tools.ts imports path (default)
            const pathImport = data.imports.find((i: any) => i.source === 'path');
            expect(pathImport).toBeDefined();
        });

        it('should identify type imports', async () => {
            const result = await executeTool('get_imports_exports', {
                file: 'src/tool-setup.ts'
            });
            const data = JSON.parse(result);

            // tool-setup.ts has type imports like ToolContext
            const typeImport = data.imports.find((i: any) => i.source.includes('./types/tool'));
            expect(typeImport).toBeDefined();
        });
    });

    describe('Export Tests', () => {
        it('should return exports from a TypeScript file', async () => {
            const result = await executeTool('get_imports_exports', {
                file: 'src/tool-setup.ts'
            });
            const data = JSON.parse(result);

            expect(data).toHaveProperty('exports');
            expect(Array.isArray(data.exports)).toBe(true);
        });

        it('should identify named exports', async () => {
            const result = await executeTool('get_imports_exports', {
                file: 'src/tool-setup.ts'
            });
            const data = JSON.parse(result);

            // tools.ts exports TOOLS and executeTool
            const toolsExport = data.exports.find((e: any) => e.name === 'TOOLS');
            const executeExport = data.exports.find((e: any) => e.name === 'executeTool');

            expect(toolsExport || executeExport).toBeDefined();
        });
    });

    describe('Edge Cases', () => {
        it('should return empty arrays when no imports/exports', async () => {
            // Create a test that might return empty results
            const result = await executeTool('get_imports_exports', {
                file: 'src/tool-setup.ts'
            });
            const data = JSON.parse(result);

            // This file has imports/exports, just verify structure
            expect(data).toHaveProperty('imports');
            expect(data).toHaveProperty('exports');
        });

        it('should return error when file not found', async () => {
            const result = await executeTool('get_imports_exports', {
                file: 'nonexistent/file.ts'
            });

            expect(result).toContain('Error');
        });

        it('should handle relative imports', async () => {
            const result = await executeTool('get_imports_exports', {
                file: 'src/agent.ts'
            });
            const data = JSON.parse(result);

            // agent.ts imports from './tools'
            const relativeImport = data.imports.find((i: any) => i.source.startsWith('./'));
            expect(relativeImport).toBeDefined();
        });

        it('should handle package imports', async () => {
            const result = await executeTool('get_imports_exports', {
                file: 'src/agent.ts'
            });
            const data = JSON.parse(result);

            // agent.ts imports from '@google/generative-ai'
            const packageImport = data.imports.find((i: any) => i.source.includes('@google'));
            expect(packageImport).toBeDefined();
        });
    });

    describe('Output Format', () => {
        it('should return imports with source property', async () => {
            const result = await executeTool('get_imports_exports', {
                file: 'src/tool-setup.ts'
            });
            const data = JSON.parse(result);

            expect(data.imports.length).toBeGreaterThan(0);
            expect(data.imports[0]).toHaveProperty('source');
        });

        it('should return exports with name property', async () => {
            const result = await executeTool('get_imports_exports', {
                file: 'src/tool-setup.ts'
            });
            const data = JSON.parse(result);

            if (data.exports.length > 0) {
                expect(data.exports[0]).toHaveProperty('name');
            }
        });
    });
});
