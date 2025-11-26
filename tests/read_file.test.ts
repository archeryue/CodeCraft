import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeTool } from '../src/tools.js';
import * as fs from 'fs';

// Mock fs
vi.mock('fs', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...(actual as any),
        readFileSync: vi.fn()
    };
});

describe('read_file tool', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should read entire file when no offset/limit provided', async () => {
        const content = 'line 1\nline 2\nline 3\nline 4\nline 5';
        vi.mocked(fs.readFileSync).mockReturnValue(content);

        const result = await executeTool('read_file', { path: 'test.txt' });

        expect(result).toBe(content);
    });

    it('should read from offset to end when only offset provided', async () => {
        const content = 'line 1\nline 2\nline 3\nline 4\nline 5';
        vi.mocked(fs.readFileSync).mockReturnValue(content);

        const result = await executeTool('read_file', {
            path: 'test.txt',
            offset: 2
        });

        expect(result).toBe('line 3\nline 4\nline 5');
    });

    it('should read limited lines from start when only limit provided', async () => {
        const content = 'line 1\nline 2\nline 3\nline 4\nline 5';
        vi.mocked(fs.readFileSync).mockReturnValue(content);

        const result = await executeTool('read_file', {
            path: 'test.txt',
            limit: 3
        });

        expect(result).toBe('line 1\nline 2\nline 3');
    });

    it('should read range when both offset and limit provided', async () => {
        const content = 'line 1\nline 2\nline 3\nline 4\nline 5';
        vi.mocked(fs.readFileSync).mockReturnValue(content);

        const result = await executeTool('read_file', {
            path: 'test.txt',
            offset: 1,
            limit: 2
        });

        expect(result).toBe('line 2\nline 3');
    });

    it('should handle offset beyond file length', async () => {
        const content = 'line 1\nline 2\nline 3';
        vi.mocked(fs.readFileSync).mockReturnValue(content);

        const result = await executeTool('read_file', {
            path: 'test.txt',
            offset: 10
        });

        expect(result).toBe('');
    });

    it('should handle limit larger than remaining lines', async () => {
        const content = 'line 1\nline 2\nline 3';
        vi.mocked(fs.readFileSync).mockReturnValue(content);

        const result = await executeTool('read_file', {
            path: 'test.txt',
            offset: 1,
            limit: 10
        });

        expect(result).toBe('line 2\nline 3');
    });

    it('should handle single line file', async () => {
        const content = 'single line';
        vi.mocked(fs.readFileSync).mockReturnValue(content);

        const result = await executeTool('read_file', {
            path: 'test.txt',
            offset: 0,
            limit: 1
        });

        expect(result).toBe('single line');
    });

    it('should handle empty file', async () => {
        const content = '';
        vi.mocked(fs.readFileSync).mockReturnValue(content);

        const result = await executeTool('read_file', { path: 'test.txt' });

        expect(result).toBe('');
    });

    it('should use 0-based offset (line 0 is first line)', async () => {
        const content = 'first\nsecond\nthird';
        vi.mocked(fs.readFileSync).mockReturnValue(content);

        const result = await executeTool('read_file', {
            path: 'test.txt',
            offset: 0,
            limit: 1
        });

        expect(result).toBe('first');
    });
});
