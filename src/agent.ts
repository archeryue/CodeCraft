import { GoogleGenerativeAI, GenerativeModel, ChatSession } from '@google/generative-ai';
import { TOOLS, executeTool } from './tools.js';
import { classifyIntent, Intent } from './intent_classifier.js';
import { ContextManager } from './context_manager.js';
import { PlanningEngine } from './planning_engine.js';
import { ErrorRecovery, ErrorType } from './error_recovery.js';

export class Agent {
    private genAI: GoogleGenerativeAI;
    private model: GenerativeModel;
    private chatSession: ChatSession | null = null;
    private currentIntent: Intent | null = null;

    // Week 5: Advanced Agent Loop components
    private contextManager: ContextManager;
    private planningEngine: PlanningEngine;
    private errorRecovery: ErrorRecovery;

    constructor(apiKey: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            tools: TOOLS as any
        });

        // Initialize Week 5 components
        this.contextManager = new ContextManager();
        this.planningEngine = new PlanningEngine();
        this.errorRecovery = new ErrorRecovery();
    }

    start() {
        this.chatSession = this.model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: `You are CodeCraft, a CLI-based AI coding assistant.

You have access to these tools:
- read_file(path, offset?, limit?) - Read file contents
- write_file(path, content) - Create or overwrite files
- edit_file(path, old_string, new_string) - Edit files efficiently
- run_command(command) - Execute shell commands
- get_codebase_map(path) - Get project structure
- search_code(query, path?) - Find functions/classes
- todo_write(todos) - Track multi-step tasks

Guidelines:
- Use tools proactively to answer questions about code/files
- Be concise but helpful - aim for clear, direct responses
- For multi-step tasks (3+ steps), use todo_write to track progress
- After making code changes, run tests with run_command
- Follow existing code conventions - read files first to understand style
- Never add comments unless asked
- IMPORTANT: Always respond with either tool calls OR text. Never return empty responses.
- When user confirms an action, proceed immediately with the task using tools

When working on tasks:
1. Use tools to gather information
2. Create todos for multi-step work
3. Make changes using edit_file or write_file
4. Verify with tests
5. Mark todos complete

Example workflow for "run function with params X and Y":
1. Create temp test file with the function call
2. Run it with run_command (npx tsx temp_file.ts)
3. Delete the temp file with run_command (rm temp_file.ts)
4. Show the user the result
` }]
                },
                {
                    role: "model",
                    parts: [{ text: "Understood. I am CodeCraft, ready to assist. I will always respond with either tool calls or explanatory text, and proceed immediately when user confirms actions." }]
                }
            ],
        });
    }

    async chat(message: string, confirm?: (diff: string) => Promise<boolean>): Promise<string> {
        if (message.startsWith('/')) {
            const [command, ...args] = message.split(' ');
            switch (command.toLowerCase()) {
                case '/clear':
                    this.start(); // Re-initialize chat
                    return "Context cleared.";
                case '/help':
                    return `Available Commands:
  /clear    - Clear the chat context and history
  /help     - Show this help message
  /save     - Return chat history
  exit      - Quit the application`;
                case '/save':
                     if (!this.chatSession) return "No active session.";
                     const history = await this.chatSession.getHistory();
                     return JSON.stringify(history, null, 2);
                default:
                    return `Unknown command: ${command}`;
            }
        }

        if (!this.chatSession) throw new Error("Chat session not started");

        // Phase 1: Understand - Parse intent and extract entities
        this.currentIntent = classifyIntent(message);
        const understanding = this.planningEngine.understand(message);
        console.log(`\x1b[36m[Intent] ${this.currentIntent.intent} (scope: ${this.currentIntent.scope}, confidence: ${this.currentIntent.confidence.toFixed(2)})\x1b[0m`);

        // Phase 2: Plan - Create execution plan for complex tasks
        if (this.currentIntent.scope === 'multi_file' || this.currentIntent.scope === 'whole_project') {
            const plan = this.planningEngine.plan(understanding, message);
            if (plan.steps.length > 2) {
                console.log(`\x1b[33m[Plan] Created ${plan.steps.length} steps (est. ${plan.totalEstimatedTokens} tokens)\x1b[0m`);
            }
        }

        // Reset error recovery for new conversation turn
        this.errorRecovery.clearHistory();

        let result = await this.chatSession.sendMessage(message);
        let response = result.response;

        let iterations = 0;
        const maxIterations = 10;

        // Phase 3: Execute - Loop for tool calls with error recovery
        while (iterations < maxIterations) {
            const calls = response.functionCalls();

            if (calls && calls.length > 0) {
                console.log(`\x1b[35m[Tool Calls] ${calls.length} tool(s) called\x1b[0m`);

                // Check for loops before executing
                if (this.errorRecovery.detectLoop()) {
                    const loopType = this.errorRecovery.getLoopType();
                    console.log(`\x1b[31m[Loop Detected] ${loopType} pattern - suggesting alternative\x1b[0m`);
                    const alternative = this.errorRecovery.suggestAlternative();
                    console.log(`\x1b[33m[Suggestion] Try ${alternative.tool}: ${alternative.reason}\x1b[0m`);
                }

                const toolParts = [];
                for (const call of calls) {
                    // Record action for loop detection
                    this.errorRecovery.recordAction({ tool: call.name, params: call.args as Record<string, any> });

                    // Track context for file reads
                    if (call.name === 'read_file' && call.args) {
                        const args = call.args as { path?: string };
                        if (args.path) {
                            this.contextManager.markUsed(args.path);
                        }
                    }

                    const toolResult = await executeTool(call.name, call.args, confirm);

                    // Check for errors and record failures
                    if (toolResult.startsWith('Error:')) {
                        this.errorRecovery.recordFailure(
                            { tool: call.name, params: call.args as Record<string, any> },
                            { type: ErrorType.UNKNOWN, message: toolResult }
                        );

                        // Check if we should ask user for help
                        if (this.errorRecovery.shouldAskUser()) {
                            console.log(`\x1b[31m[Error Recovery] Multiple failures detected - may need user guidance\x1b[0m`);
                        }
                    } else {
                        // Track successful file reads in context
                        if (call.name === 'read_file' && call.args) {
                            const args = call.args as { path?: string };
                            if (args.path) {
                                this.contextManager.addContext({
                                    content: toolResult.slice(0, 500), // First 500 chars
                                    source: args.path,
                                    type: 'current_file'
                                });
                            }
                        }
                    }

                    toolParts.push({
                        functionResponse: {
                            name: call.name,
                            response: { content: toolResult }
                        }
                    });
                }
                result = await this.chatSession.sendMessage(toolParts);
                response = result.response;
                iterations++;
            } else {
                break;
            }
        }

        // Log context usage stats
        const stats = this.contextManager.getUsageStats();
        if (stats.filesUsed.length > 0) {
            console.log(`\x1b[36m[Context] ${stats.filesUsed.length} files accessed, ${this.contextManager.getTotalTokens()} tokens used\x1b[0m`);
        }

        const finalText = response.text();
        if (!finalText || finalText.trim().length === 0) {
            console.log('\x1b[31m[Warning] Empty response from model after', iterations, 'tool iterations\x1b[0m');
            if (iterations === 0) {
                return "I apologize, but I encountered an issue generating a response. Could you please rephrase your request or try again?";
            }
        }
        return finalText;
    }
}