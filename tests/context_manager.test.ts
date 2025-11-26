import { describe, it, expect, beforeEach } from 'vitest';
import { ContextManager, ContextItem, ContextTier } from '../src/context_manager';

describe('Context Manager', () => {
    let contextManager: ContextManager;

    beforeEach(() => {
        contextManager = new ContextManager();
    });

    describe('Token Counting', () => {
        it('should count tokens in a string', () => {
            const text = 'Hello world, this is a test.';
            const tokens = contextManager.countTokens(text);
            expect(tokens).toBeGreaterThan(0);
            expect(typeof tokens).toBe('number');
        });

        it('should count tokens in file content', () => {
            const content = `function hello() {
                console.log('Hello');
            }`;
            const tokens = contextManager.countTokens(content);
            expect(tokens).toBeGreaterThan(0);
        });

        it('should handle empty string (0 tokens)', () => {
            const tokens = contextManager.countTokens('');
            expect(tokens).toBe(0);
        });

        it('should handle special characters correctly', () => {
            const text = 'const x = { foo: "bar", baz: [1, 2, 3] };';
            const tokens = contextManager.countTokens(text);
            expect(tokens).toBeGreaterThan(0);
        });
    });

    describe('Context Tiering', () => {
        it('should classify context as high priority (current file, direct dependencies)', () => {
            const item: ContextItem = {
                content: 'function main() {}',
                source: 'src/index.ts',
                type: 'current_file'
            };
            const tier = contextManager.classifyTier(item);
            expect(tier).toBe(ContextTier.HIGH);
        });

        it('should classify context as medium priority (related files, imports)', () => {
            const item: ContextItem = {
                content: 'export function helper() {}',
                source: 'src/utils.ts',
                type: 'import'
            };
            const tier = contextManager.classifyTier(item);
            expect(tier).toBe(ContextTier.MEDIUM);
        });

        it('should classify context as low priority (other project files)', () => {
            const item: ContextItem = {
                content: 'export const VERSION = "1.0.0"',
                source: 'src/config.ts',
                type: 'other'
            };
            const tier = contextManager.classifyTier(item);
            expect(tier).toBe(ContextTier.LOW);
        });

        it('should prioritize higher tier context when budget limited', () => {
            contextManager.setBudget(100); // Very small budget

            contextManager.addContext({
                content: 'Low priority content that is quite long',
                source: 'other.ts',
                type: 'other'
            });
            contextManager.addContext({
                content: 'High priority',
                source: 'current.ts',
                type: 'current_file'
            });

            const result = contextManager.getContext();
            expect(result.some(item => item.source === 'current.ts')).toBe(true);
        });
    });

    describe('Budget Management', () => {
        it('should respect maximum token budget (default 8000)', () => {
            expect(contextManager.getBudget()).toBe(8000);
        });

        it('should allow custom budget setting', () => {
            contextManager.setBudget(4000);
            expect(contextManager.getBudget()).toBe(4000);
        });

        it('should truncate low priority context first when over budget', () => {
            contextManager.setBudget(200);

            // Add low priority first
            contextManager.addContext({
                content: 'A'.repeat(500), // Large low priority
                source: 'other.ts',
                type: 'other'
            });

            // Add high priority second
            contextManager.addContext({
                content: 'High priority content',
                source: 'main.ts',
                type: 'current_file'
            });

            const result = contextManager.getContext();
            const totalTokens = contextManager.getTotalTokens();
            expect(totalTokens).toBeLessThanOrEqual(200);

            // High priority should be included
            const hasHighPriority = result.some(item => item.source === 'main.ts');
            expect(hasHighPriority).toBe(true);
        });

        it('should never exceed budget even with high priority content', () => {
            contextManager.setBudget(50);

            contextManager.addContext({
                content: 'A'.repeat(1000), // Very large
                source: 'main.ts',
                type: 'current_file'
            });

            const totalTokens = contextManager.getTotalTokens();
            expect(totalTokens).toBeLessThanOrEqual(50);
        });
    });

    describe('Relevance Ranking', () => {
        it('should rank files by relevance to query', () => {
            contextManager.addContext({
                content: 'function processUser() {}',
                source: 'user.ts',
                type: 'other'
            });
            contextManager.addContext({
                content: 'function processOrder() {}',
                source: 'order.ts',
                type: 'other'
            });

            const ranked = contextManager.rankByRelevance('user');
            expect(ranked[0].source).toBe('user.ts');
        });

        it('should rank recently accessed files higher', () => {
            contextManager.addContext({
                content: 'const old = 1',
                source: 'old.ts',
                type: 'other',
                lastAccessed: Date.now() - 10000
            });
            contextManager.addContext({
                content: 'const recent = 2',
                source: 'recent.ts',
                type: 'other',
                lastAccessed: Date.now()
            });

            const ranked = contextManager.rankByRecency();
            expect(ranked[0].source).toBe('recent.ts');
        });

        it('should rank files mentioned in query highest', () => {
            contextManager.addContext({
                content: 'function foo() {}',
                source: 'src/utils.ts',
                type: 'other'
            });
            contextManager.addContext({
                content: 'function bar() {}',
                source: 'src/helpers.ts',
                type: 'other'
            });

            const ranked = contextManager.rankByRelevance('helpers');
            expect(ranked[0].source).toContain('helpers');
        });

        it('should combine relevance scores with tier priority', () => {
            contextManager.addContext({
                content: 'relevant content for search',
                source: 'low.ts',
                type: 'other'
            });
            contextManager.addContext({
                content: 'unrelated',
                source: 'high.ts',
                type: 'current_file'
            });

            const ranked = contextManager.rankCombined('search');
            // High tier should still win even with lower relevance
            expect(ranked[0].source).toBe('high.ts');
        });
    });

    describe('Integration', () => {
        it('should provide context for agent', () => {
            contextManager.addContext({
                content: 'function main() { console.log("hello"); }',
                source: 'index.ts',
                type: 'current_file'
            });

            const context = contextManager.getContextForAgent();
            expect(context).toContain('index.ts');
            expect(context).toContain('function main');
        });

        it('should track context usage per turn', () => {
            contextManager.addContext({
                content: 'content 1',
                source: 'file1.ts',
                type: 'other'
            });
            contextManager.markUsed('file1.ts');

            const usage = contextManager.getUsageStats();
            expect(usage.filesUsed).toContain('file1.ts');
            expect(usage.totalTurns).toBe(1);
        });
    });

    describe('Clear and Reset', () => {
        it('should clear all context', () => {
            contextManager.addContext({
                content: 'test',
                source: 'test.ts',
                type: 'other'
            });
            contextManager.clear();
            expect(contextManager.getContext().length).toBe(0);
        });

        it('should reset to default budget', () => {
            contextManager.setBudget(1000);
            contextManager.reset();
            expect(contextManager.getBudget()).toBe(8000);
        });
    });
});
