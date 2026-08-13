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
  CurriculumUpgradeEvent,
  RegisterRequest,
  TeacherUser,
  UserRole,
  SignupRole,
} from '@brightpath/shared';
import {
  api,
  saveAuth,
  saveTeacherAuth,
  clearAuth,
  loadStoredParent,
  loadStoredTeacher,
  loadStoredToken,
  loadStoredRole,
  isLearnerRole,
} from '@/lib/api';
import { setLocale } from '@/i18n';

interface AuthContextValue {
  parent: ParentUser | null;
  teacher: TeacherUser | null;
  role: UserRole | null;
  loading: boolean;
  pendingUpgrade: CurriculumUpgradeEvent | null;
  clearPendingUpgrade: () => void;
  login: (email: string, password: string) => Promise<CurriculumUpgradeEvent | undefined>;
  loginTeacher: (email: string, password: string) => Promise<void>;
  register: (
    data: Omit<RegisterRequest, 'email' | 'password' | 'role'> & {
      email: string;
      password: string;
      role: SignupRole;
    },
  ) => Promise<{ role: UserRole }>;
  updateParent: (parent: ParentUser) => void;
  logout: () => void;
  refresh: () => Promise<CurriculumUpgradeEvent | undefined>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [parent, setParent] = useState<ParentUser | null>(null);
  const [teacher, setTeacher] = useState<TeacherUser | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingUpgrade, setPendingUpgrade] = useState<CurriculumUpgradeEvent | null>(null);

  const clearPendingUpgrade = useCallback(() => setPendingUpgrade(null), []);

  const updateParent = useCallback((p: ParentUser) => {
    setParent(p);
    setTeacher(null);
    const nextRole = loadStoredRole() === 'parent' ? 'parent' : 'student';
    setRole(nextRole);
    const token = loadStoredToken();
    if (token) saveAuth(token, p, nextRole);
  }, []);

  const refresh = useCallback(async () => {
    if (!loadStoredToken()) {
      setParent(null);
      setTeacher(null);
      setRole(null);
      return undefined;
    }

    const storedRole = loadStoredRole();
    try {
      if (storedRole === 'teacher') {
        const res = await api.teacherMe();
        setTeacher(res.teacher);
        setParent(null);
        setRole('teacher');
        saveTeacherAuth(loadStoredToken()!, res.teacher);
        return undefined;
      }

      const res = (await api.me()) as {
        parent?: ParentUser;
        teacher?: TeacherUser;
        role?: UserRole;
        curriculum?: CurriculumUpgradeEvent;
      };
      if (res.teacher || res.role === 'teacher') {
        setTeacher(res.teacher!);
        setParent(null);
        setRole('teacher');
        saveTeacherAuth(loadStoredToken()!, res.teacher!);
        return undefined;
      }

      const learnerRole: Extract<UserRole, 'parent' | 'student'> =
        res.role === 'parent' ? 'parent' : 'student';
      setParent(res.parent!);
      setTeacher(null);
      setRole(learnerRole);
      saveAuth(loadStoredToken()!, res.parent!, learnerRole);
      void setLocale(res.parent!.locale);
      if (res.curriculum?.upgraded) {
        setPendingUpgrade(res.curriculum);
      }
      return res.curriculum;
    } catch {
      clearAuth();
      setParent(null);
      setTeacher(null);
      setRole(null);
      return undefined;
    }
  }, []);

  useEffect(() => {
    const storedRole = loadStoredRole();
    if (storedRole === 'teacher') {
      const stored = loadStoredTeacher();
      if (stored) {
        setTeacher(stored);
        setRole('teacher');
      }
    } else if (isLearnerRole(storedRole)) {
      const stored = loadStoredParent();
      if (stored) {
        setParent(stored);
        setRole(storedRole);
        void setLocale(stored.locale);
      }
    }
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const { token, parent: p, curriculum, role: loginRole } = await api.login({ email, password });
    const learnerRole: Extract<UserRole, 'parent' | 'student'> =
      loginRole === 'parent' ? 'parent' : 'student';
    saveAuth(token, p!, learnerRole);
    setParent(p!);
    setTeacher(null);
    setRole(learnerRole);
    void setLocale(p!.locale);
    if (curriculum?.upgraded) setPendingUpgrade(curriculum);
    return curriculum;
  }, []);

  const loginTeacher = useCallback(async (email: string, password: string) => {
    const { token, teacher: t } = await api.teacherLogin({ email, password });
    saveTeacherAuth(token, t);
    setTeacher(t);
    setParent(null);
    setRole('teacher');
    setPendingUpgrade(null);
  }, []);

  const register = useCallback(
    async (
      data: Omit<RegisterRequest, 'email' | 'password' | 'role'> & {
        email: string;
        password: string;
        role: SignupRole;
      },
    ) => {
      const res = await api.register(data);
      if (res.role === 'teacher' && res.teacher) {
        saveTeacherAuth(res.token, res.teacher);
        setTeacher(res.teacher);
        setParent(null);
        setRole('teacher');
        setPendingUpgrade(null);
        return { role: 'teacher' as const };
      }

      const learnerRole: Extract<UserRole, 'parent' | 'student'> =
        res.role === 'parent' ? 'parent' : 'student';
      saveAuth(res.token, res.parent!, learnerRole);
      setParent(res.parent!);
      setTeacher(null);
      setRole(learnerRole);
      void setLocale(res.parent!.locale);
      return { role: learnerRole };
    },
    [],
  );

  const logout = useCallback(() => {
    clearAuth();
    setParent(null);
    setTeacher(null);
    setRole(null);
    setPendingUpgrade(null);
  }, []);

  const value: AuthContextValue = {
    parent,
    teacher,
    role,
    loading,
    pendingUpgrade,
    clearPendingUpgrade,
    login,
    loginTeacher,
    register,
    updateParent,
    logout,
    refresh,
  };

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
