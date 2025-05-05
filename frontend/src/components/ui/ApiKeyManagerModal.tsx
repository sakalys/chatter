import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../util/api';
import { LLMProvider } from '../../types';

interface ApiKeyManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ApiKey {
  id?: string;
  provider: string;
  key?: string;
}

export function ApiKeyManagerModal({ isOpen, onClose }: ApiKeyManagerModalProps) {
  const queryClient = useQueryClient();
  const [editingProvider, setEditingProvider] = useState<{id: string | null, provider: string, key: string} | null>(null);

  // Fetch existing API keys using useQuery
  const { data: existingKeys, isLoading: isLoadingKeys, error: fetchError } = useQuery<ApiKey[], Error>({
    queryKey: ['apiKeys'],
    queryFn: () => apiFetch('GET', '/api-keys'),
    enabled: isOpen, // Only fetch when the modal is open
    staleTime: 5 * 60 * 1000, // Data is considered fresh for 5 minutes
  });

  // Use useMutation for saving API keys
  const saveApiKeyMutation = useMutation<ApiKey, Error, ApiKey>({
    mutationFn: (keyData: ApiKey) => {
      const url = keyData.id ? `/api-keys/${keyData.id}` : '/api-keys';

      const method = keyData.id ? 'PUT' : 'POST';

      return apiFetch(method, url, {
          provider: keyData.provider,
          key: keyData.key,
      })
    },
    onSuccess: () => {
      setEditingProvider(null);
      // Invalidate the 'apiKeys' query to refetch the list after saving
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
    },
  });

  // Use useMutation for deleting API keys
  const deleteApiKeyMutation = useMutation<void, Error, string>({
    mutationFn: (keyId: string) => {
      return apiFetch('DELETE', `/api-keys/${keyId}`);
    },
    onSuccess: () => {
      // Invalidate the 'apiKeys' query to refetch the list after deletion
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
    },
  });

  const handleSaveKeys = async () => {
    if (!editingProvider) {
      return;
    }

     saveApiKeyMutation.mutate({
        id: editingProvider.id || undefined,
        provider: editingProvider.provider,
        key: editingProvider.key,
      })
  };

  useEffect(() => {
    if (!editingProvider?.provider) {
      setEditingProvider(null);
    }
  }, [editingProvider?.provider])

  if (!isOpen) return null;

  const isLoading = isLoadingKeys || saveApiKeyMutation.isPending;
  const error = fetchError || saveApiKeyMutation.error;

  const existingProviders = Array.from(existingKeys?.reduce((acc, curr) => acc.add(curr.provider), new Set<string>()) || new Set())

  const providersToAdd = Object.values(LLMProvider).filter(item => !existingProviders.includes(item))

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

        <form className="mt-3 text-start" onSubmit={(e) => {
          e.preventDefault();
          handleSaveKeys()
        }}>
          <h3 className="text-lg leading-6 font-medium text-gray-900 text-center">
            Manage API Keys
          </h3>

          {error && (
            <div className="mt-2 text-sm text-red-600">
              {error.message}
            </div>
          )}

{!editingProvider && (
  <div>
          <div className="mt-2 rounded-md mb-4">
            {!existingKeys ? (
              <>Loading...</>
            )
            : existingKeys.length === 0 ? (
              <div className="text-gray-500">No API keys provided yet.</div>
            )
            : (
              existingKeys.map(key => (
                <div key={key.provider} className="mb-2 p-2 border border-zinc-100 rounded bg-white shadow-sm flex flex-row justify-between">
                  <div>{key.provider}</div>
                  <div>
                    <button
                      className='text-blue-500 hover:underline'
                      onClick={() => {
                        if (key.id && confirm("Are you sure?")) {
                          deleteApiKeyMutation.mutate(key.id);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
              )}

            <button
              id="save-keys-btn"
              className="px-4 py-2 mb-2 border border-zinc-100 bg-zinc-50 text-black text-base font-medium rounded-md w-full shadow-sm hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || providersToAdd.length === 0}
              onClick={(e) => {
                e.preventDefault()
                  setEditingProvider({
                    id: null,
                    provider: providersToAdd[0],
                    key: '',
                  })
              }}
            >
              Add
            </button>
          </div>

            <button
              id="save-keys-btn"
              className="px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
              type="submit"
              onClick={(e) => {
                e.preventDefault()
                onClose()
              }}
            >
              Close
            </button>
          </div>
)}

          {editingProvider && <div className="items-center px-4 py-3">
            <div className="py-4 text-start space-y-2">
              <div className="py-4 text-start space-y-2">
  <div>
              <label>
                Add Provider
                <select 
                  value={editingProvider.provider} 
                  onChange={(e) => setEditingProvider({...editingProvider, provider: e.target.value})}
                  className='border w-full bg-white'>
                {providersToAdd.map(provider => (
                  <option key={provider} value={provider}>{provider}</option>
                ))}
                </select>
              </label>
</div>

<div>
              <label>
                API Key
                <input type="password" value={editingProvider.key} className='border w-full bg-white' onChange={(e) => setEditingProvider({...editingProvider, key: e.target.value})}/>
              </label>
              </div>
</div>

            <button
              id="save-keys-btn"
              className="px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
              type="submit"
              onClick={(e) => {
                e.preventDefault();
                  saveApiKeyMutation.mutate({
                    ...editingProvider,
                    id: undefined,
                  })
              }}
            >
              Save
            </button>

              
            <button
              id="save-keys-btn"
              className="px-4 py-2 bg-zinc-50 text-black border border-zinc-200 text-base font-medium rounded-md w-full shadow-sm hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
              onClick={(e) => {
                e.preventDefault();
                setEditingProvider(null);
              }}
            >
              Cancel
            </button>
 
            </div>
          </div>}
        </form>
      </div>
    </div>
  );
}
