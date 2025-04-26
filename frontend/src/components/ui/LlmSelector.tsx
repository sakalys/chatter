import React, { useEffect, useState } from 'react';
import { useLlm } from '../../context/LlmContext';
import { modelService } from '../../services/modelService';
import { McpConfig } from '../../types';

interface LlmSelectorProps {
  // TODO: Add props for handling LLM selection
}

export function LlmSelector({}: LlmSelectorProps) {
  const [llms, setLlms] = useState<McpConfig[]>([]);
  const { selectedLlm, setSelectedLlm } = useLlm();

  useEffect(() => {
    const fetchLlms = async () => {
      try {
        const configuredLlms = await modelService.getConfiguredLlms();
        setLlms(configuredLlms);
        // Set a default selected LLM (e.g., the first one) if none is selected
        if (configuredLlms.length > 0 && !selectedLlm) {
          setSelectedLlm(configuredLlms[0]);
        }
      } catch (error) {
        console.error('Error fetching configured LLMs:', error);
        // Optionally, display an error message to the user
      }
    };

    fetchLlms();
  }, [selectedLlm, setSelectedLlm]); // Add selectedLlm and setSelectedLlm to dependency array

  const handleLlmChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = event.target.value;
    const llm = llms.find(llm => llm.id === selectedId);
    if (llm) {
      setSelectedLlm(llm);
    }
  };

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
      >
        {llms.map((llm) => (
          <option key={llm.id} value={llm.id}>
            {llm.name}
          </option>
        ))}
      </select>
    </div>
  );
}
