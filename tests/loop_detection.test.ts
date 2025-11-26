import { describe, it, expect, beforeEach } from 'vitest';
import { ErrorRecovery } from '../src/error_recovery.js';

/**
 * Loop Detection Tests
 *
 * Tests the enhanced loop detection system that identifies:
 * - Consecutive repetition (same tool 3+ times)
 * - Alternating patterns (A-B-A-B-A)
 * - Parameter similarity (same file, different offsets)
 */

// Helper class for parameter similarity detection (to be added to ErrorRecovery)
class ParameterSimilarityDetector {
    detectSimilarity(actions: Array<{ tool: string; params: Record<string, any> }>): boolean {
        if (actions.length < 3) return false;

        const recent3 = actions.slice(-3);
        const tool = recent3[0].tool;

        // Check if same tool used 3 times
        if (!recent3.every(a => a.tool === tool)) return false;

        // For read_file, check if same file with different offsets
        if (tool === 'read_file') {
            const paths = recent3.map(a => a.params.path);
            const uniquePaths = new Set(paths);

            // Same file read 3 times
            if (uniquePaths.size === 1) {
                // Check if offsets/limits are different
                const hasOffset = recent3.some(a => a.params.offset !== undefined);
                if (hasOffset) {
                    return true; // Reading same file with different offsets = loop
                }
            }
        }

        return false;
    }

    getSimilarityType(actions: Array<{ tool: string; params: Record<string, any> }>): string | null {
        if (actions.length < 3) return null;

        const recent3 = actions.slice(-3);
        const tool = recent3[0].tool;

        if (!recent3.every(a => a.tool === tool)) return null;

        if (tool === 'read_file') {
            const paths = recent3.map(a => a.params.path);
            const uniquePaths = new Set(paths);

            if (uniquePaths.size === 1) {
                return 'same_file_different_offsets';
            }
        }

        if (tool === 'grep' || tool === 'search_code') {
            const patterns = recent3.map(a => a.params.query || a.params.pattern);
            const uniquePatterns = new Set(patterns);

            if (uniquePatterns.size > 1) {
                return 'same_tool_different_queries';
            }
        }

        return null;
    }
}

describe('Loop Detection', () => {
    let recovery: ErrorRecovery;
    let similarityDetector: ParameterSimilarityDetector;

    beforeEach(() => {
        recovery = new ErrorRecovery();
        similarityDetector = new ParameterSimilarityDetector();
    });

    describe('Happy Path Tests', () => {
        it('should detect when same tool is called 3+ times consecutively', () => {
            recovery.recordAction({ tool: 'read_file', params: { path: 'foo.ts' } });
            recovery.recordAction({ tool: 'read_file', params: { path: 'foo.ts' } });
            recovery.recordAction({ tool: 'read_file', params: { path: 'foo.ts' } });

            expect(recovery.detectLoop()).toBe(true);
            expect(recovery.getLoopType()).toBe('repetition');
        });

        it('should detect repetition loops (A-B-A-B-A-B pattern)', () => {
            recovery.recordAction({ tool: 'search_code', params: { query: 'foo' } });
            recovery.recordAction({ tool: 'read_file', params: { path: 'bar.ts' } });
            recovery.recordAction({ tool: 'search_code', params: { query: 'foo' } });
            recovery.recordAction({ tool: 'read_file', params: { path: 'bar.ts' } });
            recovery.recordAction({ tool: 'search_code', params: { query: 'foo' } });

            expect(recovery.detectLoop()).toBe(true);
            expect(recovery.getLoopType()).toBe('alternation');
        });

        it('should detect when same file is read 3+ times', () => {
            recovery.recordAction({ tool: 'read_file', params: { path: 'src/agent.ts' } });
            recovery.recordAction({ tool: 'read_file', params: { path: 'src/agent.ts' } });
            recovery.recordAction({ tool: 'read_file', params: { path: 'src/agent.ts' } });

            expect(recovery.detectLoop()).toBe(true);
        });

        it('should allow legitimate repeated calls (different parameters)', () => {
            recovery.recordAction({ tool: 'read_file', params: { path: 'file1.ts' } });
            recovery.recordAction({ tool: 'read_file', params: { path: 'file2.ts' } });
            recovery.recordAction({ tool: 'read_file', params: { path: 'file3.ts' } });

            expect(recovery.detectLoop()).toBe(false);
        });
    });

    describe('Edge Cases', () => {
        it('should NOT flag legitimate patterns (read → edit → verify flow)', () => {
            recovery.recordAction({ tool: 'read_file', params: { path: 'foo.ts' } });
            recovery.recordAction({ tool: 'edit_file', params: { path: 'foo.ts', old_string: 'a', new_string: 'b' } });
            recovery.recordAction({ tool: 'read_file', params: { path: 'foo.ts' } });

            expect(recovery.detectLoop()).toBe(false);
        });

        it('should detect similar parameters (not just exact matches)', () => {
            const actions = [
                { tool: 'read_file', params: { path: 'foo.ts', offset: 10, limit: 20 } },
                { tool: 'read_file', params: { path: 'foo.ts', offset: 30, limit: 20 } },
                { tool: 'read_file', params: { path: 'foo.ts', offset: 50, limit: 20 } }
            ];

            const isSimilar = similarityDetector.detectSimilarity(actions);
            expect(isSimilar).toBe(true);
            expect(similarityDetector.getSimilarityType(actions)).toBe('same_file_different_offsets');
        });

        it('should reset loop detection on user message', () => {
            recovery.recordAction({ tool: 'read_file', params: { path: 'foo.ts' } });
            recovery.recordAction({ tool: 'read_file', params: { path: 'foo.ts' } });
            recovery.recordAction({ tool: 'read_file', params: { path: 'foo.ts' } });

            expect(recovery.detectLoop()).toBe(true);

            recovery.clearHistory();

            expect(recovery.detectLoop()).toBe(false);
        });
    });

    describe('Detection Patterns', () => {
        it('Consecutive repetition: Same tool 3+ times in a row', () => {
            recovery.recordAction({ tool: 'grep', params: { pattern: 'async' } });
            recovery.recordAction({ tool: 'grep', params: { pattern: 'async' } });
            recovery.recordAction({ tool: 'grep', params: { pattern: 'async' } });

            expect(recovery.detectLoop()).toBe(true);
            expect(recovery.getLoopType()).toBe('repetition');
        });

        it('Alternating pattern: A-B-A-B-A (2+ cycles)', () => {
            recovery.recordAction({ tool: 'list_directory', params: { path: 'src' } });
            recovery.recordAction({ tool: 'grep', params: { pattern: 'foo' } });
            recovery.recordAction({ tool: 'list_directory', params: { path: 'src' } });
            recovery.recordAction({ tool: 'grep', params: { pattern: 'foo' } });
            recovery.recordAction({ tool: 'list_directory', params: { path: 'src' } });

            expect(recovery.detectLoop()).toBe(true);
            expect(recovery.getLoopType()).toBe('alternation');
        });

        it('Parameter similarity: Same tool, same file, different offset', () => {
            const actions = [
                { tool: 'read_file', params: { path: 'src/agent.ts', offset: 70, limit: 30 } },
                { tool: 'read_file', params: { path: 'src/agent.ts', offset: 40, limit: 10 } },
                { tool: 'read_file', params: { path: 'src/agent.ts', offset: 22, limit: 20 } }
            ];

            expect(similarityDetector.detectSimilarity(actions)).toBe(true);
            expect(similarityDetector.getSimilarityType(actions)).toBe('same_file_different_offsets');
        });
    });

    describe('Output', () => {
        it('Return loop type: "consecutive" | "alternating" | "parameter_similarity"', () => {
            // Test consecutive
            recovery.clearHistory();
            recovery.recordAction({ tool: 'grep', params: { pattern: 'foo' } });
            recovery.recordAction({ tool: 'grep', params: { pattern: 'foo' } });
            recovery.recordAction({ tool: 'grep', params: { pattern: 'foo' } });
            expect(recovery.getLoopType()).toBe('repetition');

            // Test alternating
            recovery.clearHistory();
            recovery.recordAction({ tool: 'A', params: {} });
            recovery.recordAction({ tool: 'B', params: {} });
            recovery.recordAction({ tool: 'A', params: {} });
            recovery.recordAction({ tool: 'B', params: {} });
            recovery.recordAction({ tool: 'A', params: {} });
            expect(recovery.getLoopType()).toBe('alternation');

            // Test parameter similarity
            const actions = [
                { tool: 'read_file', params: { path: 'foo.ts', offset: 1 } },
                { tool: 'read_file', params: { path: 'foo.ts', offset: 2 } },
                { tool: 'read_file', params: { path: 'foo.ts', offset: 3 } }
            ];
            expect(similarityDetector.getSimilarityType(actions)).toBe('same_file_different_offsets');
        });

        it('Return suggestion: Alternative approach to try', () => {
            recovery.recordAction({ tool: 'grep', params: { pattern: 'foo' } });
            recovery.recordAction({ tool: 'grep', params: { pattern: 'foo' } });
            recovery.recordAction({ tool: 'grep', params: { pattern: 'foo' } });

            const suggestion = recovery.suggestAlternative();
            expect(suggestion).toBeDefined();
            expect(suggestion.tool).toBeDefined();
            expect(suggestion.reason).toBeDefined();
        });
    });
});
