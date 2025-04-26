import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Llm {
  id: string;
  name: string;
}

interface LlmContextType {
  selectedLlm: Llm | null;
  setSelectedLlm: (llm: Llm | null) => void;
}

const LlmContext = createContext<LlmContextType | undefined>(undefined);

interface LlmProviderProps {
  children: ReactNode;
}

export function LlmProvider({ children }: LlmProviderProps) {
  const [selectedLlm, setSelectedLlm] = useState<Llm | null>(null);

  return (
    <LlmContext.Provider value={{ selectedLlm, setSelectedLlm }}>
      {children}
    </LlmContext.Provider>
  );
}

export function useLlm() {
  const context = useContext(LlmContext);
  if (context === undefined) {
    throw new Error('useLlm must be used within an LlmProvider');
  }
  return context;
}
