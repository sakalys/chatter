import { MessageRole } from "../components/chat/ChatMessage";

export interface MCPToolUse {
    id: string;
    name: string;
    state: 'pending' | 'completed' | 'failed';
    args: {
        [key: string]: string | number | boolean | null;
    }
}

export interface Message extends MessageCreate {
    id: string;
    role: MessageRole;
    content: string;
    model: string;
    mcp_tool_use: MCPToolUse | null
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
    id: string
    name: string
    code: string
    url: string
}

export interface PreconfiguredMcpTool {
    name: string
    description: string | null
}

export interface PreconfiguredMcpConfig {
    code: string
    name?: string
    enabled: boolean
    tools: PreconfiguredMcpTool[]
}

export interface McpTool {
    name: string;
    description: string;
    server: string;
}

export interface Model {
    id: string;
    name: string;
    provider: LLMProvider
    description: string;
    requiresApiKey: boolean;
    supportToolCalling?: boolean
    reasoning?: boolean // is a resoning model
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

export enum LLMProvider {
    Gemini = 'gemini',
    OpenAI = 'openai',
    Anthropic = 'anthropic',
    XAi = 'xai',
    Deepseek = 'deepseek',
}

export const AVAILABLE_MODELS: Model[] = [
    {
        id: 'gemini-2.5-flash-preview-04-17',
        name: 'Gemini 2.5 Flash',
        provider: LLMProvider.Gemini,
        description: 'Google\'s fastest Gemini model',
        requiresApiKey: true
    },
    {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        provider: LLMProvider.Gemini,
        description: 'Google\'s efficient Gemini model',
        requiresApiKey: true
    },
    {
        id: 'gemini-2.5-pro-preview-05-06',
        name: 'Gemini 2.5 Pro',
        provider: LLMProvider.Gemini,
        description: 'Google\'s advanced Gemini model',
        requiresApiKey: true
    },
    {
        id: 'gpt-4.1',
        name: 'GPT-4.1',
        provider: LLMProvider.OpenAI,
        description: 'OpenAI\'s model with advanced capabilities',
        requiresApiKey: true
    },
    {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: LLMProvider.OpenAI,
        description: '',
        requiresApiKey: true
    },
    {
        id: 'claude-3-7-sonnet-latest',
        name: 'Claude 3.7 Sonnet',
        provider: LLMProvider.Anthropic,
        description: '',
        requiresApiKey: true
    },
    {
        id: 'claude-3-5-sonnet-latest',
        name: 'Claude 3.5 Sonnet',
        provider: LLMProvider.Anthropic,
        description: '',
        requiresApiKey: true
    },
    {
        id: 'claude-3-5-haiku-latest',
        name: 'Claude 3.5 Haiku',
        provider: LLMProvider.Anthropic,
        description: '',
        requiresApiKey: true
    },
    {
        id: 'grok-3-latest',
        name: 'Grok 3',
        provider: LLMProvider.XAi,
        description: '',
        requiresApiKey: true
    },
    {
        id: 'deepseek-chat',
        name: 'Deepseek Chat',
        provider: LLMProvider.Deepseek,
        description: '',
        requiresApiKey: true
    },
    // { // not sure what to do with this one
    //   id: 'deepseek-code',
    //   name: 'Deepseek Coder',
    //   provider: LLMProvider.Deepseek,
    //   description: '',
    //   requiresApiKey: true
    // },
    {
        id: 'deepseek-reasoner',
        name: 'Deepseek Reasoner',
        provider: LLMProvider.Deepseek,
        description: '',
        requiresApiKey: true,
        reasoning: true,
        supportToolCalling: false,
    },
];

export function findModelById(id: string): Model | null {
    return AVAILABLE_MODELS.find(model => model.id === id) || null;
}
