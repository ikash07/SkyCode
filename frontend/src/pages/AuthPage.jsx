import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, User, Lock, Eye, EyeOff, ArrowRight, Github, Star, Zap } from 'lucide-react';

/* ── Decorative floating star ── */
function FloatingStar({ style, size = 24, rotate = 0, className = '' }) {
  return (
    <Star
      size={size}
      strokeWidth={3}
      fill="#FFD93D"
      color="#000"
      className={`pointer-events-none select-none ${className}`}
      style={{
        position: 'absolute',
        transform: `rotate(${rotate}deg)`,
        ...style,
      }}
    />
  );
}

export function AuthPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState(() =>
    location.pathname === '/register' ? 'register' : 'login'
  );
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
    <div
      className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center px-3 py-14 sm:px-6 sm:py-16 overflow-x-hidden overflow-y-auto"
      style={{ background: 'var(--color-canvas)' }}
    >
      {/* ── Background dot grid ── */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(#000 1.5px, transparent 1.5px)',
          backgroundSize: '22px 22px',
          opacity: 0.06,
        }}
      />

      {/* ── Decorative floating stars (hidden on small devices for clarity) ── */}
      <FloatingStar className="hidden md:block" style={{ top: '8%',  left: '6%' }}  size={28} rotate={15} />
      <FloatingStar className="hidden md:block" style={{ top: '12%', right: '8%' }} size={20} rotate={-8} />
      <FloatingStar className="hidden md:block" style={{ bottom: '10%', left: '10%' }} size={22} rotate={30} />
      <FloatingStar className="hidden md:block" style={{ bottom: '14%', right: '6%' }} size={32} rotate={-20} />

      {/* ── Seamless Infinite Scroll top strip ── */}
      <div
        className="nb-marquee-container fixed top-0 inset-x-0 py-1.5 border-b-2 border-black select-none z-30"
        style={{
          background: '#000',
          color: '#FFD93D',
          fontSize: '0.72rem',
          fontWeight: 900,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
        }}
      >
        <div className="nb-marquee-track">
          {/* Track 1 */}
          <div className="flex items-center shrink-0">
            {Array.from({ length: 18 }).map((_, i) => (
              <span key={`t1-${i}`} className="inline-flex items-center gap-2 mx-4 sm:mx-5 shrink-0">
                <img
                  src="/logo-icon.png"
                  alt=""
                  className="w-3.5 h-3.5 object-cover rounded-xs inline-block shrink-0"
                  loading="eager"
                  decoding="async"
                />
                SKYCODE IDE
              </span>
            ))}
          </div>
          {/* Track 2 (clone for gapless infinite scroll) */}
          <div className="flex items-center shrink-0" aria-hidden="true">
            {Array.from({ length: 18 }).map((_, i) => (
              <span key={`t2-${i}`} className="inline-flex items-center gap-2 mx-4 sm:mx-5 shrink-0">
                <img
                  src="/logo-icon.png"
                  alt=""
                  className="w-3.5 h-3.5 object-cover rounded-xs inline-block shrink-0"
                  loading="eager"
                  decoding="async"
                />
                SKYCODE IDE
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Auth card ── */}
      <div
        className="nb-in relative w-full max-w-[420px] mx-auto my-auto p-0 z-10"
        style={{
          border: '3px solid #000',
          boxShadow: 'clamp(5px, 2vw, 8px) clamp(5px, 2vw, 8px) 0px 0px #000',
          background: 'var(--color-panel)',
        }}
      >
        {/* Card header strip */}
        <div
          className="flex items-center justify-between gap-2 px-4 py-3 sm:px-6 sm:py-4"
          style={{
            background: '#FFD93D',
            borderBottom: '3px solid #000',
          }}
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div
              className="shrink-0"
              style={{
                width: 40,
                height: 40,
                background: '#280736',
                border: '2px solid #000',
                boxShadow: '2px 2px 0px 0px #000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <img src="/logo-icon.png" alt="SkyCode" className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0">
              <div className="font-black text-lg sm:text-xl uppercase tracking-tight text-black leading-none truncate">
                SkyCode
              </div>
              <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-black/60 truncate mt-0.5">
                Online IDE
              </div>
            </div>
          </div>

          {/* Mode badge */}
          <div
            className="shrink-0"
            style={{
              background: '#FF6B6B',
              border: '2px solid #000',
              boxShadow: '2px 2px 0px 0px #000',
              padding: '3px 10px',
              transform: 'rotate(-2deg)',
            }}
          >
            <span className="text-xs font-black uppercase tracking-wider text-white">
              {mode === 'login' ? 'Sign In' : 'Sign Up'}
            </span>
          </div>
        </div>

        {/* Card body */}
        <div className="px-4 py-5 sm:px-6 sm:py-6">
          {/* Tab switcher */}
          <div
            className="flex mb-5 sm:mb-6"
            style={{ border: '3px solid #000' }}
          >
            {['login', 'register'].map((m) => (
              <button
                key={m}
                type="button"
                id={`auth-tab-${m}`}
                onClick={() => { setMode(m); setError(null); }}
                className="flex flex-1 items-center justify-center gap-2 py-3 font-black text-sm uppercase tracking-wider transition-colors duration-100"
                style={
                  mode === m
                    ? { background: '#000', color: '#FFD93D' }
                    : { background: 'var(--color-surface)', color: 'var(--color-text)' }
                }
              >
                {m === 'login' ? <Mail size={15} strokeWidth={3} /> : <User size={15} strokeWidth={3} />}
                {m === 'login' ? 'Login' : 'Register'}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === 'register' && (
              <div className="nb-in">
                <label className="nb-label mb-2 block">Display Name</label>
                <div className="relative">
                  <User
                    size={17}
                    strokeWidth={3}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: 'var(--color-muted)' }}
                  />
                  <input
                    id="auth-display-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    type="text"
                    placeholder="Alex Rivers"
                    className="nb-input"
                    style={{ paddingLeft: 44 }}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="nb-label mb-2 block">Email</label>
              <input
                id="auth-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                placeholder="you@example.com"
                className="nb-input"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="nb-label">Password</label>
                {mode === 'login' && (
                  <a
                    href="#forgot"
                    onClick={(e) => e.preventDefault()}
                    className="text-xs font-black uppercase tracking-wider"
                    style={{ color: 'var(--color-accent)', textDecoration: 'underline' }}
                  >
                    Forgot?
                  </a>
                )}
              </div>
              <div className="relative">
                <Lock
                  size={17}
                  strokeWidth={3}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'var(--color-muted)' }}
                />
                <input
                  id="auth-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  className="nb-input"
                  style={{ paddingLeft: 44, paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--color-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={17} strokeWidth={3} /> : <Eye size={17} strokeWidth={3} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="nb-error-box nb-in">
                ⚠ {error}
              </div>
            )}

            <button
              id="auth-submit-btn"
              type="submit"
              disabled={busy}
              className="nb-btn w-full mt-1"
              style={{ height: 52, fontSize: '0.95rem' }}
            >
              {busy
                ? (mode === 'login' ? 'Signing in…' : 'Registering…')
                : (mode === 'login' ? 'Sign In' : 'Create Account')
              }
              <ArrowRight size={18} strokeWidth={3} />
            </button>
          </form>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="nb-divider flex-1" />
            <span className="font-black text-xs uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>or</span>
            <div className="nb-divider flex-1" />
          </div>

          {/* GitHub */}
          <button
            id="auth-github-btn"
            type="button"
            onClick={() => alert('GitHub OAuth is not configured in this demo.')}
            className="nb-btn-ghost w-full"
            style={{ height: 48 }}
          >
            <Github size={18} strokeWidth={2.5} />
            Continue with GitHub
          </button>

          {/* Footer */}
          <p className="mt-5 text-center text-sm font-bold" style={{ color: 'var(--color-muted)' }}>
            {mode === 'login' ? (
              <>
                No account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('register'); setError(null); }}
                  className="font-black underline"
                  style={{ color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Sign up →
                </button>
              </>
            ) : (
              <>
                Have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null); }}
                  className="font-black underline"
                  style={{ color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Login →
                </button>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Bottom tag */}
      <div
        className="mt-4 sm:mt-6 px-3.5 py-1.5 sm:px-4 sm:py-2 select-none z-10"
        style={{
          border: '2px solid #000',
          boxShadow: '3px 3px 0px 0px #000',
          background: 'var(--color-panel)',
          transform: 'rotate(-1deg)',
        }}
      >
        <span className="text-[11px] sm:text-xs font-black uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
          Code · Create · Deploy
        </span>
      </div>
    </div>
  );
}
