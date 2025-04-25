import { useState } from 'react';

interface McpConfig {
  id: string;
  name: string;
  url: string;
}

interface McpConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (configs: McpConfig[]) => void;
  initialConfigs?: McpConfig[];
}

export function McpConfigModal({ isOpen, onClose, onSave, initialConfigs = [] }: McpConfigModalProps) {
  const [configs, setConfigs] = useState<McpConfig[]>(initialConfigs.length > 0 ? initialConfigs : [{ id: '1', name: '', url: '' }]);
  
  if (!isOpen) return null;
  
  const handleSave = () => {
    // Filter out empty configs
    const validConfigs = configs.filter(config => config.name.trim() && config.url.trim());
    onSave(validConfigs);
    onClose();
  };
  
  const handleConfigChange = (id: string, field: keyof McpConfig, value: string) => {
    setConfigs(prev => prev.map(config => 
      config.id === id ? { ...config, [field]: value } : config
    ));
  };
  
  const addConfig = () => {
    setConfigs(prev => [...prev, { id: Date.now().toString(), name: '', url: '' }]);
  };
  
  const removeConfig = (id: string) => {
    setConfigs(prev => prev.filter(config => config.id !== id));
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">MCP Configurations</h2>
          <p className="text-sm text-gray-600 mb-6">
            Add Model Context Protocol (MCP) servers to extend the capabilities of your chat platform.
          </p>
          
          <div className="space-y-4">
            {configs.map((config) => (
              <div key={config.id} className="border border-gray-200 rounded-md p-4 relative">
                <button
                  type="button"
                  className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                  onClick={() => removeConfig(config.id)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Weather API"
                    value={config.name}
                    onChange={(e) => handleConfigChange(config.id, 'name', e.target.value)}
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
                    value={config.url}
                    onChange={(e) => handleConfigChange(config.id, 'url', e.target.value)}
                  />
                </div>
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
