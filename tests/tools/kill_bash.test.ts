import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ToolContext } from '../../src/types/tool';
import { bashTool, backgroundProcesses } from '../../src/tools/bash';
import { bashOutputTool } from '../../src/tools/bash_output';
import { killBashTool } from '../../src/tools/kill_bash';

describe('kill_bash tool', () => {
  let mockContext: ToolContext;

  beforeEach(() => {
    mockContext = {
      workingDir: '/test',
      rustEngine: null,
      confirm: vi.fn().mockResolvedValue(true)
    };
  });

  afterEach(() => {
    // Kill all background processes
    for (const [id, proc] of backgroundProcesses.entries()) {
      if (proc.status === 'running') {
        try {
          proc.process.kill();
        } catch (e) {
          // Ignore
        }
      }
    }
    backgroundProcesses.clear();
    vi.clearAllMocks();
  });

  describe('Terminating Processes', () => {
    it('should kill running background process', async () => {
      expect(bashTool).toBeDefined();
      expect(killBashTool).toBeDefined();

      // Start long-running process
      const startResult = await bashTool.execute({
        command: 'sleep 100',
        run_in_background: true
      }, mockContext);

      const bashId = startResult.data.bash_id;

      // Kill it
      const killResult = await killBashTool.execute({
        bash_id: bashId
      }, mockContext);

      expect(killResult.success).toBe(true);
      expect(killResult.data).toContain('terminated');

      // Verify it's killed via bash_output
      await new Promise(resolve => setTimeout(resolve, 100));
      const statusResult = await bashOutputTool.execute({
        bash_id: bashId
      }, mockContext);

      expect(statusResult.data.status).not.toBe('running');
    });

    it('should handle killing already completed process (idempotent)', async () => {
      // Start quick process
      const startResult = await bashTool.execute({
        command: 'echo "done"',
        run_in_background: true
      }, mockContext);

      const bashId = startResult.data.bash_id;

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 500));

      // Try to kill (should succeed idempotently)
      const killResult = await killBashTool.execute({
        bash_id: bashId
      }, mockContext);

      expect(killResult.success).toBe(true);
    });

    it('should kill multiple processes independently', async () => {
      // Start 3 processes
      const proc1 = await bashTool.execute({
        command: 'sleep 100',
        run_in_background: true
      }, mockContext);

      const proc2 = await bashTool.execute({
        command: 'sleep 100',
        run_in_background: true
      }, mockContext);

      const proc3 = await bashTool.execute({
        command: 'sleep 100',
        run_in_background: true
      }, mockContext);

      // Kill only proc2
      const killResult = await killBashTool.execute({
        bash_id: proc2.data.bash_id
      }, mockContext);

      expect(killResult.success).toBe(true);

      // Verify proc1 and proc3 still running
      await new Promise(resolve => setTimeout(resolve, 100));

      const status1 = await bashOutputTool.execute({
        bash_id: proc1.data.bash_id
      }, mockContext);

      const status3 = await bashOutputTool.execute({
        bash_id: proc3.data.bash_id
      }, mockContext);

      expect(status1.data.status).toBe('running');
      expect(status3.data.status).toBe('running');

      // Cleanup
      await killBashTool.execute({ bash_id: proc1.data.bash_id }, mockContext);
      await killBashTool.execute({ bash_id: proc3.data.bash_id }, mockContext);
    });
  });

  describe('Error Handling', () => {
    it('should return error for invalid bash_id', async () => {
      const result = await killBashTool.execute({
        bash_id: 'nonexistent_id'
      }, mockContext);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('BASH_NOT_FOUND');
      expect(result.error?.message).toContain('not found');
    });
  });

  describe('Integration', () => {
    it('should allow kill -> output -> see terminated status', async () => {
      // Start process
      const startResult = await bashTool.execute({
        command: 'sleep 100',
        run_in_background: true
      }, mockContext);

      const bashId = startResult.data.bash_id;

      // Kill it
      await killBashTool.execute({ bash_id: bashId }, mockContext);

      // Check output
      await new Promise(resolve => setTimeout(resolve, 100));
      const outputResult = await bashOutputTool.execute({
        bash_id: bashId
      }, mockContext);

      expect(outputResult.data.status).not.toBe('running');
      expect(['completed', 'failed', 'killed']).toContain(outputResult.data.status);
    });
  });
});
