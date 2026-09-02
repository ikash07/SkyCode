import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Rocket, Mail, User, Lock, Eye, EyeOff, ArrowRight, Github } from 'lucide-react';

export function AuthPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState(() => (location.pathname === '/register' ? 'register' : 'login'));
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, displayName || email.split('@')[0]);
      }
      navigate('/', { replace: true });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Authentication failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6">
      {/* Container */}
      <div className="glass-panel shell-shadow w-full max-w-[440px] rounded-3xl p-6 sm:p-8 border border-[var(--color-border)]">
        {/* Logo Branding */}
        <div className="flex flex-col items-center text-center">
          <div className="skycode-logo-glow flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4f8cff] to-[#7c3aed] p-3">
            <Rocket size={26} className="text-white drop-shadow-lg" />
          </div>
          <h1 className="skycode-gradient-text mt-3.5 text-2xl sm:text-3xl font-bold tracking-tight">SkyCode</h1>
          <p className="mt-1 text-xs sm:text-sm text-[var(--color-muted)] font-medium">Code. Create. Deploy.</p>
        </div>

        {/* Tab Switcher */}
        <div className="mt-6 flex rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs sm:text-sm font-semibold transition ${
              mode === 'login'
                ? 'bg-white/10 dark:bg-white/15 text-[var(--color-text)] shadow-sm'
                : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            <Mail size={16} />
            Login
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(null); }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs sm:text-sm font-semibold transition ${
              mode === 'register'
                ? 'bg-white/10 dark:bg-white/15 text-[var(--color-text)] shadow-sm'
                : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            <User size={16} />
            Register
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === 'register' && (
            <div>
              <label className="mb-1.5 block text-xs sm:text-sm font-semibold text-[var(--color-muted)]">Display Name</label>
              <div className="relative">
                <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  type="text"
                  placeholder="Alex Rivers"
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-3 pl-10 pr-4 text-xs sm:text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-accent)]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs sm:text-sm font-semibold text-[var(--color-muted)]">Email</label>
            <div className="relative">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                placeholder="you@example.com"
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-3 px-4 text-xs sm:text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-accent)]"
              />
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs sm:text-sm font-semibold text-[var(--color-muted)]">Password</label>
              {mode === 'login' && (
                <a href="#forgot" onClick={(e) => e.preventDefault()} className="text-xs text-[var(--color-accent)] font-medium hover:underline">
                  Forgot password?
                </a>
              )}
            </div>
            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-3 pl-10 pr-10 text-xs sm:text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-accent)]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-[var(--color-text)]"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 p-3 text-xs sm:text-sm text-[var(--color-danger)] font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#4f8cff] to-[#7c3aed] py-3 text-xs sm:text-sm font-bold text-white shadow-lg transition hover:opacity-95 disabled:opacity-60"
          >
            {busy ? (mode === 'login' ? 'Logging in...' : 'Registering...') : (mode === 'login' ? 'Login' : 'Register')}
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Divider */}
        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--color-border)]" />
          <span className="text-xs text-[var(--color-muted)] font-medium">or</span>
          <div className="h-px flex-1 bg-[var(--color-border)]" />
        </div>

        {/* OAuth Buttons */}
        <button
          type="button"
          onClick={() => alert('GitHub OAuth is not configured in this demo.')}
          className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-3 text-xs sm:text-sm font-semibold text-[var(--color-text)] transition hover:bg-white/5"
        >
          <Github size={18} />
          Continue with GitHub
        </button>

        {/* Footer link */}
        <div className="mt-6 text-center text-xs sm:text-sm text-[var(--color-muted)]">
          {mode === 'login' ? (
            <>
              Don't have an account?{' '}
              <button onClick={() => { setMode('register'); setError(null); }} className="text-[var(--color-accent)] font-semibold hover:underline">
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button onClick={() => { setMode('login'); setError(null); }} className="text-[var(--color-accent)] font-semibold hover:underline">
                Login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
