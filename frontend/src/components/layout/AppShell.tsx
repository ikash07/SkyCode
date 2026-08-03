import type { PropsWithChildren } from 'react';
import { useThemeMode } from '../../hooks/useThemeMode';
import { MoonStar, SunMedium } from 'lucide-react';

export function AppShell({ children }: PropsWithChildren) {
  const { theme, setTheme } = useThemeMode();

  return (
    <div className="flex min-h-full flex-col">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-24 bg-gradient-to-b from-white/5 to-transparent" />
      <header className="glass-panel shell-shadow m-3 flex items-center justify-between rounded-2xl px-4 py-3">
        <div>
          <div className="text-xs uppercase tracking-[0.35em] text-[var(--color-muted)]">Online IDE</div>
          <div className="text-lg font-semibold">VS Code in the browser</div>
        </div>
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-accent-soft)] px-3 py-2 text-sm font-medium transition hover:scale-[1.01]"
        >
          {theme === 'dark' ? <SunMedium size={16} /> : <MoonStar size={16} />}
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>
      </header>
      <main className="flex-1 px-3 pb-3">{children}</main>
    </div>
  );
}
