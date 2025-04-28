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
  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash-preview-04-17'); // Add selectedModel state

  // Get unique providers from API keys
  const configuredProviders = [...new Set(apiKeys.map(key => key.provider))];

  // Handle model change
  const handleModelChange = (modelId: string) => {
    console.log('Model changed to:', modelId);
    setSelectedModel(modelId);
  };

  // Update conversationId when route parameter changes
  useEffect(() => {
    setConversationId(routeConversationId);
  }, [routeConversationId]);

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

      // Handle streaming response using EventSource
      const assistantMessageId = `assistant-${Date.now()}-${messages.length + 1}`;
      console.log('Generated assistant message ID:', assistantMessageId); // Log generated ID
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '', // Start with empty content
        timestamp: new Date(),
        created_at: new Date().toISOString(),
        model: selectedModel,
      };
      setMessages(prev => [...prev, assistantMessage]);

      const authToken = localStorage.getItem('authToken'); // Get auth token
      if (!authToken) {
        console.warn('Authentication token not found in local storage.');
        setIsApiKeyModalOpen(true); // Prompt user to enter API key
        setIsLoading(false);
        setIsCreatingNewConversation(false);
        return;
      }

      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/chat/generate`, {
          method: 'POST', // Use POST method
          headers: {
            'Authorization': `Bearer ${authToken}`, // Include Authorization header
            'Content-Type': 'application/json', // Set Content-Type for POST body
          },
          body: JSON.stringify({ // Include parameters in the request body
            conversation_id: conversationId,
            model: selectedModel,
            message: content,
            api_key_id: apiKey.id,
            stream: true, // Request streaming
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`API error: ${response.status} ${response.statusText} - ${errorData.detail}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Failed to get stream reader from response.');
        }

        const decoder = new TextDecoder();
        let buffer = ''; // Buffer to handle incomplete SSE messages

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log('Stream finished');
            break;
          }

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE messages in the buffer
          const events = buffer.split('\r\n');
          buffer = events.pop() || ''; // Keep the last potentially incomplete event in the buffer

          events.forEach(event => {
            console.log('Processing SSE event:', event); // Log the raw event
            const lines = event.split('\n');
            let eventData = '';
            let eventType = '';

            lines.forEach(line => {
              if (line.startsWith('data:')) {
                eventData += line.substring(5).trim();
              } else if (line.startsWith('event:')) {
                eventType = line.substring(6).trim();
              }
              // Ignore other lines like 'id:' or comments
            });

            if (eventType === 'conversation_created' && eventData) {
              console.log('Received conversation_created event with ID:', eventData);
              // Update the URL to include the new conversation ID
              navigate(`/chat/${eventData}`);
              // Update the local state as well
              setConversationId(eventData);
              setIsCreatingNewConversation(false); // Hide placeholder once ID is received
            } else if (eventType === 'message' && eventData) {
              console.log('Extracted data:', eventData); // Log the extracted data
              console.log('Assistant message ID:', assistantMessageId); // Log the assistant message ID
              console.log('Messages state before update:', messages); // Log state before update

              // Assuming the data is the text chunk
              setMessages(prev => {
                const updatedMessages = prev.map(msg =>
                  msg.id === assistantMessageId ? { ...msg, content: msg.content + eventData } : msg // Append content
                );
                console.log('Messages state after update (append):', updatedMessages); // Log state after update
                return updatedMessages;
              });
            } else if (eventType === 'done') {
              console.log('Received done event');
              // The stream is finished, no more data for this message
              setIsLoading(false); // Stop loading when done
              // setIsCreatingNewConversation(false); // This is now handled by conversation_created event
            }
            // Handle other event types if needed
          });
        }

        // After the stream is done, the message is complete in the state
        // setIsLoading(false); // This is now handled by the done event
        // setIsCreatingNewConversation(false); // This is now handled by conversation_created event

      } catch (fetchError) { // Catch errors from the fetch and streaming process
        console.error('Error during fetch or streaming:', fetchError);
        // Re-throw the error to be caught by the outer catch block
        throw fetchError;
      }
    } catch (error) {
      // Handle error for both streaming and non-streaming
      console.error('Error sending message:', error);
      setIsLoading(false); // Stop loading on error
      setIsCreatingNewConversation(false); // Hide placeholder on error
      const errorMessage: Message = {
        id: `system-${Date.now()}-${messages.length + 1}`, // More unique key for errors
        role: 'system',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        created_at: new Date().toISOString(),
      };

      setMessages(prev => [...prev, errorMessage]);
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Header with Conversation Title and LLM Selector */}
      <div className="p-4 flex shrink-0 items-center justify-between border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-800">{conversationId ? `Conversation ${conversationId.substring(0, 8)}...` : 'New Conversation'}</h2>
      </div>

        <div className="flex flex-col-reverse overflow-y-scroll flex-1 relative min-h-0">
          <div>
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              role={message.role}
              content={message.content}
              timestamp={message.timestamp}
              model={message.model}
            />
          ))}
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
