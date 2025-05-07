import { createContext, useContext } from "react";

export const GlobalSettingsContext = createContext<{
isApiKeyModalOpen: boolean, 
setIsApiKeyModalOpen(open: boolean): unknown;
isMCPConfigModalOpen: boolean, 
setIsMCPConfigModalOpen(open: boolean): void
} | null>(null)

export function useGlobalSettings () {
  const ctx = useContext(GlobalSettingsContext);

  if (!ctx) {
    throw new Error('MCPConfigContext not found');
  }

  return ctx;
}