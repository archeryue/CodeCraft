import { describe, it, expect } from 'vitest';
import { TOOLS } from '../src/tool-setup';

describe('Tools Registry', () => {
  it('should have the expected tools registered (13 total)', () => {
    const toolNames = TOOLS[0].functionDeclarations.map((t: any) => t.name);

    // File operations (2)
    expect(toolNames).toContain('ReadFile');
    expect(toolNames).toContain('EditFile');

    // Utility tools (6)
    expect(toolNames).toContain('Glob');
    expect(toolNames).toContain('Grep');
    expect(toolNames).toContain('TodoWrite');
    expect(toolNames).toContain('Bash');
    expect(toolNames).toContain('BashOutput');
    expect(toolNames).toContain('KillBash');

    // Rust engine tools (5)
    expect(toolNames).toContain('SearchCode');
    expect(toolNames).toContain('GetCodebaseMap');
    expect(toolNames).toContain('InspectSymbol');
    expect(toolNames).toContain('GetImportsExports');
    expect(toolNames).toContain('FindReferences');

    // Verify total count
    expect(toolNames.length).toBe(13);
  });

  it('should NOT have removed tools', () => {
    const toolNames = TOOLS[0].functionDeclarations.map((t: any) => t.name);

    // These tools were removed
    expect(toolNames).not.toContain('WriteFile');
    expect(toolNames).not.toContain('DeleteFile');
    expect(toolNames).not.toContain('ListDirectory');
    expect(toolNames).not.toContain('BuildDependencyGraph');
    expect(toolNames).not.toContain('DetectProjectType');
    expect(toolNames).not.toContain('ExtractConventions');
    expect(toolNames).not.toContain('GetProjectOverview');
  });
});
