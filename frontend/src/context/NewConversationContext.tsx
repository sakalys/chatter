import React, { createContext, useContext, useState, ReactNode } from 'react';

type NewChatState = "no" | "idle" | "creating";

interface NewConversationContextType {
  newChatState: NewChatState;
  setNewChatState: (state: NewChatState) => void;
}

const NewConversationContext = createContext<NewConversationContextType | undefined>(undefined);

export const NewConversationProvider = ({ children }: { children: ReactNode }) => {
  const [newChatState, setNewChatState] = useState<NewChatState>("no");

  return (
    <NewConversationContext.Provider value={{ newChatState, setNewChatState }}>
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
