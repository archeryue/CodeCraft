import { describe, it, expect, vi } from 'vitest';
import { Agent } from '../src/agent';
import { TOOLS } from '../src/tool_setup';

// Mock the GoogleGenerativeAI class to avoid making real API calls
const mockChat = {
  sendMessage: vi.fn().mockResolvedValue({
    response: {
      text: () => "I am a mock response",
      functionCalls: () => []
    }
  })
};

const mockModel = {
  startChat: vi.fn().mockReturnValue(mockChat)
};

const mockGenAI = {
  getGenerativeModel: vi.fn().mockReturnValue(mockModel)
};

vi.mock('@google/generative-ai', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as any),
    GoogleGenerativeAI: class {
        constructor() { return mockGenAI; }
    }
  };
});

describe('Agent', () => {
  it('should initialize with API key', () => {
    const agent = new Agent('fake-api-key');
    expect(agent).toBeDefined();
  });

  it('should start a chat session', () => {
    const agent = new Agent('fake-api-key');
    agent.start();
    expect(mockGenAI.getGenerativeModel).toHaveBeenCalled();
    expect(mockModel.startChat).toHaveBeenCalled();
  });

  it('should send a message and return response', async () => {
    const agent = new Agent('fake-api-key');
    agent.start();
    const response = await agent.chat('Hello');
    expect(mockChat.sendMessage).toHaveBeenCalledWith('Hello');
    expect(response).toBe("I am a mock response");
  });
});
