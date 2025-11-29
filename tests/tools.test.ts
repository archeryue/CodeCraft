import { describe, it, expect } from 'vitest';
import { TOOLS } from '../src/tool-setup';

describe('Tools Registry', () => {
  it('should have the expected tools registered (9 total)', () => {
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

    // Rust engine tools (1 - consolidated CodeSearch)
    expect(toolNames).toContain('CodeSearch');

    // Verify total count
    expect(toolNames.length).toBe(9);
  });

  it('should NOT have removed tools', () => {
    const toolNames = TOOLS[0].functionDeclarations.map((t: any) => t.name);

    // Old AST tools that were consolidated into CodeSearch
    expect(toolNames).not.toContain('SearchCode');
    expect(toolNames).not.toContain('GetCodebaseMap');
    expect(toolNames).not.toContain('InspectSymbol');
    expect(toolNames).not.toContain('GetImportsExports');
    expect(toolNames).not.toContain('FindReferences');

    // Other removed tools
    expect(toolNames).not.toContain('WriteFile');
    expect(toolNames).not.toContain('DeleteFile');
    expect(toolNames).not.toContain('ListDirectory');
    expect(toolNames).not.toContain('BuildDependencyGraph');
    expect(toolNames).not.toContain('DetectProjectType');
    expect(toolNames).not.toContain('ExtractConventions');
    expect(toolNames).not.toContain('GetProjectOverview');
  });
});
