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
  PlanType,
  PlatformUserPublic,
  OrganizationPublic,
  AppRole,
} from '@brightpath/shared';
import { homePathForRole, isAppRole } from '@brightpath/shared';
import {
  api,
  saveSession,
  clearAuth,
  loadStoredParent,
  loadStoredTeacher,
  loadStoredToken,
  loadStoredRole,
  loadStoredPlanType,
  loadStoredUser,
  loadStoredOrganization,
} from '@/lib/api';
import { setLocale } from '@/i18n';

interface AuthContextValue {
  parent: ParentUser | null;
  teacher: TeacherUser | null;
  user: PlatformUserPublic | null;
  organization: OrganizationPublic | null;
  role: UserRole | null;
  planType: PlanType | null;
  loading: boolean;
  pendingUpgrade: CurriculumUpgradeEvent | null;
  clearPendingUpgrade: () => void;
  homePath: string;
  login: (email: string, password: string) => Promise<{ role: UserRole; path: string }>;
  loginTeacher: (email: string, password: string) => Promise<{ path: string }>;
  register: (
    data: Omit<RegisterRequest, 'email' | 'password' | 'role'> & {
      email: string;
      password: string;
      role: SignupRole;
    },
  ) => Promise<{ role: UserRole; path: string }>;
  updateParent: (parent: ParentUser) => void;
  logout: () => void;
  refresh: () => Promise<CurriculumUpgradeEvent | undefined>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function applyAuthResponse(
  res: {
    token: string;
    role: UserRole;
    planType?: PlanType;
    organizationId?: string | null;
    user?: PlatformUserPublic;
    organization?: OrganizationPublic | null;
    parent?: ParentUser;
    teacher?: TeacherUser;
  },
  setters: {
    setParent: (p: ParentUser | null) => void;
    setTeacher: (t: TeacherUser | null) => void;
    setUser: (u: PlatformUserPublic | null) => void;
    setOrganization: (o: OrganizationPublic | null) => void;
    setRole: (r: UserRole | null) => void;
    setPlanType: (p: PlanType | null) => void;
  },
) {
  saveSession({
    token: res.token,
    role: res.role,
    planType: res.planType,
    parent: res.parent,
    teacher: res.teacher,
    user: res.user,
    organization: res.organization ?? null,
  });
  setters.setRole(res.role);
  setters.setPlanType(res.planType ?? null);
  setters.setUser(res.user ?? null);
  setters.setOrganization(res.organization ?? null);
  setters.setParent(res.parent ?? null);
  setters.setTeacher(res.teacher ?? null);
  if (res.parent) void setLocale(res.parent.locale);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [parent, setParent] = useState<ParentUser | null>(null);
  const [teacher, setTeacher] = useState<TeacherUser | null>(null);
  const [user, setUser] = useState<PlatformUserPublic | null>(null);
  const [organization, setOrganization] = useState<OrganizationPublic | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [planType, setPlanType] = useState<PlanType | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingUpgrade, setPendingUpgrade] = useState<CurriculumUpgradeEvent | null>(null);

  const clearPendingUpgrade = useCallback(() => setPendingUpgrade(null), []);

  const updateParent = useCallback((p: ParentUser) => {
    setParent(p);
    const token = loadStoredToken();
    const r = loadStoredRole() ?? 'student';
    if (token) {
      saveSession({
        token,
        role: r,
        planType: loadStoredPlanType() ?? undefined,
        parent: p,
        teacher: loadStoredTeacher() ?? undefined,
        user: loadStoredUser() ?? undefined,
        organization: loadStoredOrganization(),
      });
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!loadStoredToken()) {
      setParent(null);
      setTeacher(null);
      setUser(null);
      setOrganization(null);
      setRole(null);
      setPlanType(null);
      return undefined;
    }

    try {
      const res = await api.me();
      const nextRole = (res.role ?? loadStoredRole() ?? 'student') as UserRole;
      setRole(nextRole);
      setPlanType((res.planType as PlanType) ?? loadStoredPlanType());
      setUser(res.user ?? null);
      setOrganization(res.organization ?? null);
      setTeacher(res.teacher ?? null);
      setParent(res.parent ?? null);
      saveSession({
        token: loadStoredToken()!,
        role: nextRole,
        planType: res.planType as PlanType | undefined,
        parent: res.parent,
        teacher: res.teacher,
        user: res.user,
        organization: res.organization ?? null,
      });
      if (res.parent) void setLocale(res.parent.locale);
      if (res.curriculum?.upgraded) setPendingUpgrade(res.curriculum);
      return res.curriculum;
    } catch {
      clearAuth();
      setParent(null);
      setTeacher(null);
      setUser(null);
      setOrganization(null);
      setRole(null);
      setPlanType(null);
      return undefined;
    }
  }, []);

  useEffect(() => {
    setRole(loadStoredRole());
    setPlanType(loadStoredPlanType());
    setParent(loadStoredParent());
    setTeacher(loadStoredTeacher());
    setUser(loadStoredUser());
    setOrganization(loadStoredOrganization());
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login({ email, password });
    applyAuthResponse(res, {
      setParent,
      setTeacher,
      setUser,
      setOrganization,
      setRole,
      setPlanType,
    });
    if (res.curriculum?.upgraded) setPendingUpgrade(res.curriculum);
    const r = res.role;
    const path = isAppRole(r) ? homePathForRole(r) : homePathForRole('student');
    return { role: r, path };
  }, []);

  const loginTeacher = useCallback(async (email: string, password: string) => {
    const res = await api.teacherLogin({ email, password });
    applyAuthResponse(
      { ...res, role: 'teacher' },
      { setParent, setTeacher, setUser, setOrganization, setRole, setPlanType },
    );
    return { path: homePathForRole('teacher') };
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
      applyAuthResponse(res, {
        setParent,
        setTeacher,
        setUser,
        setOrganization,
        setRole,
        setPlanType,
      });
      const r = res.role;
      const path = isAppRole(r) ? homePathForRole(r as AppRole) : homePathForRole('student');
      return { role: r, path };
    },
    [],
  );

  const logout = useCallback(() => {
    clearAuth();
    setParent(null);
    setTeacher(null);
    setUser(null);
    setOrganization(null);
    setRole(null);
    setPlanType(null);
    setPendingUpgrade(null);
  }, []);

  const homePath = isAppRole(role) ? homePathForRole(role) : '/login';

  const value: AuthContextValue = {
    parent,
    teacher,
    user,
    organization,
    role,
    planType,
    loading,
    pendingUpgrade,
    clearPendingUpgrade,
    homePath,
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
