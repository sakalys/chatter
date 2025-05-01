import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChatMessage, IncomingMessage, OutgoingMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { Message, ApiKey, MessageCreate, Model, AVAILABLE_MODELS } from '../../types';
import { ApiKeyManagerModal } from '../ui/ApiKeyManagerModal';
import { toast } from 'react-toastify';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, apiFetchStreaming } from '../../util/api';
import { useNewConversation } from '../../context/NewConversationContext';

interface ChatInterfaceProps {
}

const fetchMessages = async (conversationId: string | undefined): Promise<Message[]> => {
  if (!conversationId) {
    return [];
  }
  return apiFetch<Message[]>('GET', `/conversations/${conversationId}/messages`);
};

const fetchApiKeys = async (): Promise<ApiKey[]> => {
  return apiFetch<ApiKey[]>('GET', '/api-keys');
};


export function ChatInterface({ }: ChatInterfaceProps) {
  const { id: routeConversationId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [conversationId, setConversationId] = useState<string | undefined>(routeConversationId);
  const [messages, setMessages] = useState<(Message)[]>([]);
  const [outgoingMessage, setOutgoingMessage] = useState<MessageCreate | null>(null);
  const [incomingMessage, setIncomingMessage] = useState<{ message: string, model: Model } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [conversationTitle, setConversationTitle] = useState<string>('New Conversation');
  const [selectedModel, setSelectedModel] = useState<Model>(AVAILABLE_MODELS[0]); // Default to the first model
  const { setNewChatState, refetchConversations } = useNewConversation(); // Consume context and setter

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
  const handleModelChange = (model: Model) => {
    setSelectedModel(model);
  };

  // Update conversationId when route parameter changes
  useEffect(() => {
    setConversationId(routeConversationId);
  }, [routeConversationId]);

  // Effect to set newChatState to "no" when navigating to an existing chat route
  useEffect(() => {
    if (!conversationId) {
      setNewChatState("idle");
    }
  }, [conversationId, setNewChatState]);


  const handleSendMessage = async (content: string, toolDecision: boolean | null = null) => {
    // Prevent sending message if API keys are not loaded
    if (!apiKeys || apiKeys.length === 0) {
      console.warn('API keys not loaded yet. Cannot send message.');
      // Optionally, show a user-facing message
      return;
    }

    // Add user message
    const userMessage: MessageCreate = {
      model: selectedModel.id,
      content,
    };
    setOutgoingMessage(userMessage);
    setIncomingMessage({ message: '', model: selectedModel });
    setIsLoading(true);

    // If it's a new conversation, set the state to "creating"
    if (!conversationId) {
      setNewChatState("creating"); // Use context setter
    }

    try {
      // Determine which provider's API key to use based on selectedModel
      const provider = selectedModel.provider;

      // Find the API key ID for the selected provider
      const apiKey = apiKeys.find(key => key.provider === provider);

      if (!apiKey) {
        toast.error(`API key not found for provider: ${provider}`);
        setIsApiKeyModalOpen(true); // Prompt user to enter API key
        setIsLoading(false);
        return; // Stop processing if API key is missing
      }

      try {
        const thisModel = selectedModel
        const body = {
          conversation_id: conversationId,
          model: selectedModel.id,
          message: content,
          api_key_id: apiKey.id,
          tool_decision: toolDecision,
        }

        const response = await apiFetchStreaming('POST', '/chat/generate', body);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`API error: ${response.status} ${response.statusText} - ${errorData.detail}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Failed to get stream reader from response.');
        }

        const decoder = new TextDecoder();
        let newConversationId = conversationId; // Keep track of the new conversation ID - Moved outside the loop

        let message = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          const buffer = decoder.decode(value, { stream: true });
          console.log(buffer);

          // Process complete SSE messages in the buffer
          const events = buffer.split('\r\n\r\n');

          events.forEach(event => {
            let eventData = '';
            let eventType = '';
            let firstData = true;
            event.split('\r\n').forEach(line => {
              if (line.startsWith('data:')) {
                if (firstData) {
                  firstData = false;
                  eventData = line.substring(6);
                } else {
                  eventData += "\n" + line.substring(6);
                }
              } else if (line.startsWith('event:')) {
                eventType = line.substring(7);
                eventData = '';
              }
            })
            // let newConversationId = conversationId; // Keep track of the new conversation ID - Moved outside the loop

            if (eventType === 'conversation_created' && eventData) {
              // Store the new conversation ID, but don't navigate yet
              newConversationId = eventData;
              // setNewChatState("no"); // Use context setter - Removed as per user feedback
            } else if (eventType === 'message' && typeof eventData === 'string') {
              message += eventData;

              // Assuming the data is the text chunk
              setIncomingMessage({ model: thisModel, message: message });
            } else if (eventType === 'done') {
              // The stream is finished, no more data for this message
              setIsLoading(false); // Stop loading when done

              // Navigate and update state only after the stream is done
              // Use newConversationId explicitly for navigation and state update
              if (!conversationId && newConversationId) {
                navigate(`/chat/${newConversationId}`);
                setConversationId(newConversationId);
                setIncomingMessage(null)
                setOutgoingMessage(null)
                setNewChatState("no");
                refetchConversations(); // Refetch conversations after new chat is created and done
              }
            } else if (eventType === 'conversation_title_updated' && typeof eventData === 'string') {
              // Update the conversation title state
              setConversationTitle(eventData);
            }

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
      setNewChatState("idle"); // Set state to "idle" on error in a new chat
      const errorMessage: Message = {
        id: `system-${Date.now()}-${messages.length + 1}`, // More unique key for errors
        role: 'system',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        created_at: new Date().toISOString(),
        model: selectedModel.id,
        mcp_tool_use: null,
      };

      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleToolDecision = (toolDecide: boolean) => {
    handleSendMessage('', toolDecide);
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Header with Conversation Title and LLM Selector */}
      <div className="p-4 flex shrink-0 items-center justify-between border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-800">{conversationTitle}</h2>
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
              toolCall={message.mcp_tool_use}
              onDecision={handleToolDecision}
              isGenerating={isLoading}
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

export function Nl2p({ text }: { text: string }) {
  return (
    <div className="prose prose-sm">
      {/* make paragraphs out of text */}
      {text.split('\n').map((line, index) => (
        <p key={index} className="mb-2">{line}</p>
      ))}
    </div>
  );
}
