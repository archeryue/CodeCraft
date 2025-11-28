// tests/mocks/rust-engine.mock.ts
// Mock Rust engine for testing

/**
 * Mock Rust engine that simulates the behavior of the real Rust engine
 * Used for testing when the actual .node file isn't available
 */
export const mockRustEngine = {
  // Mock data for testing
  generateRepoMap: (path: string) => {
    return `// Mock repo map for ${path}\nfunction mockFunction() {}\nclass MockClass {}`;
  },

  search: (path: string, query: string) => {
    // Return mock search results
    return [
      { file: 'src/agent.ts', line: 10, snippet: `class Agent { // matches ${query}` },
      { file: 'src/tools.ts', line: 5, snippet: `function executeTool() { // matches ${query}` }
    ];
  },

  getImportsExports: (file: string) => {
    // Return mock imports/exports based on file
    if (file.includes('agent.ts')) {
      return {
        imports: [
          { source: '@google/generative-ai', names: ['GoogleGenerativeAI'], isNamespace: false },
          { source: './tools', names: ['TOOLS', 'executeTool'], isNamespace: false },
          { source: './intent_classifier', names: ['classifyIntent', 'Intent'], isNamespace: false }
        ],
        exports: [
          { name: 'Agent', type: 'class' }
        ]
      };
    }

    if (file.includes('tools.ts') || file.includes('tool-setup.ts')) {
      return {
        imports: [
          { source: 'child_process', names: ['exec'], isNamespace: false },
          { source: 'path', names: [], isNamespace: false, isDefault: true },
          { source: 'fs', names: [], isNamespace: true },
          { source: '@google/generative-ai', names: ['SchemaType'], isNamespace: false }
        ],
        exports: [
          { name: 'TOOLS', type: 'const' },
          { name: 'executeTool', type: 'function' }
        ]
      };
    }

    return {
      imports: [],
      exports: []
    };
  },

  getSymbolInfo: (file: string, symbol: string) => {
    // Return mock symbol info
    if (symbol === 'TOOLS') {
      return {
        name: 'TOOLS',
        type: 'const',
        file,
        line: 24,
        signature: 'const TOOLS: any[]'
      };
    }

    if (symbol === 'Agent') {
      return {
        name: 'Agent',
        type: 'class',
        file,
        line: 27,
        signature: 'export class Agent'
      };
    }

    return null;
  },

  buildDependencyGraph: (path: string) => {
    // Return mock dependency graph
    return {
      nodes: [
        { file: 'src/agent.ts', exports: ['Agent'] },
        { file: 'src/tools.ts', exports: ['TOOLS', 'executeTool'] },
        { file: 'index.ts', exports: [] }
      ],
      edges: [
        { from: 'src/agent.ts', to: 'src/tools.ts', imports: ['TOOLS', 'executeTool'] },
        { from: 'index.ts', to: 'src/agent.ts', imports: ['Agent'] }
      ]
    };
  },

  resolveSymbol: (symbol: string, file: string) => {
    // Return mock symbol resolution
    if (symbol === 'SchemaType') {
      return {
        file: 'node_modules/@google/generative-ai/dist/types.d.ts',
        line: 15,
        external: true,
        package: '@google/generative-ai'
      };
    }

    if (symbol === 'TOOLS' || symbol === 'executeTool') {
      return {
        file: 'src/tools.ts',
        line: symbol === 'TOOLS' ? 24 : 77,
        external: false
      };
    }

    return null;
  },

  findReferences: (symbol: string, path: string) => {
    // Return mock references
    if (symbol === 'executeTool') {
      return [
        { file: 'src/agent.ts', line: 218, context: 'const toolResult = await executeTool(call.name, call.args, confirm);' },
        { file: 'tests/tools.test.ts', line: 10, context: 'import { executeTool } from "../src/tools";' },
        { file: 'tests/grep.test.ts', line: 5, context: 'const result = await executeTool("grep", args);' }
      ];
    }

    if (symbol === 'Agent') {
      return [
        { file: 'index.ts', line: 12, context: 'import { Agent } from "./src/agent";' },
        { file: 'tests/agent.test.ts', line: 2, context: 'import { Agent } from "../src/agent";' }
      ];
    }

    return [];
  }
};

export default mockRustEngine;
