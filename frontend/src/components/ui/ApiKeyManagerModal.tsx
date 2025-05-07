import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../util/api';
import { LLMProvider } from '../../types';

interface ApiKey {
  id?: string;
  provider: string;
  key?: string;
}

export function ApiKeyManagerModal() {

  const queryClient = useQueryClient();
  const [editingProvider, setEditingProvider] = useState<{ id: string | null, provider: string, key: string } | null>(null);

  // Fetch existing API keys using useQuery
  const { data: existingKeys, isLoading: isLoadingKeys, error: fetchError } = useQuery<ApiKey[], Error>({
    queryKey: ['apiKeys'],
    queryFn: () => apiFetch('GET', '/api-keys'),
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

  const isLoading = isLoadingKeys || saveApiKeyMutation.isPending;
  const error = fetchError || saveApiKeyMutation.error;

  const existingProviders = Array.from(existingKeys?.reduce((acc, curr) => acc.add(curr.provider), new Set<string>()) || new Set())

  const providersToAdd = Object.values(LLMProvider).filter(item => !existingProviders.includes(item))

  return (
    <div className="">
      <form className="mt-3 text-start" onSubmit={(e) => {
        e.preventDefault();
        handleSaveKeys()
      }}>
        {error && (
          <div className="mt-2 text-sm text-red-600">
            {error.message}
          </div>
        )}

        {!editingProvider && (
          <div>
            <div className="mt-2 rounded-md mb-4 text-center">
              {!existingKeys ? (
                <>Loading...</>
              )
                : existingKeys.length === 0 ? (
                  <div className="text-gray-500">No API keys provided yet.</div>
                )
                  : (
                    <div className="mb-5">
                      <div className="text-gray-500 text-start mb-2">Provided API keys:</div>
                      <div>
                        {existingKeys.map(key => (
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
                        ))}
                      </div>
                    </div>
                  )}

              <div className="text-center">
                <button
                  className="px-4 py-2 mb-2 border border-zinc-100 bg-zinc-50 text-black text-base font-medium rounded-md w-full shadow-sm hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed max-w-60"
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
            </div>
          </div>
        )}

        {editingProvider && <div className="items-center">
          <div className="text-start space-y-2">
            <div className="text-start space-y-2">
              <div>
                <label>
                  Select Provider
                  <select
                    value={editingProvider.provider}
                    onChange={(e) => setEditingProvider({ ...editingProvider, provider: e.target.value })}
                    className='w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500'>
                    {providersToAdd.map(provider => (
                      <option key={provider} value={provider}>{provider}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div>
                <div>
                  <label>
                    API Key
                    <input
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      type="password" value={editingProvider.key}
                      onChange={(e) => setEditingProvider({ ...editingProvider, key: e.target.value })} />
                  </label>
                </div>
              </div>

              <div className="text-center space-x-2 flex flex-row justify-end">
                <div>
                  <button
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
                    disabled={isLoading}
                    onClick={(e) => {
                      e.preventDefault();
                      setEditingProvider(null);
                    }}
                  >
                    Cancel
                  </button>
                </div>

                <div>
                  <button
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
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
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>}
      </form>
    </div>
  );
}
