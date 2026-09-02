import { useThemeMode } from '../../hooks/useThemeMode';
import { useAuth } from '../../context/AuthContext';
import { MoonStar, SunMedium, Rocket, Bell } from 'lucide-react';

export function AppShell({ children, projectName }) {
  const { theme, setTheme } = useThemeMode();
  const { user } = useAuth();

  const userInitial = user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'A';

  return (
    <div className="flex min-h-full flex-col">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-24 bg-gradient-to-b from-white/5 to-transparent" />
      
      {/* App Header */}
      <header className="glass-panel shell-shadow m-2 md:m-3 flex flex-wrap items-center justify-between rounded-2xl px-3 sm:px-4 py-2.5 gap-2">
        {/* Left: Logo */}
        <div className="flex items-center gap-3">
          <div className="skycode-logo-glow relative flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#4f8cff] to-[#7c3aed] shrink-0">
            <Rocket size={20} className="text-white drop-shadow-lg" />
          </div>
          <div className="flex flex-col">
            <span className="skycode-gradient-text text-xl font-bold tracking-wide leading-tight">SkyCode</span>
            <span className="text-[10px] sm:text-xs uppercase tracking-[0.25em] text-[var(--color-muted)] font-medium">Online IDE</span>
          </div>
        </div>

        {/* Center: Active Project Indicator */}
        {projectName && (
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-1 text-xs">
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">Project</span>
            <span className="font-semibold text-[var(--color-text)] uppercase tracking-wider text-xs md:text-sm">{projectName}</span>
          </div>
        )}

        {/* Right: Actions & User Avatar */}
        <div className="flex items-center gap-2.5">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:text-[var(--color-text)] transition"
            title="Notifications"
          >
            <Bell size={16} />
          </button>

          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 px-2.5 py-1.5 text-xs md:text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition font-medium"
            title="Toggle theme"
          >
            {theme === 'dark' ? <SunMedium size={15} /> : <MoonStar size={15} />}
            <span className="text-xs md:text-sm">{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>

          {/* User Avatar */}
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#4f8cff] to-[#7c3aed] text-sm font-bold text-white shadow shrink-0"
            title={user?.displayName || 'User'}
          >
            {userInitial}
          </div>
        </div>
      </header>

      <main className="flex-1 px-2 md:px-3 pb-3">{children}</main>
    </div>
  );
}
