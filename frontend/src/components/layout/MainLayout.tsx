import { ReactNode } from 'react';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-blue-600">Chat Platform</h1>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Models</h2>
          <div className="space-y-1 mb-6">
            <button className="w-full text-left px-3 py-2 rounded-md bg-blue-50 text-blue-700 font-medium">
              GPT-4
            </button>
            <button className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100">
              Claude 3
            </button>
            <button className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100">
              Llama 3
            </button>
          </div>
          
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Conversations</h2>
          <div className="space-y-1">
            <button className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100">
              <div className="font-medium truncate">Project Planning</div>
              <div className="text-xs text-gray-500">2 hours ago</div>
            </button>
            <button className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100">
              <div className="font-medium truncate">Code Review</div>
              <div className="text-xs text-gray-500">Yesterday</div>
            </button>
            <button className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100">
              <div className="font-medium truncate">Bug Fixing</div>
              <div className="text-xs text-gray-500">3 days ago</div>
            </button>
          </div>
        </div>
        <div className="p-4 border-t border-gray-200">
          <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            New Chat
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
}
