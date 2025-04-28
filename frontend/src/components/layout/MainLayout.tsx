import { PropsWithChildren, useEffect, useState } from 'react';
import { LlmProvider } from '../../context/LlmContext';
import { SettingsButton } from '../ui/SettingsButton';
import { Conversation } from '../../types';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../util/api';

const fetchConversations = async (): Promise<Conversation[]> => {
  return apiFetch<Conversation[]>('GET', '/conversations');
};

export function MainLayout({ children }: PropsWithChildren) {
  const [isCreatingNewConversationState, setIsCreatingNewConversationState] = useState(false); // Re-add state
  const location = useLocation();

  // Fetch conversations using React Query
  const { data: conversations, error, isLoading } = useQuery<Conversation[], Error>({
    queryKey: ['conversations'],
    queryFn: () => fetchConversations(),
    staleTime: 5 * 60 * 1000, // Data is considered fresh for 5 minutes
  });

  useEffect(() => {
    if (location.pathname === '/chat' || location.pathname === '/') {
      setIsCreatingNewConversationState(false); // Use local state
    }
  }, [location.pathname]);


  return (
    <div className="flex h-screen bg-gray-100">
      <LlmProvider>
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h1 className="text-xl font-bold text-blue-600">Chat Platform</h1>
            <SettingsButton />
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Conversations</h2>
            <div className="space-y-1 mb-6">
              {isCreatingNewConversationState && ( // Use local state
                <div className="w-full text-left px-3 py-2 rounded-md bg-gray-100 animate-pulse">
                  <div className="font-medium truncate text-gray-500">Creating new conversation...</div>
                </div>
              )}
              {isLoading && <div className="text-gray-500">Loading conversations...</div>}
              {error && <div className="text-red-500">Error: {error.message}</div>}
              {!isLoading && !error && conversations?.map((conversation) => (
                <Link
                  key={conversation.id}
                  to={`/chat/${conversation.id}`}
                  className={`block w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 ${
                    location.pathname === `/chat/${conversation.id}` ? 'bg-blue-50 text-blue-600' : ''
                  }`}
                >
                  <div className="font-medium truncate">{conversation.title || `Conversation ${conversation.id.substring(0, 8)}...`}</div>
                </Link>
              ))}
            </div>
          </div>
          <div className="p-4 border-t border-gray-200">
            <Link to="/" className="block w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-center">
              New Chat
            </Link>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col h-full relative">
          {children} {/* Render children with injected prop */}
        </div>
      </LlmProvider>
    </div>
  );
}
