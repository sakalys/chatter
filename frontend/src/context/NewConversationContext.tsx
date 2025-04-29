import React, { createContext, useContext, useState, ReactNode } from 'react';

type NewChatState = "no" | "idle" | "creating";

interface NewConversationContextType {
  newChatState: NewChatState;
  setNewChatState: (state: NewChatState) => void;
  refetchConversations: () => void; // Add refetchConversations to the context type
}

const NewConversationContext = createContext<NewConversationContextType | undefined>(undefined);

export const NewConversationProvider = ({ children, refetchConversations }: { children: ReactNode, refetchConversations: () => void }) => {
  const [newChatState, setNewChatState] = useState<NewChatState>("no");

  return (
    <NewConversationContext.Provider value={{ newChatState, setNewChatState, refetchConversations }}> {/* Include refetchConversations in the value */}
      {children}
    </NewConversationContext.Provider>
  );
};

export const useNewConversation = () => {
  const context = useContext(NewConversationContext);
  if (context === undefined) {
    throw new Error('useNewConversation must be used within a NewConversationProvider');
  }
  return context;
};
