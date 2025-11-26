import { describe, it, expect, beforeAll } from 'vitest';
import { spawn } from 'child_process';

// Helper to run CLI with a query and capture output
function runCLI(query: string, timeoutMs = 60000): Promise<string> {
    return new Promise((resolve, reject) => {
        const proc = spawn('npx', ['tsx', 'index.ts'], {
            cwd: process.cwd(),
            env: process.env,
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let output = '';
        let stderr = '';
        let resolved = false;

        proc.stdout.on('data', (data) => {
            output += data.toString();
            // Check if we got a complete response (look for prompt or specific patterns)
            if (output.includes('\n> ') && output.split('\n> ').length > 2) {
                // Got response after initial prompt, resolve
                if (!resolved) {
                    resolved = true;
                    proc.kill();
                    resolve(output + stderr);
                }
            }
        });

        proc.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        // Send query
        proc.stdin.write(query + '\n');

        // Force exit after some time if response received
        setTimeout(() => {
            if (!resolved && (output.length > 200 || output.includes('[Tool Call]'))) {
                resolved = true;
                proc.kill();
                resolve(output + stderr);
            }
        }, 45000);

        const timeout = setTimeout(() => {
            if (!resolved) {
                proc.kill();
                // Return whatever output we got instead of rejecting
                resolve(output + stderr);
            }
        }, timeoutMs);

        proc.on('close', () => {
            clearTimeout(timeout);
            if (!resolved) {
                resolved = true;
                resolve(output + stderr);
            }
        });

        proc.on('error', (err) => {
            clearTimeout(timeout);
            if (!resolved) {
                reject(err);
            }
        });
    });
}

describe('E2E Tests', () => {
    beforeAll(() => {
        // Verify API key is set
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY not set');
        }
    });

    describe('glob tool', () => {
        it('should find test files when asked', async () => {
            const output = await runCLI('use glob to find all .test.ts files in tests folder');

            // Verify glob tool was called
            expect(output).toContain('[Tool Call] glob');

            // Verify actual results - should mention test files
            expect(output).toMatch(/\.test\.ts/);
        }, 90000);
    });

    describe('grep tool', () => {
        it('should search file contents', async () => {
            const output = await runCLI('use the grep tool to search for "SchemaType" in src/tools.ts');

            // Verify grep tool was called
            expect(output).toContain('[Tool Call] grep');

            // Verify results mention the pattern
            expect(output).toMatch(/SchemaType|tools\.ts/i);
        }, 90000);
    });

    describe('list_directory tool', () => {
        it('should list directory contents', async () => {
            const output = await runCLI('use list_directory to show whats in src folder');

            // Verify tool was called
            expect(output).toContain('[Tool Call] list_directory');

            // Verify actual files are mentioned
            expect(output).toMatch(/agent\.ts|tools\.ts|intent_classifier\.ts/);
        }, 90000);
    });

    describe('get_symbol_info tool', () => {
        it('should return symbol information', async () => {
            const output = await runCLI('use get_symbol_info to look up the TOOLS constant in src/tools.ts');

            // Verify tool was called
            expect(output).toContain('[Tool Call] get_symbol_info');

            // Verify response contains relevant info
            expect(output).toMatch(/TOOLS|variable|tools\.ts/i);
        }, 90000);
    });

    describe('get_imports_exports tool', () => {
        it('should analyze imports and exports', async () => {
            const output = await runCLI('use get_imports_exports to analyze src/agent.ts');

            // Verify tool was called
            expect(output).toContain('[Tool Call] get_imports_exports');

            // Verify response mentions actual imports
            expect(output).toMatch(/import|export|@google|GoogleGenerativeAI/i);
        }, 90000);
    });
});
