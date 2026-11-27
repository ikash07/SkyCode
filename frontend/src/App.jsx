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
    // Seamlessly transition out the splash screen once mounted and ready
    const splash = document.getElementById('initial-splash');
    if (!splash) return;

    const bar = document.getElementById('splash-progress-bar');

    const fadeOut = () => {
      splash.style.opacity = '0';
      splash.style.pointerEvents = 'none';

      const removeTimer = setTimeout(() => {
        splash.remove();
      }, 450);

      return () => clearTimeout(removeTimer);
    };

    const animations = bar?.getAnimations?.() || [];
    const isFinished = animations.length > 0 && animations.every((a) => a.playState === 'finished');

    if (isFinished) {
      fadeOut();
      return;
    }

    if (bar) {
      bar.addEventListener('animationend', fadeOut, { once: true });
      const safetyFallback = setTimeout(fadeOut, 750);
      return () => {
        clearTimeout(safetyFallback);
        bar.removeEventListener('animationend', fadeOut);
      };
    }

    const timer = setTimeout(fadeOut, 600);
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
