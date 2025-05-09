import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { CredentialResponse, GoogleLogin } from '@react-oauth/google';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';

const googleLogin = async (credential: string): Promise<{ access_token: string }> => {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/auth/google-login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token: credential }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Google login failed');
  }

  return response.json();
};

const quickLogin = async (): Promise<{ access_token: string }> => {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/auth/test-login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Test login failed');
  }

  return response.json();
};


const LoginPage = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const isDevelopment = import.meta.env.MODE === 'development';

  // Use useMutation for Google login
  const googleLoginMutation = useMutation<{ access_token: string }, Error, string>({
    mutationFn: googleLogin,
    onSuccess: (data) => {
      console.log('Backend authentication successful:', data);
      auth.login(data.access_token);
      navigate('/');
    },
    onError: (error) => {
      console.error('An error occurred during backend authentication:', error);
      toast.error('An error occurred during login: ' + error.message);
    },
  });

  // Use useMutation for quick test login
  const quickLoginMutation = useMutation<{ access_token: string }, Error>({
    mutationFn: quickLogin,
    onSuccess: (data) => {
      auth.login(data.access_token);
      navigate('/');
    },
    onError: (error) => {
      console.error('Test login failed:', error);
      toast.error('Test login failed: ' + error.message);
    },
  });


  const handleGoogleLoginSuccess = (credentialResponse: CredentialResponse) => {
    console.log('Google login successful:', credentialResponse);
    if (credentialResponse.credential) {
      googleLoginMutation.mutate(credentialResponse.credential);
    } else {
      toast.error('Google login failed: No credential received.');
    }
  };

  const handleGoogleLoginError = () => {
    console.error('Google login failed');
    toast.error('Google login failed. Please try again.');
  };

  const handleQuickLoginClick = () => {
    quickLoginMutation.mutate();
  };

  const isLoading = googleLoginMutation.isPending || quickLoginMutation.isPending;

  return (
    <div className='flex flex-col sm:flex-row h-full'>
      <div className="bg-white sm:flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Welcome to Moo Point</h1>
          <p className="text-lg text-gray-700 mb-4">...a platform for interacting with AI models and MCP tools <u>of your choice</u></p>
        </div>

      </div>
      <div className="flex sm:flex-2 items-center justify-center grow bg-gradient-to-br from-gray-900 to-black p-6">
        <div className="mt-[-200px] sm:mt-0 relative px-8 py-10 bg-gray-800 bg-opacity-70 backdrop-filter backdrop-blur-lg shadow-2xl rounded-xl w-full max-w-md border border-gray-700">
          <div className="text-center mb-8">
            <h3 className="text-xl font-semibold text-gray-300">Login to your account</h3>
          </div>
          <div className="flex flex-col items-center space-y-4">
            <GoogleLogin
              onSuccess={handleGoogleLoginSuccess}
              onError={handleGoogleLoginError}
            />
            {isDevelopment && (
              <button
                onClick={handleQuickLoginClick}
                className="text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                {quickLoginMutation.isPending ? 'Logging in...' : 'Quick test login (dev only)'}
              </button>
            )}
          </div>
        </div>
    </div>

    </div>
  );
};

export default LoginPage;
