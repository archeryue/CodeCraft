import { GoogleGenerativeAI, GenerativeModel, ChatSession } from '@google/generative-ai';
import { TOOLS, executeTool } from './tools.js';

export class Agent {
    private genAI: GoogleGenerativeAI;
    private model: GenerativeModel;
    private chatSession: ChatSession | null = null;

    constructor(apiKey: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            tools: TOOLS as any
        });
    }

    start() {
        this.chatSession = this.model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: "You are CodeCraft, an advanced CLI coding assistant. You have access to tools to read, write, and search the codebase. Always use 'get_codebase_map' first when asked about the project structure. Be concise." }]
                },
                {
                    role: "model",
                    parts: [{ text: "Understood. I am CodeCraft, ready to assist." }]
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

        let result = await this.chatSession.sendMessage(message);
        let response = result.response;

        // Loop for tool calls
        while (true) {
            const calls = response.functionCalls();
            if (calls && calls.length > 0) {
                const toolParts = [];
                for (const call of calls) {
                    // Execute tool
                    const toolResult = await executeTool(call.name, call.args, confirm);
                    toolParts.push({
                        functionResponse: {
                            name: call.name,
                            response: { content: toolResult }
                        }
                    });
                }
                // Send tool results back
                result = await this.chatSession.sendMessage(toolParts);
                response = result.response;
            } else {
                break;
            }
        }

        return response.text();
    }
}