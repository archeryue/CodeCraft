import { describe, it, expect, beforeEach } from 'vitest';
import { PlanningEngine, PlanStep, ExecutionPlan } from '../src/planning-engine';

describe('Planning Engine', () => {
    let planningEngine: PlanningEngine;

    beforeEach(() => {
        planningEngine = new PlanningEngine();
    });

    describe('Phase 1 - Understand', () => {
        it('should parse user intent from message', () => {
            const result = planningEngine.understand('Fix the bug in auth.ts');
            expect(result.intent).toBe('debug');
        });

        it('should extract mentioned entities (files, functions, classes)', () => {
            const result = planningEngine.understand('Refactor the User class in src/models/user.ts');
            expect(result.entities.files).toContain('src/models/user.ts');
            expect(result.entities.classes).toContain('User');
        });

        it('should identify constraints from message', () => {
            const result = planningEngine.understand('Add login feature without breaking existing tests');
            expect(result.constraints).toContain('without breaking existing tests');
        });

        it('should determine success criteria', () => {
            const result = planningEngine.understand('Make the tests pass for the auth module');
            expect(result.successCriteria).toContain('tests pass');
        });
    });

    describe('Phase 2 - Plan', () => {
        it('should create todo list for multi-step tasks', () => {
            const understanding = {
                intent: 'implement',
                entities: { files: ['src/auth.ts'], classes: [], functions: [] },
                constraints: [],
                successCriteria: []
            };

            const plan = planningEngine.plan(understanding, 'Implement user authentication');
            expect(plan.steps.length).toBeGreaterThan(0);
            expect(plan.steps[0]).toHaveProperty('description');
            expect(plan.steps[0]).toHaveProperty('status');
        });

        it('should estimate token usage per step', () => {
            const understanding = {
                intent: 'implement',
                entities: { files: ['src/auth.ts'], classes: [], functions: [] },
                constraints: [],
                successCriteria: []
            };

            const plan = planningEngine.plan(understanding, 'Add new feature');
            expect(plan.steps[0]).toHaveProperty('estimatedTokens');
            expect(typeof plan.steps[0].estimatedTokens).toBe('number');
        });

        it('should identify dependencies between steps', () => {
            const understanding = {
                intent: 'implement',
                entities: { files: ['src/auth.ts', 'src/user.ts'], classes: [], functions: [] },
                constraints: [],
                successCriteria: []
            };

            const plan = planningEngine.plan(understanding, 'Implement auth with user model');
            const hasDependencies = plan.steps.some(step =>
                step.dependencies && step.dependencies.length > 0
            );
            expect(hasDependencies).toBe(true);
        });

        it('should order steps by dependency', () => {
            const understanding = {
                intent: 'implement',
                entities: { files: [], classes: [], functions: [] },
                constraints: [],
                successCriteria: []
            };

            const plan = planningEngine.plan(understanding, 'Create database, add models, write API');
            // Steps with no dependencies should come first
            const firstStep = plan.steps[0];
            expect(firstStep.dependencies?.length || 0).toBe(0);
        });
    });

    describe('Phase 3 - Execute', () => {
        it('should execute steps in planned order', async () => {
            const plan: ExecutionPlan = {
                steps: [
                    { id: '1', description: 'Read file', status: 'pending', estimatedTokens: 100 },
                    { id: '2', description: 'Edit file', status: 'pending', estimatedTokens: 200, dependencies: ['1'] }
                ],
                totalEstimatedTokens: 300
            };

            const executedOrder: string[] = [];
            await planningEngine.execute(plan, async (step) => {
                executedOrder.push(step.id);
                return { success: true, result: 'done' };
            });

            expect(executedOrder).toEqual(['1', '2']);
        });

        it('should build context from previous step results', async () => {
            const plan: ExecutionPlan = {
                steps: [
                    { id: '1', description: 'Read config', status: 'pending', estimatedTokens: 100 },
                    { id: '2', description: 'Use config', status: 'pending', estimatedTokens: 100, dependencies: ['1'] }
                ],
                totalEstimatedTokens: 200
            };

            let step2Context: any = null;
            await planningEngine.execute(plan, async (step, context) => {
                if (step.id === '1') {
                    return { success: true, result: { config: 'value' } };
                }
                step2Context = context;
                return { success: true, result: 'done' };
            });

            expect(step2Context?.previousResults['1']?.config).toBe('value');
        });

        it('should track step success/failure', async () => {
            const plan: ExecutionPlan = {
                steps: [
                    { id: '1', description: 'Failing step', status: 'pending', estimatedTokens: 100 }
                ],
                totalEstimatedTokens: 100
            };

            await planningEngine.execute(plan, async () => {
                return { success: false, error: 'Something went wrong' };
            });

            expect(plan.steps[0].status).toBe('failed');
        });

        it('should retry failed steps (max 3 attempts)', async () => {
            const plan: ExecutionPlan = {
                steps: [
                    { id: '1', description: 'Flaky step', status: 'pending', estimatedTokens: 100 }
                ],
                totalEstimatedTokens: 100
            };

            let attempts = 0;
            await planningEngine.execute(plan, async () => {
                attempts++;
                if (attempts < 3) {
                    return { success: false, error: 'Transient error', retryable: true };
                }
                return { success: true, result: 'done' };
            });

            expect(attempts).toBe(3);
            expect(plan.steps[0].status).toBe('completed');
        });

        it('should ask user if stuck after retries', async () => {
            const plan: ExecutionPlan = {
                steps: [
                    { id: '1', description: 'Always fails', status: 'pending', estimatedTokens: 100 }
                ],
                totalEstimatedTokens: 100
            };

            let askedUser = false;
            await planningEngine.execute(plan, async () => {
                return { success: false, error: 'Permanent failure', retryable: true };
            }, {
                onStuck: () => { askedUser = true; }
            });

            expect(askedUser).toBe(true);
        });
    });

    describe('Phase 4 - Reflect', () => {
        it('should note lessons learned from execution', async () => {
            const plan: ExecutionPlan = {
                steps: [
                    { id: '1', description: 'Test step', status: 'pending', estimatedTokens: 100 }
                ],
                totalEstimatedTokens: 100
            };

            await planningEngine.execute(plan, async () => {
                return { success: true, result: 'done' };
            });

            const reflection = planningEngine.reflect(plan);
            expect(reflection.lessonsLearned).toBeDefined();
            expect(reflection.lessonsLearned.length).toBeGreaterThanOrEqual(0);
        });

        it('should identify patterns for future tasks', async () => {
            const plan: ExecutionPlan = {
                steps: [
                    { id: '1', description: 'Read file', status: 'completed', estimatedTokens: 100 },
                    { id: '2', description: 'Edit file', status: 'completed', estimatedTokens: 200 }
                ],
                totalEstimatedTokens: 300
            };

            const reflection = planningEngine.reflect(plan);
            expect(reflection.patterns).toBeDefined();
        });
    });

    describe('Integration', () => {
        it('should maintain planning state across turns', () => {
            planningEngine.understand('Add feature X');
            const plan = planningEngine.getCurrentPlan();

            // Simulate turn
            planningEngine.startNewTurn();

            const planAfterTurn = planningEngine.getCurrentPlan();
            expect(planAfterTurn).toBeDefined();
        });

        it('should persist plans to todo_write format', () => {
            const understanding = {
                intent: 'implement',
                entities: { files: [], classes: [], functions: [] },
                constraints: [],
                successCriteria: []
            };

            const plan = planningEngine.plan(understanding, 'Test task');
            const todos = planningEngine.toTodoFormat(plan);

            expect(Array.isArray(todos)).toBe(true);
            expect(todos[0]).toHaveProperty('content');
            expect(todos[0]).toHaveProperty('status');
            expect(todos[0]).toHaveProperty('activeForm');
        });
    });
});
