import { useState, useEffect } from 'react';

interface ApiKeyManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ApiKey {
  id?: string;
  provider: string;
  name?: string;
  key?: string;
}

export function ApiKeyManagerModal({ isOpen, onClose }: ApiKeyManagerModalProps) {
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [anthropicApiKey, setAnthropicApiKey] = useState('');
  const [googleApiKey, setGoogleApiKey] = useState('');
  const [existingKeys, setExistingKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchApiKeys();
    }
  }, [isOpen]);

  const fetchApiKeys = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        setError('Authentication token not found');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/api-keys/`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const keys: ApiKey[] = await response.json();
      setExistingKeys(keys);

      // Populate input fields if keys exist
      const openaiKey = keys.find(key => key.provider === 'openai');
      if (openaiKey) setOpenaiApiKey('********');

      const anthropicKey = keys.find(key => key.provider === 'anthropic');
      if (anthropicKey) setAnthropicApiKey('********');

      const googleKey = keys.find(key => key.provider === 'google');
      if (googleKey) setGoogleApiKey('********');

    } catch (error) {
      setError('Error fetching API keys');
      console.error('Error fetching API keys:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveKeys = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        setError('Authentication token not found');
        return;
      }

      const keysToSave: ApiKey[] = [];

      if (openaiApiKey && openaiApiKey !== '********') {
        const existingOpenaiKey = existingKeys.find(key => key.provider === 'openai');
        keysToSave.push({
          id: existingOpenaiKey?.id,
          provider: 'openai',
          name: 'OpenAI API Key',
          key: openaiApiKey,
        });
      }

      if (anthropicApiKey && anthropicApiKey !== '********') {
        const existingAnthropicKey = existingKeys.find(key => key.provider === 'anthropic');
        keysToSave.push({
          id: existingAnthropicKey?.id,
          provider: 'anthropic',
          name: 'Anthropic API Key',
          key: anthropicApiKey,
        });
      }

      if (googleApiKey && googleApiKey !== '********') {
        const existingGoogleKey = existingKeys.find(key => key.provider === 'google');
        keysToSave.push({
          id: existingGoogleKey?.id,
          provider: 'google',
          name: 'Google API Key',
          key: googleApiKey,
        });
      }

      for (const key of keysToSave) {
        const url = key.id 
          ? `${import.meta.env.VITE_API_URL}/api/v1/api-keys/${key.id}`
          : `${import.meta.env.VITE_API_URL}/api/v1/api-keys/`;
        
        const method = key.id ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            provider: key.provider,
            name: key.name,
            key: key.key,
          }),
        });

        if (!response.ok) {
          throw new Error(`Error saving API key for ${key.provider}`);
        }
      }

      await fetchApiKeys(); // Refresh the list
      onClose();
    } catch (error) {
      setError('Error saving API keys');
      console.error('Error saving API keys:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
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

        <div className="mt-3 text-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Manage API Keys
          </h3>

          {error && (
            <div className="mt-2 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="mt-2 px-7 py-3">
            <p className="text-sm text-gray-600 mb-4 text-left">
              Enter or update your API keys for the supported language model providers.
              Existing keys are masked. To update a key, type the new key over the masked value.
            </p>

            <div className="mb-4">
              <label htmlFor="openai-key" className="block text-sm font-medium text-gray-700 text-left">
                OpenAI API Key
                <span className="ml-2 text-xs font-normal text-gray-500">
                  ({existingKeys.find(key => key.provider === 'openai') ? 'Key set' : 'No key set'})
                </span>
              </label>
              <input
                type="password"
                id="openai-key"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={openaiApiKey}
                onChange={(e) => setOpenaiApiKey(e.target.value)}
                placeholder="sk-..."
              />
            </div>

            <div className="mb-4">
              <label htmlFor="anthropic-key" className="block text-sm font-medium text-gray-700 text-left">
                Anthropic API Key
                <span className="ml-2 text-xs font-normal text-gray-500">
                  ({existingKeys.find(key => key.provider === 'anthropic') ? 'Key set' : 'No key set'})
                </span>
              </label>
              <input
                type="password"
                id="anthropic-key"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={anthropicApiKey}
                onChange={(e) => setAnthropicApiKey(e.target.value)}
                placeholder="sk-ant-..."
              />
            </div>

            <div className="mb-4">
              <label htmlFor="google-key" className="block text-sm font-medium text-gray-700 text-left">
                Google API Key
                <span className="ml-2 text-xs font-normal text-gray-500">
                  ({existingKeys.find(key => key.provider === 'google') ? 'Key set' : 'No key set'})
                </span>
              </label>
              <input
                type="password"
                id="google-key"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                value={googleApiKey}
                onChange={(e) => setGoogleApiKey(e.target.value)}
                placeholder="AIza..."
              />
            </div>
          </div>

          <div className="items-center px-4 py-3">
            <button
              id="save-keys-btn"
              className="px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleSaveKeys}
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Keys'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
