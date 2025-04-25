import { MainLayout } from './components/layout/MainLayout';
import { ChatInterface } from './components/chat/ChatInterface';
import { SettingsButton } from './components/ui/SettingsButton';

function App() {
  return (
    <MainLayout>
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <h2 className="text-lg font-medium text-gray-900">New Conversation</h2>
        <SettingsButton />
      </div>
      <ChatInterface />
    </MainLayout>
  );
}

export default App;
