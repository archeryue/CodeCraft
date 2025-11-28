import { describe, it, expect } from 'vitest';
import { executeTool } from '../src/tool-setup.js';

describe('todo_write tool', () => {
    it('should accept array of todos and return confirmation', async () => {
        const result = await executeTool('TodoWrite', {
            todos: [
                { content: "Task 1", status: "completed", activeForm: "Completing task 1" },
                { content: "Task 2", status: "in_progress", activeForm: "Working on task 2" },
                { content: "Task 3", status: "pending", activeForm: "Starting task 3" }
            ]
        });

        expect(result).toContain('Updated');
        expect(result).toContain('3 tasks');
    });

    it('should validate status values', async () => {
        const result = await executeTool('TodoWrite', {
            todos: [
                { content: "Task 1", status: "invalid_status", activeForm: "Doing task 1" }
            ]
        });

        expect(result).toContain('Error');
        expect(result).toContain('status');
    });

    it('should require all required fields', async () => {
        const result = await executeTool('TodoWrite', {
            todos: [
                { content: "Task 1", status: "pending" }  // missing activeForm
            ]
        });

        expect(result).toContain('Error');
        expect(result).toContain('activeForm');
    });

    it('should handle empty todos array', async () => {
        const result = await executeTool('TodoWrite', {
            todos: []
        });

        expect(result).toContain('Updated');
        expect(result).toContain('0 tasks');
    });

    it('should handle single todo', async () => {
        const result = await executeTool('TodoWrite', {
            todos: [
                { content: "Single task", status: "in_progress", activeForm: "Working on single task" }
            ]
        });

        expect(result).toContain('Updated');
        expect(result).toContain('1 task');
    });

    it('should show current task status breakdown', async () => {
        const result = await executeTool('TodoWrite', {
            todos: [
                { content: "Task 1", status: "completed", activeForm: "Completing task 1" },
                { content: "Task 2", status: "completed", activeForm: "Completing task 2" },
                { content: "Task 3", status: "in_progress", activeForm: "Working on task 3" },
                { content: "Task 4", status: "pending", activeForm: "Starting task 4" },
                { content: "Task 5", status: "pending", activeForm: "Starting task 5" }
            ]
        });

        expect(result).toContain('5 tasks');
        expect(result).toContain('2 completed');
        expect(result).toContain('1 in progress');
        expect(result).toContain('2 pending');
    });
});
