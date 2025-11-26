// ANSI color codes
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';

const FG_RED = '\x1b[31m';
const FG_GREEN = '\x1b[32m';
const FG_YELLOW = '\x1b[33m';
const FG_BLUE = '\x1b[34m';
const FG_MAGENTA = '\x1b[35m';
const FG_CYAN = '\x1b[36m';
const FG_GRAY = '\x1b[90m';

let colorsEnabled = true;

export function setColorsEnabled(enabled: boolean): void {
    colorsEnabled = enabled;
}

function wrap(text: string, code: string): string {
    if (!colorsEnabled) return text;
    return `${code}${text}${RESET}`;
}

export const colors = {
    error: (text: string) => wrap(text, FG_RED),
    success: (text: string) => wrap(text, FG_GREEN),
    warn: (text: string) => wrap(text, FG_YELLOW),
    info: (text: string) => wrap(text, FG_BLUE),
    cyan: (text: string) => wrap(text, FG_CYAN),
    magenta: (text: string) => wrap(text, FG_MAGENTA),
    dim: (text: string) => wrap(text, FG_GRAY),
    bold: (text: string) => wrap(text, BOLD),

    // Convenience methods
    filePath: (path: string) => wrap(path, FG_CYAN),

    toolCall: (name: string, args: Record<string, any>) => {
        const argsStr = JSON.stringify(args);
        const truncated = argsStr.length > 50 ? argsStr.slice(0, 50) + '...' : argsStr;
        return wrap(`[Tool Call] ${name}(${truncated})`, FG_YELLOW);
    },

    errorWithSuggestion: (error: string, suggestion: string) => {
        const errorLine = wrap(`Error: ${error}`, FG_RED);
        const suggestionLine = wrap(`Suggestion: ${suggestion}`, FG_YELLOW);
        return `${errorLine}\n${suggestionLine}`;
    },

    // Formatted output helpers
    header: (text: string) => wrap(text, `${BOLD}${FG_CYAN}`),
    subheader: (text: string) => wrap(text, FG_CYAN),
    label: (text: string) => wrap(text, FG_GRAY),
    value: (text: string) => text,

    // Status indicators
    statusSuccess: () => wrap('✓', FG_GREEN),
    statusError: () => wrap('✗', FG_RED),
    statusPending: () => wrap('○', FG_YELLOW),
    statusInProgress: () => wrap('◐', FG_BLUE),
};

// Check NO_COLOR environment variable on load
if (typeof process !== 'undefined' && process.env?.NO_COLOR !== undefined) {
    setColorsEnabled(false);
}
