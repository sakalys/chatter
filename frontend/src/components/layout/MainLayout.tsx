import { ReactNode, useState } from 'react';
import { LlmProvider } from '../../context/LlmContext';
import { ApiKeyManagerModal } from '../ui/ApiKeyManagerModal'; // Import ApiKeyManagerModal

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false); // State for modal visibility

  const handleLogout = async () => {
    try {
      // Call the backend logout endpoint
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
      });

      // Clear the token from local storage
      localStorage.removeItem('access_token');

      // Redirect to the login page
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
      // Optionally, display an error message to the user
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <LlmProvider>
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between"> {/* Added flex and justify-between */}
            <h1 className="text-xl font-bold text-blue-600">Chat Platform</h1>
            {/* Settings Icon */}
            <button className="p-2 rounded-md hover:bg-gray-200" onClick={() => setIsApiKeyModalOpen(true)}>
              {/* Placeholder for settings icon */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.49 3.17C10.237 1.586 8.742 1 7 1 4.291 1 2 3.291 2 6v14h14V6c0-1.742-.586-3.237-2.17-4.49zM12 10a2 2 0 11-4 0 2 2 0 014 0z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Conversations</h2>
            <div className="space-y-1 mb-6"> {/* Added mb-6 for spacing below conversations */}
              <button className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100">
                <div className="font-medium truncate">Project Planning</div>
                <div className="text-xs text-gray-500">2 hours ago</div>
              </button>
              <button className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100">
                <div className="font-medium truncate">Code Review</div>
                <div className="text-xs text-gray-500">Yesterday</div>
              </button>
              <button className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100">
                <div className="font-medium truncate">Bug Fixing</div>
                <div className="text-xs text-gray-500">3 days ago</div>
              </button>
            </div>
          </div>
          <div className="p-4 border-t border-gray-200">
            <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              New Chat
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {children}
        </div>
      </LlmProvider>

      {/* API Key Manager Modal */}
      <ApiKeyManagerModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
      />
    </div>
  );
}
