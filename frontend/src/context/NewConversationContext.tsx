import { createContext, useContext } from 'react';

export type NewChatState = "no" | "idle" | "creating";

interface NewConversationContextType {
  newChatState: NewChatState;
  setNewChatState: (state: NewChatState) => void;
  refetchConversations: () => void;
}

export const NewConversationContext = createContext<NewConversationContextType | undefined>(undefined);

export const useNewConversation = () => {
  const context = useContext(NewConversationContext);
  if (context === undefined) {
    throw new Error('useNewConversation must be used within a NewConversationProvider');
  }
  return context;
};
