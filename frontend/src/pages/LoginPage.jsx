import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-full place-items-center px-4 py-10" style={{ background: 'var(--color-canvas)' }}>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md"
        style={{ background: 'var(--color-panel)', border: '3px solid #000', boxShadow: '8px 8px 0px 0px #000' }}
      >
        <div style={{ background: '#FFD93D', borderBottom: '3px solid #000', padding: '16px 24px' }}>
          <div className="text-xs font-black uppercase tracking-widest text-black">Welcome back</div>
          <h1 className="mt-1 text-2xl font-black uppercase tracking-tight text-black">Sign In</h1>
        </div>
        <div className="p-6 space-y-4">
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email" className="nb-input" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" className="nb-input" />
          {error ? <div className="nb-error-box">{error}</div> : null}
          <button type="submit" disabled={busy} className="nb-btn w-full" style={{ height: 48 }}>
            {busy ? 'Signing in…' : 'Sign In'}
          </button>
          <div className="text-sm font-bold text-center" style={{ color: 'var(--color-muted)' }}>
            New here? <Link to="/register" className="font-black underline" style={{ color: 'var(--color-accent)' }}>Create account →</Link>
          </div>
        </div>
      </form>
    </div>
  );
}
