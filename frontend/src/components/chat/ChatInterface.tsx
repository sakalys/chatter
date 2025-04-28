import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChatMessage, IncomingMessage, OutgoingMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { Message, ApiKey, MessageCreate } from '../../types'; // Import ApiKey type
import { ApiKeyManagerModal } from '../ui/ApiKeyManagerModal';
import { toast } from 'react-toastify';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../util/api';

interface ChatInterfaceProps {
}

const fetchMessages = async (conversationId: string | undefined): Promise<Message[]> => {
  if (!conversationId) {
    return [];
  }
  return apiFetch<Message[]>('GET', `/conversations/${conversationId}/messages`);
};

const fetchApiKeys = async (): Promise<ApiKey[]> => {
  return apiFetch<ApiKey[]>('GET', '/api-keys/');
};


export function ChatInterface({ }: ChatInterfaceProps) {
  const { conversationId: routeConversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();

  const [conversationId, setConversationId] = useState<string | undefined>(routeConversationId);
  const [messages, setMessages] = useState<(Message)[]>([]);
  const [outgoingMessage, setOutgoingMessage] = useState<MessageCreate | null>(null);
  const [incomingMessage, setIncomingMessage] = useState<{message: string, model: string} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash-preview-04-17'); // Add selectedModel state

  // Fetch messages using React Query
  const { data: fetchedMessages, error: messagesError, isLoading: isLoadingMessages } = useQuery<Message[], Error>({
    queryKey: ['messages', conversationId],
    queryFn: () => fetchMessages(conversationId),
    enabled: true, // Always enabled, fetchMessages handles the conversationId logic
    staleTime: 5 * 60 * 1000, // Data is considered fresh for 5 minutes
  });

  // Fetch API keys using React Query
  const { data: apiKeys, error: apiKeysError, isLoading: isLoadingApiKeys } = useQuery<ApiKey[], Error>({
    queryKey: ['apiKeys'],
    queryFn: fetchApiKeys,
    staleTime: 5 * 60 * 1000, // Data is considered fresh for 5 minutes
  });


  // Update messages state when fetchedMessages changes
  useEffect(() => {
    if (fetchedMessages) {
      setMessages(fetchedMessages);
    }
  }, [fetchedMessages]);

  // Get unique providers from API keys
  const configuredProviders = [...new Set(apiKeys?.map(key => key.provider) || [])];

  // Handle model change
  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
  };

  // Update conversationId when route parameter changes
  useEffect(() => {
    setConversationId(routeConversationId);
  }, [routeConversationId]);

  const handleSendMessage = async (content: string) => {
    // Prevent sending message if API keys are not loaded
    if (!apiKeys || apiKeys.length === 0) {
      console.warn('API keys not loaded yet. Cannot send message.');
      // Optionally, show a user-facing message
      return;
    }

    // Add user message
    const userMessage: MessageCreate = {
      model: selectedModel,
      content,
    };
    setOutgoingMessage(userMessage);
    setIncomingMessage({message: '', model: selectedModel});
    setIsLoading(true);

    // If it's a new conversation, set the state in MainLayout to show the placeholder
    if (!conversationId) {
      // setIsCreatingNewConversation(true);
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
        toast.error(`API key not found for provider: ${provider}`);
        setIsApiKeyModalOpen(true); // Prompt user to enter API key
        setIsLoading(false);
        return; // Stop processing if API key is missing
      }

      const authToken = localStorage.getItem('authToken'); // Get auth token
      if (!authToken) {
        toast.error('Authentication token not found in local storage.');
        setIsApiKeyModalOpen(true); // Prompt user to enter API key
        setIsLoading(false);
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
        let newConversationId = conversationId; // Keep track of the new conversation ID - Moved outside the loop

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log('Stream finished');
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          console.log(buffer)

          // Process complete SSE messages in the buffer
          const events = buffer.split('\r\n');
          buffer = events.pop() || ''; // Keep the last potentially incomplete event in the buffer

          events.forEach(event => {
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

            // let newConversationId = conversationId; // Keep track of the new conversation ID - Moved outside the loop

            if (eventType === 'conversation_created' && eventData) {
              // Store the new conversation ID, but don't navigate yet
              newConversationId = eventData;
              // setIsCreatingNewConversation(false); // Hide placeholder once ID is received - moved to 'done'
            } else if (eventType === 'message' && eventData) {

              // Assuming the data is the text chunk
              setMessages(prev => {
                // const updatedMessages = prev.map(msg =>
                //   msg.id === assistantMessageId ? { ...msg, content: msg.content + eventData } : msg // Append content
                // );
                // return updatedMessages;
                return prev;
              });
            } else if (eventType === 'done') {
              // The stream is finished, no more data for this message
              setIsLoading(false); // Stop loading when done

              // Navigate and update state only after the stream is done
              // Use newConversationId explicitly for navigation and state update
              if (!conversationId && newConversationId) {
                 navigate(`/chat/${newConversationId}`);
                 setConversationId(newConversationId);
                //  setIsCreatingNewConversation(false); // Hide placeholder after navigation
              } else {
                //  setIsCreatingNewConversation(false); // Hide placeholder if it was set for an existing conversation
              }
            }
            // Handle other event types if needed
          });
        }

        // After the stream is done, the message is complete in the state
        // setIsLoading(false); // This is now handled by the done event
        // setIsCreatingNewConversation(false); // This is now handled by conversation_created event

      } catch (fetchError) { // Catch errors from the fetch and streaming process
        toast.error('Error: ' + (fetchError instanceof Error ? fetchError.message : 'Unknown error'));
        // Re-throw the error to be caught by the outer catch block
        throw fetchError;
      }
    } catch (error) {
      // Handle error for both streaming and non-streaming
      console.error('Error sending message:', error);
      setIsLoading(false); // Stop loading on error
      // setIsCreatingNewConversation(false); // Hide placeholder on error
      const errorMessage: Message = {
        id: `system-${Date.now()}-${messages.length + 1}`, // More unique key for errors
        role: 'system',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        created_at: new Date().toISOString(),
        model: selectedModel,
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
              id={message.id}
              key={message.id}
              role={message.role}
              content={message.content}
              timestamp={message.timestamp}
              model={message.model}
            />
          ))}
          {outgoingMessage && (
            <OutgoingMessage
              content={outgoingMessage.content}
              model={outgoingMessage.model}
            />
          )}
            {incomingMessage !== null && (
              <IncomingMessage
                incomingMessage={incomingMessage.message}
                model={incomingMessage.model}
              />
            )}
          </div>
      </div>
      <ChatInput
        onSendMessage={handleSendMessage}
        isLoading={isLoading || isLoadingMessages || isLoadingApiKeys}
        apiKeysLoaded={apiKeys !== undefined && apiKeys.length > 0}
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

export function Nl2p ({ text }: { text: string }) {
  return (
    <div className="prose prose-sm">
      {/* make paragraphs out of text */}
      {text.split('\n').map((line, index) => (
        <p key={index} className="mb-2">{line}</p>
      ))}
    </div>
  );
}
