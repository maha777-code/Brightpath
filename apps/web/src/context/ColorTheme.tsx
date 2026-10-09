import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';

export type ColorTheme = 'dark' | 'light';

const STORAGE_KEY = 'brightpath.color-theme';

type ColorThemeContextValue = {
  theme: ColorTheme;
  setTheme: (theme: ColorTheme) => void;
  toggleTheme: () => void;
};

const ColorThemeContext = createContext<ColorThemeContextValue | null>(null);

function readTheme(): ColorTheme {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

function applyTheme(theme: ColorTheme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'light' ? '#f8fafc' : '#030712');
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
  const toggleTheme = () => setThemeState((current) => (current === 'dark' ? 'light' : 'dark'));

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

export function ThemeToggle() {
  const { theme, toggleTheme } = useColorTheme();
  const light = theme === 'light';
  return (
    <button
      type="button"
      className="mv-theme-toggle"
      onClick={toggleTheme}
      aria-pressed={light}
      aria-label={light ? 'Switch to dark mode' : 'Switch to light mode'}
      title={light ? 'Dark mode' : 'Light mode'}
    >
      {light ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      <span>{light ? 'Dark' : 'Light'}</span>
    </button>
  );
}
