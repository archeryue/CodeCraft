import { colors } from './ui/colors.js';

interface ErrorInfo {
    type: string;
    message: string;
    path?: string;
    line?: number;
    column?: number;
}

export class ErrorFormatter {
    format(error: ErrorInfo): string {
        const parts: string[] = [];

        // Error type and message
        parts.push(colors.error(`Error: ${error.message}`));

        // Location info
        if (error.path) {
            let location = colors.cyan(error.path);
            if (error.line !== undefined) {
                location += `:${error.line}`;
                if (error.column !== undefined) {
                    location += `:${error.column}`;
                }
            }
            parts.push(colors.dim(`  at ${location}`));
        }

        // Suggestion based on error type
        const suggestion = this.getSuggestion(error);
        if (suggestion) {
            parts.push(colors.warn(`  Suggestion: ${suggestion}`));
        }

        return parts.join('\n');
    }

    private getSuggestion(error: ErrorInfo): string | null {
        switch (error.type) {
            case 'FILE_NOT_FOUND':
                return `Use glob("**/*${this.getBasename(error.path || '')}*") to find similar files`;
            case 'PERMISSION_DENIED':
                return `Check file permissions with: chmod +r ${error.path}`;
            case 'SYNTAX_ERROR':
                return `Check the syntax at line ${error.line || 'unknown'}`;
            case 'COMMAND_FAILED':
                return `Check the command output for details`;
            case 'EDIT_FAILED':
                return `Use read_file to verify the current file content`;
            default:
                return null;
        }
    }

    private getBasename(path: string): string {
        const parts = path.split('/');
        return parts[parts.length - 1] || '';
    }

    formatFileNotFound(path: string, similarFiles: string[] = []): string {
        const parts: string[] = [];
        parts.push(colors.error(`Error: File not found: ${path}`));

        if (similarFiles.length > 0) {
            parts.push(colors.warn(`  Did you mean one of these?`));
            for (const file of similarFiles.slice(0, 3)) {
                parts.push(colors.cyan(`    - ${file}`));
            }
        } else {
            parts.push(colors.warn(`  Suggestion: Use glob() to search for files`));
        }

        return parts.join('\n');
    }

    formatCommandFailed(command: string, exitCode: number, stderr: string): string {
        const parts: string[] = [];
        parts.push(colors.error(`Error: Command failed with exit code ${exitCode}`));
        parts.push(colors.dim(`  Command: ${command}`));

        if (stderr) {
            const stderrLines = stderr.split('\n').slice(0, 5);
            parts.push(colors.dim(`  Output:`));
            for (const line of stderrLines) {
                parts.push(colors.dim(`    ${line}`));
            }
            if (stderr.split('\n').length > 5) {
                parts.push(colors.dim(`    ... (truncated)`));
            }
        }

        return parts.join('\n');
    }

    formatEditFailed(path: string, oldString: string, actualContent?: string): string {
        const parts: string[] = [];
        parts.push(colors.error(`Error: Edit failed - string not found in ${path}`));
        parts.push(colors.dim(`  Looking for:`));
        parts.push(colors.dim(`    "${oldString.slice(0, 50)}${oldString.length > 50 ? '...' : ''}"`));
        parts.push(colors.warn(`  Suggestion: Use read_file("${path}") to see current content`));

        return parts.join('\n');
    }

    formatPermissionDenied(path: string): string {
        const parts: string[] = [];
        parts.push(colors.error(`Error: Permission denied: ${path}`));
        parts.push(colors.warn(`  Suggestion: Check permissions with: ls -la ${path}`));
        parts.push(colors.warn(`  To fix: chmod +rw ${path}`));

        return parts.join('\n');
    }

    wrapError(error: Error | string, context: string, path?: string): string {
        const message = error instanceof Error ? error.message : String(error);
        const parts: string[] = [];

        parts.push(colors.error(`Error: ${context}`));
        if (path) {
            parts.push(colors.dim(`  File: ${path}`));
        }
        parts.push(colors.dim(`  Details: ${message}`));

        return parts.join('\n');
    }
}

// Singleton instance for convenience
export const errorFormatter = new ErrorFormatter();
