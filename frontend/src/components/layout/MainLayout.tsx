import { PropsWithChildren, useState, KeyboardEvent } from 'react';
import { NewChatState, NewConversationContext } from '../../context/NewConversationContext';
import { SettingsButton } from '../ui/SettingsButton';
import { Conversation } from '../../types';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../util/api';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { EllipsisVerticalIcon } from '@heroicons/react/20/solid';

const fetchConversations = async (): Promise<Conversation[]> => {
  return apiFetch<Conversation[]>('GET', '/conversations');
};

export function MainLayout({ children }: PropsWithChildren) {
  const location = useLocation();

  // Fetch conversations using React Query
  const { data: conversations, error, isLoading, refetch } = useQuery<Conversation[], Error>({
    queryKey: ['conversations'],
    queryFn: () => fetchConversations(),
    staleTime: 5 * 60 * 1000, // Data is considered fresh for 5 minutes
  });
  const [newChatState, setNewChatState] = useState<NewChatState>("no");
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState<string>('');

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const updateConversationTitleMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => {
      return apiFetch('PUT', `/conversations/${id}`, { title });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: (id: string) => {
      return apiFetch('DELETE', `/conversations/${id}`);
    },
    onSuccess: (_, deletedConversationId) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      if (location.pathname === `/chat/${deletedConversationId}`) {
        navigate('/');
      }
    },
  });

  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEditedTitle(event.target.value);
  };

  const handleTitleBlur = (conversationId: string) => {
    if (editedTitle.trim() !== (conversations?.find(c => c.id === conversationId)?.title || '')) {
      updateConversationTitleMutation.mutate({ id: conversationId, title: editedTitle.trim() });
    }
    setEditingConversationId(null);
    setEditedTitle('');
  };

  const handleTitleKeyPress = (event: KeyboardEvent<HTMLInputElement>, conversationId: string) => {
    if (event.key === 'Enter') {
      handleTitleBlur(conversationId);
    }
  };

  const handleRenameClick = (conversation: Conversation) => {
    setEditingConversationId(conversation.id);
    setEditedTitle(conversation.title || '');
  };

  const handleDeleteClick = (conversationId: string) => {
    if (window.confirm('Are you sure you want to delete this conversation?')) {
      deleteConversationMutation.mutate(conversationId);
    }
  };


  return (
    <NewConversationContext.Provider value={{ newChatState, setNewChatState, refetchConversations: refetch }}>
    <div className="flex h-full bg-gray-100">
          {/* Sidebar */}
          <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h1 className="text-xl font-bold text-blue-600">Moo Point</h1>
              <SettingsButton />
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Conversations</h2>
              <div className="space-y-1 mb-6">
                {newChatState === "creating" && ( // Use context state for creating
                  <div className="w-full text-left px-3 py-2 rounded-md bg-gray-100 animate-pulse">
                    <div className="font-medium truncate text-gray-500">Creating new conversation...</div>
                  </div>
                )}
                {isLoading && <div className="text-gray-500">Loading conversations...</div>}
                {error && <div className="text-red-500">Error: {error.message}</div>}
                {!isLoading && !error && conversations?.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`relative flex items-center group ${
                      location.pathname === `/chat/${conversation.id}` ? 'bg-blue-50 text-blue-600' : ''
                    }`}
                  >
                    {editingConversationId === conversation.id ? (
                      <input
                        type="text"
                        value={editedTitle}
                        onChange={handleTitleChange}
                        onBlur={() => handleTitleBlur(conversation.id)}
                        onKeyUp={(e) => handleTitleKeyPress(e, conversation.id)}
                        className="w-full bg-transparent outline-none border-none px-3 py-2 rounded-md"
                        autoFocus
                      />
                    ) : (
                      <Link
                        to={`/chat/${conversation.id}`}
                        className="flex-1 block w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 truncate"
                      >
                        <div className="font-medium truncate">
                          {conversation.title || `Conversation ${conversation.id.substring(0, 8)}...`}
                        </div>
                      </Link>
                    )}
                    {!editingConversationId && (
                      <Menu as="div" className="relative inline-block text-left">
                        <div>
                          <MenuButton className="p-1 rounded-full hover:bg-gray-200 opacity-0 group-hover:opacity-100">
                            <EllipsisVerticalIcon className="h-5 w-5" aria-hidden="true" />
                          </MenuButton>
                        </div>
                        <MenuItems className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                          <div className="py-1">
                            <MenuItem>
                              {({ focus }) => (
                                <button
                                  className={`${
                                    focus ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                                  } block w-full text-left px-4 py-2 text-sm`}
                                  onClick={() => handleRenameClick(conversation)}
                                >
                                  Rename
                                </button>
                              )}
                            </MenuItem>
                            <MenuItem>
                              {({ focus }) => (
                                <button
                                  className={`${
                                    focus ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                                  } block w-full text-left px-4 py-2 text-sm`}
                                  onClick={() => handleDeleteClick(conversation.id)}
                                >
                                  Delete
                                </button>
                              )}
                            </MenuItem>
                          </div>
                        </MenuItems>
                      </Menu>
                    )}
                  </div>
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
          <div className="flex-1 flex flex-col h-full relative min-w-0">
            {children} {/* Render children */}
          </div>
    </div>
    </NewConversationContext.Provider >
  );
}
