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
    <div className="grid min-h-full place-items-center px-4 py-10">
      <form onSubmit={handleSubmit} className="glass-panel shell-shadow w-full max-w-md rounded-3xl p-8">
        <div className="text-xs uppercase tracking-[0.35em] text-[var(--color-muted)]">Welcome back</div>
        <h1 className="mt-3 text-3xl font-semibold">Sign in to your IDE</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">Continue to your projects and executions.</p>
        <div className="mt-6 space-y-4">
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="Email" className="w-full rounded-2xl border border-[var(--color-border)] bg-black/10 px-4 py-3 outline-none" />
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Password" className="w-full rounded-2xl border border-[var(--color-border)] bg-black/10 px-4 py-3 outline-none" />
          {error ? <div className="rounded-2xl border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-4 py-3 text-sm text-[var(--color-danger)]">{error}</div> : null}
          <button disabled={busy} className="w-full rounded-2xl bg-[var(--color-accent)] px-4 py-3 font-medium text-white disabled:opacity-60">{busy ? 'Signing in...' : 'Sign in'}</button>
        </div>
        <div className="mt-6 text-sm text-[var(--color-muted)]">New here? <Link to="/register" className="text-[var(--color-accent)]">Create an account</Link></div>
      </form>
    </div>
  );
}
