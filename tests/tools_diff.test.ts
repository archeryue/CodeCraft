import { describe, it, expect, vi, afterEach } from 'vitest';
import { executeTool } from '../src/tools';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs
vi.mock('fs', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...(actual as any),
        readFileSync: vi.fn(),
        writeFileSync: vi.fn(),
        existsSync: vi.fn().mockReturnValue(true)
    };
});

describe('executeTool - write_file with confirmation', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should write file immediately if no confirmation callback is provided', async () => {
        await executeTool('write_file', { path: 'test.txt', content: 'new' });
        expect(fs.writeFileSync).toHaveBeenCalledWith('test.txt', 'new');
    });

    it('should request confirmation if callback is provided', async () => {
        const confirmMock = vi.fn().mockResolvedValue(true);
        // We need to mock readFileSync to return "old" content for diffing
        vi.mocked(fs.readFileSync).mockReturnValue('old');

        await executeTool('write_file', { path: 'test.txt', content: 'new' }, confirmMock);
        
        expect(fs.readFileSync).toHaveBeenCalledWith('test.txt', 'utf-8');
        expect(confirmMock).toHaveBeenCalled(); 
        expect(fs.writeFileSync).toHaveBeenCalledWith('test.txt', 'new');
    });

    it('should abort if confirmation returns false', async () => {
        const confirmMock = vi.fn().mockResolvedValue(false);
        vi.mocked(fs.readFileSync).mockReturnValue('old');

        const result = await executeTool('write_file', { path: 'test.txt', content: 'new' }, confirmMock);
        
        expect(confirmMock).toHaveBeenCalled();
        expect(fs.writeFileSync).not.toHaveBeenCalled();
        expect(result).toBe('User cancelled the operation.');
    });
});
