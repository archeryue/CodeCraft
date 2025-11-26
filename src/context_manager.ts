export enum ContextTier {
    HIGH = 3,    // Current file, direct dependencies
    MEDIUM = 2,  // Related files, imports
    LOW = 1      // Other project files
}

export interface ContextItem {
    content: string;
    source: string;
    type: 'current_file' | 'import' | 'dependency' | 'other';
    tokens?: number;
    tier?: ContextTier;
    lastAccessed?: number;
    relevanceScore?: number;
}

interface UsageStats {
    filesUsed: string[];
    totalTurns: number;
    tokenUsage: number[];
}

export class ContextManager {
    private items: ContextItem[] = [];
    private budget: number = 8000;
    private usageStats: UsageStats = {
        filesUsed: [],
        totalTurns: 0,
        tokenUsage: []
    };

    countTokens(text: string): number {
        if (!text || text.length === 0) return 0;
        // Simple approximation: ~4 characters per token for code
        // This is a rough estimate - in production you'd use tiktoken or similar
        const words = text.split(/\s+/).filter(w => w.length > 0);
        const chars = text.length;
        // Hybrid: use both word count and character count
        return Math.max(1, Math.ceil((words.length + chars / 4) / 2));
    }

    classifyTier(item: ContextItem): ContextTier {
        switch (item.type) {
            case 'current_file':
            case 'dependency':
                return ContextTier.HIGH;
            case 'import':
                return ContextTier.MEDIUM;
            case 'other':
            default:
                return ContextTier.LOW;
        }
    }

    setBudget(budget: number): void {
        this.budget = budget;
    }

    getBudget(): number {
        return this.budget;
    }

    addContext(item: ContextItem): void {
        item.tokens = this.countTokens(item.content);
        item.tier = this.classifyTier(item);
        item.lastAccessed = item.lastAccessed || Date.now();
        this.items.push(item);
    }

    getContext(): ContextItem[] {
        // Sort by tier (HIGH first), then by lastAccessed
        const sorted = [...this.items].sort((a, b) => {
            const tierDiff = (b.tier || 0) - (a.tier || 0);
            if (tierDiff !== 0) return tierDiff;
            return (b.lastAccessed || 0) - (a.lastAccessed || 0);
        });

        // Apply budget constraints
        const result: ContextItem[] = [];
        let totalTokens = 0;

        for (const item of sorted) {
            const itemTokens = item.tokens || 0;
            if (totalTokens + itemTokens <= this.budget) {
                result.push(item);
                totalTokens += itemTokens;
            } else if (item.tier === ContextTier.HIGH) {
                // For high priority, truncate content if needed
                const remainingBudget = this.budget - totalTokens;
                if (remainingBudget > 10) {
                    const truncatedContent = this.truncateToTokens(item.content, remainingBudget);
                    result.push({ ...item, content: truncatedContent, tokens: remainingBudget });
                    totalTokens = this.budget;
                }
                break;
            }
        }

        return result;
    }

    private truncateToTokens(content: string, maxTokens: number): string {
        // Approximate: truncate to ~4 chars per token
        const maxChars = maxTokens * 4;
        if (content.length <= maxChars) return content;
        return content.slice(0, maxChars) + '... (truncated)';
    }

    getTotalTokens(): number {
        const context = this.getContext();
        return context.reduce((sum, item) => sum + (item.tokens || 0), 0);
    }

    rankByRelevance(query: string): ContextItem[] {
        const queryLower = query.toLowerCase();
        const queryWords = queryLower.split(/\s+/);

        return [...this.items]
            .map(item => {
                let score = 0;
                const sourceLower = item.source.toLowerCase();
                const contentLower = item.content.toLowerCase();

                // Check if source matches query
                for (const word of queryWords) {
                    if (sourceLower.includes(word)) score += 10;
                    if (contentLower.includes(word)) score += 5;
                }

                return { ...item, relevanceScore: score };
            })
            .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
    }

    rankByRecency(): ContextItem[] {
        return [...this.items].sort((a, b) =>
            (b.lastAccessed || 0) - (a.lastAccessed || 0)
        );
    }

    rankCombined(query: string): ContextItem[] {
        const queryLower = query.toLowerCase();
        const queryWords = queryLower.split(/\s+/);

        return [...this.items]
            .map(item => {
                let score = 0;

                // Tier score (most important)
                score += (item.tier || 1) * 100;

                // Relevance score
                const sourceLower = item.source.toLowerCase();
                const contentLower = item.content.toLowerCase();
                for (const word of queryWords) {
                    if (sourceLower.includes(word)) score += 10;
                    if (contentLower.includes(word)) score += 5;
                }

                // Recency score (minor factor)
                const recencyBonus = Math.min(10, (Date.now() - (item.lastAccessed || 0)) / 1000 / 60);
                score -= recencyBonus;

                return { ...item, relevanceScore: score };
            })
            .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
    }

    getContextForAgent(): string {
        const context = this.getContext();
        return context.map(item =>
            `=== ${item.source} ===\n${item.content}`
        ).join('\n\n');
    }

    markUsed(source: string): void {
        const item = this.items.find(i => i.source === source);
        if (item) {
            item.lastAccessed = Date.now();
        }
        if (!this.usageStats.filesUsed.includes(source)) {
            this.usageStats.filesUsed.push(source);
        }
        this.usageStats.totalTurns++;
        this.usageStats.tokenUsage.push(this.getTotalTokens());
    }

    getUsageStats(): UsageStats {
        return { ...this.usageStats };
    }

    clear(): void {
        this.items = [];
    }

    reset(): void {
        this.items = [];
        this.budget = 8000;
        this.usageStats = {
            filesUsed: [],
            totalTurns: 0,
            tokenUsage: []
        };
    }
}
