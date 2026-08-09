import { useEffect, useState } from 'react';

export function useThemeMode() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme-mode') || 'dark');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme-mode', theme);
  }, [theme]);

  return { theme, setTheme };
}
