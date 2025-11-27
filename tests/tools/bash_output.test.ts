import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ToolContext } from '../../src/types/tool';
import { bashTool, backgroundProcesses } from '../../src/tools/bash';
import { bashOutputTool } from '../../src/tools/bash_output';

describe('bash_output tool', () => {
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

  describe('Reading Background Process Output', () => {
    it('should read output from running background process', async () => {
      expect(bashTool).toBeDefined();
      expect(bashOutputTool).toBeDefined();

      // Start background process
      const startResult = await bashTool.execute({
        command: 'echo "hello" && sleep 2 && echo "world"',
        run_in_background: true
      }, mockContext);

      const bashId = startResult.data.bash_id;

      // Give it time to produce some output
      await new Promise(resolve => setTimeout(resolve, 100));

      // Read output
      const outputResult = await bashOutputTool.execute({
        bash_id: bashId
      }, mockContext);

      expect(outputResult.success).toBe(true);
      expect(outputResult.data).toHaveProperty('status');
      expect(outputResult.data).toHaveProperty('output');
      expect(outputResult.data.status).toBe('running');
    });

    it('should read output from completed process', async () => {
      // Start quick background process
      const startResult = await bashTool.execute({
        command: 'echo "done"',
        run_in_background: true
      }, mockContext);

      const bashId = startResult.data.bash_id;

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 500));

      // Read output
      const outputResult = await bashOutputTool.execute({
        bash_id: bashId
      }, mockContext);

      expect(outputResult.success).toBe(true);
      expect(outputResult.data.status).toBe('completed');
      expect(outputResult.data.output).toContain('done');
      expect(outputResult.data).toHaveProperty('exitCode');
    });

    it('should return only new output on subsequent reads (incremental)', async () => {
      // Start process that outputs over time
      const startResult = await bashTool.execute({
        command: 'echo "line1" && sleep 0.2 && echo "line2" && sleep 0.2 && echo "line3"',
        run_in_background: true
      }, mockContext);

      const bashId = startResult.data.bash_id;

      // First read
      await new Promise(resolve => setTimeout(resolve, 100));
      const read1 = await bashOutputTool.execute({ bash_id: bashId }, mockContext);

      // Second read
      await new Promise(resolve => setTimeout(resolve, 300));
      const read2 = await bashOutputTool.execute({ bash_id: bashId }, mockContext);

      // Second read should not duplicate first read's output
      expect(read1.data.output).toBeDefined();
      expect(read2.data.output).toBeDefined();

      // Outputs should be different (incremental)
      if (read1.data.output && read2.data.output) {
        expect(read1.data.output).not.toBe(read2.data.output);
      }
    });

    it('should preserve output for late readers (completed process)', async () => {
      // Start and complete process
      const startResult = await bashTool.execute({
        command: 'echo "preserved"',
        run_in_background: true
      }, mockContext);

      const bashId = startResult.data.bash_id;

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 500));

      // Read after completion - should still have output
      const outputResult = await bashOutputTool.execute({
        bash_id: bashId
      }, mockContext);

      expect(outputResult.success).toBe(true);
      expect(outputResult.data.output).toContain('preserved');
      expect(outputResult.data.status).toBe('completed');
    });
  });

  describe('Error Handling', () => {
    it('should return error for invalid bash_id', async () => {
      const result = await bashOutputTool.execute({
        bash_id: 'nonexistent_id'
      }, mockContext);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('BASH_NOT_FOUND');
      expect(result.error?.message).toContain('not found');
    });

    it('should handle process that failed', async () => {
      // Start process that will fail
      const startResult = await bashTool.execute({
        command: 'exit 1',
        run_in_background: true
      }, mockContext);

      const bashId = startResult.data.bash_id;

      // Wait for failure
      await new Promise(resolve => setTimeout(resolve, 500));

      // Read output
      const outputResult = await bashOutputTool.execute({
        bash_id: bashId
      }, mockContext);

      expect(outputResult.success).toBe(true);
      expect(outputResult.data.status).toBe('failed');
      expect(outputResult.data.exitCode).toBe(1);
    });
  });

  describe('Integration', () => {
    it('should support polling pattern', async () => {
      // Start long-running process
      const startResult = await bashTool.execute({
        command: 'for i in 1 2 3; do echo "count $i"; sleep 0.2; done',
        run_in_background: true
      }, mockContext);

      const bashId = startResult.data.bash_id;

      // Poll multiple times
      const outputs = [];

      for (let i = 0; i < 4; i++) {
        await new Promise(resolve => setTimeout(resolve, 150));
        const result = await bashOutputTool.execute({ bash_id: bashId }, mockContext);
        outputs.push(result.data);
      }

      // Should see progression
      const statuses = outputs.map(o => o.status);
      expect(statuses).toBeDefined();

      // At least one should be running, last should be completed
      expect(statuses[statuses.length - 1]).toBe('completed');
    });
  });
});
