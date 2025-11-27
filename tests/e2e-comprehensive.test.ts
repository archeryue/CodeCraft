// tests/e2e-comprehensive.test.ts
// Comprehensive End-to-End Test Suite for CodeCraft

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
            // Check if we got a complete response
            if (output.includes('\n> ') && output.split('\n> ').length > 2) {
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

describe('Comprehensive E2E Tests', () => {
    beforeAll(() => {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY not set - required for E2E tests');
        }
    });

    describe('File Operations', () => {
        it('should read files with read_file tool', async () => {
            const output = await runCLI('read the package.json file');

            expect(output).toMatch(/Tool Call.*read_file/i);
            expect(output).toMatch(/package\.json|codecraft|name/i);
        }, 90000);

        it('should list directory contents', async () => {
            const output = await runCLI('list files in the src directory');

            expect(output).toMatch(/Tool Call.*list_directory/i);
            expect(output).toMatch(/agent\.ts|tool-setup\.ts/i);
        }, 90000);

        it('should search with glob patterns', async () => {
            const output = await runCLI('find all TypeScript files in tests using glob');

            expect(output).toMatch(/Tool Call.*glob/i);
            expect(output).toMatch(/\.test\.ts/i);
        }, 90000);

        it('should search file contents with grep', async () => {
            const output = await runCLI('search for the word "Agent" in src files using grep');

            expect(output).toMatch(/Tool Call.*grep/i);
            expect(output).toMatch(/Agent|src/i);
        }, 90000);
    });

    describe('Code Analysis Tools', () => {
        it('should get codebase map', async () => {
            const output = await runCLI('show me the codebase structure using get_codebase_map');

            expect(output).toMatch(/Tool Call.*get_codebase_map/i);
            expect(output).toMatch(/function|class|export/i);
        }, 90000);

        it('should search code symbols', async () => {
            const output = await runCLI('use search_code to find the Agent class');

            expect(output).toMatch(/Tool Call.*search_code/i);
            expect(output).toMatch(/Agent|class/i);
        }, 90000);

        it('should analyze imports and exports', async () => {
            const output = await runCLI('analyze imports in src/agent.ts using get_imports_exports');

            expect(output).toMatch(/Tool Call.*get_imports_exports/i);
            expect(output).toMatch(/import|export|@google/i);
        }, 90000);

        it('should get symbol information', async () => {
            const output = await runCLI('get info about the TOOLS symbol in src/tool-setup.ts using get_symbol_info');

            expect(output).toMatch(/Tool Call.*get_symbol_info/i);
            expect(output).toMatch(/TOOLS|const|variable/i);
        }, 90000);
    });

    describe('Project Analysis', () => {
        it('should detect project type', async () => {
            const output = await runCLI('detect the project type using detect_project_type');

            expect(output).toMatch(/Tool Call.*detect_project_type/i);
            expect(output).toMatch(/node|typescript|vitest/i);
        }, 90000);

        it('should extract coding conventions', async () => {
            const output = await runCLI('extract coding conventions using extract_conventions');

            expect(output).toMatch(/Tool Call.*extract_conventions/i);
            expect(output).toMatch(/indent|quote|semicolon/i);
        }, 90000);

        it('should get project overview', async () => {
            const output = await runCLI('give me a project overview using get_project_overview');

            expect(output).toMatch(/Tool Call.*get_project_overview/i);
            expect(output).toMatch(/CodeCraft|project|overview/i);
        }, 90000);
    });

    describe('Multi-Step Workflows', () => {
        it('should handle multiple tool calls in sequence', async () => {
            const output = await runCLI('first list files in src, then read agent.ts');

            // Should call both tools
            expect(output).toMatch(/Tool Call.*list_directory/i);
            expect(output).toMatch(/Tool Call.*read_file/i);
            expect(output).toMatch(/agent\.ts/i);
        }, 120000);

        it('should use todo_write for multi-step tasks', async () => {
            const output = await runCLI('create a plan to refactor the agent using todo_write');

            expect(output).toMatch(/Tool Call.*todo_write/i);
            expect(output).toMatch(/todo|task|plan/i);
        }, 90000);
    });

    describe('Command Execution', () => {
        it('should execute commands with run_command', async () => {
            const output = await runCLI('run the command "echo hello world" using run_command');

            expect(output).toMatch(/Tool Call.*run_command/i);
            expect(output).toMatch(/hello world|executed/i);
        }, 90000);

        it('should list directory with ls command', async () => {
            const output = await runCLI('use run_command to run "ls src"');

            expect(output).toMatch(/Tool Call.*run_command/i);
            expect(output).toMatch(/agent\.ts|tool-setup\.ts/i);
        }, 90000);
    });

    describe('Error Handling', () => {
        it('should handle non-existent files gracefully', async () => {
            const output = await runCLI('read the file that-does-not-exist.txt');

            expect(output).toMatch(/Tool Call.*read_file/i);
            expect(output).toMatch(/not found|error|doesn't exist/i);
        }, 90000);

        it('should handle invalid glob patterns', async () => {
            const output = await runCLI('use glob to find files with pattern "["');

            expect(output).toMatch(/Tool Call.*glob/i);
            // Should either error or return empty results
            expect(output).toMatch(/error|no files|empty|\[\]/i);
        }, 90000);
    });

    describe('Integration Scenarios', () => {
        it('should answer questions about the codebase', async () => {
            const output = await runCLI('what is the Agent class and where is it defined?');

            // Should use multiple tools to answer
            expect(output).toMatch(/Tool Call.*(search_code|get_symbol_info|grep)/i);
            expect(output).toMatch(/Agent.*class|src\/agent\.ts/i);
        }, 120000);

        it('should help with refactoring tasks', async () => {
            const output = await runCLI('I want to refactor the executor - show me where it is used');

            expect(output).toMatch(/Tool Call.*(find_references|grep|search_code)/i);
            expect(output).toMatch(/executor|agent\.ts/i);
        }, 120000);

        it('should analyze project structure', async () => {
            const output = await runCLI('explain the project architecture');

            // Should use multiple analysis tools
            expect(output).toMatch(/Tool Call.*(get_project_overview|get_codebase_map|detect_project_type)/i);
            expect(output).toMatch(/architecture|structure|typescript|node/i);
        }, 120000);
    });

    describe('Session Management', () => {
        it('should maintain context across turns', async () => {
            const output = await runCLI('read package.json, then tell me the project name');

            expect(output).toMatch(/Tool Call.*read_file/i);
            expect(output).toMatch(/codecraft|project.*name/i);
        }, 120000);

        it('should handle conversational queries', async () => {
            const output = await runCLI('hello, can you help me understand this codebase?');

            // Should respond conversationally and offer to help
            expect(output).toMatch(/hello|hi|help|assist|codebase/i);
        }, 90000);
    });

    describe('Tool Selection Intelligence', () => {
        it('should choose grep for text search', async () => {
            const output = await runCLI('find error messages containing "not found"');

            expect(output).toMatch(/Tool Call.*grep/i);
        }, 90000);

        it('should choose search_code for code search', async () => {
            const output = await runCLI('find all class definitions');

            expect(output).toMatch(/Tool Call.*search_code/i);
        }, 90000);

        it('should choose get_imports_exports for dependency analysis', async () => {
            const output = await runCLI('what does agent.ts import?');

            expect(output).toMatch(/Tool Call.*get_imports_exports/i);
            expect(output).toMatch(/import|@google|tool-setup/i);
        }, 90000);
    });
});
