import { useEffect, useState } from 'react';

export type ThemeMode = 'dark' | 'light';

export function useThemeMode() {
  const [theme, setTheme] = useState<ThemeMode>(() => (localStorage.getItem('theme-mode') as ThemeMode) || 'dark');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme-mode', theme);
  }, [theme]);

  return { theme, setTheme };
}
