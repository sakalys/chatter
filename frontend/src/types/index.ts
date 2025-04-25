export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  model?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  lastUpdated: Date;
  model: string;
}

export interface ApiKey {
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

export const AVAILABLE_MODELS: Model[] = [
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
