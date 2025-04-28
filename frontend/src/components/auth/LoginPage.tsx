import React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { GoogleLogin } from '@react-oauth/google';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const isDevelopment = import.meta.env.MODE === 'development';

  const handleGoogleLoginSuccess = async (credentialResponse: any) => {
    console.log('Google login successful:', credentialResponse);
    // TODO: Send credentialResponse.credential (ID token) to backend for verification
    // and token exchange. For now, simulate success and redirect.

    try {
      // Call backend endpoint to verify token and authenticate user
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/auth/google-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: credentialResponse.credential }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.detail || 'Google login failed';
        console.error('Google login failed:', response.statusText, errorData);
        toast.error(errorMessage);
        return;
      }

      const data = await response.json();
      console.log('Backend authentication successful:', data);
      // Store authentication token (example using localStorage)
      localStorage.setItem('authToken', data.access_token);
      // Redirect user to the main page
      navigate('/');

    } catch (error) {
      console.error('An error occurred during backend authentication:', error);
      toast.error('An error occurred during login.');
    }
  };

  const handleGoogleLoginError = () => {
    console.error('Google login failed');
    toast.error('Google login failed. Please try again.');
  };

  const handleQuickLogin = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/auth/test-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Test login failed');
      }

      const data = await response.json();
      localStorage.setItem('authToken', data.access_token);
      navigate('/');
    } catch (error) {
      console.error('Test login failed:', error);
      toast.error('Test login failed. Please try again.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-black p-6">
      <div className="relative px-8 py-10 bg-gray-800 bg-opacity-70 backdrop-filter backdrop-blur-lg shadow-2xl rounded-xl w-full max-w-md border border-gray-700">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-extrabold text-white mb-3 tracking-tight">Moo Point</h1>
          <h3 className="text-xl font-semibold text-gray-300">Login to your account</h3>
        </div>
        <div className="flex flex-col items-center space-y-4">
          <GoogleLogin
            onSuccess={handleGoogleLoginSuccess}
            onError={handleGoogleLoginError}
          />
          {isDevelopment && (
            <button
              onClick={handleQuickLogin}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Quick test login (dev only)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
