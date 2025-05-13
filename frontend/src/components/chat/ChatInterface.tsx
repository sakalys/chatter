import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChatMessage, IncomingMessage, MessageRole, OutgoingMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { Message, ApiKey, MessageCreate, Model, AVAILABLE_MODELS, findModelById } from '../../types';
import LoadingSpinner from '../ui/LoadingSpinner';
import { toast } from 'react-toastify';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, apiFetchStreaming } from '../../util/api';
import { useNewConversation } from '../../context/NewConversationContext';
import { useGlobalSettings } from '../../context/GlobaSettingsContext';

const fetchMessages = async (conversationId: string | undefined): Promise<Message[]> => {
  if (!conversationId) {
    return [];
  }
  return apiFetch<Message[]>('GET', `/conversations/${conversationId}/messages`);
};

const fetchApiKeys = async (): Promise<ApiKey[]> => {
  return apiFetch<ApiKey[]>('GET', '/api-keys');
};

export function ChatInterface() {
  const { id: routeConversationId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [conversationId, setConversationId] = useState<string | undefined>(routeConversationId);
  const [messages, setMessages] = useState<(Message)[]>([]);
  const [outgoingMessage, setOutgoingMessage] = useState<MessageCreate | null>(null);
  const [incomingMessage, setIncomingMessage] = useState<{ message: string, model: Model } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showNoModelsOverlay, setShowNoModelsOverlay] = useState(false);
  const [selectedModel, setSelectedModel] = useState<Model>(() => {
    const storedModelId = localStorage.getItem('selectedModelId');
    const model = storedModelId ? findModelById(storedModelId) : null;
    return model || AVAILABLE_MODELS[0]; // Default to stored model or the first available
  });
  const { setNewChatState, refetchConversations } = useNewConversation(); // Consume context and setter

  // Effect to save selected model to localStorage
  useEffect(() => {
    if (selectedModel) {
      localStorage.setItem('selectedModelId', selectedModel.id);
    } else {
      localStorage.removeItem('selectedModelId');
    }
  }, [selectedModel]);

  // Fetch messages using React Query
  const { data: fetchedMessages, isLoading: isLoadingMessages } = useQuery<Message[], Error>({
    queryKey: ['messages', conversationId],
    queryFn: () => fetchMessages(conversationId),
    staleTime: 5 * 60 * 1000, // Data is considered fresh for 5 minutes
  });

  // Fetch API keys using React Query
  const { data: apiKeys, isLoading: isLoadingApiKeys } = useQuery<ApiKey[], Error>({
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
  const configuredProviders = useMemo(() => {
    return [...new Set(apiKeys?.map(key => key.provider) || [])];
  }, [apiKeys]);

  // Determine if there are any available models based on configured providers
  const hasAvailableModels = useMemo(() => {
    return AVAILABLE_MODELS.some(model => configuredProviders.includes(model.provider));
  }, [configuredProviders]);

  // Effect to show the overlay if no models are available after API keys are loaded
  useEffect(() => {
    if (!isLoadingApiKeys) {
      setShowNoModelsOverlay(!hasAvailableModels);
    }
  }, [isLoadingApiKeys, hasAvailableModels]);


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

  const settingsCtx = useGlobalSettings();

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
    if (toolDecision === null) {
      setOutgoingMessage(userMessage);
    }
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
        settingsCtx.setIsApiKeyModalOpen(true); // Prompt user to enter API key
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
          reasoning: selectedModel.reasoning,
          tool_calling: selectedModel.supportToolCalling,
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
            } else if (eventType === 'message_done' && typeof eventData === 'string') {
              const message: Message = JSON.parse(eventData);

              setMessages(prev => [...prev, message]);
              setIncomingMessage(null);

            } else if (eventType === 'function_call' && typeof eventData === 'string') {
              const message: Message = JSON.parse(eventData);

              setMessages(prev => [...prev, message]);
            } else if (eventType === 'user_message_id' && typeof eventData === 'string') {
              const messageId = eventData;
              setOutgoingMessage(null)
              setMessages([...messages, {role: MessageRole.User, model: thisModel.id, id: messageId, content: userMessage.content, mcp_tool_use: null }]);

            } else if (eventType === 'done') {
              // The stream is finished, no more data for this message
              setIsLoading(false); // Stop loading when done

              // Navigate and update state only after the stream is done
              // Use newConversationId explicitly for navigation and state update
              setIncomingMessage(null)
              setOutgoingMessage(null)
              if (!conversationId && newConversationId) {
                navigate(`/chat/${newConversationId}`);
                setConversationId(newConversationId);
                setNewChatState("no");
                refetchConversations(); // Refetch conversations after new chat is created and done
              }
            } else if (eventType === 'conversation_title_updated' && typeof eventData === 'string') {
              console.log('conversation_title_updated');
              // Update the conversation title state
            } else if (eventType === 'auth_error') {
              const errorMessage: Message = {
                id: `system-${Date.now()}-${messages.length + 1}`, // More unique key for errors
                role: MessageRole.System,
                content: `Error: API key error, possibly invalid`,
                model: selectedModel.id,
                mcp_tool_use: null,
              };

              setMessages([...messages, errorMessage]);
            } else if (eventType === 'api_error' && typeof eventData === 'string') {
              const errorMessage: Message = {
                id: `system-${Date.now()}-${messages.length + 1}`, // More unique key for errors
                role: MessageRole.ApiError,
                content: `Error: ${eventData}`,
                model: selectedModel.id,
                mcp_tool_use: null,
              };

              setMessages([...messages, errorMessage]);
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
        role: MessageRole.System,
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        model: selectedModel.id,
        mcp_tool_use: null,
      };

      setMessages([...messages, errorMessage]);
    }
  };

  const handleToolDecision = (toolDecide: boolean) => {
    handleSendMessage('', toolDecide);
  };

  const mcpCtx = useGlobalSettings();

  const debug = false;

  return (
    <div className="flex h-full relative"> {/* Modified main container to be a flex container */}
      {debug && (
        <div className="w-[600px] overflow-y-auto"> {/* Added sidebar div */}
          <h3 className="text-lg font-semibold mb-2">Debug Messages</h3>
          {messages.map((message, index) => (
            <div key={index} className="text-xs break-all mb-1 even:bg-zinc-50 p-4"> {/* Display message content */}
              <strong>{message.role}:</strong> {message.content}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col flex-1 h-full"> {/* Main chat content container */}
        {showNoModelsOverlay && (
          <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10">
            <div className="text-center p-4">
              <div className="flex justify-center items-center mb-8">
                <div className="text-center text-gray-500">
                  <h1 className="text-2xl font-bold mb-4">Welcome to Moo Point!</h1>
                  <p className="text-lg">...a platform for interacting with AI models and MCP tools of your choice.</p>
                </div>
              </div>
              <p className="text-lg mb-4">Configure your API keys and MCP servers to start chatting</p>
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                onClick={() => settingsCtx.setIsApiKeyModalOpen(true)}
              >
                Setup API Keys
              </button>

              &nbsp;
              &nbsp;
              &nbsp;

              <button
                className="px-4 py-2 bg-zinc-500 text-white rounded hover:bg-blue-600"
                onClick={() => mcpCtx.setIsMCPConfigModalOpen(true)}
              >
                Setup MCP Servers
              </button>
            </div>
          </div>
        )}

        {/* Loading spinner for API keys */}
        {isLoadingApiKeys && (
          <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10">
            <LoadingSpinner />
          </div>
        )}


        <div className="flex flex-col-reverse overflow-y-scroll flex-1 relative min-h-0">
          <div>
            {messages.map((message, i) => (
              <ChatMessage
                id={message.id}
                key={message.id}
                role={message.role}
                content={message.content}
                model={message.model}
                toolCall={message.mcp_tool_use}
                onDecision={handleToolDecision}
                disabledToolCall={isLoading || i != messages.length - 1}
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
      </div>
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
