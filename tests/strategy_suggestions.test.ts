import { describe, it, expect, beforeEach } from 'vitest';
import { ErrorRecovery } from '../src/error_recovery.js';

/**
 * Alternative Strategy Suggestions Tests
 *
 * Tests the system that provides context-aware suggestions when agent is stuck.
 */

// Enhanced strategy suggester (to be added to ErrorRecovery)
class StrategySuggester {
    suggestForStuckReading(filePath: string): { tool: string; reason: string } {
        return {
            tool: 'grep',
            reason: `Instead of reading ${filePath} repeatedly, try searching for specific patterns with grep`
        };
    }

    suggestForStuckSearching(): { tool: string; reason: string } {
        return {
            tool: 'read_file',
            reason: 'Search isn\'t finding results. Try reading the full file or asking user for clarification'
        };
    }

    suggestForFailedEdits(filePath: string): { tool: string; reason: string } {
        return {
            tool: 'show_user',
            reason: `Multiple edit attempts failed. Show user the current state of ${filePath} and ask for guidance`
        };
    }

    suggestForStuckGrep(): { tool: string; reason: string } {
        return {
            tool: 'broaden_or_narrow',
            reason: 'Grep not finding matches. Try broader pattern, narrower pattern, or different search approach'
        };
    }

    suggestGenericFallback(): { tool: string; reason: string } {
        return {
            tool: 'ask_user',
            reason: 'Multiple approaches tried without success. Summarize progress and ask user for guidance'
        };
    }

    getSuggestionForToolPattern(toolHistory: string[]): { tool: string; reason: string } | null {
        if (toolHistory.length < 3) return null;

        const recent = toolHistory.slice(-3);
        const allSame = recent.every(t => t === recent[0]);

        if (allSame) {
            const tool = recent[0];

            switch (tool) {
                case 'read_file':
                    return {
                        tool: 'grep',
                        reason: 'Repeatedly reading files. Try grep to search for specific content'
                    };
                case 'grep':
                case 'search_code':
                    return {
                        tool: 'read_file',
                        reason: 'Search not finding results. Try reading full files or asking user'
                    };
                case 'edit_file':
                    return {
                        tool: 'read_file',
                        reason: 'Edits failing. Re-read file to verify exact content before editing'
                    };
                default:
                    return this.suggestGenericFallback();
            }
        }

        return null;
    }

    shouldAvoidSuggestion(suggestion: string, alreadyTried: string[]): boolean {
        return alreadyTried.includes(suggestion);
    }
}

describe('Alternative Strategy Suggestions', () => {
    let recovery: ErrorRecovery;
    let suggester: StrategySuggester;

    beforeEach(() => {
        recovery = new ErrorRecovery();
        suggester = new StrategySuggester();
    });

    describe('Test Cases', () => {
        it('When stuck reading same file repeatedly → Suggest using grep/search instead', () => {
            const suggestion = suggester.suggestForStuckReading('src/agent.ts');

            expect(suggestion.tool).toBe('grep');
            expect(suggestion.reason).toContain('grep');
            expect(suggestion.reason).toContain('reading');
        });

        it('When stuck with search tools → Suggest reading full file or asking user', () => {
            const suggestion = suggester.suggestForStuckSearching();

            expect(suggestion.tool).toBe('read_file');
            expect(suggestion.reason).toContain('full file');
            expect(suggestion.reason).toContain('asking user');
        });

        it('When stuck with edits failing → Suggest showing user the problem', () => {
            const suggestion = suggester.suggestForFailedEdits('src/tools.ts');

            expect(suggestion.tool).toBe('show_user');
            expect(suggestion.reason).toContain('failed');
            expect(suggestion.reason).toContain('ask for guidance');
        });

        it('When stuck with grep → Suggest trying broader or narrower search', () => {
            const suggestion = suggester.suggestForStuckGrep();

            expect(suggestion.tool).toBe('broaden_or_narrow');
            expect(suggestion.reason).toContain('broader');
            expect(suggestion.reason).toContain('narrower');
        });

        it('Generic fallback → Suggest summarizing progress and asking user', () => {
            const suggestion = suggester.suggestGenericFallback();

            expect(suggestion.tool).toBe('ask_user');
            expect(suggestion.reason).toContain('Summarize');
            expect(suggestion.reason).toContain('ask user');
        });
    });

    describe('Edge Cases', () => {
        it('Suggestions should be context-aware (based on tool types involved)', () => {
            const readSuggestion = suggester.getSuggestionForToolPattern(['read_file', 'read_file', 'read_file']);
            expect(readSuggestion?.tool).toBe('grep');

            const grepSuggestion = suggester.getSuggestionForToolPattern(['grep', 'grep', 'grep']);
            expect(grepSuggestion?.tool).toBe('read_file');

            const editSuggestion = suggester.getSuggestionForToolPattern(['edit_file', 'edit_file', 'edit_file']);
            expect(editSuggestion?.tool).toBe('read_file');
        });

        it('Should not suggest already-tried approaches', () => {
            const alreadyTried = ['grep', 'search_code'];

            const shouldAvoidGrep = suggester.shouldAvoidSuggestion('grep', alreadyTried);
            expect(shouldAvoidGrep).toBe(true);

            const shouldAvoidRead = suggester.shouldAvoidSuggestion('read_file', alreadyTried);
            expect(shouldAvoidRead).toBe(false);
        });

        it('Should prioritize user communication over infinite tool attempts', () => {
            // After multiple failures, should suggest asking user
            const fallback = suggester.suggestGenericFallback();

            expect(fallback.tool).toBe('ask_user');
            expect(fallback.reason).toContain('user');
        });
    });
});
