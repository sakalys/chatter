import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetchWithToken } from '../util/api';

export interface AuthContextType {
  isFetching: boolean
  isLoading: boolean
  isTokenSet: boolean
  auth: {} | null
  error: Error | null
  login: (user: string) => void
  logout: () => void
  refetch: () => void
}

export const AuthContext = createContext<AuthContextType>(null!);

export const useAuth = () => {
  return useContext(AuthContext);
};


class TokenStorage {
  private storage: Storage;
  static TOKEN_KEY = 'user-token';

  constructor() {
      this.storage = localStorage;
  }

  setToken(token: string) {
      this.storage.setItem(TokenStorage.TOKEN_KEY, token);
  }

  isTokenSet() {
      try {
          return !!this.token;
      } catch (e) {
          return false;
      }
  }

  get token(): string {
      const storedToken = this.storage.getItem(TokenStorage.TOKEN_KEY);
      if (!storedToken) {
          throw new Error('User token not set');
      }

      return storedToken;
  }

  discardToken() {
      this.storage.clear();
  }
}

export const tokenStorage = new TokenStorage();



const idleRefetchTimeout = 1000 * 60 * 5; // 5 minutes

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const client = useQueryClient();

  const initialToken = useMemo(() => {
      return (tokenStorage.isTokenSet() && tokenStorage.token) || null
  }, []);

  const [tokenValue, setTokenValue] = useState<string | null>(initialToken);

  const login = useCallback((token: string) => {
      setTokenValue(token);
  }, []);

  const isTokenSet = !!tokenValue;

  const [focusDate, setFocusDate] = useState(new Date());
  const [lostFocusDate, setLostFocusDate] = useState<Date | null>(null);

  useEffect(() => {
      if (!isTokenSet) {
          return;
      }

      if (typeof window !== 'undefined' && window.addEventListener) {
          const listener = () => {
              if (document.visibilityState === 'visible') {
                  setFocusDate(new Date());
              } else {
                  setLostFocusDate(new Date());
              }
          }

          window.addEventListener('visibilitychange', listener, false)
          return () => {
              window.removeEventListener('visibilitychange', listener)
          }
      }
  }, [isTokenSet]);

  const { data: auth, error, isFetching, isLoading, refetch } = useQuery({
      queryKey: ['auth-user-general', tokenValue],
      queryFn: async () => {
          const res = await apiFetchWithToken<{}>(tokenValue!, 'GET', '/auth/validate');
          return res;
      },
      enabled: !!tokenValue,
  });

  const queryClient = useQueryClient();

  const logout = useCallback(() => {
      setTokenValue(null);
      queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
      if (isFetching) {
          return;
      }

      if (error) {
          tokenStorage.discardToken();
          return;
      }

      if (tokenValue) {
          if (tokenValue !== initialToken) {
              tokenStorage.setToken(tokenValue);
          }
      } else {
          tokenStorage.discardToken();
      }

  }, [tokenValue, isFetching, initialToken, client, error])

  useEffect(() => {
      if (!lostFocusDate) {
          return;
      }

      const diff = focusDate.valueOf() - lostFocusDate.valueOf();

      if (diff <= 0) {
          return;
      }

      if (diff > idleRefetchTimeout) {
          console.log('Idle for too long', diff)
          refetch().then();
      }
  }, [focusDate, lostFocusDate, refetch]);


  const value = useMemo(() => {
      return { auth: (!error && auth) || null, login, logout, isFetching, isLoading, isTokenSet, error, refetch }
  }, [error, auth, isFetching, isLoading, isTokenSet, login, logout, refetch]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
