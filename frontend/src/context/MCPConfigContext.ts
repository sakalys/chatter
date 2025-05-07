import { createContext, useContext } from "react";

export const MCPConfigContext = createContext<{
isMCPConfigModalOpen: boolean, 
setIsMCPConfigModalOpen(open: boolean): void
} | null>(null)

export function useMCPConfig () {
  const ctx = useContext(MCPConfigContext);

  if (!ctx) {
    throw new Error('MCPConfigContext not found');
  }

  return ctx;
}