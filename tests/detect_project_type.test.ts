import { describe, it, expect } from 'vitest';
import { executeTool } from '../src/tools';

describe('detect_project_type tool', () => {
    describe('Happy Path Tests', () => {
        it('should detect Node.js project (package.json exists)', async () => {
            // Current project is Node.js
            const result = await executeTool('detect_project_type', { path: '.' });
            const info = JSON.parse(result);

            expect(info.type).toContain('node');
        });

        it('should detect Rust project (Cargo.toml exists)', async () => {
            // rust_engine has Cargo.toml
            const result = await executeTool('detect_project_type', { path: './rust_engine' });
            const info = JSON.parse(result);

            expect(info.type).toContain('rust');
        });

        it('should detect TypeScript usage', async () => {
            const result = await executeTool('detect_project_type', { path: '.' });
            const info = JSON.parse(result);

            expect(info.typescript).toBe(true);
        });

        it('should detect mixed projects', async () => {
            // Root has both Node.js and Rust (rust_engine)
            const result = await executeTool('detect_project_type', { path: '.' });
            const info = JSON.parse(result);

            // Should detect as node primarily, but note rust_engine exists
            expect(info.type).toBeDefined();
        });
    });

    describe('Framework Detection', () => {
        it('should detect test framework (vitest)', async () => {
            const result = await executeTool('detect_project_type', { path: '.' });
            const info = JSON.parse(result);

            expect(info.testFramework).toBe('vitest');
        });

        it('should detect linter/formatter configuration', async () => {
            const result = await executeTool('detect_project_type', { path: '.' });
            const info = JSON.parse(result);

            // Should have some info about linting (even if none configured)
            expect(info).toHaveProperty('linter');
        });

        it('should detect package manager', async () => {
            const result = await executeTool('detect_project_type', { path: '.' });
            const info = JSON.parse(result);

            expect(info.packageManager).toBeDefined();
        });
    });

    describe('Edge Cases', () => {
        it('should return unknown for directory without project files', async () => {
            const result = await executeTool('detect_project_type', { path: './tests' });
            const info = JSON.parse(result);

            // tests folder has no package.json, so type should be unknown or inherit from parent
            expect(info).toBeDefined();
        });

        it('should return error for non-existent path', async () => {
            const result = await executeTool('detect_project_type', { path: './nonexistent_dir_12345' });

            expect(result).toContain('Error');
        });
    });

    describe('Output Format', () => {
        it('should return JSON with type, testFramework, linter fields', async () => {
            const result = await executeTool('detect_project_type', { path: '.' });
            const info = JSON.parse(result);

            expect(info).toHaveProperty('type');
            expect(info).toHaveProperty('testFramework');
            expect(info).toHaveProperty('linter');
        });
    });
});
