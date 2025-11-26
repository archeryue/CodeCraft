import { describe, it, expect, beforeEach } from 'vitest';
import { ErrorRecovery } from '../src/error_recovery.js';

/**
 * Better Error Messages Tests
 *
 * Tests the system that generates helpful messages when hitting iteration limit
 * instead of returning empty responses.
 */

interface ToolCall {
    tool: string;
    params: Record<string, any>;
}

class ErrorMessageGenerator {
    generateIterationLimitMessage(toolCalls: ToolCall[], loopDetected: boolean): string {
        const summary = this.summarizeToolCalls(toolCalls);
        const issue = loopDetected
            ? "Loop detected: Repeatedly using same tools without making progress"
            : "Iteration limit reached without completing task";

        const suggestion = this.getSuggestion(toolCalls);

        return `I attempted to complete your request but encountered difficulties:

**Attempted:**
${summary}

**Issue:**
${issue}

**Suggestion:**
${suggestion}

Would you like me to try that, or would you prefer to provide more guidance?`;
    }

    private summarizeToolCalls(toolCalls: ToolCall[]): string {
        const summary: Record<string, number> = {};

        for (const call of toolCalls) {
            const key = call.tool;
            summary[key] = (summary[key] || 0) + 1;
        }

        const lines: string[] = [];
        for (const [tool, count] of Object.entries(summary)) {
            if (count === 1) {
                lines.push(`- Called ${tool}`);
            } else {
                lines.push(`- Called ${tool} ${count} times`);
            }
        }

        return lines.join('\n');
    }

    private getSuggestion(toolCalls: ToolCall[]): string {
        const lastCall = toolCalls[toolCalls.length - 1];

        if (!lastCall) {
            return "Try a different approach or ask for clarification";
        }

        switch (lastCall.tool) {
            case 'read_file':
                return "Try using grep to search for specific patterns instead of reading entire files";
            case 'grep':
            case 'search_code':
                return "Try reading the full file or asking for clarification about what to search for";
            case 'edit_file':
                return "Re-read the file to verify the exact content before attempting to edit";
            default:
                return "Let me know what you'd like me to focus on, or try a different approach";
        }
    }

    identifyBlocker(toolCalls: ToolCall[]): string | null {
        // Check for repeated failures with same file
        const readCalls = toolCalls.filter(c => c.tool === 'read_file');
        if (readCalls.length >= 3) {
            const paths = readCalls.map(c => c.params.path);
            const uniquePaths = new Set(paths);
            if (uniquePaths.size === 1) {
                return `Repeatedly trying to read ${Array.from(uniquePaths)[0]} - file may not exist or path may be incorrect`;
            }
        }

        // Check for edit failures
        const editCalls = toolCalls.filter(c => c.tool === 'edit_file');
        if (editCalls.length >= 2) {
            return "Multiple edit attempts failed - the exact string to replace may not match the file content";
        }

        return null;
    }
}

describe('Better Error Messages', () => {
    let generator: ErrorMessageGenerator;
    let recovery: ErrorRecovery;

    beforeEach(() => {
        generator = new ErrorMessageGenerator();
        recovery = new ErrorRecovery();
    });

    describe('Test Cases', () => {
        it('When hitting 10 iteration limit, should return structured message', () => {
            const toolCalls: ToolCall[] = [
                { tool: 'read_file', params: { path: 'src/agent.ts', offset: 70, limit: 30 } },
                { tool: 'read_file', params: { path: 'src/agent.ts', offset: 40, limit: 10 } },
                { tool: 'read_file', params: { path: 'src/agent.ts', offset: 22, limit: 20 } },
                { tool: 'read_file', params: { path: 'src/agent.ts', offset: 34, limit: 15 } },
                { tool: 'edit_file', params: { path: 'src/agent.ts', old_string: 'foo', new_string: 'bar' } },
                { tool: 'read_file', params: { path: 'src/agent.ts', offset: 51, limit: 1 } },
                { tool: 'read_file', params: { path: 'src/agent.ts' } },
            ];

            const message = generator.generateIterationLimitMessage(toolCalls, true);

            // Should contain all required sections
            expect(message).toContain("**Attempted:**");
            expect(message).toContain("**Issue:**");
            expect(message).toContain("**Suggestion:**");

            // Should not be empty
            expect(message.length).toBeGreaterThan(50);
        });

        it('Should track and summarize tool calls made', () => {
            const toolCalls: ToolCall[] = [
                { tool: 'read_file', params: { path: 'a.ts' } },
                { tool: 'read_file', params: { path: 'b.ts' } },
                { tool: 'read_file', params: { path: 'c.ts' } },
                { tool: 'edit_file', params: { path: 'd.ts', old_string: '', new_string: '' } },
                { tool: 'edit_file', params: { path: 'e.ts', old_string: '', new_string: '' } },
            ];

            const message = generator.generateIterationLimitMessage(toolCalls, false);

            expect(message).toContain("read_file 3 times");
            expect(message).toContain("edit_file 2 times");
        });

        it('Should identify the specific blocker (file not found, string not found, etc.)', () => {
            const toolCalls: ToolCall[] = [
                { tool: 'read_file', params: { path: 'nonexistent.ts' } },
                { tool: 'read_file', params: { path: 'nonexistent.ts' } },
                { tool: 'read_file', params: { path: 'nonexistent.ts' } },
            ];

            const blocker = generator.identifyBlocker(toolCalls);

            expect(blocker).not.toBeNull();
            expect(blocker).toContain("nonexistent.ts");
            expect(blocker).toContain("not exist");
        });
    });

    describe('Message Format Tests', () => {
        it('Should return helpful message with what was attempted', () => {
            const toolCalls: ToolCall[] = [
                { tool: 'grep', params: { pattern: 'async' } },
                { tool: 'read_file', params: { path: 'index.ts' } },
            ];

            const message = generator.generateIterationLimitMessage(toolCalls, false);

            expect(message).toContain("Called grep");
            expect(message).toContain("Called read_file");
        });

        it('Should explain why it failed (loop detected, limit reached, etc.)', () => {
            const toolCalls: ToolCall[] = [
                { tool: 'read_file', params: { path: 'foo.ts' } },
            ];

            const messageWithLoop = generator.generateIterationLimitMessage(toolCalls, true);
            expect(messageWithLoop).toContain("Loop detected");

            const messageWithoutLoop = generator.generateIterationLimitMessage(toolCalls, false);
            expect(messageWithoutLoop).toContain("Iteration limit reached");
        });

        it('Should provide what to try next (suggestions)', () => {
            const toolCalls: ToolCall[] = [
                { tool: 'read_file', params: { path: 'foo.ts' } },
                { tool: 'read_file', params: { path: 'bar.ts' } },
            ];

            const message = generator.generateIterationLimitMessage(toolCalls, false);

            expect(message).toContain("Suggestion:");
            expect(message).toContain("grep");
        });

        it('Should NOT return empty response', () => {
            const toolCalls: ToolCall[] = [];

            const message = generator.generateIterationLimitMessage(toolCalls, false);

            expect(message).not.toBe("");
            expect(message.trim().length).toBeGreaterThan(0);
        });
    });
});
