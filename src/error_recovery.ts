export enum ErrorType {
    FILE_NOT_FOUND = 'FILE_NOT_FOUND',
    INVALID_PATH = 'INVALID_PATH',
    SYNTAX_ERROR = 'SYNTAX_ERROR',
    NETWORK_ERROR = 'NETWORK_ERROR',
    COMMAND_FAILED = 'COMMAND_FAILED',
    NO_MATCHES = 'NO_MATCHES',
    EDIT_CONFLICT = 'EDIT_CONFLICT',
    AMBIGUOUS = 'AMBIGUOUS',
    PERMISSION_DENIED = 'PERMISSION_DENIED',
    TIMEOUT = 'TIMEOUT',
    UNKNOWN = 'UNKNOWN'
}

export enum RecoveryStrategy {
    RETRY = 'RETRY',
    SEARCH_FIRST = 'SEARCH_FIRST',
    BROADEN_SEARCH = 'BROADEN_SEARCH',
    ASK_USER = 'ASK_USER',
    SKIP = 'SKIP',
    ABORT = 'ABORT'
}

export interface Action {
    tool: string;
    params: Record<string, any>;
}

export interface ErrorInfo {
    type: ErrorType;
    message: string;
}

export interface ActionHistory {
    action: Action;
    timestamp: number;
    success: boolean;
    error?: ErrorInfo;
}

export interface RecoveryStrategyResult {
    type: RecoveryStrategy;
    actions: string[];
    suggestion?: string;
}

export interface AlternativeAction {
    tool: string;
    params: Record<string, any>;
    reason: string;
}

export class ErrorRecovery {
    private history: ActionHistory[] = [];
    private failures: Map<string, number> = new Map();
    private currentTask: string | null = null;
    private taskStatus: Map<string, string> = new Map();
    private taskFailureReasons: Map<string, string> = new Map();

    recordAction(action: Action): void {
        this.history.push({
            action,
            timestamp: Date.now(),
            success: true
        });
    }

    recordFailure(action: Action, error: ErrorInfo): void {
        this.history.push({
            action,
            timestamp: Date.now(),
            success: false,
            error
        });

        const key = this.getActionKey(action);
        this.failures.set(key, (this.failures.get(key) || 0) + 1);

        // Update task status if there's a current task
        if (this.currentTask) {
            this.taskStatus.set(this.currentTask, 'failed');
            this.taskFailureReasons.set(this.currentTask, error.message);
        }
    }

    private getActionKey(action: Action): string {
        return `${action.tool}:${JSON.stringify(action.params)}`;
    }

    detectLoop(): boolean {
        if (this.history.length < 3) return false;

        // Check for alternation FIRST (A-B-A-B-A pattern) - more specific pattern
        if (this.history.length >= 5) {
            const last5 = this.history.slice(-5);
            const key1 = this.getActionKey(last5[0].action);
            const key2 = this.getActionKey(last5[1].action);
            if (key1 !== key2) {
                const isAlternating =
                    this.getActionKey(last5[2].action) === key1 &&
                    this.getActionKey(last5[3].action) === key2 &&
                    this.getActionKey(last5[4].action) === key1;
                if (isAlternating) return true;
            }
        }

        // Check for repetition (same action 3+ times in a row)
        const recent = this.history.slice(-3);
        const lastAction = recent[recent.length - 1];
        const sameActions = recent.filter(h =>
            this.getActionKey(h.action) === this.getActionKey(lastAction.action)
        );
        if (sameActions.length >= 3) return true;

        // Check for parameter similarity (same file, different offsets)
        if (this.detectParameterSimilarity()) return true;

        return false;
    }

    private detectParameterSimilarity(): boolean {
        if (this.history.length < 3) return false;

        const recent3 = this.history.slice(-3).map(h => h.action);
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

    getLoopType(): 'repetition' | 'alternation' | null {
        if (this.history.length < 3) return null;

        // Check alternation FIRST
        if (this.history.length >= 5) {
            const last5 = this.history.slice(-5);
            const key1 = this.getActionKey(last5[0].action);
            const key2 = this.getActionKey(last5[1].action);
            if (key1 !== key2) {
                const isAlternating =
                    this.getActionKey(last5[2].action) === key1 &&
                    this.getActionKey(last5[3].action) === key2 &&
                    this.getActionKey(last5[4].action) === key1;
                if (isAlternating) return 'alternation';
            }
        }

        // Then check repetition
        const recent = this.history.slice(-3);
        const lastAction = recent[recent.length - 1];
        const sameActions = recent.filter(h =>
            this.getActionKey(h.action) === this.getActionKey(lastAction.action)
        );
        if (sameActions.length >= 3) return 'repetition';

        return null;
    }

    suggestAlternative(): AlternativeAction {
        const lastAction = this.history[this.history.length - 1]?.action;
        if (!lastAction) {
            return {
                tool: 'list_directory',
                params: { path: '.' },
                reason: 'No previous action to analyze'
            };
        }

        // Suggest alternative based on the tool used
        switch (lastAction.tool) {
            case 'grep':
                return {
                    tool: 'glob',
                    params: { pattern: '**/*' },
                    reason: 'Try file pattern search instead of content search'
                };
            case 'read_file':
                return {
                    tool: 'list_directory',
                    params: { path: this.getDirectory(lastAction.params.path) },
                    reason: 'List directory to find correct file'
                };
            case 'edit_file':
                return {
                    tool: 'read_file',
                    params: { path: lastAction.params.path },
                    reason: 'Re-read file to verify current content'
                };
            default:
                return {
                    tool: 'list_directory',
                    params: { path: '.' },
                    reason: 'Start fresh with directory listing'
                };
        }
    }

    private getDirectory(path: string): string {
        const parts = path.split('/');
        parts.pop();
        return parts.join('/') || '.';
    }

    getHistory(): ActionHistory[] {
        return [...this.history];
    }

    suggestRetry(action: Action, error: ErrorInfo): AlternativeAction {
        switch (error.type) {
            case ErrorType.FILE_NOT_FOUND:
                // Try with different path variations
                const path = action.params.path || '';
                return {
                    tool: 'glob',
                    params: { pattern: `**/*${path.split('/').pop() || '*'}` },
                    reason: 'Search for file with similar name'
                };
            case ErrorType.NO_MATCHES:
                // Broaden search
                const pattern = action.params.pattern || '';
                return {
                    tool: action.tool,
                    params: { ...action.params, pattern: pattern.split(' ')[0] },
                    reason: 'Try with simpler pattern'
                };
            default:
                return {
                    tool: 'list_directory',
                    params: { path: '.' },
                    reason: 'Start with directory listing'
                };
        }
    }

    shouldAskUser(): boolean {
        const totalFailures = Array.from(this.failures.values()).reduce((a, b) => a + b, 0);
        return totalFailures >= 3;
    }

    isRecoverable(error: ErrorInfo): boolean {
        const unrecoverableTypes = [
            ErrorType.INVALID_PATH,
            ErrorType.SYNTAX_ERROR,
            ErrorType.PERMISSION_DENIED,
            ErrorType.FILE_NOT_FOUND
        ];
        return !unrecoverableTypes.includes(error.type);
    }

    classifyError(error: ErrorInfo): 'transient' | 'permanent' {
        const transientTypes = [
            ErrorType.NETWORK_ERROR,
            ErrorType.TIMEOUT,
            ErrorType.COMMAND_FAILED
        ];
        return transientTypes.includes(error.type) ? 'transient' : 'permanent';
    }

    getHelpfulMessage(error: ErrorInfo): string {
        const suggestions: Record<ErrorType, string> = {
            [ErrorType.FILE_NOT_FOUND]: `File not found. Suggestion: Use glob or list_directory to find the correct file path.`,
            [ErrorType.INVALID_PATH]: `Invalid path. Suggestion: Check for path traversal or invalid characters.`,
            [ErrorType.SYNTAX_ERROR]: `Syntax error in code. Suggestion: Review the syntax and fix before retrying.`,
            [ErrorType.NETWORK_ERROR]: `Network error. Suggestion: Retry the operation after a brief wait.`,
            [ErrorType.COMMAND_FAILED]: `Command failed. Suggestion: Check command syntax or try alternative approach.`,
            [ErrorType.NO_MATCHES]: `No matches found. Suggestion: Broaden your search pattern or check spelling.`,
            [ErrorType.EDIT_CONFLICT]: `Edit conflict. Suggestion: Re-read the file and verify the old string matches exactly.`,
            [ErrorType.AMBIGUOUS]: `Ambiguous request. Suggestion: Ask user for clarification.`,
            [ErrorType.PERMISSION_DENIED]: `Permission denied. Suggestion: Check file permissions or run with elevated privileges.`,
            [ErrorType.TIMEOUT]: `Operation timed out. Suggestion: Try with smaller input or increase timeout.`,
            [ErrorType.UNKNOWN]: `Unknown error. Suggestion: Review the error message and try a different approach.`
        };

        return `${error.message} - ${suggestions[error.type] || 'Try a different approach.'}`;
    }

    getRecoveryStrategy(error: ErrorInfo): RecoveryStrategyResult {
        switch (error.type) {
            case ErrorType.FILE_NOT_FOUND:
                return {
                    type: RecoveryStrategy.SEARCH_FIRST,
                    actions: ['glob', 'list_directory'],
                    suggestion: 'Search for the file first'
                };
            case ErrorType.NO_MATCHES:
                return {
                    type: RecoveryStrategy.BROADEN_SEARCH,
                    actions: ['grep', 'glob'],
                    suggestion: 'Try a broader search pattern'
                };
            case ErrorType.AMBIGUOUS:
                return {
                    type: RecoveryStrategy.ASK_USER,
                    actions: [],
                    suggestion: 'Ask user to clarify'
                };
            case ErrorType.NETWORK_ERROR:
            case ErrorType.TIMEOUT:
                return {
                    type: RecoveryStrategy.RETRY,
                    actions: [],
                    suggestion: 'Retry after brief wait'
                };
            case ErrorType.INVALID_PATH:
            case ErrorType.SYNTAX_ERROR:
                return {
                    type: RecoveryStrategy.ABORT,
                    actions: [],
                    suggestion: 'Cannot recover from this error'
                };
            default:
                return {
                    type: RecoveryStrategy.ASK_USER,
                    actions: [],
                    suggestion: 'Ask user for guidance'
                };
        }
    }

    setCurrentTask(taskId: string): void {
        this.currentTask = taskId;
        if (!this.taskStatus.has(taskId)) {
            this.taskStatus.set(taskId, 'in_progress');
        }
    }

    getTaskStatus(taskId: string): string {
        return this.taskStatus.get(taskId) || 'unknown';
    }

    getFailureReason(taskId: string): string | undefined {
        return this.taskFailureReasons.get(taskId);
    }

    canMarkComplete(): boolean {
        // Cannot mark complete if there are recent failures
        const recentFailures = this.history
            .slice(-5)
            .filter(h => !h.success);
        return recentFailures.length === 0;
    }

    getFailureCount(): number {
        return Array.from(this.failures.values()).reduce((a, b) => a + b, 0);
    }

    clearHistory(): void {
        this.history = [];
    }

    reset(): void {
        this.history = [];
        this.failures.clear();
        this.currentTask = null;
        this.taskStatus.clear();
        this.taskFailureReasons.clear();
    }
}
