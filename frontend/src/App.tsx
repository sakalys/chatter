import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { MainLayout } from './components/layout/MainLayout';
import { ChatInterface } from './components/chat/ChatInterface';
import { SettingsButton } from './components/ui/SettingsButton';
import LoginPage from './components/auth/LoginPage';

function App() {
  const bypassAuth = import.meta.env.VITE_BYPASS_AUTH === 'true';

  useEffect(() => {
    if (bypassAuth) {
      // Call the backend test login endpoint to get a token
      fetch('http://localhost:8000/api/v1/auth/test-login', {
        method: 'POST',
      })
        .then(response => {
          if (!response.ok) {
            throw new Error('Failed to get test token');
          }
          return response.json();
        })
        .then(data => {
          localStorage.setItem('authToken', data.access_token);
          console.log('Obtained test token and stored in localStorage.');
        })
        .catch(error => {
          console.error('Error during test login:', error);
          // Handle error, maybe show a message to the user
        });
    }
  }, [bypassAuth]);

  return (
    <>
      <Routes>
        {bypassAuth ? (
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
        ) : (
          <>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                // This route will likely be protected and redirect to /login if not authenticated
                // For now, it renders the main layout, but the auth check should happen elsewhere
                <MainLayout>
                  <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
                    <h2 className="text-lg font-medium text-gray-900">New Conversation</h2>
                    <SettingsButton />
                  </div>
                  <ChatInterface />
                </MainLayout>
              }
            />
          </>
        )}
      </Routes>
      <ToastContainer />
    </>
  );
}

export default App;
