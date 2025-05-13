import ReactMarkdown from 'react-markdown';
import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter'
import {dark} from 'react-syntax-highlighter/dist/esm/styles/prism'
import remarkGfm from 'remark-gfm';
import { Nl2p } from './ChatInterface';
import { MCPToolUse, Model } from '../../types';
import { ToolCallMessage } from './ToolCallMessage';

export enum MessageRole {
    User= 'user',
    Assistant = 'asssitant',
    FunctionCall = 'function_call',
    AuthError = 'auth_error',
    ApiError = 'api_error',
    System = 'system',
}

interface ChatMessageProps {
  id: string
  role: MessageRole
  content: string
  model: string
  toolCall: MCPToolUse | null
  onDecision: (toolDecide: boolean) => void
  disabledToolCall: boolean
}

export function ChatMessage({ role, content, model, toolCall, onDecision, disabledToolCall }: ChatMessageProps) {
  const isUser = role === MessageRole.User;
  const isError = role === MessageRole.ApiError || role === MessageRole.AuthError;
  const isToolCall = !!toolCall;

  let bgColor = 'bg-gray-50';
  let avatar = (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M16.5 7.5h-9v9h9v-9z" />
      <path fillRule="evenodd" d="M8.25 2.25A.75.75 0 019 3v.75h2.25V3a.75.75 0 011.5 0v.75H15V3a.75.75 0 011.5 0v.75h.75a3 3 0 013 3v.75H21A.75.75 0 0121 9h-.75v2.25H21a.75.75 0 010 1.5h-.75V15H21a.75.75 0 010 1.5h-.75v.75a3 3 0 01-3 3h-.75V21a.75.75 0 01-1.5 0v-.75h-2.25V21a.75.75 0 01-1.5 0v-.75H9V21a.75.75 0 01-1.5 0v-.75h-.75a3 3 0 01-3-3v-.75H3A.75.75 0 013 15h.75v-2.25H3a.75.75 0 010-1.5h.75V9H3a.75.75 0 010-1.5h.75v-.75a3 3 0 013-3h.75V3a.75.75 0 01.75-.75zM6 6.75A.75.75 0 016.75 6h10.5a.75.75 0 01.75.75v10.5a.75.75 0 01-.75.75H6.75a.75.75 0 01-.75-.75V6.75z" clipRule="evenodd" />
    </svg>
  );
  let senderName = model || 'Assistant';
  let textColor = 'text-gray-700';

  if (isUser) {
    bgColor = 'bg-white';
    avatar = (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
      </svg>
    );
    senderName = 'You';
    } else if (isError) {
    bgColor = 'bg-red-300';
    avatar = (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25a.75.75 0 00-1.5 0V6.75a3.75 3.75 0 10-7.5 0v3a.75.75 0 00-1.5 0V6.75a5.25 5.25 0 1110.5 0v3z" clipRule="evenodd" />
      </svg>
    );
    senderName = 'Error';
  } else if (isToolCall) {
    bgColor = 'bg-yellow-100';
    avatar = (
      // TODO: Replace with a more appropriate icon for function calls
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25a.75.75 0 00-1.5 0V6.75a3.75 3.75 0 10-7.5 0v3a.75.75 0 00-1.5 0V6.75a5.25 5.25 0 1110.5 0v3z" clipRule="evenodd" />
      </svg>
    );
    senderName = 'Function Call';
    textColor = 'text-yellow-800';
  }

  return (
    <div className={`py-5 ${bgColor}`}>
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-start">
          <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${isUser ? 'bg-blue-100 text-blue-600' : isToolCall ? 'bg-yellow-200 text-yellow-800' : 'bg-purple-100 text-purple-600'}`}>
            {avatar}
          </div>
          <div className="ml-3 flex-1">
            <div className="flex items-center">
              <p className={`text-sm font-medium ${isUser ? 'text-gray-900' : isToolCall ? 'text-yellow-800' : 'text-gray-900'}`}>
                {senderName}
              </p>
            </div>
            <div className={`mt-1 text-sm ${textColor}`}>
              <div className="prose prose-sm">
                {isUser ? (
                  <Nl2p text={content} />
                ) : toolCall ? (
                  <ToolCallMessage toolCall={toolCall} onDecision={onDecision} disabled={disabledToolCall}/>
                ) : (
                  <Markdown content={content}/>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Markdown({content}: {content: string}) {
  return (
                  <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code(props) {
                      const {children, className, node, ...rest} = props
                      const match = /language-(\w+)/.exec(className || '')
                      return match ? (
                        <SyntaxHighlighter
                          {...rest}
                          PreTag="div"
                          children={String(children).replace(/\n$/, '')}
                          language={match[1]}
                          style={dark}
                        />
                      ) : (
                        <code {...rest} className={className}>
                          {children}
                        </code>
                      )
                    }
                  }}
                  >
                    {content}
                  </ReactMarkdown>
  )
}

export function IncomingMessage({incomingMessage, model}: {incomingMessage: string, model: Model}) {
  return (
    <div className="py-5 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-start">
          <div className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-purple-100 text-purple-600">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M16.5 7.5h-9v9h9v-9z" />
              <path fillRule="evenodd" d="M8.25 2.25A.75.75 0 019 3v.75h2.25V3a.75.75 0 011.5 0v.75H15V3a.75.75 0 011.5 0v.75h.75a3 3 0 013 3v.75H21A.75.75 0 0121 9h-.75v2.25H21a.75.75 0 010 1.5h-.75V15H21a.75.75 0 010 1.5h-.75v.75a3 3 0 01-3 3h-.75V21a.75.75 0 01-1.5 0v-.75h-2.25V21a.75.75 0 01-1.5 0v-.75H9V21a.75.75 0 01-1.5 0v-.75h-.75a3 3 0 01-3-3v-.75H3A.75.75 0 013 15h.75v-2.25H3a.75.75 0 010-1.5h.75V9H3a.75.75 0 010-1.5h.75v-.75a3 3 0 013-3h.75V3a.75.75 0 01.75-.75zM6 6.75A.75.75 0 016.75 6h10.5a.75.75 0 01.75.75v10.5a.75
                .75 0 01-.75.75H6.75a.75.75 0 01-.75-.75V6.75z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <div className="flex items-center">
              <p className="text-sm font-medium text-gray-900">{model.id || 'Assistant'}</p>
            </div>
            <div className="mt-1 text-sm text-gray-700">
              <div className="prose prose-sm">
                {incomingMessage === '' ? (
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                ) : (
                  <Markdown content={incomingMessage}/>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function OutgoingMessage ({ content }: {
  content: string;
  model: string;
}) {
  return (
    <div className="py-5 bg-white">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-start">
          <div className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-blue-100 text-blue-600">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <div className="flex items-center">
              <p className="text-sm font-medium text-gray-900">You</p>
            </div>
            <div className="mt-1 text-sm text-gray-700">
              <div className="prose prose-sm">
                <Markdown content={content}/>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
