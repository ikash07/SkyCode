import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
    <div className="grid min-h-full place-items-center px-4 py-10">
      <form onSubmit={handleSubmit} className="glass-panel shell-shadow w-full max-w-md rounded-3xl p-8">
        <div className="text-xs uppercase tracking-[0.35em] text-[var(--color-muted)]">Create account</div>
        <h1 className="mt-3 text-3xl font-semibold">Join the workspace</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">Create and run projects in isolated Docker containers.</p>
        <div className="mt-6 space-y-4">
          <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} type="text" placeholder="Display name" className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 outline-none" />
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="Email" className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 outline-none" />
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Password" className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 outline-none" />
          {error ? <div className="rounded-2xl border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-4 py-3 text-sm text-[var(--color-danger)]">{error}</div> : null}
          <button disabled={busy} className="w-full rounded-2xl bg-[var(--color-accent)] px-4 py-3 font-medium text-white disabled:opacity-60">{busy ? 'Creating account...' : 'Create account'}</button>
        </div>
        <div className="mt-6 text-sm text-[var(--color-muted)]">Already have an account? <Link to="/login" className="text-[var(--color-accent)]">Sign in</Link></div>
      </form>
    </div>
  );
}
