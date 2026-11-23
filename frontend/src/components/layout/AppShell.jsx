import { Link } from 'react-router-dom';
import { useThemeMode } from '../../hooks/useThemeMode';
import { useAuth } from '../../context/AuthContext';
import { MoonStar, SunMedium, Zap } from 'lucide-react';

export function AppShell({ children, projectName }) {
  const { theme, setTheme } = useThemeMode();
  const { user } = useAuth();

  const userInitial = user?.displayName
    ? user.displayName.charAt(0).toUpperCase()
    : 'A';

  return (
    <div className="flex min-h-full flex-col" style={{ background: 'var(--color-canvas)' }}>
      {/* ── Header ── */}
      <header
        className="m-3 flex flex-wrap items-center justify-between gap-3 px-4 py-3"
        style={{
          background: 'var(--color-panel)',
          border: '3px solid var(--color-border)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        {/* Left: Logo */}
        <Link to="/" className="flex items-center gap-3 no-underline group cursor-pointer" title="SkyCode Dashboard">
          <div
            className="nb-logo-box"
            style={{ width: 42, height: 42 }}
          >
            <img
              src="/logo-icon.png"
              alt="SkyCode"
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
            />
          </div>
          <div className="flex flex-col leading-none">
            <span
              className="text-xl font-black tracking-tight uppercase"
              style={{ color: 'var(--color-text)', letterSpacing: '-0.02em' }}
            >
              SkyCode
            </span>
            <span className="nb-label" style={{ marginTop: 2 }}>Online IDE</span>
          </div>
        </Link>

        {/* Center: Active Project */}
        {projectName && (
          <div
            className="hidden sm:flex items-center gap-2 px-3 py-1"
            style={{
              border: '3px solid var(--color-border)',
              background: 'var(--color-secondary)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <Zap size={14} strokeWidth={3} fill="#000" color="#000" />
            <span className="text-xs font-black uppercase tracking-widest text-black">
              {projectName}
            </span>
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <button
            id="header-theme-toggle"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="nb-btn-ghost"
            title="Toggle theme"
          >
            {theme === 'dark' ? <SunMedium size={15} strokeWidth={3} /> : <MoonStar size={15} strokeWidth={3} />}
            <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>

          {/* User Avatar */}
          <div
            className="flex h-10 w-10 items-center justify-center font-black text-sm shrink-0"
            style={{
              background: 'var(--color-accent)',
              border: '3px solid var(--color-border)',
              boxShadow: 'var(--shadow-sm)',
              color: '#fff',
            }}
            title={user?.displayName || 'User'}
          >
            {userInitial}
          </div>
        </div>
      </header>

      <main className="flex-1 px-3 pb-3">{children}</main>
    </div>
  );
}
