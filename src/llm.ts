/**
 * Shared LLM configuration for both main application and evaluation system
 */

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

/**
 * LLM configuration options
 */
export interface LLMConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  tools?: any[];
}

/**
 * Default model name used across the application
 */
export const DEFAULT_MODEL = 'gemini-2.5-flash';

/**
 * Create a configured LLM client
 *
 * This ensures the same model and configuration is used in both:
 * - The main CLI application (src/agent.ts)
 * - The evaluation system (run-llm-evals.ts)
 */
export function createLLM(config: LLMConfig): GenerativeModel {
  const genAI = new GoogleGenerativeAI(config.apiKey);

  const modelConfig: any = {
    model: config.model || DEFAULT_MODEL
  };

  // Add tools if provided
  if (config.tools && config.tools.length > 0) {
    modelConfig.tools = config.tools;
  }

  // Add generation config if temperature is specified
  if (config.temperature !== undefined) {
    modelConfig.generationConfig = {
      temperature: config.temperature
    };
  }

  return genAI.getGenerativeModel(modelConfig);
}

/**
 * Create LLM for evaluation (deterministic with temperature=0)
 */
export function createEvalLLM(apiKey: string, tools?: any[]): GenerativeModel {
  return createLLM({
    apiKey,
    model: DEFAULT_MODEL,
    temperature: 0, // Deterministic for evaluation
    tools
  });
}
