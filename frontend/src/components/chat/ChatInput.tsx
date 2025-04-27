import { useState, FormEvent, KeyboardEvent, useEffect } from 'react';
import { AVAILABLE_MODELS } from '../../types';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  selectedModel?: string;
  onModelChange?: (model: string) => void;
  apiKeysLoaded?: boolean;
  configuredProviders?: string[];
}

export function ChatInput({ 
  onSendMessage, 
  isLoading = false,
  selectedModel = 'gemini-2.5-flash-preview-04-17',
  onModelChange,
  configuredProviders = [],
}: ChatInputProps) {
  const [message, setMessage] = useState('Generate me 20 paragraphs of text');

  const availableModels = AVAILABLE_MODELS.filter(model => 
    configuredProviders.includes(model.provider)
  );

  useEffect(() => {
    if (availableModels.length > 0 && !availableModels.find(m => m.id === selectedModel)) {
      onModelChange?.(availableModels[0].id);
    }
  }, [configuredProviders, selectedModel, availableModels, onModelChange]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message);
      setMessage('Generate me 20 paragraphs of text');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-16 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          <button
            type="submit"
            className="absolute right-3 bottom-3 p-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!message.trim() || isLoading}
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
              </svg>
            )}
          </button>
        </form>
        <div className="mt-2 text-xs text-gray-500 flex justify-between items-center">
          <div>Press Shift + Enter for a new line</div>
          <div className="flex items-center">
            <span className="mr-2">Model:</span>
            <select 
              className="border border-gray-300 rounded px-2 py-1 text-sm"
              value={selectedModel}
              onChange={(e) => onModelChange && onModelChange(e.target.value)}
              disabled={availableModels.length === 0}
            >
              {availableModels.length === 0 ? (
                <option value="">No models available</option>
              ) : (
                availableModels.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
