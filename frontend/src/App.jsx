import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './components/layout/RequireAuth';
import { DashboardPage } from './pages/DashboardPage';
import { AuthPage } from './pages/AuthPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { useAuth } from './context/AuthContext';

export default function App() {
  const { user } = useAuth();

  useEffect(() => {
    // Gracefully fade out the 0.00ms pre-inlined HTML splash screen once the app mounts
    const timer = setTimeout(() => {
      const splashEl = document.getElementById('initial-splash');
      if (splashEl) {
        splashEl.style.opacity = '0';
        splashEl.style.transform = 'scale(0.96)';
        splashEl.style.pointerEvents = 'none';
        const removeTimer = setTimeout(() => {
          if (splashEl && splashEl.parentNode) {
            splashEl.parentNode.removeChild(splashEl);
          }
        }, 360);
        return () => clearTimeout(removeTimer);
      }
    }, 560);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen">
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
    </div>
  );
}
