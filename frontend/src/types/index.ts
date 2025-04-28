export type MessageRole = 'user' | 'assistant' | 'system';


export interface Message extends MessageCreate {
  id: string;
  created_at: string; // Add created_at property
  timestamp: Date;
  role: MessageRole;
  content: string;
  model: string;
}

export interface MessageCreate {
  content: string;
  model: string;
}

export interface Conversation {
  id: string;
  title: string | null;
  user_id: string;
  // messages: Message[]; // Messages are fetched separately
  // lastUpdated: Date; // Add if needed
  // model: string; // Add if needed
}

export interface ApiKey {
  id: string; // Add id property
  provider: string;
  key: string;
}

export interface McpConfig {
  id: string;
  name: string;
  url: string;
}

export interface McpTool {
  name: string;
  description: string;
  server: string;
}

export interface Model {
  id: string;
  name: string;
  provider: string;
  description: string;
  requiresApiKey: boolean;
}

export interface ChatCompletionRequest {
  conversationId?: string; // Optional conversation ID
  model: string;
  message: string; // Send single message content
  apiKey: string;
}

export interface ChatCompletionResponse {
  conversation_id: string;
  message: Message;
}


export const AVAILABLE_MODELS: Model[] = [
  {
    id: 'gemini-2.5-flash-preview-04-17',
    name: 'Gemini 2.5 Flash',
    provider: 'google',
    description: 'Google\'s fastest Gemini model',
    requiresApiKey: true
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    description: 'Google\'s efficient Gemini model',
    requiresApiKey: true
  },
  {
    id: 'gemini-2.5-pro-preview-03-25',
    name: 'Gemini 2.5 Pro',
    provider: 'google',
    description: 'Google\'s advanced Gemini model',
    requiresApiKey: true
  },
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'openai',
    description: 'OpenAI\'s most advanced model, GPT-4',
    requiresApiKey: true
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    description: 'OpenAI\'s efficient and cost-effective model',
    requiresApiKey: true
  },
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    description: 'Anthropic\'s most powerful model',
    requiresApiKey: true
  },
  {
    id: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    provider: 'anthropic',
    description: 'Anthropic\'s balanced model for performance and efficiency',
    requiresApiKey: true
  },
  {
    id: 'llama-3-70b',
    name: 'Llama 3 (70B)',
    provider: 'meta',
    description: 'Meta\'s largest open model',
    requiresApiKey: true
  }
];
