import { Message, MessageRole } from '../types';

interface ChatCompletionRequest {
  model: string;
  messages: {
    role: MessageRole;
    content: string;
  }[];
  apiKey: string;
}

interface ChatCompletionResponse {
  id: string;
  model: string;
  content: string;
}

// This is a mock service that simulates API calls to different model providers
// In a real application, this would make actual API calls to OpenAI, Anthropic, etc.
export const modelService = {
  // Send a chat completion request to the appropriate model provider
  async sendChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const { model, messages, apiKey } = request;
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if API key is provided
    if (!apiKey) {
      throw new Error(`API key is required for model ${model}`);
    }
    
    // Determine which provider to use based on the model
    if (model.startsWith('gpt-')) {
      return this.mockOpenAIResponse(model, messages);
    } else if (model.startsWith('claude-')) {
      return this.mockAnthropicResponse(model, messages);
    } else if (model.startsWith('llama-')) {
      return this.mockMetaResponse(model, messages);
    } else {
      throw new Error(`Unsupported model: ${model}`);
    }
  },
  
  // Mock OpenAI API response
  mockOpenAIResponse(model: string, messages: { role: MessageRole; content: string }[]): ChatCompletionResponse {
    const lastMessage = messages[messages.length - 1];
    
    return {
      id: `chatcmpl-${Date.now()}`,
      model,
      content: `This is a simulated response from ${model} to your message: "${lastMessage.content}"`
    };
  },
  
  // Mock Anthropic API response
  mockAnthropicResponse(model: string, messages: { role: MessageRole; content: string }[]): ChatCompletionResponse {
    const lastMessage = messages[messages.length - 1];
    
    return {
      id: `msg-${Date.now()}`,
      model,
      content: `This is a simulated response from ${model} to your message: "${lastMessage.content}"`
    };
  },
  
  // Mock Meta API response
  mockMetaResponse(model: string, messages: { role: MessageRole; content: string }[]): ChatCompletionResponse {
    const lastMessage = messages[messages.length - 1];
    
    return {
      id: `llama-${Date.now()}`,
      model,
      content: `This is a simulated response from ${model} to your message: "${lastMessage.content}"`
    };
  }
};
