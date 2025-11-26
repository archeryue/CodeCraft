import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Guardrails Tests
 *
 * Tests the system that prevents excessive repetition and enforces limits.
 */

interface ToolCall {
    tool: string;
    params: Record<string, any>;
}

class Guardrails {
    private callHistory: ToolCall[] = [];
    private fileReadCounts: Map<string, number> = new Map();

    recordCall(call: ToolCall): void {
        this.callHistory.push(call);

        if (call.tool === 'read_file' && call.params.path) {
            const path = call.params.path;
            this.fileReadCounts.set(path, (this.fileReadCounts.get(path) || 0) + 1);
        }
    }

    shouldBlockCall(call: ToolCall): boolean {
        // Block if reading same file 3+ times
        if (call.tool === 'read_file' && call.params.path) {
            const count = this.fileReadCounts.get(call.params.path) || 0;
            if (count >= 3) {
                return true;
            }
        }

        // Block if alternating between same 2 tools 3+ times
        if (this.detectAlternation()) {
            return true;
        }

        return false;
    }

    private detectAlternation(): boolean {
        if (this.callHistory.length < 5) return false;

        const recent5 = this.callHistory.slice(-5);
        const tool1 = recent5[0].tool;
        const tool2 = recent5[1].tool;

        if (tool1 === tool2) return false;

        const pattern =
            recent5[2].tool === tool1 &&
            recent5[3].tool === tool2 &&
            recent5[4].tool === tool1;

        return pattern;
    }

    isProgressBeingMade(): boolean {
        if (this.callHistory.length < 3) return true;

        const recent = this.callHistory.slice(-3);
        const tools = recent.map(c => c.tool);
        const uniqueTools = new Set(tools);

        // If all 3 calls are the same tool, likely not making progress
        if (uniqueTools.size === 1) {
            return false;
        }

        return true;
    }

    shouldEscalateToUser(iterationCount: number): boolean {
        // Escalate at 8 iterations (before hitting hard limit of 10)
        return iterationCount >= 8;
    }

    reset(): void {
        this.callHistory = [];
        this.fileReadCounts.clear();
    }

    getFileReadCount(path: string): number {
        return this.fileReadCounts.get(path) || 0;
    }

    getAllowedFiles(files: string[]): string[] {
        return files.filter(f => this.getFileReadCount(f) < 3);
    }
}

describe('Guardrails', () => {
    let guardrails: Guardrails;

    beforeEach(() => {
        guardrails = new Guardrails();
    });

    describe('Test Cases', () => {
        it('Should limit consecutive reads of same file to 3', () => {
            guardrails.recordCall({ tool: 'read_file', params: { path: 'foo.ts' } });
            guardrails.recordCall({ tool: 'read_file', params: { path: 'foo.ts' } });
            guardrails.recordCall({ tool: 'read_file', params: { path: 'foo.ts' } });

            const shouldBlock = guardrails.shouldBlockCall({
                tool: 'read_file',
                params: { path: 'foo.ts' }
            });

            expect(shouldBlock).toBe(true);
            expect(guardrails.getFileReadCount('foo.ts')).toBe(3);
        });

        it('Should detect when no progress is being made', () => {
            guardrails.recordCall({ tool: 'read_file', params: { path: 'a.ts' } });
            guardrails.recordCall({ tool: 'read_file', params: { path: 'a.ts' } });
            guardrails.recordCall({ tool: 'read_file', params: { path: 'a.ts' } });

            const isProgressing = guardrails.isProgressBeingMade();
            expect(isProgressing).toBe(false);
        });

        it('Should escalate to user before hitting hard limit', () => {
            expect(guardrails.shouldEscalateToUser(7)).toBe(false);
            expect(guardrails.shouldEscalateToUser(8)).toBe(true);
            expect(guardrails.shouldEscalateToUser(9)).toBe(true);
        });

        it('Should prevent infinite loops between 2 tools', () => {
            guardrails.recordCall({ tool: 'grep', params: {} });
            guardrails.recordCall({ tool: 'list_directory', params: {} });
            guardrails.recordCall({ tool: 'grep', params: {} });
            guardrails.recordCall({ tool: 'list_directory', params: {} });
            guardrails.recordCall({ tool: 'grep', params: {} });

            // Should detect alternation
            const shouldBlock = guardrails.shouldBlockCall({ tool: 'list_directory', params: {} });
            expect(shouldBlock).toBe(true);
        });
    });

    describe('Edge Cases', () => {
        it('Should allow reading different files (not same file repeatedly)', () => {
            guardrails.recordCall({ tool: 'read_file', params: { path: 'a.ts' } });
            guardrails.recordCall({ tool: 'read_file', params: { path: 'b.ts' } });
            guardrails.recordCall({ tool: 'read_file', params: { path: 'c.ts' } });

            const shouldBlockA = guardrails.shouldBlockCall({
                tool: 'read_file',
                params: { path: 'a.ts' }
            });

            const shouldBlockD = guardrails.shouldBlockCall({
                tool: 'read_file',
                params: { path: 'd.ts' }
            });

            expect(shouldBlockA).toBe(false); // Only read once
            expect(shouldBlockD).toBe(false); // Never read
        });

        it('Should allow legitimate multi-step workflows', () => {
            guardrails.recordCall({ tool: 'read_file', params: { path: 'foo.ts' } });
            guardrails.recordCall({ tool: 'edit_file', params: { path: 'foo.ts' } });
            guardrails.recordCall({ tool: 'run_command', params: { command: 'npm test' } });

            const isProgressing = guardrails.isProgressBeingMade();
            expect(isProgressing).toBe(true); // Different tools = making progress
        });

        it('Should NOT overly restrict valid agent behavior', () => {
            // Reading 2 times should be OK
            guardrails.recordCall({ tool: 'read_file', params: { path: 'foo.ts' } });
            guardrails.recordCall({ tool: 'read_file', params: { path: 'foo.ts' } });

            const shouldBlock = guardrails.shouldBlockCall({
                tool: 'read_file',
                params: { path: 'foo.ts' }
            });

            expect(shouldBlock).toBe(false); // 3rd call is allowed (block on 4th)
        });
    });

    describe('Reset and State Management', () => {
        it('Should reset state when new user message arrives', () => {
            guardrails.recordCall({ tool: 'read_file', params: { path: 'foo.ts' } });
            guardrails.recordCall({ tool: 'read_file', params: { path: 'foo.ts' } });

            expect(guardrails.getFileReadCount('foo.ts')).toBe(2);

            guardrails.reset();

            expect(guardrails.getFileReadCount('foo.ts')).toBe(0);
        });

        it('Should track multiple files independently', () => {
            guardrails.recordCall({ tool: 'read_file', params: { path: 'a.ts' } });
            guardrails.recordCall({ tool: 'read_file', params: { path: 'a.ts' } });
            guardrails.recordCall({ tool: 'read_file', params: { path: 'b.ts' } });

            expect(guardrails.getFileReadCount('a.ts')).toBe(2);
            expect(guardrails.getFileReadCount('b.ts')).toBe(1);
        });

        it('Should provide list of allowed files', () => {
            guardrails.recordCall({ tool: 'read_file', params: { path: 'a.ts' } });
            guardrails.recordCall({ tool: 'read_file', params: { path: 'a.ts' } });
            guardrails.recordCall({ tool: 'read_file', params: { path: 'a.ts' } });
            guardrails.recordCall({ tool: 'read_file', params: { path: 'b.ts' } });

            const allowed = guardrails.getAllowedFiles(['a.ts', 'b.ts', 'c.ts']);

            expect(allowed).not.toContain('a.ts'); // Read 3 times, blocked
            expect(allowed).toContain('b.ts'); // Read 1 time, allowed
            expect(allowed).toContain('c.ts'); // Never read, allowed
        });
    });
});
