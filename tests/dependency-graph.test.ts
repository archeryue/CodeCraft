import { describe, it, expect } from 'vitest';
import { executeTool } from '../src/tool-setup';

describe('build_dependency_graph tool', () => {
    describe('Happy Path Tests', () => {
        it('should return dependency graph for a directory', async () => {
            const result = await executeTool('BuildDependencyGraph', { path: 'src' });
            const graph = JSON.parse(result);

            expect(graph).toHaveProperty('nodes');
            expect(graph).toHaveProperty('edges');
            expect(Array.isArray(graph.nodes)).toBe(true);
            expect(Array.isArray(graph.edges)).toBe(true);
        });

        it('should identify all imports for each file', async () => {
            const result = await executeTool('BuildDependencyGraph', { path: 'src' });
            const graph = JSON.parse(result);

            // agent.ts imports from tools.ts
            const agentEdges = graph.edges.filter((e: any) => e.from.includes('agent.ts'));
            expect(agentEdges.length).toBeGreaterThan(0);
        });

        it('should identify all exports for each file', async () => {
            const result = await executeTool('BuildDependencyGraph', { path: 'src' });
            const graph = JSON.parse(result);

            // tools.ts should be in nodes and have exports
            const toolsNode = graph.nodes.find((n: any) => n.file.includes('tool-setup.ts'));
            expect(toolsNode).toBeDefined();
            expect(toolsNode.exports).toBeDefined();
        });

        it('should resolve relative imports to full paths', async () => {
            const result = await executeTool('BuildDependencyGraph', { path: 'src' });
            const graph = JSON.parse(result);

            // Edges should have full paths, not relative ./tools
            const hasRelativePath = graph.edges.some((e: any) => e.to.startsWith('./'));
            expect(hasRelativePath).toBe(false);
        });
    });

    describe('Graph Structure Tests', () => {
        it('should support forward lookup (file → what it imports)', async () => {
            const result = await executeTool('BuildDependencyGraph', { path: 'src' });
            const graph = JSON.parse(result);

            // Should be able to find what agent.ts imports
            const agentImports = graph.edges
                .filter((e: any) => e.from.includes('agent.ts'))
                .map((e: any) => e.to);

            expect(agentImports.length).toBeGreaterThan(0);
        });

        it('should support reverse lookup (file → what imports it)', async () => {
            const result = await executeTool('BuildDependencyGraph', { path: 'src' });
            const graph = JSON.parse(result);

            // Should be able to find what imports tools.ts
            const toolsImportedBy = graph.edges
                .filter((e: any) => e.to.includes('tool-setup.ts'))
                .map((e: any) => e.from);

            // agent.ts imports tools.ts
            expect(toolsImportedBy.some((f: string) => f.includes('agent.ts'))).toBe(true);
        });

        it('should handle circular dependencies gracefully', async () => {
            // This shouldn't throw or hang
            const result = await executeTool('BuildDependencyGraph', { path: 'src' });
            const graph = JSON.parse(result);

            expect(graph).toBeDefined();
            expect(graph.nodes).toBeDefined();
        });
    });

    describe('Edge Cases', () => {
        it('should mark node_modules imports as external', async () => {
            const result = await executeTool('BuildDependencyGraph', { path: 'src' });
            const graph = JSON.parse(result);

            // External imports like @google/generative-ai should be marked as external
            const externalEdges = graph.edges.filter((e: any) => e.external === true);
            expect(externalEdges.length).toBeGreaterThan(0);
        });

        it('should handle missing files gracefully', async () => {
            // Should not throw even if imported file doesn't exist
            const result = await executeTool('BuildDependencyGraph', { path: 'src' });
            // Check for actual error message, not just "Error" (which matches error_recovery.ts filename)
            expect(result).not.toMatch(/^Error:/);
        });

        it('should return error for non-existent directory', async () => {
            const result = await executeTool('BuildDependencyGraph', { path: './nonexistent_dir_12345' });
            expect(result).toContain('Error');
        });
    });

    describe('Output Format', () => {
        it('should return JSON with nodes and edges arrays', async () => {
            const result = await executeTool('BuildDependencyGraph', { path: 'src' });
            const graph = JSON.parse(result);

            expect(graph).toHaveProperty('nodes');
            expect(graph).toHaveProperty('edges');
            expect(Array.isArray(graph.nodes)).toBe(true);
            expect(Array.isArray(graph.edges)).toBe(true);
        });

        it('should include file path and exports in each node', async () => {
            const result = await executeTool('BuildDependencyGraph', { path: 'src' });
            const graph = JSON.parse(result);

            const node = graph.nodes[0];
            expect(node).toHaveProperty('file');
            expect(node).toHaveProperty('exports');
        });

        it('should include from, to, and symbols in each edge', async () => {
            const result = await executeTool('BuildDependencyGraph', { path: 'src' });
            const graph = JSON.parse(result);

            if (graph.edges.length > 0) {
                const edge = graph.edges[0];
                expect(edge).toHaveProperty('from');
                expect(edge).toHaveProperty('to');
                expect(edge).toHaveProperty('symbols');
            }
        });
    });
});
