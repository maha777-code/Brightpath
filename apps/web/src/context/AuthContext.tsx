import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  createElement,
  type ReactNode,
} from 'react';
import type { ParentUser, Locale } from '@brightpath/shared';
import { api, saveAuth, clearAuth, loadStoredParent, loadStoredToken } from '@/lib/api';
import { setLocale } from '@/i18n';

interface AuthContextValue {
  parent: ParentUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string, locale?: Locale) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [parent, setParent] = useState<ParentUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!loadStoredToken()) {
      setParent(null);
      return;
    }
    try {
      const { parent: p } = await api.me();
      setParent(p);
      saveAuth(loadStoredToken()!, p);
      void setLocale(p.locale);
    } catch {
      clearAuth();
      setParent(null);
    }
  }, []);

  useEffect(() => {
    const stored = loadStoredParent();
    if (stored) {
      setParent(stored);
      void setLocale(stored.locale);
    }
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const { token, parent: p } = await api.login({ email, password });
    saveAuth(token, p);
    setParent(p);
    void setLocale(p.locale);
  }, []);

  const register = useCallback(
    async (email: string, password: string, name?: string, locale?: Locale) => {
      const { token, parent: p } = await api.register({ email, password, name, locale });
      saveAuth(token, p);
      setParent(p);
      void setLocale(p.locale);
    },
    [],
  );

  const logout = useCallback(() => {
    clearAuth();
    setParent(null);
  }, []);

  return createElement(AuthContext.Provider, {
    value: { parent, loading, login, register, logout, refresh },
    children,
  });
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
