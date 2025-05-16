import { PropsWithChildren, useState, KeyboardEvent, useEffect } from 'react';
import { NewChatState, NewConversationContext } from '../../context/NewConversationContext';
import { Conversation } from '../../types';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../util/api';
import { Menu, MenuButton, MenuItem } from '@headlessui/react';
import { EllipsisVerticalIcon } from '@heroicons/react/20/solid';
import { GlobalSettingsContext } from '../../context/GlobaSettingsContext';
import { Modal, ModalBody, ModalBox, ModalFooter } from '../ui/modal';
import { McpConfigModal } from '../ui/McpConfigModal';
import { ApiKeyManagerModal } from '../ui/ApiKeyManagerModal';
import DropdownMenu from '../ui/DropdownMenu';
import { SettingsButton } from '../ui/SettingsButton';

export function MainLayout({ children }: PropsWithChildren) {
    const location = useLocation();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 768) { // Tailwind's 'md' breakpoint is 768px
                setIsSidebarCollapsed(true);
            } else {
                setIsSidebarCollapsed(false);
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Set initial state

        return () => window.removeEventListener('resize', handleResize);
    }, []);


    // Fetch conversations using React Query
    const { data: conversations, error, isLoading, refetch } = useQuery<Conversation[], Error>({
        queryKey: ['conversations'],
        queryFn: () => apiFetch<Conversation[]>('GET', '/conversations'),
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


    const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
    const [isMCPConfigModalOpen, setIsMCPConfigModalOpen] = useState(false);

    return (
        <NewConversationContext.Provider value={{ newChatState, setNewChatState, refetchConversations: refetch }}>
            <GlobalSettingsContext.Provider value={{
                isMCPConfigModalOpen,
                setIsMCPConfigModalOpen: (open) => setIsMCPConfigModalOpen(open),
                isApiKeyModalOpen,
                setIsApiKeyModalOpen: (open) => setIsApiKeyModalOpen(open),
            }}>
                <div className="flex h-full bg-gray-100">
                    {/* Sidebar */}
                    <div className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-16' : 'w-64'}`}>
                        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                            {!isSidebarCollapsed && <h1 className="text-xl font-bold text-blue-600">Moo Point</h1>}
                            <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-1 rounded-md hover:bg-gray-200">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                                </svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            {!isSidebarCollapsed && (
                                <>
                                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Conversations</h2>
                                    <div className="space-y-1 mb-6">
                                        {newChatState === "creating" && ( // Use context state for creating
                                            <div className="w-full text-left px-3 py-2 rounded-md bg-gray-100 animate-pulse">
                                                <div className="font-medium truncate text-gray-500">Creating...</div>
                                            </div>
                                        )}
                                        {isLoading && <div className="text-gray-500">Loading conversations...</div>}
                                        {error && <div className="text-red-500">Error: {error.message}</div>}
                                        {!isLoading && !error && conversations?.map((conversation) => (
                                            <div
                                                key={conversation.id}
                                                className={`relative flex items-center group ${location.pathname === `/chat/${conversation.id}` ? 'bg-blue-50 text-blue-600' : ''
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
                                                        <DropdownMenu>
                                                            <MenuItem>
                                                                {({ focus }) => (
                                                                    <button
                                                                        className={`${focus ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
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
                                                                        className={`${focus ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                                                                            } block w-full text-left px-4 py-2 text-sm`}
                                                                        onClick={() => handleDeleteClick(conversation.id)}
                                                                    >
                                                                        Delete
                                                                    </button>
                                                                )}
                                                            </MenuItem>
                                                        </DropdownMenu>
                                                    </Menu>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                        <div className={'border-t border-gray-200 flex justify-around space-x-4 ' + (isSidebarCollapsed ? 'p-2' : 'p-4')}>
                            <SettingsButton />
                            {!isSidebarCollapsed && (
                                <Link to="/" className="block w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-center grow">
                                    New Chat
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className={`flex-1 flex flex-col h-full relative min-w-0 transition-all duration-300 ease-in-out `}>
                        {children}
                    </div>

                    <Modal open={isApiKeyModalOpen} onClose={() => setIsApiKeyModalOpen(false)}>
                        <ModalBox
                            title="API Keys Configuration"
                            width="sm"
                            height="auto">
                            <ModalBody>
                                <ApiKeyManagerModal />
                            </ModalBody>
                            <ModalFooter>
                                <div className="flex justify-end space-x-3">
                                    <button
                                        type="button"
                                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
                                        onClick={() => setIsApiKeyModalOpen(false)}
                                    >
                                        Close
                                    </button>
                                </div>
                            </ModalFooter>
                        </ModalBox>
                    </Modal>

                    <Modal open={isMCPConfigModalOpen} onClose={() => setIsMCPConfigModalOpen(false)}>
                        <ModalBox
                            title="MCP Configuration"
                            width="md"
                            height="auto">
                            <ModalBody>
                                <McpConfigModal />
                            </ModalBody>
                            <ModalFooter>
                                <div className="flex justify-end space-x-3">
                                    <button
                                        type="button"
                                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
                                        onClick={() => setIsMCPConfigModalOpen(false)}
                                    >
                                        Close
                                    </button>
                                </div>
                            </ModalFooter>
                        </ModalBox>
                    </Modal>
                </div>
            </GlobalSettingsContext.Provider>
        </NewConversationContext.Provider >
    );
}
