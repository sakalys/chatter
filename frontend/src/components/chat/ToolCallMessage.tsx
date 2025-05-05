import { useState } from 'react';
import { MCPToolUse } from '../../types';

interface ToolCallMessageProps {
  toolCall: MCPToolUse
  onDecision: (toolDecide: boolean) => void
  disabled: boolean
}

export function ToolCallMessage({ toolCall, onDecision, disabled }: ToolCallMessageProps) {
    const [isPending, setIsPending] = useState(toolCall.state === 'pending');

  return (
    <div className="flex items-center">
      <div className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-yellow-100 text-yellow-600">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25a.75.75 0 00-1.5 0V6.75a3.75 3.75 0 10-7.5 0v3a.75.75 0 00-1.5 0V6.75a5.25 5.25 0 1110.5 0v3z" clipRule="evenodd" />
        </svg>
      </div>
      <div className="ml-2 text-sm text-gray-700">
        <div>{toolCall.name}</div>
        {/* present arguments */}
        <div className="text-xs text-gray-500">
          {JSON.stringify(toolCall.args)}
        </div>
        {isPending ? (
          <>
            <button
              className="ml-2 px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => onDecision(true)}
              disabled={disabled}
            >Approve</button>
            <button
              className="ml-2 px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => onDecision(false)}
              disabled={disabled}
            >Reject</button>
          </>
        ) : (
          <>
            <div className="text-xs text-gray-500">{toolCall.state}</div>
          </>
        )}
      </div>
    </div>
  );
}
