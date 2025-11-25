import { describe, it, expect } from 'vitest';
import { TOOLS } from '../src/tools';

describe('Tools Registry', () => {
  it('should have the expected tools registered', () => {
    const toolNames = TOOLS[0].functionDeclarations.map((t: any) => t.name);
    expect(toolNames).toContain('read_file');
    expect(toolNames).toContain('write_file');
    expect(toolNames).toContain('run_command');
    expect(toolNames).toContain('get_codebase_map');
    expect(toolNames).toContain('search_code');
  });
});
