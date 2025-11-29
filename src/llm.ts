/**
 * Shared LLM configuration for both main application and evaluation system
 */

import { GoogleGenerativeAI, GenerativeModel, ChatSession } from '@google/generative-ai';
import { generateSystemPrompt } from './system-prompt-template.js';
import type { Tool } from './types/tool.js';

/**
 * LLM configuration options
 */
export interface LLMConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  tools?: any[]; // Tool declarations for Gemini
  systemPrompt?: string; // Optional custom system prompt
  craftContext?: string; // Optional CRAFT.md context
}

/**
 * Default model name used across the application
 */
export const DEFAULT_MODEL = 'gemini-2.5-flash';

/**
 * LLM class that encapsulates model creation and chat session management
 */
export class LLM {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private chatSession: ChatSession | null = null;

  constructor(config: LLMConfig) {
    this.genAI = new GoogleGenerativeAI(config.apiKey);

    const modelConfig: any = {
      model: config.model || DEFAULT_MODEL
    };

    // Add tools if provided
    if (config.tools && config.tools.length > 0) {
      modelConfig.tools = config.tools;
    }

    // Add system instruction if provided
    if (config.systemPrompt) {
      modelConfig.systemInstruction = {
        parts: [{ text: config.systemPrompt }],
        role: "user"
      };
    }

    // Add generation config if temperature is specified
    if (config.temperature !== undefined) {
      modelConfig.generationConfig = {
        temperature: config.temperature
      };
    }

    this.model = this.genAI.getGenerativeModel(modelConfig);
  }

  /**
   * Get the underlying GenerativeModel
   */
  getModel(): GenerativeModel {
    return this.model;
  }

  /**
   * Start a new chat session
   */
  startChat(history: any[] = []): ChatSession {
    this.chatSession = this.model.startChat({ history });
    return this.chatSession;
  }

  /**
   * Get the current chat session (if any)
   */
  getChatSession(): ChatSession | null {
    return this.chatSession;
  }
}

/**
 * Create LLM for the main agent with all tools and system prompt
 */
export function createAgentLLM(
  apiKey: string,
  tools: Tool[],
  toolDeclarations: any[],
  craftContext: string = ''
): LLM {
  // Generate system prompt (tools are already provided via function calling)
  const systemPrompt = generateSystemPrompt(craftContext);

  return new LLM({
    apiKey,
    model: DEFAULT_MODEL,
    tools: toolDeclarations,
    systemPrompt
  });
}

/**
 * Create LLM for evaluation (deterministic with temperature=0)
 * Can optionally specify a subset of tools
 */
export function createEvalLLM(
  apiKey: string,
  tools: Tool[],
  toolDeclarations: any[]
): LLM {
  // Generate system prompt (tools are already provided via function calling)
  const systemPrompt = generateSystemPrompt();

  return new LLM({
    apiKey,
    model: DEFAULT_MODEL,
    temperature: 0, // Deterministic for evaluation
    tools: toolDeclarations,
    systemPrompt
  });
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use createEvalLLM instead
 */
export function createLLM(config: LLMConfig): GenerativeModel {
  const llm = new LLM(config);
  return llm.getModel();
}
