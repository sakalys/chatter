import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { Message, ApiKey } from '../../types'; // Import ApiKey type
import { modelService } from '../../services/modelService';
import { useLlm } from '../../context/LlmContext';
import { ApiKeyManagerModal } from '../ui/ApiKeyManagerModal';

interface ChatInterfaceProps {
  setIsCreatingNewConversation: (isCreating: boolean) => void;
}

export function ChatInterface({ setIsCreatingNewConversation }: ChatInterfaceProps) {
  const { conversationId: routeConversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();

  const [conversationId, setConversationId] = useState<string | undefined>(routeConversationId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { selectedLlm } = useLlm();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]); // New state for API keys
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4'); // Add selectedModel state

  // Get unique providers from API keys
  const configuredProviders = [...new Set(apiKeys.map(key => key.provider))];

  // Handle model change
  const handleModelChange = (modelId: string) => {
    console.log('Model changed to:', modelId);
    setSelectedModel(modelId);
  };

  // Fetch messages if conversationId is in the URL and fetch API keys
  useEffect(() => {
    const fetchData = async () => {
      // Fetch messages
      if (conversationId) {
        try {
          const authToken = localStorage.getItem('authToken');
          if (!authToken) {
            console.warn('Authentication token not found in local storage.');
            // Depending on the application flow, you might want to redirect to login here
            return; // Stop fetching if no token
          }
          const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/conversations/${conversationId}/messages`, {
            headers: {
              'Authorization': `Bearer ${authToken}`, // Include auth token
            },
          });
          if (!response.ok) {
            throw new Error(`Error fetching messages: ${response.statusText}`);
          }
          const data: Message[] = await response.json();
          setMessages(data);
        } catch (error) {
          console.error('Error fetching messages:', error);
          // Handle error, maybe show an error message to the user
        }
      } else {
        // Start with a welcome message for a new conversation
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            content: 'Hello! How can I help you today?',
            timestamp: new Date(),
            created_at: new Date().toISOString(),
            model: selectedLlm?.id || 'GPT-4'
          }
        ]);
      }

      // Fetch API keys
      try {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
          console.warn('Authentication token not found in local storage.');
          // Depending on the application flow, you might want to redirect to login here
          return; // Stop fetching if no token
        }
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/api-keys/`, {
          headers: {
            'Authorization': `Bearer ${authToken}`, // Include auth token
          },
        });
        if (!response.ok) {
          throw new Error(`Error fetching API keys: ${response.statusText}`);
        }
        const keys: ApiKey[] = await response.json();
        setApiKeys(keys);
      } catch (error) {
        console.error('Error fetching API keys:', error);
        // Optionally, display an error message to the user
      }
    };

    fetchData();
  }, [conversationId, selectedLlm?.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    // Prevent sending message if API keys are not loaded
    if (apiKeys.length === 0) {
      console.warn('API keys not loaded yet. Cannot send message.');
      // Optionally, show a user-facing message
      return;
    }

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}-${messages.length}`, // More unique key
      role: 'user',
      content,
      timestamp: new Date(),
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // If it's a new conversation, set the state in MainLayout to show the placeholder
    if (!conversationId) {
      setIsCreatingNewConversation(true);
    }

    try {
      // Determine which provider's API key to use based on selectedModel
      let provider = 'openai';
      if (selectedModel.startsWith('claude-')) {
        provider = 'anthropic';
      } else if (selectedModel.startsWith('llama-')) {
        provider = 'meta';
      } else if (selectedModel.startsWith('gemini-')) {
        provider = 'google';
      }

      // Find the API key ID for the selected provider
      const apiKey = apiKeys.find(key => key.provider === provider);

      if (!apiKey) {
        console.error(`API key not found for provider: ${provider}`);
        setIsApiKeyModalOpen(true); // Prompt user to enter API key
        setIsLoading(false);
        return; // Stop processing if API key is missing
      }

      console.log('Sending chat completion request with API Key ID:', apiKey.id); // Log API key ID

      // Call the model service
      const response = await modelService.sendChatCompletion({
        conversationId: conversationId,
        model: selectedModel,
        message: content,
        apiKey: apiKey.id // Pass the API key ID
      });

      // If it was a new conversation, update the URL and state with the new conversation ID
      if (!conversationId && response.conversation_id) {
        setConversationId(response.conversation_id);
        navigate(`/chat/${response.conversation_id}`, { replace: true });
        setIsCreatingNewConversation(false); // Hide placeholder
      }

      // Add assistant message
      const assistantMessage: Message = {
        id: response.message.id || `assistant-${Date.now()}-${messages.length + 1}`, // More unique key
        role: 'assistant',
        content: response.message.content,
        timestamp: new Date(response.message.created_at),
        created_at: response.message.created_at,
        model: response.message.model || selectedModel
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      // Handle error
      const errorMessage: Message = {
        id: `system-${Date.now()}-${messages.length + 1}`, // More unique key for errors
        role: 'system',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        created_at: new Date().toISOString(),
      };

      setMessages(prev => [...prev, errorMessage]);
      setIsCreatingNewConversation(false); // Hide placeholder on error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with Conversation Title and LLM Selector */}
      <div className="p-4 flex items-center justify-between border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-800">{conversationId ? `Conversation ${conversationId.substring(0, 8)}...` : 'New Conversation'}</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="pb-4">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              role={message.role}
              content={message.content}
              timestamp={message.timestamp}
              model={message.model}
            />
          ))}
          {isLoading && (
            <ChatMessage
              role="assistant"
              content={
                <div className="flex items-center">
                  <div className="h-2 w-2 bg-gray-500 rounded-full animate-bounce"></div>
                  <div className="h-2 w-2 bg-gray-500 rounded-full animate-bounce mx-1" style={{ animationDelay: '0.2s' }}></div>
                  <div className="h-2 w-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              }
            />
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <ChatInput
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        apiKeysLoaded={apiKeys.length > 0}
        configuredProviders={configuredProviders}
        selectedModel={selectedModel}
        onModelChange={handleModelChange}
      />
      {/* API Key Manager Modal */}
      <ApiKeyManagerModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
      />
    </div>
  );
}
