import { describe, it, expect, vi } from 'vitest';
import { Agent } from '../src/agent';

// Reuse the mock setup
const mockChat = {
  sendMessage: vi.fn().mockResolvedValue({
    response: {
      text: () => "Response",
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

describe('Agent Commands', () => {
  it('should handle /clear command', async () => {
    const agent = new Agent('key');
    agent.start();
    
    console.log("Testing /clear..."); 
    const response = await agent.chat('/clear');
    
    expect(response).toBe('Context cleared.');
  });

  it('should handle /help command', async () => {
      const agent = new Agent('key');
      agent.start();
      const response = await agent.chat('/help');
      expect(response).toContain('/clear');
      expect(response).toContain('/help');
  });
});
