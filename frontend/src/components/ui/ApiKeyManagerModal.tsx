import { useState, useEffect } from 'react';

interface ApiKeyManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ApiKey {
  id?: string; // Optional for creation
  provider: string;
  name?: string;
  key?: string; // Only for creation/update
}

export function ApiKeyManagerModal({ isOpen, onClose }: ApiKeyManagerModalProps) {
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [anthropicApiKey, setAnthropicApiKey] = useState('');
  const [googleApiKey, setGoogleApiKey] = useState('');
  const [existingKeys, setExistingKeys] = useState<ApiKey[]>([]);

  useEffect(() => {
    if (isOpen) {
      const fetchApiKeys = async () => {
        try {
          const response = await fetch('/api/v1/api-keys/');
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const keys: ApiKey[] = await response.json();
          setExistingKeys(keys);
          // Populate input fields if keys exist
          const openaiKey = keys.find(key => key.provider === 'openai');
          if (openaiKey) setOpenaiApiKey('********'); // Mask existing key

          const anthropicKey = keys.find(key => key.provider === 'anthropic');
          if (anthropicKey) setAnthropicApiKey('********'); // Mask existing key

          const googleKey = keys.find(key => key.provider === 'google');
          if (googleKey) setGoogleApiKey('********'); // Mask existing key

        } catch (error) {
          console.error('Error fetching API keys:', error);
          // Optionally, display an error message to the user
        }
      };
      fetchApiKeys();
    }
  }, [isOpen]);

  const handleSaveKeys = async () => {
    const keysToSave: ApiKey[] = [];

    if (openaiApiKey && openaiApiKey !== '********') {
      const existingOpenaiKey = existingKeys.find(key => key.provider === 'openai');
      keysToSave.push({
        id: existingOpenaiKey?.id,
        provider: 'openai',
        key: openaiApiKey,
      });
    }

    if (anthropicApiKey && anthropicApiKey !== '********') {
      const existingAnthropicKey = existingKeys.find(key => key.provider === 'anthropic');
      keysToSave.push({
        id: existingAnthropicKey?.id,
        provider: 'anthropic',
        key: anthropicApiKey,
      });
    }

    if (googleApiKey && googleApiKey !== '********') {
      const existingGoogleKey = existingKeys.find(key => key.provider === 'google');
      keysToSave.push({
        id: existingGoogleKey?.id,
        provider: 'google',
        key: googleApiKey,
      });
    }

    try {
      for (const key of keysToSave) {
        if (key.id) {
          // Update existing key
          await fetch(`/api/v1/api-keys/${key.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: key.name, key: key.key }),
          });
        } else {
          // Create new key
          await fetch('/api/v1/api-keys/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ provider: key.provider, name: key.name, key: key.key }),
          });
        }
      }
      console.log('API Keys saved successfully');
      onClose(); // Close modal after saving
    } catch (error) {
      console.error('Error saving API keys:', error);
      // Optionally, display an error message to the user
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3 text-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Manage API Keys</h3>
          <div className="mt-2 px-7 py-3">
            <div className="mb-4">
              <label htmlFor="openai-key" className="block text-sm font-medium text-gray-700 text-left">
                OpenAI API Key
              </label>
              <input
                type="text"
                id="openai-key"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={openaiApiKey}
                onChange={(e) => setOpenaiApiKey(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="anthropic-key" className="block text-sm font-medium text-gray-700 text-left">
                Anthropic API Key
              </label>
              <input
                type="text"
                id="anthropic-key"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={anthropicApiKey}
                onChange={(e) => setAnthropicApiKey(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="google-key" className="block text-sm font-medium text-gray-700 text-left">
                Google API Key
              </label>
              <input
                type="text"
                id="google-key"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={googleApiKey}
                onChange={(e) => setGoogleApiKey(e.target.value)}
              />
            </div>
          </div>
          <div className="items-center px-4 py-3">
            <button
              id="save-keys-btn"
              className="px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
              onClick={handleSaveKeys}
            >
              Save Keys
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
