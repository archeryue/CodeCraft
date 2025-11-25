import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';

// Configure marked to use the terminal renderer
marked.setOptions({
  renderer: new TerminalRenderer()
});

export class Renderer {
  render(markdown: string): string {
    return marked(markdown) as string;
  }
}
