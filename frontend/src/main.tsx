import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Navigate, Outlet, RouterProvider, useNavigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css'
import LoginPage from './components/auth/LoginPage.tsx';
import { MainLayout } from './components/layout/MainLayout.tsx';
import { ChatInterface } from './components/chat/ChatInterface.tsx';
import { ToastContainer } from 'react-toastify';
import LoadingSpinner from './components/ui/LoadingSpinner.tsx';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';

const googleClientId = '181853076785-uf93784hrobvqqfrgftek08hd5n03m25.apps.googleusercontent.com';

const queryClient = new QueryClient();

export const AuthenticatedOnly = () => {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
      if (!auth.isTokenSet || (!auth.isLoading && !auth.auth)) {
          setTimeout(() => {
              auth.logout();
              navigate("/login")
          }, 50)
      }
  }, [auth, auth.isLoading, auth.auth, auth.isTokenSet, navigate]);

  if (auth.isLoading) {
      return <LoadingSpinner />;
  }

  return <>
    <Outlet />
  </>
};

export function HomePage() {
  const auth = useAuth();

  if (auth.isLoading) {
      return <LoadingSpinner/>;
  }

  if (!auth.auth) {
      return <Navigate to={'/login'} replace={true}/>
  }

    return <Navigate to='/chat' replace={true}/>
};

export const AnonymousOnly = () => {
  const auth = useAuth();

  if (auth.isLoading) {
      return <LoadingSpinner />;
  }

  if (auth.auth) {
      return <Navigate to={'/'} />
  }

  return <>
    <Outlet />
  </>
};



const router = createBrowserRouter([
  {
      path: '/',
      children: [
          {
              path: '/',
              element: <HomePage />
          },
          {
              path: '/',
              element: <AuthenticatedOnly />,
              children: [
                  {
                      path: '/chat',
                      element: <MainLayout>
                        <ChatInterface />
                      </MainLayout>,
                      children: [
                          {
                              path: '/chat',
                              element: <></>,
                          },
                          {
                              path: '/chat/:id',
                              element: <></>,
                          },
                      ]
                  },
              ]
          },
          {
              path: '/',
              element: <AnonymousOnly />,
              children: [
                  {
                      path: '/login',
                      element: <LoginPage />
                  },
              ]
          },
          // {
          //     path: '/legal',
          //     element: <Legal />,
          //     children: [
          //         {
          //             path: '/legal/terms-of-service',
          //             element: <TermsOfServicePage />
          //         },
          //     ]
          // },
          // {
          //     path: '/signup-success/confirm-email',
          //     element: <SignupSuccessConfirmEmailPage />
          // },
          // {
          //     path: '/logout',
          //     element: <LogoutPage />
          // },
      ]
  },
])




createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <RouterProvider router={router}/>
            <ToastContainer />
          </AuthProvider>
        </QueryClientProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
)
