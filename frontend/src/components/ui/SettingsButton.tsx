import { useState } from 'react';
import { ApiKeyManagerModal } from './ApiKeyManagerModal';
import { McpConfigModal } from './McpConfigModal';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../util/api';
import { useNavigate } from 'react-router-dom';
import { Modal, ModalBody, ModalBox, ModalFooter } from './modal';
import { useMCPConfig } from '../../context/MCPConfigContext';

export function SettingsButton() {
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const auth = useAuth();
  const mcpCtx = useMCPConfig();

  // Use useMutation for logout
  const logoutMutation = useMutation<void, Error>({
    mutationFn: async () => apiFetch( 'POST', '/auth/logout'),
    onSuccess: () => {
      // Clear the token from local storage
      auth.logout();

      navigate('/login');
    },
    onError: (error) => {
      console.error('Logout failed:', error);
      // Optionally, display an error message to the user
    },
  });

  const handleLogoutClick = () => {
    logoutMutation.mutate();
    setIsDropdownOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        className="p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
          <button
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={() => {
              setIsApiKeyModalOpen(true);
              setIsDropdownOpen(false);
            }}
          >
            API Keys
          </button>
          <button
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={() => {
              mcpCtx.setIsMCPConfigModalOpen(true);
              setIsDropdownOpen(false);
            }}
          >
            MCP Configurations
          </button>
          <button
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={handleLogoutClick}
            disabled={logoutMutation.isPending}
          >
            {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
          </button>
        </div>
      )}

      <ApiKeyManagerModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
      />
    </div>
  );
}
