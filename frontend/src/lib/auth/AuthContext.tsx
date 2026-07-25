import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  type ReactElement,
} from 'react';
import { getToken, setToken as persistToken, clearToken, decodeToken, isTokenLive } from './token';

interface AuthState {
  token: string | null;
  account: string | null;
  isConnected: boolean;
  connect: (token: string) => void;
  disconnect: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }): ReactElement => {
  const [token, setTokenState] = useState<string | null>(() => {
    const stored = getToken();
    return stored && isTokenLive(stored) ? stored : null;
  });

  // The API client clears localStorage and fires this event on any 401 --
  // there is no refresh path for this single-account JWT, so the only
  // correct reaction is to drop the session and let route guards redirect.
  useEffect(() => {
    const onExpired = () => setTokenState(null);
    window.addEventListener('dispatch:auth-expired', onExpired);
    return () => window.removeEventListener('dispatch:auth-expired', onExpired);
  }, []);

  const value = useMemo<AuthState>(() => {
    const account = token ? (decodeToken(token)?.sub ?? null) : null;
    return {
      token,
      account,
      isConnected: token !== null,
      connect: (next: string) => {
        persistToken(next);
        setTokenState(next);
      },
      disconnect: () => {
        clearToken();
        setTokenState(null);
      },
    };
  }, [token]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthState => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
