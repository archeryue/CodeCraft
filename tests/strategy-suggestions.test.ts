import { describe, it, expect, beforeEach } from 'vitest';
import { ErrorRecovery } from '../src/error-recovery.js';

/**
 * Alternative Strategy Suggestions Tests
 *
 * Tests the system that provides context-aware suggestions when agent is stuck.
 */

// Enhanced strategy suggester (to be added to ErrorRecovery)
class StrategySuggester {
    suggestForStuckReading(filePath: string): { tool: string; reason: string } {
        return {
            tool: 'Grep',
            reason: `Instead of reading ${filePath} repeatedly, try searching for specific patterns with Grep`
        };
    }

    suggestForStuckSearching(): { tool: string; reason: string } {
        return {
            tool: 'ReadFile',
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
                case 'ReadFile':
                    return {
                        tool: 'Grep',
                        reason: 'Repeatedly reading files. Try grep to search for specific content'
                    };
                case 'Grep':
                case 'SearchCode':
                    return {
                        tool: 'ReadFile',
                        reason: 'Search not finding results. Try reading full files or asking user'
                    };
                case 'EditFile':
                    return {
                        tool: 'ReadFile',
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

            expect(suggestion.tool).toBe('Grep');
            expect(suggestion.reason).toContain('Grep');
            expect(suggestion.reason).toContain('reading');
        });

        it('When stuck with search tools → Suggest reading full file or asking user', () => {
            const suggestion = suggester.suggestForStuckSearching();

            expect(suggestion.tool).toBe('ReadFile');
            expect(suggestion.reason).toContain('full file');
            expect(suggestion.reason).toContain('asking user');
        });

        it('When stuck with edits failing → Suggest showing user the problem', () => {
            const suggestion = suggester.suggestForFailedEdits('src/tool-setup.ts');

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
            const readSuggestion = suggester.getSuggestionForToolPattern(['ReadFile', 'ReadFile', 'ReadFile']);
            expect(readSuggestion?.tool).toBe('Grep');

            const grepSuggestion = suggester.getSuggestionForToolPattern(['Grep', 'Grep', 'Grep']);
            expect(grepSuggestion?.tool).toBe('ReadFile');

            const editSuggestion = suggester.getSuggestionForToolPattern(['EditFile', 'EditFile', 'EditFile']);
            expect(editSuggestion?.tool).toBe('ReadFile');
        });

        it('Should not suggest already-tried approaches', () => {
            const alreadyTried = ['Grep', 'SearchCode'];

            const shouldAvoidGrep = suggester.shouldAvoidSuggestion('Grep', alreadyTried);
            expect(shouldAvoidGrep).toBe(true);

            const shouldAvoidRead = suggester.shouldAvoidSuggestion('ReadFile', alreadyTried);
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
