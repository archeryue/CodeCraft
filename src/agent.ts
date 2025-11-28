import { GoogleGenerativeAI, GenerativeModel, ChatSession } from '@google/generative-ai';
import { TOOLS, executor, createToolContext } from './tool-setup.js';
import { classifyIntent, Intent } from './intent-classifier.js';
import { ContextManager } from './context-manager.js';
import { PlanningEngine } from './planning-engine.js';
import { ErrorRecovery, ErrorType } from './error-recovery.js';
import type { ToolResult } from './types/tool.js';
import { ToolResultFormatter } from './tool-result-formatter.js';
import * as fs from 'fs';
import * as path from 'path';

// Import analysis tools for /init command (not in registry)
import { detectProjectTypeTool } from './tools/detect-project-type.js';
import { extractConventionsTool } from './tools/extract-conventions.js';
import { getProjectOverviewTool } from './tools/get-project-overview.js';

// Agent iteration configuration
interface IterationConfig {
    maxIterations: number;
    warningThresholds: {
        first: number;
        second: number;
        final: number;
    };
}

// Default iteration configuration
const DEFAULT_ITERATION_CONFIG: IterationConfig = {
    maxIterations: 16,
    warningThresholds: {
        first: 10,   // First warning at 10 iterations
        second: 13,  // Second warning at 13 iterations
        final: 15    // Final warning at 15 iterations (one before max)
    }
};

export class Agent {
    private genAI: GoogleGenerativeAI;
    private model: GenerativeModel;
    private chatSession: ChatSession | null = null;
    private currentIntent: Intent | null = null;

    // Week 5: Advanced Agent Loop components
    private contextManager: ContextManager;
    private planningEngine: PlanningEngine;
    private errorRecovery: ErrorRecovery;

    // BC-004: Guardrails to prevent excessive repetition
    private fileReadCounts: Map<string, number> = new Map();

    // Iteration configuration
    private iterationConfig: IterationConfig;
    private toolResultFormatter: ToolResultFormatter;

    constructor(apiKey: string, config?: Partial<IterationConfig>) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            tools: TOOLS as any
        });

        // Initialize iteration configuration
        this.iterationConfig = {
            maxIterations: config?.maxIterations ?? DEFAULT_ITERATION_CONFIG.maxIterations,
            warningThresholds: {
                first: config?.warningThresholds?.first ?? DEFAULT_ITERATION_CONFIG.warningThresholds.first,
                second: config?.warningThresholds?.second ?? DEFAULT_ITERATION_CONFIG.warningThresholds.second,
                final: config?.warningThresholds?.final ?? DEFAULT_ITERATION_CONFIG.warningThresholds.final
            }
        };

        // Initialize Week 5 components
        this.contextManager = new ContextManager();
        this.planningEngine = new PlanningEngine();
        this.errorRecovery = new ErrorRecovery();
        this.toolResultFormatter = new ToolResultFormatter();
    }

    /**
     * Execute a tool and return formatted result
     * Exposed for testing purposes
     */
    private async executeTool(name: string, args: any): Promise<string> {
        const context = createToolContext();
        const result = await executor.executeWithContext(name, args, context);
        return this.toolResultFormatter.formatToolResult(result);
    }

    start() {
        // Load CRAFT.md if it exists
        let craftContext = '';
        const craftPath = path.join(process.cwd(), 'CRAFT.md');
        if (fs.existsSync(craftPath)) {
            try {
                const craftContent = fs.readFileSync(craftPath, 'utf-8');
                craftContext = `\n\n## Project Context (from CRAFT.md)\n${craftContent}\n`;
            } catch (err) {
                // Silently ignore if can't read CRAFT.md
            }
        }

        this.chatSession = this.model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: `You are CodeCraft, a CLI-based AI coding assistant.${craftContext}

You have access to 17 tools:

File Operations:
- ReadFile(path, offset?, limit?) - Read file contents (supports partial reads with offset/limit)
- WriteFile(path, content) - Create or overwrite files
- EditFile(path, old_string, new_string) - Edit files with string replacement
- DeleteFile(path) - Delete a file

Directory & Search:
- ListDirectory(path?) - List files and directories (filters hidden files)
- Glob(pattern, path?) - File pattern matching (e.g., "**/*.ts", "src/**/*.tsx")
- Grep(pattern, path?, options?) - Text search with regex (case insensitive with -i, context with -A/-B/-C)

Code Analysis (AST-based):
- GetCodebaseMap(path?) - Generate AST skeleton of codebase (functions, classes, interfaces)
- SearchCode(query, path?) - Fuzzy search for symbols/code patterns (e.g., "Agent", "executeTool")
- InspectSymbol(symbol, file, mode?) - Inspect symbol details or resolve definition location
- GetImportsExports(file) - Show what a file imports and exports
- BuildDependencyGraph(path?) - Generate project-wide dependency graph
- FindReferences(symbol, path?) - Find all usages of a symbol

Command Execution:
- Bash(command, timeout?, run_in_background?) - Execute shell commands (supports background processes)
- BashOutput(bash_id) - Read incremental output from background process
- KillBash(bash_id) - Terminate a background process

Task Management:
- TodoWrite(todos) - Track multi-step tasks (required for tasks with 3+ steps)

Guidelines:
- For finding code (functions, classes, symbols): use SearchCode (AST-based, fuzzy matching)
- For finding text (strings, comments, error messages): use Grep (text-based, regex)
- For file discovery: use Glob for patterns, ListDirectory for browsing
- For understanding code: GetCodebaseMap for structure, InspectSymbol for details
- Use tools proactively to answer questions about code/files
- Be concise but helpful - aim for clear, direct responses
- For multi-step tasks (3+ steps), use TodoWrite to track progress
- After making code changes, run tests with Bash
- Follow existing code conventions - read files first to understand style
- Never add comments unless asked
- IMPORTANT: Always respond with either tool calls OR text. Never return empty responses.
- When user confirms an action, proceed immediately with the task using tools

When working on tasks:
1. Use tools to gather information
2. Create todos for multi-step work (TodoWrite)
3. Make changes using EditFile or WriteFile
4. Verify with tests (Bash)
5. Mark todos complete

Example workflow for "run function with params X and Y":
1. Use WriteFile to create temp test file with the function call
2. Run it with Bash (npx tsx temp_file.ts)
3. Delete the temp file with DeleteFile
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
  /init     - Generate CRAFT.md with project analysis
  /save     - Return chat history
  exit      - Quit the application`;
                case '/init':
                    try {
                        // Create tool context for analysis tools
                        const toolContext = createToolContext();

                        // Call analysis tools directly (not via registry)
                        const projectTypeResult = await detectProjectTypeTool.execute({ path: '.' }, toolContext);
                        const conventionsResult = await extractConventionsTool.execute({ path: '.' }, toolContext);
                        const overviewResult = await getProjectOverviewTool.execute({ path: '.' }, toolContext);

                        // Check for errors
                        if (!projectTypeResult.success || !conventionsResult.success || !overviewResult.success) {
                            const errors = [
                                !projectTypeResult.success ? projectTypeResult.error?.message : null,
                                !conventionsResult.success ? conventionsResult.error?.message : null,
                                !overviewResult.success ? overviewResult.error?.message : null
                            ].filter(Boolean).join('; ');
                            return `Error generating CRAFT.md: ${errors}`;
                        }

                        // Format results
                        const projectType = this.toolResultFormatter.formatToolResult(projectTypeResult);
                        const conventions = this.toolResultFormatter.formatToolResult(conventionsResult);
                        const overview = this.toolResultFormatter.formatToolResult(overviewResult);

                        // Generate CRAFT.md content
                        const craftContent = `# CRAFT.md - CodeCraft Project Analysis

## Project Overview
${overview}

## Technology Stack
${projectType}

## Code Conventions
${conventions}

---
Generated by CodeCraft /init command on ${new Date().toISOString()}
`;

                        // Write to CRAFT.md
                        fs.writeFileSync(path.join(process.cwd(), 'CRAFT.md'), craftContent);

                        return "Project analysis complete. CRAFT.md has been generated. Restart the session to load it into context.";
                    } catch (err: any) {
                        return `Error generating CRAFT.md: ${err.message}`;
                    }
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

        // Reset guardrails for new conversation turn
        this.fileReadCounts.clear();

        // Send message with retry logic for empty responses
        let result = await this.sendWithRetry(message);
        let response = result.response;

        let iterations = 0;
        const maxIterations = this.iterationConfig.maxIterations;
        const toolCallHistory: Array<{tool: string, params: any}> = [];

        // Phase 3: Execute - Loop for tool calls with error recovery
        while (iterations < maxIterations) {
            const calls = response.functionCalls();

            if (calls && calls.length > 0) {
                console.log(`\x1b[35m[Tool Calls] ${calls.length} tool(s) called\x1b[0m`);

                // Iteration limit warnings
                if (iterations === this.iterationConfig.warningThresholds.first) {
                    console.log(`\x1b[33m[Iteration Warning] ${this.iterationConfig.warningThresholds.first} tool calls made - consider summarizing progress or changing approach\x1b[0m`);
                } else if (iterations === this.iterationConfig.warningThresholds.second) {
                    console.log(`\x1b[33m[Iteration Warning] ${this.iterationConfig.warningThresholds.second} tool calls made - please wrap up soon\x1b[0m`);
                } else if (iterations === this.iterationConfig.warningThresholds.final) {
                    console.log(`\x1b[31m[Iteration Warning] ${this.iterationConfig.warningThresholds.final} tool calls made - final iteration, must provide response\x1b[0m`);
                }

                // Check for loops before executing
                if (this.errorRecovery.detectLoop()) {
                    const loopType = this.errorRecovery.getLoopType();
                    console.log(`\x1b[31m[Loop Detected] ${loopType} pattern - suggesting alternative\x1b[0m`);
                    const alternative = this.errorRecovery.suggestAlternative();
                    console.log(`\x1b[33m[Suggestion] Try ${alternative.tool}: ${alternative.reason}\x1b[0m`);
                }

                const toolParts = [];
                for (const call of calls) {
                    // Log individual tool call
                    console.log(`\x1b[33m[Tool Call] ${call.name}\x1b[0m`);

                    // Track for error message generation
                    toolCallHistory.push({ tool: call.name, params: call.args });

                    // Record action for loop detection
                    this.errorRecovery.recordAction({ tool: call.name, params: call.args as Record<string, any> });

                    // Track context for file reads and apply guardrails
                    if (call.name === 'read_file' && call.args) {
                        const args = call.args as { path?: string };
                        if (args.path) {
                            this.contextManager.markUsed(args.path);

                            // Guardrail: Track file read count
                            const count = this.fileReadCounts.get(args.path) || 0;
                            this.fileReadCounts.set(args.path, count + 1);

                            // Warn if same file read 3+ times
                            if (count + 1 >= 3) {
                                console.log(`\x1b[33m[Guardrail Warning] File ${args.path} has been read ${count + 1} times - consider using grep or a different approach\x1b[0m`);
                            }
                        }
                    }

                    // Execute tool using new architecture
                    const context = createToolContext(confirm);
                    const result = await executor.executeWithContext(call.name, call.args, context);
                    const toolResult = this.toolResultFormatter.formatToolResult(result);

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

            // Generate helpful error message when hitting iteration limit
            return this.generateIterationLimitMessage(toolCallHistory, this.errorRecovery.detectLoop());
        }
        return finalText;
    }

    /**
     * Send message to LLM with retry logic for empty responses
     * Retries up to 3 times with exponential backoff
     */
    private async sendWithRetry(message: string, maxRetries = 3): Promise<any> {
        let lastError: Error | null = null;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const result = await this.chatSession!.sendMessage(message);
                const response = result.response;

                // Check if we got a meaningful response (text or function calls)
                const hasText = response.text() && response.text().trim().length > 0;
                const hasFunctionCalls = response.functionCalls() && response.functionCalls()!.length > 0;

                if (hasText || hasFunctionCalls) {
                    return result;
                }

                // Empty response - log and retry
                console.log(`\x1b[33m[Retry] Empty response from model (attempt ${attempt + 1}/${maxRetries})\x1b[0m`);

                if (attempt < maxRetries - 1) {
                    // Exponential backoff: 1s, 2s, 4s
                    const delay = Math.pow(2, attempt) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            } catch (error) {
                lastError = error as Error;
                console.log(`\x1b[31m[Error] API call failed (attempt ${attempt + 1}/${maxRetries}): ${lastError.message}\x1b[0m`);

                if (attempt < maxRetries - 1) {
                    const delay = Math.pow(2, attempt) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        // All retries exhausted - return the last result or throw
        if (lastError) {
            throw lastError;
        }

        // Return empty response to be handled by caller
        return await this.chatSession!.sendMessage(message);
    }

    private generateIterationLimitMessage(toolCalls: Array<{tool: string, params: any}>, loopDetected: boolean): string {
        const summary = this.summarizeToolCalls(toolCalls);
        const issue = loopDetected
            ? "Loop detected: Repeatedly using same tools without making progress"
            : "Iteration limit reached without completing task";

        const suggestion = this.getSuggestion(toolCalls);

        return `I attempted to complete your request but encountered difficulties:

**Attempted:**
${summary}

**Issue:**
${issue}

**Suggestion:**
${suggestion}

Would you like me to try that, or would you prefer to provide more guidance?`;
    }

    private summarizeToolCalls(toolCalls: Array<{tool: string, params: any}>): string {
        const summary: Record<string, number> = {};

        for (const call of toolCalls) {
            const key = call.tool;
            summary[key] = (summary[key] || 0) + 1;
        }

        const lines: string[] = [];
        for (const [tool, count] of Object.entries(summary)) {
            if (count === 1) {
                lines.push(`- Called ${tool}`);
            } else {
                lines.push(`- Called ${tool} ${count} times`);
            }
        }

        return lines.length > 0 ? lines.join('\n') : "- No tool calls were made";
    }

    private getSuggestion(toolCalls: Array<{tool: string, params: any}>): string {
        if (toolCalls.length === 0) {
            return "Try a different approach or ask for clarification";
        }

        const lastCall = toolCalls[toolCalls.length - 1];

        switch (lastCall.tool) {
            case 'ReadFile':
                return "Try using Grep to search for specific patterns instead of reading entire files";
            case 'Grep':
            case 'SearchCode':
                return "Try reading the full file or asking for clarification about what to search for";
            case 'EditFile':
                return "Re-read the file to verify the exact content before attempting to edit";
            default:
                return "Let me know what you'd like me to focus on, or try a different approach";
        }
    }
}