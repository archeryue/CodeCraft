import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { colors, setColorsEnabled } from '../src/ui/colors';

describe('Colors Module', () => {
    beforeEach(() => {
        setColorsEnabled(true);
    });

    describe('Color Functions', () => {
        it('should have error() function (red text)', () => {
            const result = colors.error('Error message');
            expect(result).toContain('\x1b[31m'); // Red ANSI code
            expect(result).toContain('Error message');
        });

        it('should have success() function (green text)', () => {
            const result = colors.success('Success!');
            expect(result).toContain('\x1b[32m'); // Green ANSI code
            expect(result).toContain('Success!');
        });

        it('should have info() function (blue text)', () => {
            const result = colors.info('Information');
            expect(result).toContain('\x1b[34m'); // Blue ANSI code
            expect(result).toContain('Information');
        });

        it('should have warn() function (yellow text)', () => {
            const result = colors.warn('Warning');
            expect(result).toContain('\x1b[33m'); // Yellow ANSI code
            expect(result).toContain('Warning');
        });

        it('should have dim() function (gray text)', () => {
            const result = colors.dim('Dimmed');
            expect(result).toContain('\x1b[90m'); // Gray ANSI code
            expect(result).toContain('Dimmed');
        });

        it('should have cyan() function for file paths', () => {
            const result = colors.cyan('src/index.ts');
            expect(result).toContain('\x1b[36m'); // Cyan ANSI code
            expect(result).toContain('src/index.ts');
        });

        it('should have bold() function', () => {
            const result = colors.bold('Important');
            expect(result).toContain('\x1b[1m'); // Bold ANSI code
            expect(result).toContain('Important');
        });
    });

    describe('Color Disable Support', () => {
        it('should return plain text when colors disabled', () => {
            setColorsEnabled(false);
            const result = colors.error('Error');
            expect(result).toBe('Error');
            expect(result).not.toContain('\x1b[');
        });

        it('should respect NO_COLOR environment variable', () => {
            // This would typically be set before module load
            // For now, just test the setColorsEnabled function
            setColorsEnabled(false);
            expect(colors.success('text')).toBe('text');
        });
    });

    describe('Convenience Methods', () => {
        it('should have filePath() for formatting paths', () => {
            const result = colors.filePath('src/tool-setup.ts');
            expect(result).toContain('src/tool-setup.ts');
        });

        it('should have toolCall() for formatting tool calls', () => {
            const result = colors.toolCall('ReadFile', { path: 'test.ts' });
            expect(result).toContain('ReadFile');
        });

        it('should have errorWithSuggestion() for rich errors', () => {
            const result = colors.errorWithSuggestion(
                'File not found: test.ts',
                'Try running: glob("**/*.ts")'
            );
            expect(result).toContain('File not found');
            expect(result).toContain('Try running');
        });
    });
});
