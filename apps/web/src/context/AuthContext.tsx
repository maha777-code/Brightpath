import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  createElement,
  type ReactNode,
} from 'react';
import type {
  ParentUser,
  Locale,
  CurriculumUpgradeEvent,
  RegisterRequest,
} from '@brightpath/shared';
import { api, saveAuth, clearAuth, loadStoredParent, loadStoredToken } from '@/lib/api';
import { setLocale } from '@/i18n';

interface AuthContextValue {
  parent: ParentUser | null;
  loading: boolean;
  pendingUpgrade: CurriculumUpgradeEvent | null;
  clearPendingUpgrade: () => void;
  login: (email: string, password: string) => Promise<CurriculumUpgradeEvent | undefined>;
  register: (data: Omit<RegisterRequest, 'email' | 'password'> & { email: string; password: string }) => Promise<void>;
  updateParent: (parent: ParentUser) => void;
  logout: () => void;
  refresh: () => Promise<CurriculumUpgradeEvent | undefined>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [parent, setParent] = useState<ParentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingUpgrade, setPendingUpgrade] = useState<CurriculumUpgradeEvent | null>(null);

  const clearPendingUpgrade = useCallback(() => setPendingUpgrade(null), []);

  const updateParent = useCallback((p: ParentUser) => {
    setParent(p);
    const token = loadStoredToken();
    if (token) saveAuth(token, p);
  }, []);

  const refresh = useCallback(async () => {
    if (!loadStoredToken()) {
      setParent(null);
      return undefined;
    }
    try {
      const res = await api.me();
      setParent(res.parent);
      saveAuth(loadStoredToken()!, res.parent);
      void setLocale(res.parent.locale);
      if (res.curriculum?.upgraded) {
        setPendingUpgrade(res.curriculum);
      }
      return res.curriculum;
    } catch {
      clearAuth();
      setParent(null);
      return undefined;
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
    const { token, parent: p, curriculum } = await api.login({ email, password });
    saveAuth(token, p);
    setParent(p);
    void setLocale(p.locale);
    if (curriculum?.upgraded) setPendingUpgrade(curriculum);
    return curriculum;
  }, []);

  const register = useCallback(
    async (data: Omit<RegisterRequest, 'email' | 'password'> & { email: string; password: string }) => {
      const { token, parent: p } = await api.register(data);
      saveAuth(token, p);
      setParent(p);
      void setLocale(p.locale);
    },
    [],
  );

  const logout = useCallback(() => {
    clearAuth();
    setParent(null);
    setPendingUpgrade(null);
  }, []);

  return createElement(AuthContext.Provider, {
    value: {
      parent,
      loading,
      pendingUpgrade,
      clearPendingUpgrade,
      login,
      register,
      updateParent,
      logout,
      refresh,
    },
    children,
  });
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
