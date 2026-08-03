import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './components/layout/RequireAuth';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { useAuth } from './context/AuthContext';

export default function App() {
  const { loading, user } = useAuth();

  if (loading) {
    return <div className="grid min-h-full place-items-center text-sm text-[var(--color-muted)]">Loading Online IDE...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <RegisterPage />} />
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
