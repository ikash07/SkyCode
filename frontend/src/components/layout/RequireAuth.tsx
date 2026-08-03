import { Navigate } from 'react-router-dom';
import type { PropsWithChildren } from 'react';
import { useAuth } from '../../context/AuthContext';

export function RequireAuth({ children }: PropsWithChildren) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex h-full items-center justify-center text-sm text-[var(--color-muted)]">Loading workspace...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
