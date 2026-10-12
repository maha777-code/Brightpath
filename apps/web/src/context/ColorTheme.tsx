import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Moon, Sparkles, Sun } from 'lucide-react';

export type ColorTheme = 'dark' | 'light' | 'bright';

const THEME_ORDER: ColorTheme[] = ['dark', 'light', 'bright'];

const STORAGE_KEY = 'brightpath.color-theme';

type ColorThemeContextValue = {
  theme: ColorTheme;
  setTheme: (theme: ColorTheme) => void;
  toggleTheme: () => void;
};

const ColorThemeContext = createContext<ColorThemeContextValue | null>(null);

function readTheme(): ColorTheme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'bright') return saved;
    return 'dark';
  } catch {
    return 'dark';
  }
}

function applyTheme(theme: ColorTheme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme === 'dark' ? 'dark' : 'light';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', theme === 'dark' ? '#030712' : theme === 'bright' ? '#ecfeff' : '#f8fafc');
  }
}

function nextTheme(theme: ColorTheme): ColorTheme {
  const index = THEME_ORDER.indexOf(theme);
  return THEME_ORDER[(index + 1) % THEME_ORDER.length] ?? 'dark';
}

export function ColorThemeProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [theme, setThemeState] = useState<ColorTheme>(readTheme);

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* private browsing can block storage */
    }
  }, [theme]);

  const setTheme = (next: ColorTheme) => setThemeState(next);
  const toggleTheme = () => setThemeState((current) => nextTheme(current));

  return (
    <ColorThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
      {pathname !== '/' ? (
        <div className="fixed right-4 top-4 z-[90]">
          <ThemeToggle />
        </div>
      ) : null}
    </ColorThemeContext.Provider>
  );
}

export function useColorTheme() {
  const value = useContext(ColorThemeContext);
  if (!value) throw new Error('useColorTheme must be used within ColorThemeProvider');
  return value;
}

const NEXT_LABEL: Record<ColorTheme, string> = {
  dark: 'Light',
  light: 'Bright',
  bright: 'Dark',
};

export function ThemeToggle() {
  const { theme, toggleTheme } = useColorTheme();
  const next = nextTheme(theme);
  const Icon = next === 'light' ? Sun : next === 'bright' ? Sparkles : Moon;
  return (
    <button
      type="button"
      className="mv-theme-toggle"
      onClick={toggleTheme}
      aria-label={`Switch to ${NEXT_LABEL[theme].toLowerCase()} mode`}
      title={`${NEXT_LABEL[theme]} mode`}
    >
      <Icon className="h-4 w-4" />
      <span>{NEXT_LABEL[theme]}</span>
    </button>
  );
}
