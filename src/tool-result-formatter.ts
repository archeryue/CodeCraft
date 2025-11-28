import type { ToolResult } from './types/tool.js';

export class ToolResultFormatter {
    /**
     * Format ToolResult to string for backward compatibility
     */
    formatToolResult(result: ToolResult): string {
        if (!result.success) {
            // Special case: USER_CANCELLED doesn't need "Error:" prefix
            if (result.error?.code === 'USER_CANCELLED') {
                return result.error.message;
            }

            // Include validation error details if available
            if (result.error?.code === 'VALIDATION_ERROR' && result.error?.details) {
                const errors = Array.isArray(result.error.details) ? result.error.details : [result.error.details];
                return `Error: ${result.error.message}: ${errors.join(', ')}`;
            }

            return `Error: ${result.error?.message || 'Unknown error'}`;
        }

        // Handle different data types
        if (typeof result.data === 'string') {
            return result.data;
        }

        if (typeof result.data === 'object') {
            return JSON.stringify(result.data, null, 2);
        }

        if (result.data === undefined || result.data === null) {
            return JSON.stringify(null);
        }

        return String(result.data);
    }
}
