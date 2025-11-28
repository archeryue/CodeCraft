import { describe, it, expect } from 'vitest';
import { classifyIntent, IntentType } from '../src/intent-classifier.js';

describe('Intent Classifier', () => {
    it('should classify "what is X" as explain', () => {
        const result = classifyIntent('What is the Agent class?');
        expect(result.intent).toBe('explain');
    });

    it('should classify "how does X work" as explain', () => {
        const result = classifyIntent('How does the tool execution work?');
        expect(result.intent).toBe('explain');
    });

    it('should classify "show me X" as explain', () => {
        const result = classifyIntent('Show me the codebase structure');
        expect(result.intent).toBe('explain');
    });

    it('should classify "add X" as implement', () => {
        const result = classifyIntent('Add authentication to the CLI');
        expect(result.intent).toBe('implement');
    });

    it('should classify "create X" as implement', () => {
        const result = classifyIntent('Create a new tool for searching');
        expect(result.intent).toBe('implement');
    });

    it('should classify "implement X" as implement', () => {
        const result = classifyIntent('Implement a caching layer');
        expect(result.intent).toBe('implement');
    });

    it('should classify "refactor X" as refactor', () => {
        const result = classifyIntent('Refactor the agent loop');
        expect(result.intent).toBe('refactor');
    });

    it('should classify "improve X" as refactor', () => {
        const result = classifyIntent('Improve the error handling');
        expect(result.intent).toBe('refactor');
    });

    it('should classify "fix X" as debug', () => {
        const result = classifyIntent('Fix the bug in read_file');
        expect(result.intent).toBe('debug');
    });

    it('should classify "debug X" as debug', () => {
        const result = classifyIntent('Debug why tests are failing');
        expect(result.intent).toBe('debug');
    });

    it('should classify "test X" as test', () => {
        const result = classifyIntent('Test the new edit_file tool');
        expect(result.intent).toBe('test');
    });

    it('should classify "write tests" as test', () => {
        const result = classifyIntent('Write tests for the agent');
        expect(result.intent).toBe('test');
    });

    it('should classify "analyze X" as analyze', () => {
        const result = classifyIntent('Analyze the codebase structure');
        expect(result.intent).toBe('analyze');
    });

    it('should classify "review X" as analyze', () => {
        const result = classifyIntent('Review the code quality');
        expect(result.intent).toBe('analyze');
    });

    it('should detect file mentions in entities', () => {
        const result = classifyIntent('Refactor src/agent.ts and src/tool-setup.ts');
        expect(result.entities).toContain('src/agent.ts');
        expect(result.entities).toContain('src/tool-setup.ts');
    });

    it('should detect function/class names in entities', () => {
        const result = classifyIntent('Explain how the Agent class works');
        expect(result.entities).toContain('Agent');
    });

    it('should detect scope as single_file for specific file mentions', () => {
        const result = classifyIntent('Add a method to src/agent.ts');
        expect(result.scope).toBe('single_file');
    });

    it('should detect scope as multi_file for multiple file mentions', () => {
        const result = classifyIntent('Refactor src/agent.ts and src/tool-setup.ts');
        expect(result.scope).toBe('multi_file');
    });

    it('should detect scope as whole_project for broad requests', () => {
        const result = classifyIntent('Add authentication to the application');
        expect(result.scope).toBe('whole_project');
    });

    it('should classify "tell me about" as explain', () => {
        const result = classifyIntent('Tell me about this project');
        expect(result.intent).toBe('explain');
    });
});
