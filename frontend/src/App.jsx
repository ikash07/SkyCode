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
    // Seamlessly transition out the hardware-accelerated initial splash screen
    const splash = document.getElementById('initial-splash');
    if (!splash) return;

    // Allow the GPU progress animation to complete smoothly (~700ms)
    const timer = setTimeout(() => {
      splash.style.opacity = '0';
      splash.style.pointerEvents = 'none';

      const removeTimer = setTimeout(() => {
        splash.remove();
      }, 350);

      return () => clearTimeout(removeTimer);
    }, 680);

    return () => clearTimeout(timer);
  }, []);

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
