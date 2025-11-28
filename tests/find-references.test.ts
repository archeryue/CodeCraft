import { describe, it, expect } from 'vitest';
import { executeTool } from '../src/tool-setup';

describe('find_references tool', () => {
    describe('Happy Path Tests', () => {
        it('should find all usages of a function', async () => {
            const result = await executeTool('FindReferences', {
                symbol: 'executor',
                path: 'src'
            });
            const references = JSON.parse(result);

            expect(Array.isArray(references)).toBe(true);
            expect(references.length).toBeGreaterThan(0);

            // Should find usage in agent.ts (where it's called)
            const agentRef = references.find((r: any) => r.file.includes('agent.ts'));
            expect(agentRef).toBeDefined();
        });

        it('should find all usages of a class', async () => {
            const result = await executeTool('FindReferences', {
                symbol: 'Agent',
                path: '.'
            });
            const references = JSON.parse(result);

            expect(references.length).toBeGreaterThan(0);

            // Should find in index.ts where Agent is used
            const indexRef = references.find((r: any) => r.file.includes('index.ts'));
            expect(indexRef).toBeDefined();
        });

        it('should find all usages of a constant', async () => {
            const result = await executeTool('FindReferences', {
                symbol: 'TOOLS',
                path: 'src'
            });
            const references = JSON.parse(result);

            expect(references.length).toBeGreaterThan(0);
        });

        it('should return file, line, column for each reference', async () => {
            const result = await executeTool('FindReferences', {
                symbol: 'executeTool',
                path: 'src'
            });
            const references = JSON.parse(result);

            if (references.length > 0) {
                const ref = references[0];
                expect(ref).toHaveProperty('file');
                expect(ref).toHaveProperty('line');
                expect(typeof ref.line).toBe('number');
            }
        });
    });

    describe('Search Scope Tests', () => {
        it('should search entire project by default', async () => {
            const result = await executeTool('FindReferences', {
                symbol: 'executeTool',
                path: '.'
            });
            const references = JSON.parse(result);

            // Should find in both src and tests
            const srcRefs = references.filter((r: any) => r.file.includes('src/'));
            const testRefs = references.filter((r: any) => r.file.includes('tests/'));

            expect(srcRefs.length).toBeGreaterThan(0);
            expect(testRefs.length).toBeGreaterThan(0);
        });

        it('should support limiting to specific directory', async () => {
            const result = await executeTool('FindReferences', {
                symbol: 'executeTool',
                path: 'src'
            });
            const references = JSON.parse(result);

            // Should only find in src directory
            const allInSrc = references.every((r: any) => r.file.includes('src/') || r.file.startsWith('src'));
            expect(allInSrc).toBe(true);
        });

        it('should find both definitions and usages', async () => {
            const result = await executeTool('FindReferences', {
                symbol: 'executeTool',
                path: 'src'
            });
            const references = JSON.parse(result);

            // Should include the definition in tools.ts
            const definition = references.find((r: any) =>
                r.file.includes('tool-setup.ts') && r.isDefinition === true
            );
            expect(definition).toBeDefined();
        });
    });

    describe('Edge Cases', () => {
        it('should return empty array when no references found', async () => {
            const result = await executeTool('FindReferences', {
                symbol: 'nonExistentSymbol12345',
                path: 'src'
            });
            const references = JSON.parse(result);

            expect(Array.isArray(references)).toBe(true);
            expect(references.length).toBe(0);
        });

        it('should handle symbols in different scopes', async () => {
            // 'name' is used in multiple places with different meanings
            const result = await executeTool('FindReferences', {
                symbol: 'name',
                path: 'src'
            });
            const references = JSON.parse(result);

            // Should find multiple references
            expect(references.length).toBeGreaterThan(1);
        });

        it('should exclude node_modules', async () => {
            const result = await executeTool('FindReferences', {
                symbol: 'describe',
                path: '.'
            });
            const references = JSON.parse(result);

            // Should not include node_modules
            const nodeModulesRef = references.find((r: any) => r.file.includes('node_modules'));
            expect(nodeModulesRef).toBeUndefined();
        });

        it('should return empty array for non-existent path', async () => {
            const result = await executeTool('FindReferences', {
                symbol: 'foo',
                path: './nonexistent_dir_12345'
            });

            const references = JSON.parse(result);
            expect(Array.isArray(references)).toBe(true);
            expect(references.length).toBe(0);
        });
    });

    describe('Output Format', () => {
        it('should return array of references', async () => {
            const result = await executeTool('FindReferences', {
                symbol: 'executeTool',
                path: 'src'
            });
            const references = JSON.parse(result);

            expect(Array.isArray(references)).toBe(true);
        });

        it('should include context (the line of code)', async () => {
            const result = await executeTool('FindReferences', {
                symbol: 'executeTool',
                path: 'src'
            });
            const references = JSON.parse(result);

            if (references.length > 0) {
                const ref = references[0];
                expect(ref).toHaveProperty('context');
                expect(typeof ref.context).toBe('string');
            }
        });
    });
});
