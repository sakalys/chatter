import { useEffect, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { MainLayout } from './components/layout/MainLayout';
import { ChatInterface } from './components/chat/ChatInterface';
import LoginPage from './components/auth/LoginPage';
import LoadingSpinner from './components/ui/LoadingSpinner'; // Assuming a LoadingSpinner component exists
import { useQuery, useMutation } from '@tanstack/react-query';

const validateToken = async (token: string): Promise<boolean> => {
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

const testLogin = async (): Promise<{ access_token: string }> => {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/auth/test-login`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Failed to get test token');
  }
  return response.json();
};


function App() {
  const bypassAuth = import.meta.env.VITE_BYPASS_AUTH === 'true';
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isCreatingNewConversation, setIsCreatingNewConversation] = useState(false); // State for placeholder
  const navigate = useNavigate();

  // Use useQuery for token validation
  const { data: isTokenValid, isLoading: isLoadingValidation } = useQuery<boolean, Error>({
    queryKey: ['validateToken', authToken],
    queryFn: () => validateToken(authToken!),
    enabled: !!authToken && !bypassAuth, // Only run if authToken exists and not bypassing auth
    staleTime: Infinity, // Token validation result is unlikely to change
  });

  // Use useMutation for test login
  const testLoginMutation = useMutation<{ access_token: string }, Error>({
    mutationFn: testLogin,
    onSuccess: (data) => {
      localStorage.setItem('authToken', data.access_token);
      setAuthToken(data.access_token);
      console.log('Obtained test token and stored in localStorage and state.');
    },
    onError: (error) => {
      console.error('Error during test login:', error);
      setAuthToken(null);
    },
  });

  useEffect(() => {
    const authenticate = async () => {
      if (bypassAuth) {
        testLoginMutation.mutate();
      } else {
        const existingToken = localStorage.getItem('authToken');
        if (existingToken) {
          setAuthToken(existingToken);
        } else {
          // No token exists, redirect to login
          navigate('/login');
        }
      }
    };

    authenticate();
  }, [bypassAuth, navigate, testLoginMutation]);

  useEffect(() => {
    if (!bypassAuth && authToken !== null && isTokenValid === false) {
      // If token is invalid, clear it and redirect to login
      localStorage.removeItem('authToken');
      setAuthToken(null); // Clear authToken state as well
      navigate('/login');
    }
  }, [bypassAuth, authToken, isTokenValid, navigate]);


  const loadingAuth = bypassAuth ? testLoginMutation.isPending : isLoadingValidation || authToken === null;


  if (loadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner /> {/* Show loading spinner while authenticating */}
      </div>
    );
  }

  // Handle test login error in bypass mode
  if (bypassAuth && testLoginMutation.isError) {
    return <div>Error obtaining test token: {testLoginMutation.error.message}</div>;
  }


  return (
    <>
      <Routes>
        {bypassAuth ? (
          authToken ? ( // Conditionally render if authToken exists
            <>
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
              <Route
                path="/chat/:conversationId"
                element={
                  <MainLayout
                    authToken={authToken}
                    setIsCreatingNewConversation={setIsCreatingNewConversation}
                  >
                    <ChatInterface setIsCreatingNewConversation={setIsCreatingNewConversation} />
                  </MainLayout>
                }
              />
            </>
          ) : (
            // Optionally render an error message or redirect if test login fails
            // This case is now handled by the testLoginMutation.isError check above
            null
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
            <Route
              path="/chat/:conversationId"
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
