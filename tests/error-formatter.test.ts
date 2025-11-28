import { describe, it, expect } from 'vitest';
import { ErrorFormatter } from '../src/error-formatter';

describe('Error Formatter', () => {
    const formatter = new ErrorFormatter();

    describe('Error Formatting', () => {
        it('should include file path in error', () => {
            const result = formatter.format({
                type: 'FILE_NOT_FOUND',
                message: 'File not found',
                path: 'src/missing.ts'
            });
            expect(result).toContain('src/missing.ts');
        });

        it('should include line number when relevant', () => {
            const result = formatter.format({
                type: 'SYNTAX_ERROR',
                message: 'Unexpected token',
                path: 'src/file.ts',
                line: 42
            });
            expect(result).toContain('42');
        });

        it('should suggest next steps', () => {
            const result = formatter.format({
                type: 'FILE_NOT_FOUND',
                message: 'File not found',
                path: 'utils.ts'
            });
            expect(result.toLowerCase()).toContain('suggestion');
        });

        it('should be formatted with colors', () => {
            const result = formatter.format({
                type: 'FILE_NOT_FOUND',
                message: 'Error',
                path: 'test.ts'
            });
            // Should contain ANSI color codes
            expect(result).toContain('\x1b[');
        });
    });

    describe('Specific Errors', () => {
        it('should suggest similar files for file not found', () => {
            const result = formatter.formatFileNotFound('src/utlis.ts', [
                'src/utils.ts',
                'src/utils/index.ts'
            ]);
            expect(result).toContain('utils.ts');
            expect(result.toLowerCase()).toContain('did you mean');
        });

        it('should show exit code and stderr for command failed', () => {
            const result = formatter.formatCommandFailed(
                'npm test',
                1,
                'Test failed: expected 1 to equal 2'
            );
            expect(result).toContain('exit code');
            expect(result).toContain('1');
            expect(result).toContain('Test failed');
        });

        it('should show expected vs found for edit failed', () => {
            const result = formatter.formatEditFailed(
                'src/file.ts',
                'const x = 1',
                'const y = 2'
            );
            expect(result).toContain('const x = 1');
            expect(result.toLowerCase()).toContain('not found');
        });

        it('should suggest chmod for permission denied', () => {
            const result = formatter.formatPermissionDenied('/etc/passwd');
            expect(result.toLowerCase()).toContain('permission');
            expect(result).toContain('chmod');
        });
    });

    describe('Error Wrapping', () => {
        it('should wrap errors with context', () => {
            const result = formatter.wrapError(
                new Error('Original error'),
                'While reading file',
                'src/test.ts'
            );
            expect(result).toContain('Original error');
            expect(result).toContain('While reading file');
            expect(result).toContain('src/test.ts');
        });

        it('should handle string errors', () => {
            const result = formatter.wrapError(
                'Simple string error',
                'During operation'
            );
            expect(result).toContain('Simple string error');
        });
    });
});
