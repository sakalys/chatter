import { useState, useRef, useEffect } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { Message, MessageRole } from '../../types';
import { modelService } from '../../services/modelService';
import { useLlm } from '../../context/LlmContext';
import { LlmSelector } from '../ui/LlmSelector'; // Import LlmSelector


export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! How can I help you today?',
      timestamp: new Date(),
      model: 'GPT-4' // Default model
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const { selectedLlm } = useLlm();
  const messagesEndRef = useRef<HTMLDivElement>(null);


  // Update the model of the initial message when selectedLlm is available
  useEffect(() => {
    if (selectedLlm && messages.length > 0 && messages[0].id === '1' && messages[0].model === 'GPT-4') {
      setMessages(prevMessages => {
        const updatedMessages = [...prevMessages];
        updatedMessages[0] = {
          ...updatedMessages[0],
          model: selectedLlm.id
        };
        return updatedMessages;
      });
    }
  }, [selectedLlm, messages]);


  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    try {
      // Get API key from localStorage (in a real app, this would be more secure)
      const apiKeysString = localStorage.getItem('apiKeys');
      const apiKeys = apiKeysString ? JSON.parse(apiKeysString) : {};
      
      // Determine which provider's API key to use based on selectedLlm
      let provider = 'openai';
      if (selectedLlm?.id.startsWith('claude-')) {
        provider = 'anthropic';
      } else if (selectedLlm?.id.startsWith('llama-')) {
        provider = 'meta';
      }
      
      const apiKey = apiKeys[provider] || 'mock-api-key';
      
      // Convert messages to the format expected by the model service
      const messageHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Add the new user message
      messageHistory.push({
        role: 'user',
        content
      });
      // Call the model service
      const response = await modelService.sendChatCompletion({
        model: selectedLlm?.id || 'gpt-4', // Use selectedLlm from context, fallback to gpt-4
        messages: messageHistory,
        apiKey
      });
      
      // Add assistant message
      const assistantMessage: Message = {
        id: response.id || (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        model: response.model || selectedLlm?.id || 'GPT-4'
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      // Handle error
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'system',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with "New Conversation" and LLM Selector */}
      <div className="p-4 flex items-center justify-between border-b border-gray-200"> {/* Added flex and justify-between */}
        <h2 className="text-xl font-bold text-gray-800">New Conversation</h2> {/* "New Conversation" label */}
        {/* LLM Selector */}
        <div className="flex items-center space-x-2"> {/* Adjusted styling */}
          <LlmSelector />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="pb-4">
          {messages
            .filter(message => message.content !== 'New Conversation') // Filter out messages with "New Conversation" content
            .map((message) => (
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
      />
    </div>
  );
}
