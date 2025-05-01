import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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

const fetchApiKeys = async (): Promise<ApiKey[]> => {
  const authToken = localStorage.getItem('authToken');
  if (!authToken) {
    console.warn('Authentication token not found');
    throw new Error('Authentication token not found');
  }

  const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/api-keys`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};

const saveApiKey = async (keyData: ApiKey): Promise<ApiKey> => {
  const authToken = localStorage.getItem('authToken');
  if (!authToken) {
    console.warn('Authentication token not found');
    throw new Error('Authentication token not found');
  }

  const url = keyData.id
    ? `${import.meta.env.VITE_API_URL}/api/v1/api-keys/${keyData.id}`
    : `${import.meta.env.VITE_API_URL}/api/v1/api-keys`;

  const method = keyData.id ? 'PUT' : 'POST';

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      provider: keyData.provider,
      name: keyData.name,
      key: keyData.key,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Error saving API key for ${keyData.provider}: ${errorData.detail || response.statusText}`);
  }

  return response.json();
};


export function ApiKeyManagerModal({ isOpen, onClose }: ApiKeyManagerModalProps) {
  const queryClient = useQueryClient();
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [anthropicApiKey, setAnthropicApiKey] = useState('');
  const [googleApiKey, setGoogleApiKey] = useState('');

  // Fetch existing API keys using useQuery
  const { data: existingKeys, isLoading: isLoadingKeys, error: fetchError } = useQuery<ApiKey[], Error>({
    queryKey: ['apiKeys'],
    queryFn: fetchApiKeys,
    enabled: isOpen, // Only fetch when the modal is open
    staleTime: 5 * 60 * 1000, // Data is considered fresh for 5 minutes
  });

  // Use useMutation for saving API keys
  const saveApiKeyMutation = useMutation<ApiKey, Error, ApiKey>({
    mutationFn: saveApiKey,
    onSuccess: () => {
      // Invalidate the 'apiKeys' query to refetch the list after saving
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
    },
  });

  // Populate input fields when existingKeys are loaded
  useEffect(() => {
    if (existingKeys) {
      const openaiKey = existingKeys.find(key => key.provider === 'openai');
      if (openaiKey) setOpenaiApiKey('********');

      const anthropicKey = existingKeys.find(key => key.provider === 'anthropic');
      if (anthropicKey) setAnthropicApiKey('********');

      const googleKey = existingKeys.find(key => key.provider === 'google');
      if (googleKey) setGoogleApiKey('********');
    }
  }, [existingKeys]);

  const handleSaveKeys = async () => {
    const keysToSave: ApiKey[] = [];

    if (openaiApiKey && openaiApiKey !== '********') {
      const existingOpenaiKey = existingKeys?.find(key => key.provider === 'openai');
      keysToSave.push({
        id: existingOpenaiKey?.id,
        provider: 'openai',
        name: 'OpenAI API Key',
        key: openaiApiKey,
      });
    }

    if (anthropicApiKey && anthropicApiKey !== '********') {
      const existingAnthropicKey = existingKeys?.find(key => key.provider === 'anthropic');
      keysToSave.push({
        id: existingAnthropicKey?.id,
        provider: 'anthropic',
        name: 'Anthropic API Key',
        key: anthropicApiKey,
      });
    }

    if (googleApiKey && googleApiKey !== '********') {
      const existingGoogleKey = existingKeys?.find(key => key.provider === 'google');
      keysToSave.push({
        id: existingGoogleKey?.id,
        provider: 'google',
        name: 'Google API Key',
        key: googleApiKey,
      });
    }

    try {
      // Use Promise.all to save all keys concurrently
      await Promise.all(keysToSave.map(key => saveApiKeyMutation.mutateAsync(key)));
      onClose();
    } catch (error: any) {
      // Error handling is done within the mutation, but we can catch here for a general message
      console.error('Error saving API keys:', error);
      // The mutation's onError callback or the individual mutation errors will handle specific messages
    }
  };

  if (!isOpen) return null;

  const isLoading = isLoadingKeys || saveApiKeyMutation.isPending;
  const error = fetchError || saveApiKeyMutation.error;


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
              {error.message}
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
                  ({existingKeys?.find(key => key.provider === 'openai') ? 'Key set' : 'No key set'})
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
                  ({existingKeys?.find(key => key.provider === 'anthropic') ? 'Key set' : 'No key set'})
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
                  ({existingKeys?.find(key => key.provider === 'google') ? 'Key set' : 'No key set'})
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
