import { describe, it, expect } from 'vitest';
import { executeTool } from '../src/tool-setup.js';

describe('get_project_overview tool', () => {
    describe('Happy Path Tests', () => {
        it('should return overview for current project', async () => {
            const result = await executeTool('get_project_overview', { path: '.' });
            const overview = JSON.parse(result);

            expect(overview).toHaveProperty('purpose');
            expect(overview).toHaveProperty('techStack');
            expect(overview).toHaveProperty('sources');
        });

        it('should read package.json metadata', async () => {
            const result = await executeTool('get_project_overview', { path: '.' });
            const overview = JSON.parse(result);

            expect(overview.techStack).toHaveProperty('name');
            expect(overview.sources).toContain('package.json');
        });

        it('should detect entry points', async () => {
            const result = await executeTool('get_project_overview', { path: '.' });
            const overview = JSON.parse(result);

            expect(overview).toHaveProperty('entryPoints');
            expect(Array.isArray(overview.entryPoints)).toBe(true);
        });

        it('should include tech stack information', async () => {
            const result = await executeTool('get_project_overview', { path: '.' });
            const overview = JSON.parse(result);

            expect(overview.techStack).toBeDefined();
            expect(overview.techStack.languages).toBeDefined();
        });
    });

    describe('Content Detection Tests', () => {
        it('should extract project purpose', async () => {
            const result = await executeTool('get_project_overview', { path: '.' });
            const overview = JSON.parse(result);

            expect(overview.purpose).toBeDefined();
            expect(typeof overview.purpose).toBe('string');
            expect(overview.purpose.length).toBeGreaterThan(0);
        });

        it('should identify architecture if documented', async () => {
            const result = await executeTool('get_project_overview', { path: '.' });
            const overview = JSON.parse(result);

            // Should have architecture section
            expect(overview.architecture).toBeDefined();
        });

        it('should find usage instructions', async () => {
            const result = await executeTool('get_project_overview', { path: '.' });
            const overview = JSON.parse(result);

            expect(overview.usage).toBeDefined();
        });

        it('should detect key technologies for CodeCraft', async () => {
            const result = await executeTool('get_project_overview', { path: '.' });
            const overview = JSON.parse(result);

            // CodeCraft uses TypeScript and Rust
            const langs = overview.techStack.languages || [];
            const hasTypeScript = langs.some((l: string) => l.toLowerCase().includes('typescript'));
            const hasRust = langs.some((l: string) => l.toLowerCase().includes('rust'));

            expect(hasTypeScript || hasRust).toBe(true);
        });
    });

    describe('Edge Cases', () => {
        it('should handle non-existent path gracefully', async () => {
            const result = await executeTool('get_project_overview', { path: './nonexistent_12345' });

            expect(result).toContain('Error');
        });

        it('should work even if some sources missing', async () => {
            // Even if some docs are missing, should return what's available
            const result = await executeTool('get_project_overview', { path: '.' });

            // Should not throw, should return valid JSON
            expect(() => JSON.parse(result)).not.toThrow();
        });
    });

    describe('Output Format Tests', () => {
        it('should return structured JSON', async () => {
            const result = await executeTool('get_project_overview', { path: '.' });

            expect(() => JSON.parse(result)).not.toThrow();
            const overview = JSON.parse(result);
            expect(typeof overview).toBe('object');
        });

        it('should include source attribution', async () => {
            const result = await executeTool('get_project_overview', { path: '.' });
            const overview = JSON.parse(result);

            expect(overview.sources).toBeDefined();
            expect(Array.isArray(overview.sources)).toBe(true);
            expect(overview.sources.length).toBeGreaterThan(0);
        });
    });

    describe('Integration Tests', () => {
        it('should correctly identify CodeCraft project', async () => {
            const result = await executeTool('get_project_overview', { path: '.' });
            const overview = JSON.parse(result);

            // Should mention key CodeCraft characteristics
            const overviewStr = JSON.stringify(overview).toLowerCase();

            // Look for key terms (at least one should be present)
            const hasCodeCraft = overviewStr.includes('codecraft');
            const hasAgent = overviewStr.includes('agent');
            const hasCLI = overviewStr.includes('cli');

            expect(hasCodeCraft || hasAgent || hasCLI).toBe(true);
        });

        it('should detect hybrid architecture', async () => {
            const result = await executeTool('get_project_overview', { path: '.' });
            const overview = JSON.parse(result);

            const overviewStr = JSON.stringify(overview).toLowerCase();

            // Should mention Rust or hybrid architecture
            const hasRust = overviewStr.includes('rust');
            const hasHybrid = overviewStr.includes('hybrid');

            expect(hasRust || hasHybrid).toBe(true);
        });
    });
});
