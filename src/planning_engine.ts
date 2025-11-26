import { classifyIntent, IntentResult } from './intent_classifier';

export interface PlanStep {
    id: string;
    description: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    estimatedTokens: number;
    dependencies?: string[];
    result?: any;
    error?: string;
    retryCount?: number;
}

export interface ExecutionPlan {
    steps: PlanStep[];
    totalEstimatedTokens: number;
}

export interface Understanding {
    intent: string;
    entities: {
        files: string[];
        classes: string[];
        functions: string[];
    };
    constraints: string[];
    successCriteria: string[];
}

export interface StepResult {
    success: boolean;
    result?: any;
    error?: string;
    retryable?: boolean;
}

export interface ExecutionContext {
    previousResults: Record<string, any>;
}

export interface ExecutionOptions {
    onStuck?: () => void;
    maxRetries?: number;
}

export interface Reflection {
    lessonsLearned: string[];
    patterns: string[];
    recommendations: string[];
}

export class PlanningEngine {
    private currentPlan: ExecutionPlan | null = null;
    private understanding: Understanding | null = null;

    understand(message: string): Understanding {
        // Use existing intent classifier
        const intentResult = classifyIntent(message);

        // Extract entities from message
        const entities = this.extractEntities(message);

        // Extract constraints
        const constraints = this.extractConstraints(message);

        // Extract success criteria
        const successCriteria = this.extractSuccessCriteria(message);

        this.understanding = {
            intent: intentResult.intent,
            entities,
            constraints,
            successCriteria
        };

        return this.understanding;
    }

    private extractEntities(message: string): { files: string[], classes: string[], functions: string[] } {
        const files: string[] = [];
        const classes: string[] = [];
        const functions: string[] = [];

        // Extract file paths (e.g., src/utils.ts, ./index.js)
        const filePattern = /(?:^|[\s,])([a-zA-Z0-9_\-./]+\.[a-zA-Z]{2,4})(?:[\s,]|$)/g;
        let match;
        while ((match = filePattern.exec(message)) !== null) {
            files.push(match[1]);
        }

        // Extract class names (PascalCase words after "class" or standalone)
        const classPattern = /\b(?:the\s+)?([A-Z][a-zA-Z0-9]+)\s+(?:class|component|model)/gi;
        while ((match = classPattern.exec(message)) !== null) {
            classes.push(match[1]);
        }

        // Also find PascalCase words that might be classes
        const pascalPattern = /\b([A-Z][a-z]+(?:[A-Z][a-z]+)+)\b/g;
        while ((match = pascalPattern.exec(message)) !== null) {
            if (!classes.includes(match[1])) {
                classes.push(match[1]);
            }
        }

        // Extract function names (camelCase after "function" or standalone)
        const funcPattern = /\b(?:the\s+)?([a-z][a-zA-Z0-9]+)\s*(?:\(|function)/gi;
        while ((match = funcPattern.exec(message)) !== null) {
            functions.push(match[1]);
        }

        return { files, classes, functions };
    }

    private extractConstraints(message: string): string[] {
        const constraints: string[] = [];
        const lowerMessage = message.toLowerCase();

        // Look for constraint patterns
        const patterns = [
            /without\s+(?:breaking|changing|modifying)\s+([^.]+)/gi,
            /must\s+(?:not|keep|maintain)\s+([^.]+)/gi,
            /don't\s+([^.]+)/gi,
            /preserve\s+([^.]+)/gi
        ];

        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(message)) !== null) {
                constraints.push(match[0].trim());
            }
        }

        return constraints;
    }

    private extractSuccessCriteria(message: string): string[] {
        const criteria: string[] = [];
        const lowerMessage = message.toLowerCase();

        // Look for success criteria patterns
        if (lowerMessage.includes('tests pass')) {
            criteria.push('tests pass');
        }
        if (lowerMessage.includes('no errors')) {
            criteria.push('no errors');
        }
        if (lowerMessage.includes('compile') || lowerMessage.includes('build')) {
            criteria.push('builds successfully');
        }
        if (lowerMessage.includes('works') || lowerMessage.includes('working')) {
            criteria.push('feature works as expected');
        }

        return criteria;
    }

    plan(understanding: Understanding, task: string): ExecutionPlan {
        const steps: PlanStep[] = [];
        let stepId = 1;

        // Generate steps based on intent
        switch (understanding.intent) {
            case 'implement':
                steps.push(
                    { id: String(stepId++), description: 'Analyze requirements', status: 'pending', estimatedTokens: 500 },
                    { id: String(stepId++), description: 'Search for relevant files', status: 'pending', estimatedTokens: 300, dependencies: ['1'] },
                    { id: String(stepId++), description: 'Read existing code', status: 'pending', estimatedTokens: 1000, dependencies: ['2'] },
                    { id: String(stepId++), description: 'Implement feature', status: 'pending', estimatedTokens: 2000, dependencies: ['3'] },
                    { id: String(stepId++), description: 'Run tests', status: 'pending', estimatedTokens: 500, dependencies: ['4'] }
                );
                break;
            case 'debug':
                steps.push(
                    { id: String(stepId++), description: 'Understand the bug', status: 'pending', estimatedTokens: 500 },
                    { id: String(stepId++), description: 'Locate bug source', status: 'pending', estimatedTokens: 800, dependencies: ['1'] },
                    { id: String(stepId++), description: 'Apply fix', status: 'pending', estimatedTokens: 1000, dependencies: ['2'] },
                    { id: String(stepId++), description: 'Verify fix', status: 'pending', estimatedTokens: 500, dependencies: ['3'] }
                );
                break;
            case 'refactor':
                steps.push(
                    { id: String(stepId++), description: 'Analyze current code', status: 'pending', estimatedTokens: 800 },
                    { id: String(stepId++), description: 'Plan refactoring', status: 'pending', estimatedTokens: 500, dependencies: ['1'] },
                    { id: String(stepId++), description: 'Apply changes', status: 'pending', estimatedTokens: 1500, dependencies: ['2'] },
                    { id: String(stepId++), description: 'Verify tests pass', status: 'pending', estimatedTokens: 500, dependencies: ['3'] }
                );
                break;
            case 'explain':
                steps.push(
                    { id: String(stepId++), description: 'Read relevant code', status: 'pending', estimatedTokens: 1000 },
                    { id: String(stepId++), description: 'Analyze structure', status: 'pending', estimatedTokens: 500, dependencies: ['1'] },
                    { id: String(stepId++), description: 'Generate explanation', status: 'pending', estimatedTokens: 800, dependencies: ['2'] }
                );
                break;
            default:
                steps.push(
                    { id: String(stepId++), description: 'Analyze task', status: 'pending', estimatedTokens: 500 },
                    { id: String(stepId++), description: 'Execute task', status: 'pending', estimatedTokens: 1000, dependencies: ['1'] }
                );
        }

        const totalEstimatedTokens = steps.reduce((sum, s) => sum + s.estimatedTokens, 0);

        this.currentPlan = { steps, totalEstimatedTokens };
        return this.currentPlan;
    }

    async execute(
        plan: ExecutionPlan,
        stepExecutor: (step: PlanStep, context: ExecutionContext) => Promise<StepResult>,
        options: ExecutionOptions = {}
    ): Promise<void> {
        const maxRetries = options.maxRetries ?? 3;
        const context: ExecutionContext = { previousResults: {} };

        // Sort steps by dependencies
        const sortedSteps = this.topologicalSort(plan.steps);

        for (const step of sortedSteps) {
            step.status = 'in_progress';
            step.retryCount = 0;

            let success = false;
            while (!success && (step.retryCount || 0) < maxRetries) {
                const result = await stepExecutor(step, context);

                if (result.success) {
                    step.status = 'completed';
                    step.result = result.result;
                    context.previousResults[step.id] = result.result;
                    success = true;
                } else {
                    step.retryCount = (step.retryCount || 0) + 1;
                    step.error = result.error;

                    if (!result.retryable || step.retryCount >= maxRetries) {
                        step.status = 'failed';
                        if (options.onStuck) {
                            options.onStuck();
                        }
                        break;
                    }
                }
            }
        }
    }

    private topologicalSort(steps: PlanStep[]): PlanStep[] {
        const result: PlanStep[] = [];
        const visited = new Set<string>();
        const stepMap = new Map(steps.map(s => [s.id, s]));

        const visit = (step: PlanStep) => {
            if (visited.has(step.id)) return;
            visited.add(step.id);

            // Visit dependencies first
            for (const depId of step.dependencies || []) {
                const dep = stepMap.get(depId);
                if (dep) visit(dep);
            }

            result.push(step);
        };

        for (const step of steps) {
            visit(step);
        }

        return result;
    }

    reflect(plan: ExecutionPlan): Reflection {
        const lessonsLearned: string[] = [];
        const patterns: string[] = [];
        const recommendations: string[] = [];

        // Analyze execution
        const completedSteps = plan.steps.filter(s => s.status === 'completed');
        const failedSteps = plan.steps.filter(s => s.status === 'failed');

        if (failedSteps.length > 0) {
            lessonsLearned.push(`${failedSteps.length} steps failed - may need different approach`);
            for (const step of failedSteps) {
                if (step.error) {
                    lessonsLearned.push(`Step "${step.description}" failed: ${step.error}`);
                }
            }
        }

        if (completedSteps.length === plan.steps.length) {
            patterns.push('All steps completed successfully');
        }

        // Identify common patterns
        const readSteps = plan.steps.filter(s => s.description.toLowerCase().includes('read'));
        const editSteps = plan.steps.filter(s => s.description.toLowerCase().includes('implement') || s.description.toLowerCase().includes('apply'));
        if (readSteps.length > 0 && editSteps.length > 0) {
            patterns.push('Read-then-edit pattern detected');
        }

        return { lessonsLearned, patterns, recommendations };
    }

    getCurrentPlan(): ExecutionPlan | null {
        return this.currentPlan;
    }

    startNewTurn(): void {
        // Keep the plan but reset step statuses for retry
        if (this.currentPlan) {
            for (const step of this.currentPlan.steps) {
                if (step.status === 'failed') {
                    step.status = 'pending';
                    step.retryCount = 0;
                    step.error = undefined;
                }
            }
        }
    }

    toTodoFormat(plan: ExecutionPlan): Array<{ content: string; status: string; activeForm: string }> {
        return plan.steps.map(step => ({
            content: step.description,
            status: step.status === 'completed' ? 'completed' :
                   step.status === 'in_progress' ? 'in_progress' : 'pending',
            activeForm: this.toActiveForm(step.description)
        }));
    }

    private toActiveForm(description: string): string {
        // Convert imperative to gerund form
        const words = description.split(' ');
        if (words.length > 0) {
            const verb = words[0].toLowerCase();
            // Simple verb conjugation
            if (verb.endsWith('e')) {
                words[0] = verb.slice(0, -1) + 'ing';
            } else if (verb.endsWith('y')) {
                words[0] = verb.slice(0, -1) + 'ying';
            } else {
                words[0] = verb + 'ing';
            }
            words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
        }
        return words.join(' ');
    }
}
