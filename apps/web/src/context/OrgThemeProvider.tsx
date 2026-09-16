import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';

type ThemeCtx = {
  primary: string;
  primaryHover: string;
  accent: string;
  logoUrl: string | null;
  orgName: string | null;
};

const ThemeContext = createContext<ThemeCtx>({
  primary: '#06B6D4',
  primaryHover: '#0891B2',
  accent: '#10B981',
  logoUrl: null,
  orgName: null,
});

export function OrgThemeProvider({ children }: { children: ReactNode }) {
  const { organization } = useAuth();
  const value = useMemo<ThemeCtx>(
    () => ({
      primary: organization?.primaryColor ?? '#06B6D4',
      primaryHover: organization?.primaryHoverColor ?? '#0891B2',
      accent: organization?.accentColor ?? '#10B981',
      logoUrl: organization?.logoUrl ?? null,
      orgName: organization?.name ?? null,
    }),
    [organization],
  );

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', value.primary);
    root.style.setProperty('--primary-hover', value.primaryHover);
    root.style.setProperty('--accent-color', value.accent);
  }, [value]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useOrgTheme() {
  return useContext(ThemeContext);
}
