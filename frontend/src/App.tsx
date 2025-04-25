import { Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { MainLayout } from './components/layout/MainLayout';
import { ChatInterface } from './components/chat/ChatInterface';
import { SettingsButton } from './components/ui/SettingsButton';
import LoginPage from './components/auth/LoginPage';

function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <MainLayout>
              <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
                <h2 className="text-lg font-medium text-gray-900">New Conversation</h2>
                <SettingsButton />
              </div>
              <ChatInterface />
            </MainLayout>
          }
        />
      </Routes>
      <ToastContainer />
    </>
  );
}

export default App;
