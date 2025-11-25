import { describe, it, expect, vi } from 'vitest';
import { Renderer } from '../src/ui/renderer';

// Mock dependencies if necessary, but for a pure function/class, we might not need to.
// However, marked-terminal writes to stdout usually via console, or returns strings.
// We want to test that our Renderer class wraps marked correctly.

describe('UI Renderer', () => {
  it('should render markdown to ANSI string', () => {
    const renderer = new Renderer();
    const input = '# Hello';
    const output = renderer.render(input);
    
    // We expect some ANSI codes or at least the text. 
    // marked-terminal output usually transforms '#' to something specific.
    // For robust testing, we check if it's NOT just the raw string.
    expect(output).not.toBe('# Hello'); 
    expect(output).toContain('Hello');
  });

  it('should handle code blocks', () => {
    const renderer = new Renderer();
    const input = '```typescript\nconst x = 1;\n```';
    const output = renderer.render(input);
    expect(output).toContain('const x = 1;');
  });
});

