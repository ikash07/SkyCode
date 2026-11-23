import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LOGO_ICON_BASE64 } from '../assets/logo-b64';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register(email, password, displayName);
      navigate('/', { replace: true });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Registration failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center px-4 py-10 relative nb-grid-bg" style={{ background: 'var(--color-canvas)' }}>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md nb-page-enter relative z-10"
        style={{ background: 'var(--color-panel)', border: '3px solid #000', boxShadow: '8px 8px 0px 0px #000' }}
      >
        <div style={{ background: '#FF6B6B', borderBottom: '3px solid #000', padding: '20px 24px' }}>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="nb-logo-box" style={{ width: 28, height: 28 }}>
              <img src={LOGO_ICON_BASE64} alt="SkyCode" className="w-full h-full object-cover" />
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-white/85">SkyCode Online IDE</span>
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-white">Join Workspace</h1>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="nb-label mb-1.5 block">Display Name</label>
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} type="text" placeholder="Developer Name" className="nb-input" required />
          </div>
          <div>
            <label className="nb-label mb-1.5 block">Email</label>
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="name@example.com" className="nb-input" required />
          </div>
          <div>
            <label className="nb-label mb-1.5 block">Password</label>
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="••••••••" className="nb-input" required />
          </div>
          {error ? <div className="nb-error-box nb-in">⚠ {error}</div> : null}
          <button type="submit" disabled={busy} className="nb-btn w-full mt-2" style={{ height: 48 }}>
            {busy ? 'Creating account…' : 'Create Account →'}
          </button>
          <div className="pt-2 text-xs font-bold text-center uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>
            Already have an account? <Link to="/login" className="font-black underline transition-colors hover:text-black dark:hover:text-white" style={{ color: 'var(--color-accent)' }}>Sign in →</Link>
          </div>
        </div>
      </form>
    </div>
  );
}
