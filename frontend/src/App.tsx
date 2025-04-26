import { useEffect, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { MainLayout } from './components/layout/MainLayout';
import { ChatInterface } from './components/chat/ChatInterface';
import LoginPage from './components/auth/LoginPage';
import LoadingSpinner from './components/ui/LoadingSpinner'; // Assuming a LoadingSpinner component exists

function App() {
  const bypassAuth = import.meta.env.VITE_BYPASS_AUTH === 'true';
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true); // New state to track auth loading
  const [setIsCreatingNewConversation] = useState(false); // State for placeholder
  const navigate = useNavigate();

  useEffect(() => {
    const validateToken = async (token: string) => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/auth/validate`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        return response.ok;
      } catch (error) {
        console.error('Error validating token:', error);
        return false;
      }
    };

    const authenticate = async () => {
      if (bypassAuth) {
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/auth/test-login`, {
            method: 'POST',
          });
          if (!response.ok) {
            throw new Error('Failed to get test token');
          }
          const data = await response.json();
          localStorage.setItem('authToken', data.access_token);
          setAuthToken(data.access_token);
          console.log('Obtained test token and stored in localStorage and state.');
        } catch (error) {
          console.error('Error during test login:', error);
          setAuthToken(null);
        } finally {
          setLoadingAuth(false); // Set loading to false after fetch
        }
      } else {
        const existingToken = localStorage.getItem('authToken');
        if (existingToken) {
          // Validate the existing token
          const isValid = await validateToken(existingToken);
          if (isValid) {
            setAuthToken(existingToken);
          } else {
            // If token is invalid, clear it and redirect to login
            localStorage.removeItem('authToken');
            navigate('/login');
          }
        } else {
          // No token exists, redirect to login
          navigate('/login');
        }
        setLoadingAuth(false); // Set loading to false if not bypassing auth
      }
    };

    authenticate();
  }, [bypassAuth, navigate]);

  if (loadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner /> {/* Show loading spinner while authenticating in bypass mode */}
      </div>
    );
  }

  return (
    <>
      <Routes>
        {bypassAuth ? (
          authToken ? ( // Conditionally render if authToken exists
            <Route
              path="/"
              element={
                <MainLayout
                  authToken={authToken}
                  setIsCreatingNewConversation={setIsCreatingNewConversation}
                >
                  <ChatInterface setIsCreatingNewConversation={setIsCreatingNewConversation} />
                </MainLayout>
              }
            />
          ) : (
            // Optionally render an error message or redirect if test login fails
            <Route path="/" element={<div>Error obtaining test token.</div>} />
          )
        ) : (
          <>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                authToken ? ( // Conditionally render if authToken exists
                  <MainLayout
                    authToken={authToken}
                    setIsCreatingNewConversation={setIsCreatingNewConversation}
                  >
                    <ChatInterface setIsCreatingNewConversation={setIsCreatingNewConversation} />
                  </MainLayout>
                ) : (
                  <LoginPage /> // Redirect to login if no token
                )
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
