import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../util/api';
import { McpConfig } from '../../types'; // Import McpConfig from types

const fetchMcpConfigs = async (): Promise<McpConfig[]> => {
  return apiFetch<McpConfig[]>('GET', '/mcp-configs');
};

interface McpConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (configs: McpConfig[]) => void;
  initialConfigs?: McpConfig[];
}

export function McpConfigModal({ isOpen, onClose, onSave, initialConfigs = [] }: McpConfigModalProps) {
  const [configs, setConfigs] = useState<McpConfig[]>(initialConfigs.length > 0 ? initialConfigs : [{ id: '1', name: '', url: '' }]);
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);

  // Fetch MCP configurations using React Query
  const { data: fetchedMcpConfigs, error: mcpConfigsError, isLoading: isLoadingMcpConfigs } = useQuery<McpConfig[], Error>({
    queryKey: ['mcpConfigs'],
    queryFn: fetchMcpConfigs,
    enabled: isOpen, // Only fetch when the modal is open
    staleTime: 5 * 60 * 1000, // Data is considered fresh for 5 minutes
  });

  // Update configs state when fetchedMcpConfigs changes and modal is open
  useEffect(() => {
    if (isOpen && fetchedMcpConfigs) {
      setConfigs(fetchedMcpConfigs);
    }
  }, [isOpen, fetchedMcpConfigs]);

  if (!isOpen) return null;

  const handleConfigChange = (id: string, field: keyof McpConfig, value: string) => {
    setConfigs(prev => prev.map(config =>
      config.id === id ? { ...config, [field]: value } : config
    ));
  };

  const addConfig = () => {
    const newConfig = { id: Date.now().toString(), name: '', url: '' };
    setConfigs(prev => [...prev, newConfig]);
    setEditingConfigId(newConfig.id); // Open edit form for the new config
  };

  const handleSaveIndividualConfig = async (id: string) => {
    const configToSave = configs.find(config => config.id === id);
    if (!configToSave) return;

    try {
      let savedConfig: McpConfig;
      // Simple check: if the ID is a string and looks like a temporary timestamp ID, assume it's new.
      // A more robust check might involve verifying if the config was part of the initial fetch.
      if (typeof id === 'string' && !isNaN(Number(id)) && id.length > 10) { // Basic check for timestamp-like ID
        // New config, use POST
        savedConfig = await apiFetch<McpConfig>('POST', '/mcp-configs', configToSave);
        // Replace the temporary config with the saved one from the backend
        setConfigs(prev => prev.map(config =>
          config.id === id ? savedConfig : config
        ));
      } else {
        // Existing config, use PUT
        savedConfig = await apiFetch<McpConfig>('PUT', `/mcp-configs/${id}`, configToSave);
        // Update local state with the response
        setConfigs(prev => prev.map(config =>
          config.id === savedConfig.id ? savedConfig : config
        ));
      }

      setEditingConfigId(null); // Close edit form on successful save
    } catch (error) {
      console.error('Failed to save MCP configuration:', error);
      // Optionally show an error message to the user
    }
  };

  const handleDeleteIndividualConfig = async (id: string) => {
    try {
      // Assuming a DELETE endpoint for deleting a single config
      await apiFetch('DELETE', `/mcp-configs/${id}`);
      console.log('Configuration deleted successfully:', id); // Log success
      // Remove from local state
      const updatedConfigs = configs.filter(config => config.id !== id);
      setConfigs(updatedConfigs);
      setTimeout(() => setEditingConfigId(null), 0); // Close edit form on successful delete with a slight delay
      console.log('Edit form should be closed now.'); // Confirm this line is reached
    } catch (error) {
      console.error('Failed to delete MCP configuration:', error);
      alert('Failed to delete MCP configuration.'); // Show error to user
    }
  };

  const configToEdit = configs.find(config => config.id === editingConfigId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">MCP Configurations</h2>
          <p className="text-sm text-gray-600 mb-6">
            Add Model Context Protocol (MCP) servers to extend the capabilities of your chat platform.
          </p>

          {editingConfigId === null ? (
            // Index View
            <div className="space-y-4">
              {configs.map((config) => (
                <div key={config.id} className="border border-gray-200 rounded-md p-4 flex justify-between items-center">
                  <div className="min-w-0 mr-2"> {/* Added min-w-0 here and mr-2 for spacing */}
                    <div className="font-medium text-gray-900 overflow-hidden text-ellipsis whitespace-nowrap">{config.name || 'Unnamed Configuration'}</div> {/* Added ellipsis classes */}
                    <div className="text-sm text-gray-600 overflow-hidden text-ellipsis whitespace-nowrap">{config.url || 'No URL'}</div> {/* Added ellipsis classes */}
                  </div>
                  <button
                    type="button"
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    onClick={() => setEditingConfigId(config.id)}
                  >
                    Edit
                  </button>
                </div>
              ))}

              <button
                type="button"
                className="w-full py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={addConfig}
              >
                Add MCP Configuration
              </button>
            </div>
          ) : (
            // Edit Form View
            configToEdit && (
              <div className="space-y-4">
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Weather API"
                    value={configToEdit.name}
                    onChange={(e) => handleConfigChange(configToEdit.id, 'name', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., https://example.com/mcp"
                    value={configToEdit.url}
                    onChange={(e) => handleConfigChange(configToEdit.id, 'url', e.target.value)}
                  />
                </div>

                <div className="flex justify-end space-x-3">
                   <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md"
                    onClick={() => handleDeleteIndividualConfig(configToEdit.id)}
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
                    onClick={() => setEditingConfigId(null)}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                    onClick={() => handleSaveIndividualConfig(configToEdit.id)}
                  >
                    Save
                  </button>
                </div>
              </div>
            )
          )}
        </div>

        {/* The main modal buttons remain, but Save All Changes is removed */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 rounded-b-lg">
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
            onClick={onClose}
          >
            Close
          </button>
          {/* Removed Save All Changes button as individual saves persist */}
        </div>
      </div>
    </div>
  );
}
