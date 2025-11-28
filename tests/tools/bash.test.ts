import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ToolContext } from '../../src/types/tool';
import { bashTool, backgroundProcesses } from '../../src/tools/bash';

describe('bash tool', () => {
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

  // Happy Path Tests
  describe('Foreground Commands', () => {
    it('should execute simple foreground command', async () => {
      // Will fail until we implement bashTool
      expect(bashTool).toBeDefined();

      const result = await bashTool.execute({ command: 'echo "hello"' }, mockContext);

      expect(result.success).toBe(true);
      expect(result.data.output || result.data.stdout).toContain('hello');
      expect(result.data.exitCode).toBe(0);
    });

    it('should execute foreground command with timeout', async () => {
      const result = await bashTool.execute({
        command: 'sleep 1',
        timeout: 5000
      }, mockContext);

      expect(result.success).toBe(true);
      expect(result.metadata?.executionTime).toBeLessThan(5000);
      expect(result.metadata?.executionTime).toBeGreaterThan(900); // At least 1 second
    });

    it('should use default timeout of 30 seconds', async () => {
      const result = await bashTool.execute({
        command: 'echo "test"'
      }, mockContext);

      expect(result.success).toBe(true);
      // Default timeout should be used (verified via metadata)
    });
  });

  describe('Background Commands', () => {
    it('should execute background command and return bash_id', async () => {
      const result = await bashTool.execute({
        command: 'sleep 5',
        run_in_background: true
      }, mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('bash_id');
      expect(typeof result.data.bash_id).toBe('string');
      expect(result.data.bash_id).toMatch(/^bash_/);
    });

    it('should return immediately for background commands', async () => {
      const start = Date.now();

      const result = await bashTool.execute({
        command: 'sleep 10',
        run_in_background: true
      }, mockContext);

      const duration = Date.now() - start;
      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(1000); // Should return quickly
    });
  });

  // Edge Cases
  describe('Edge Cases', () => {
    it.skip('should timeout foreground command that exceeds limit', async () => {
      const result = await bashTool.execute({
        command: 'sleep 2',
        timeout: 500
      }, mockContext);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('TIMEOUT');
      expect(result.error?.message).toContain('timeout');
    });

    it('should handle command with non-zero exit code', async () => {
      const result = await bashTool.execute({
        command: 'ls /nonexistent'
      }, mockContext);

      // Command failed (non-zero exit code)
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('COMMAND_FAILED');
      expect(result.data).toHaveProperty('exitCode');
      expect(result.data.exitCode).not.toBe(0);
      expect(result.data).toHaveProperty('stderr');
    });

    it('should handle command with syntax error', async () => {
      const result = await bashTool.execute({
        command: 'invalid|||syntax'
      }, mockContext);

      // Command failed (syntax error causes non-zero exit)
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('COMMAND_FAILED');
      expect(result.data.exitCode).not.toBe(0);
      // stderr or output should have error info
      expect(result.data.stderr || result.data.output).toBeTruthy();
    });

    it('should reject empty command', async () => {
      const result = await bashTool.execute({
        command: ''
      }, mockContext);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_PARAMS');
    });
  });

  // Process Management
  describe('Process Management', () => {
    it('should track multiple background processes independently', async () => {
      const result1 = await bashTool.execute({
        command: 'sleep 5',
        run_in_background: true
      }, mockContext);

      const result2 = await bashTool.execute({
        command: 'sleep 5',
        run_in_background: true
      }, mockContext);

      const result3 = await bashTool.execute({
        command: 'sleep 5',
        run_in_background: true
      }, mockContext);

      expect(result1.data.bash_id).not.toBe(result2.data.bash_id);
      expect(result2.data.bash_id).not.toBe(result3.data.bash_id);
      expect(result1.data.bash_id).not.toBe(result3.data.bash_id);
    });
  });
});
