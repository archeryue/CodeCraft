import { describe, it, expect, beforeEach } from 'vitest';
import { ErrorRecovery, ActionHistory, ErrorType, RecoveryStrategy } from '../src/error-recovery';

describe('Error Recovery', () => {
    let errorRecovery: ErrorRecovery;

    beforeEach(() => {
        errorRecovery = new ErrorRecovery();
    });

    describe('Loop Detection', () => {
        it('should detect repeating same tool call 3+ times', () => {
            errorRecovery.recordAction({ tool: 'ReadFile', params: { path: 'test.ts' } });
            errorRecovery.recordAction({ tool: 'ReadFile', params: { path: 'test.ts' } });
            errorRecovery.recordAction({ tool: 'ReadFile', params: { path: 'test.ts' } });

            expect(errorRecovery.detectLoop()).toBe(true);
            expect(errorRecovery.getLoopType()).toBe('repetition');
        });

        it('should detect alternating between same 2 actions', () => {
            errorRecovery.recordAction({ tool: 'ReadFile', params: { path: 'a.ts' } });
            errorRecovery.recordAction({ tool: 'WriteFile', params: { path: 'a.ts' } });
            errorRecovery.recordAction({ tool: 'ReadFile', params: { path: 'a.ts' } });
            errorRecovery.recordAction({ tool: 'WriteFile', params: { path: 'a.ts' } });
            errorRecovery.recordAction({ tool: 'ReadFile', params: { path: 'a.ts' } });

            expect(errorRecovery.detectLoop()).toBe(true);
            expect(errorRecovery.getLoopType()).toBe('alternation');
        });

        it('should break loop with alternative strategy', () => {
            errorRecovery.recordAction({ tool: 'Grep', params: { pattern: 'foo' } });
            errorRecovery.recordAction({ tool: 'Grep', params: { pattern: 'foo' } });
            errorRecovery.recordAction({ tool: 'Grep', params: { pattern: 'foo' } });

            const strategy = errorRecovery.suggestAlternative();
            expect(strategy).toBeDefined();
            expect(strategy.tool).not.toBe('Grep');
        });

        it('should track action history for detection', () => {
            errorRecovery.recordAction({ tool: 'ReadFile', params: { path: 'test.ts' } });
            errorRecovery.recordAction({ tool: 'EditFile', params: { path: 'test.ts' } });

            const history = errorRecovery.getHistory();
            expect(history.length).toBe(2);
            expect(history[0].action.tool).toBe('ReadFile');
            expect(history[1].action.tool).toBe('EditFile');
        });
    });

    describe('Retry Logic', () => {
        it('should retry failed tool calls with modified params', () => {
            const originalAction = { tool: 'ReadFile', params: { path: 'test.ts' } };
            const error = { type: ErrorType.FILE_NOT_FOUND, message: 'File not found' };

            const retry = errorRecovery.suggestRetry(originalAction, error);
            expect(retry).toBeDefined();
            // Should suggest trying with different path or listing directory first
            expect(retry.params).not.toEqual(originalAction.params);
        });

        it('should try alternative approach after 2 failures', () => {
            const action = { tool: 'Grep', params: { pattern: 'function foo' } };

            errorRecovery.recordFailure(action, { type: ErrorType.NO_MATCHES, message: 'No matches' });
            errorRecovery.recordFailure(action, { type: ErrorType.NO_MATCHES, message: 'No matches' });

            const alternative = errorRecovery.suggestAlternative();
            expect(alternative).toBeDefined();
            expect(alternative.tool).not.toBe('Grep');
        });

        it('should ask user after 3 total failures', () => {
            const action = { tool: 'RunCommand', params: { command: 'npm test' } };

            errorRecovery.recordFailure(action, { type: ErrorType.COMMAND_FAILED, message: 'Failed' });
            errorRecovery.recordFailure(action, { type: ErrorType.COMMAND_FAILED, message: 'Failed' });
            errorRecovery.recordFailure(action, { type: ErrorType.COMMAND_FAILED, message: 'Failed' });

            expect(errorRecovery.shouldAskUser()).toBe(true);
        });

        it('should not retry unrecoverable errors (file not found)', () => {
            const action = { tool: 'ReadFile', params: { path: '/nonexistent/file.ts' } };
            const error = { type: ErrorType.FILE_NOT_FOUND, message: 'File not found' };

            expect(errorRecovery.isRecoverable(error)).toBe(false);
        });
    });

    describe('Error Classification', () => {
        it('should classify errors as recoverable/unrecoverable', () => {
            const recoverableError = { type: ErrorType.NETWORK_ERROR, message: 'Timeout' };
            const unrecoverableError = { type: ErrorType.INVALID_PATH, message: 'Path traversal' };

            expect(errorRecovery.isRecoverable(recoverableError)).toBe(true);
            expect(errorRecovery.isRecoverable(unrecoverableError)).toBe(false);
        });

        it('should classify transient errors (network, timeout)', () => {
            const error = { type: ErrorType.NETWORK_ERROR, message: 'Connection timeout' };
            const classification = errorRecovery.classifyError(error);

            expect(classification).toBe('transient');
        });

        it('should classify permanent errors (invalid path, syntax)', () => {
            const error = { type: ErrorType.SYNTAX_ERROR, message: 'Invalid syntax' };
            const classification = errorRecovery.classifyError(error);

            expect(classification).toBe('permanent');
        });

        it('should provide helpful error messages', () => {
            const error = { type: ErrorType.FILE_NOT_FOUND, message: 'Not found: test.ts' };
            const helpfulMessage = errorRecovery.getHelpfulMessage(error);

            expect(helpfulMessage).toContain('test.ts');
            expect(helpfulMessage.toLowerCase()).toContain('suggestion');
        });
    });

    describe('Task Status', () => {
        it('should never mark task complete with errors', () => {
            errorRecovery.recordFailure(
                { tool: 'RunCommand', params: { command: 'npm test' } },
                { type: ErrorType.COMMAND_FAILED, message: 'Tests failed' }
            );

            expect(errorRecovery.canMarkComplete()).toBe(false);
        });

        it('should update task status on failure', () => {
            errorRecovery.setCurrentTask('implement-feature');
            errorRecovery.recordFailure(
                { tool: 'EditFile', params: { path: 'test.ts' } },
                { type: ErrorType.EDIT_CONFLICT, message: 'Conflict' }
            );

            const status = errorRecovery.getTaskStatus('implement-feature');
            expect(status).toBe('failed');
        });

        it('should provide failure reason in status', () => {
            errorRecovery.setCurrentTask('fix-bug');
            errorRecovery.recordFailure(
                { tool: 'RunCommand', params: { command: 'npm test' } },
                { type: ErrorType.COMMAND_FAILED, message: 'Test assertion failed' }
            );

            const reason = errorRecovery.getFailureReason('fix-bug');
            expect(reason).toContain('Test assertion failed');
        });
    });

    describe('Recovery Strategies', () => {
        it('should suggest searching before reading when file not found', () => {
            const error = { type: ErrorType.FILE_NOT_FOUND, message: 'Not found: utils.ts' };
            const strategy = errorRecovery.getRecoveryStrategy(error);

            expect(strategy.type).toBe(RecoveryStrategy.SEARCH_FIRST);
            expect(strategy.actions).toContain('Glob');
        });

        it('should suggest broader search when no grep matches', () => {
            const error = { type: ErrorType.NO_MATCHES, message: 'No matches for pattern' };
            const strategy = errorRecovery.getRecoveryStrategy(error);

            expect(strategy.type).toBe(RecoveryStrategy.BROADEN_SEARCH);
        });

        it('should suggest asking user for ambiguous errors', () => {
            const error = { type: ErrorType.AMBIGUOUS, message: 'Multiple options available' };
            const strategy = errorRecovery.getRecoveryStrategy(error);

            expect(strategy.type).toBe(RecoveryStrategy.ASK_USER);
        });
    });

    describe('Clear and Reset', () => {
        it('should clear action history', () => {
            errorRecovery.recordAction({ tool: 'ReadFile', params: { path: 'test.ts' } });
            errorRecovery.clearHistory();

            expect(errorRecovery.getHistory().length).toBe(0);
        });

        it('should reset failure counts', () => {
            const action = { tool: 'RunCommand', params: { command: 'npm test' } };
            errorRecovery.recordFailure(action, { type: ErrorType.COMMAND_FAILED, message: 'Failed' });

            errorRecovery.reset();

            expect(errorRecovery.getFailureCount()).toBe(0);
        });
    });
});
