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
  primary: '#5B46BA',
  primaryHover: '#4A3799',
  accent: '#0D9488',
  logoUrl: null,
  orgName: null,
});

export function OrgThemeProvider({ children }: { children: ReactNode }) {
  const { organization } = useAuth();
  const value = useMemo<ThemeCtx>(
    () => ({
      primary: organization?.primaryColor ?? '#5B46BA',
      primaryHover: organization?.primaryHoverColor ?? '#4A3799',
      accent: organization?.accentColor ?? '#0D9488',
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
