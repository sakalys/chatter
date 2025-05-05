import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../util/api';
import { McpConfig, McpTool } from '../../types'; // Import McpConfig and McpTool

const fetchMcpConfigs = async (): Promise<McpConfig[]> => {
  return apiFetch<McpConfig[]>('GET', '/mcp-configs');
};

// New fetch function for tools of a specific MCP config
const fetchMcpToolsForConfig = async (configId: string): Promise<McpTool[]> => {
  return apiFetch<McpTool[]>('GET', `/mcp-configs/tools?config_id=${configId}`);
};

interface McpConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (configs: McpConfig[]) => void;
  initialConfigs?: McpConfig[];
}

type EditConfigType = {
    id: string | null // null means a new config is being created
    name: string
    url: string
  };

export function McpConfigModal({ isOpen, onClose, onSave, initialConfigs = [] }: McpConfigModalProps) {
  const [configs, setConfigs] = useState<McpConfig[]>(initialConfigs.length > 0 ? initialConfigs : []);
  const [editingConfig, setEditingConfig] = useState<EditConfigType | null>(null);

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

  const addConfig = () => {
    setEditingConfig({
      id: null,
      name: '',
      url: '',
    });
  };

  const handleSaveIndividualConfig = async (cfg: EditConfigType) => {
    try {
      let savedConfig: McpConfig;
      if (!cfg.id) { 
        // New config, use POST
        savedConfig = await apiFetch<McpConfig>('POST', '/mcp-configs', cfg);
        // Replace the temporary config with the saved one from the backend
        setConfigs(prev => [...prev, savedConfig]) 
      } else {
        // Existing config, use PUT
        savedConfig = await apiFetch<McpConfig>('PUT', `/mcp-configs/${cfg.id}`, cfg);
        // Update local state with the response
        setConfigs(prev => prev.map(config =>
          config.id === savedConfig.id ? savedConfig : config
        ));
      }

      setEditingConfig(null); // Close edit form on successful save
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
      setTimeout(() => setEditingConfig(null), 0); // Close edit form on successful delete with a slight delay
      console.log('Edit form should be closed now.'); // Confirm this line is reached
    } catch (error) {
      console.error('Failed to delete MCP configuration:', error);
      alert('Failed to delete MCP configuration.'); // Show error to user
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">MCP Configurations</h2>
          <p className="text-sm text-gray-600 mb-6">
            Add Model Context Protocol (MCP) servers to extend the capabilities of your chat platform.
          </p>

          {editingConfig === null ? (
            // Index View
            <div className="space-y-4">
              {configs.map((config) => (
                <div key={config.id} className="border border-gray-200 rounded-md p-4 flex flex-col"> {/* Changed to flex-col */}
                  <div className="flex justify-between items-center mb-2"> {/* Added flex container for name/url and edit button */}
                    <div className="min-w-0 mr-2">
                      <div className="font-medium text-gray-900 overflow-hidden text-ellipsis whitespace-nowrap">{config.name || 'Unnamed Configuration'}</div>
                      <div className="text-sm text-gray-600 overflow-hidden text-ellipsis whitespace-nowrap">{config.url || 'No URL'}</div>
                    </div>
                    <button
                      type="button"
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                      onClick={() => setEditingConfig({...config})}
                    >
                      Edit
                    </button>
                  </div>

                  {/* Display tools for this config */}
                  <ConfigToolsDisplay configId={config.id} isModalOpen={isOpen} /> {/* New component to display tools */}

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
            editingConfig && (
              <form className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSaveIndividualConfig(editingConfig)
                  }}
               >
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Weather API"
                    value={editingConfig.name}
                    required
                    onChange={(e) => setEditingConfig({...editingConfig, name: e.target.value})}
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
                    value={editingConfig.url}
                    required
                    onChange={(e) => setEditingConfig({...editingConfig, url: e.target.value})}
                  />
                </div>

                {/* Display tools for the config being edited */}
                {editingConfig.id && <ConfigToolsDisplay configId={editingConfig.id} isModalOpen={isOpen} />}


                <div className="flex justify-end space-x-3">
                   {editingConfig.id && (
                    <button
                      type="button"
                      className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md"
                      onClick={() => handleDeleteIndividualConfig(editingConfig.id)}
                    >
                      Delete
                    </button>
                   )}
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
                    onClick={() => setEditingConfig(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                  >
                    {editingConfig.id ? 'Save' : 'Add'}
                  </button>
                </div>
              </form>
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

// New component to fetch and display tools for a specific config
interface ConfigToolsDisplayProps {
  configId: string;
  isModalOpen: boolean;
}

function ConfigToolsDisplay({ configId, isModalOpen }: ConfigToolsDisplayProps) {
  const { data: tools, isLoading, error } = useQuery<McpTool[], Error>({
    queryKey: ['mcpTools', configId],
    queryFn: () => fetchMcpToolsForConfig(configId),
    enabled: isModalOpen, // Only fetch when the modal is open
    staleTime: 5 * 60 * 1000, // Data is considered fresh for 5 minutes
  });

  if (isLoading) {
    return <div className="text-sm text-gray-500">Loading tools...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-500">Error loading tools: {error.message}</div>;
  }

  if (!tools || tools.length === 0) {
    return <div className="text-sm text-gray-500">No tools available for this config.</div>;
  }

  return (
    <div className="mt-3">
      <h6 className="text-xs font-medium text-gray-700 mb-1">Available Tools:</h6>
      <ul className="list-disc list-inside text-xs ml-2">
        {tools.map((tool, index) => (
          <li key={index}>
            <strong>{tool.name}</strong>: {tool.description || <em className="text-zinc-500">Description not set</em>}
          </li>
        ))}
      </ul>
    </div>
  );
}
