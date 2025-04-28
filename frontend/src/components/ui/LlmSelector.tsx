import React, { useEffect } from 'react';
import { useLlm } from '../../context/LlmContext';
import { modelService } from '../../services/modelService';
import { McpConfig } from '../../types';
import { useQuery } from '@tanstack/react-query';

interface LlmSelectorProps {
  // TODO: Add props for handling LLM selection
}

const fetchLlms = async (): Promise<McpConfig[]> => {
  return modelService.getConfiguredLlms();
};

export function LlmSelector({}: LlmSelectorProps) {
  const { selectedLlm, setSelectedLlm } = useLlm();

  const { data: llms, error, isLoading } = useQuery<McpConfig[], Error>({
    queryKey: ['llms'],
    queryFn: fetchLlms,
    staleTime: 5 * 60 * 1000, // Data is considered fresh for 5 minutes
  });

  // Set a default selected LLM (e.g., the first one) if none is selected and LLMs are loaded
  useEffect(() => {
    if (llms && llms.length > 0 && !selectedLlm) {
      setSelectedLlm(llms[0]);
    }
  }, [llms, selectedLlm, setSelectedLlm]);

  const handleLlmChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = event.target.value;
    const llm = llms?.find(llm => llm.id === selectedId);
    if (llm) {
      setSelectedLlm(llm);
    }
  };

  if (isLoading) {
    return <div>Loading LLMs...</div>;
  }

  if (error) {
    return <div>Error loading LLMs: {error.message}</div>;
  }

  return (
    <div className="flex items-center space-x-2">
      <label htmlFor="llm-select" className="text-sm font-medium text-gray-700">
        Select LLM:
      </label>
      <select
        id="llm-select"
        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
        value={selectedLlm?.id || ''}
        onChange={handleLlmChange}
        disabled={!llms || llms.length === 0}
      >
        {llms?.map((llm) => (
          <option key={llm.id} value={llm.id}>
            {llm.name}
          </option>
        ))}
      </select>
    </div>
  );
}
