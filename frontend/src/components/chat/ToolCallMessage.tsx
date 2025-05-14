import { MCPToolUse } from '../../types';
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import { Nl2br } from './ChatInterface';

interface ToolCallMessageProps {
    toolCall: MCPToolUse
    onDecision: (toolDecide: boolean) => void
    disabled: boolean
}

export function ToolCallMessage({ toolCall, onDecision, disabled }: ToolCallMessageProps) {

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
                {toolCall.state === 'pending' ? (
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

interface ToolCallResponseProps {
    content: string
}

export function ToolCallResponse({ content }: ToolCallResponseProps) {
    const breakIndex = content.indexOf('\n');

    const first = breakIndex > -1 ? content.substring(0,  breakIndex) : content;
    const other = breakIndex > -1 ? content.substring(breakIndex) : '';

    console.log(first, other)

    return (
        <div className="w-full max-w-lg rounded-xl bg-black/5">
            <div className="max-h-60 overflow-y-auto p-4">
                <Disclosure as="div" className="" defaultOpen={false}>
                    <DisclosureButton className="group flex w-full items-center justify-between">
                        <div className="font-medium text-sm text-black/50 group-data-hover:text-black/80 overflow-hidden overflow-ellipsis whitespace-nowrap">
                            <div className='text-xs text-zinc-500'>Tool Response</div>
                        </div>
                        <ChevronDownIcon className="size-5 fill-black/60 group-data-hover:fill-black/50 group-data-open:rotate-180" />
                    </DisclosureButton>
                    <DisclosurePanel className="text-sm/5 text-black/50">
                        <Nl2br text={content}/>
                    </DisclosurePanel>
                </Disclosure>
            </div>
        </div>
    )
}
