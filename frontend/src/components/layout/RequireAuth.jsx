import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function RequireAuth({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 nb-grid-bg transition-opacity duration-300"
        style={{ background: 'var(--color-canvas)' }}
      >
        <div
          className="flex flex-col items-center gap-3.5 px-8 py-7 nb-fade-in w-full max-w-xs text-center select-none"
          style={{
            background: '#FFD93D',
            border: '3px solid #000',
            boxShadow: '8px 8px 0px 0px #000',
          }}
        >
          <div
            className="flex items-center justify-center overflow-hidden"
            style={{
              width: 62,
              height: 62,
              background: '#280736',
              border: '3px solid #000',
              boxShadow: '4px 4px 0px 0px #000',
            }}
          >
            <img src="/logo-icon.png" alt="SkyCode" className="w-full h-full object-cover" />
          </div>
          <div className="text-2xl font-black uppercase tracking-tight text-black">SkyCode</div>
          <div className="text-xs font-black uppercase tracking-widest text-black/75">Authenticating…</div>
          <div className="w-full h-2.5 bg-black/15 border-2 border-black mt-2 overflow-hidden">
            <div className="h-full bg-black nb-progress-infinite" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
