import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './components/layout/RequireAuth';
import { DashboardPage } from './pages/DashboardPage';
import { AuthPage } from './pages/AuthPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { useAuth } from './context/AuthContext';

export default function App() {
  const { loading, user } = useAuth();

  if (loading) {
    return (
      <div
        className="grid min-h-screen place-items-center p-4 nb-grid-bg"
        style={{ background: 'var(--color-canvas)' }}
      >
        <div
          className="flex flex-col items-center gap-3 px-8 py-6 nb-modal-anim"
          style={{
            border: '3px solid #000',
            boxShadow: '8px 8px 0px 0px #000',
            background: '#FFD93D',
          }}
        >
          <div
            className="flex items-center justify-center overflow-hidden"
            style={{
              width: 54,
              height: 54,
              background: '#280736',
              border: '3px solid #000',
              boxShadow: '3px 3px 0px 0px #000',
            }}
          >
            <img src="/logo-icon.png" alt="SkyCode" className="w-full h-full object-cover" />
          </div>
          <div className="text-2xl font-black uppercase tracking-tight text-black">SkyCode</div>
          <div className="text-xs font-black uppercase tracking-widest text-black/70">Online IDE</div>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        }
      />
      <Route
        path="/projects/:projectId"
        element={
          <RequireAuth>
            <WorkspacePage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
