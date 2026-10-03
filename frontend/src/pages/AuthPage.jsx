import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Rocket, Mail, User, Lock, Eye, EyeOff, ArrowRight, Github, Star, Zap } from 'lucide-react';

/* ── Decorative floating star ── */
function FloatingStar({ style, size = 24, rotate = 0 }) {
  return (
    <Star
      size={size}
      strokeWidth={3}
      fill="#FFD93D"
      color="#000"
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
      className="relative flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 overflow-hidden"
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

      {/* ── Decorative floating stars ── */}
      <FloatingStar style={{ top: '8%',  left: '6%' }}  size={28} rotate={15} />
      <FloatingStar style={{ top: '12%', right: '8%' }} size={20} rotate={-8} />
      <FloatingStar style={{ bottom: '10%', left: '10%' }} size={22} rotate={30} />
      <FloatingStar style={{ bottom: '14%', right: '6%' }} size={32} rotate={-20} />

      {/* ── Seamless Infinite Scroll top strip ── */}
      <div
        className="absolute top-0 inset-x-0 overflow-hidden py-1.5 border-b-2 border-black select-none z-10"
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
              <span key={`t1-${i}`} className="inline-flex items-center gap-2 mx-5">
                <Zap size={11} strokeWidth={3} fill="#FFD93D" /> SKYCODE IDE
              </span>
            ))}
          </div>
          {/* Track 2 (clone for gapless infinite scroll) */}
          <div className="flex items-center shrink-0" aria-hidden="true">
            {Array.from({ length: 18 }).map((_, i) => (
              <span key={`t2-${i}`} className="inline-flex items-center gap-2 mx-5">
                <Zap size={11} strokeWidth={3} fill="#FFD93D" /> SKYCODE IDE
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Auth card ── */}
      <div
        className="nb-in relative w-full max-w-[440px] p-0 mt-8"
        style={{
          border: '3px solid #000',
          boxShadow: '8px 8px 0px 0px #000',
          background: 'var(--color-panel)',
        }}
      >
        {/* Card header strip */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{
            background: '#FFD93D',
            borderBottom: '3px solid #000',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              style={{
                width: 40, height: 40,
                background: '#000',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Rocket size={20} strokeWidth={3} color="#FFD93D" />
            </div>
            <div>
              <div className="font-black text-xl uppercase tracking-tight text-black leading-none">
                SkyCode
              </div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-black/60">
                Online IDE
              </div>
            </div>
          </div>

          {/* Mode badge */}
          <div
            style={{
              background: '#FF6B6B',
              border: '2px solid #000',
              boxShadow: '3px 3px 0px 0px #000',
              padding: '4px 12px',
              transform: 'rotate(-2deg)',
            }}
          >
            <span className="text-xs font-black uppercase tracking-widest text-white">
              {mode === 'login' ? 'Sign In' : 'Sign Up'}
            </span>
          </div>
        </div>

        {/* Card body */}
        <div className="px-6 py-6">
          {/* Tab switcher */}
          <div
            className="flex mb-6"
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
        className="mt-6 px-4 py-2"
        style={{
          border: '2px solid #000',
          boxShadow: '4px 4px 0px 0px #000',
          background: 'var(--color-panel)',
          transform: 'rotate(-1deg)',
        }}
      >
        <span className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
          Code · Create · Deploy
        </span>
      </div>
    </div>
  );
}
