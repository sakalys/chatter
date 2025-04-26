import { useState } from 'react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (keys: Record<string, string>) => void;
  initialKeys?: Record<string, string>;
}

export function ApiKeyModal({ isOpen, onClose, onSave, initialKeys = {} }: ApiKeyModalProps) {
  const [keys, setKeys] = useState<Record<string, string>>(initialKeys);
  
  if (!isOpen) return null;
  
  const handleSave = () => {
    onSave(keys);
    onClose();
  };
  
  const handleKeyChange = (model: string, value: string) => {
    setKeys(prev => ({
      ...prev,
      [model]: value
    }));
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full relative">
        <button
          className="absolute top-0 right-0 mt-4 mr-4 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">API Keys</h2>
          <p className="text-sm text-gray-600 mb-6">
            Enter your API keys for the models you want to use. Your keys are stored locally and never sent to our servers.
          </p>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="openai-key" className="block text-sm font-medium text-gray-700 mb-1">
                OpenAI (GPT-4, GPT-3.5)
              </label>
              <input
                type="password"
                id="openai-key"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="sk-..."
                value={keys.openai || ''}
                onChange={(e) => handleKeyChange('openai', e.target.value)}
              />
            </div>
            
            <div>
              <label htmlFor="anthropic-key" className="block text-sm font-medium text-gray-700 mb-1">
                Anthropic (Claude)
              </label>
              <input
                type="password"
                id="anthropic-key"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="sk-ant-..."
                value={keys.anthropic || ''}
                onChange={(e) => handleKeyChange('anthropic', e.target.value)}
              />
            </div>
            
            <div>
              <label htmlFor="meta-key" className="block text-sm font-medium text-gray-700 mb-1">
                Meta (Llama)
              </label>
              <input
                type="password"
                id="meta-key"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter API key"
                value={keys.meta || ''}
                onChange={(e) => handleKeyChange('meta', e.target.value)}
              />
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 rounded-b-lg">
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
