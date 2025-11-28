import { describe, it, expect } from 'vitest';
import { TOOLS } from '../src/tool-setup';

describe('Tools Registry', () => {
  it('should have the expected tools registered', () => {
    const toolNames = TOOLS[0].functionDeclarations.map((t: any) => t.name);
    expect(toolNames).toContain('ReadFile');
    expect(toolNames).toContain('WriteFile');
    expect(toolNames).toContain('Bash');  // Renamed from run_command
    expect(toolNames).toContain('GetCodebaseMap');
    expect(toolNames).toContain('SearchCode');
  });
});
