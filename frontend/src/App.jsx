import { useState, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './components/layout/RequireAuth';
import { DashboardPage } from './pages/DashboardPage';
import { AuthPage } from './pages/AuthPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { useAuth } from './context/AuthContext';

export default function App() {
  const { user } = useAuth();
  const [splashPhase, setSplashPhase] = useState('visible'); // 'visible' | 'exiting' | 'hidden'

  useEffect(() => {
    // Show splash loading screen first, then smoothly transition into login / dashboard
    const timer = setTimeout(() => {
      setSplashPhase('exiting');
      const exitTimer = setTimeout(() => {
        setSplashPhase('hidden');
      }, 450);
      return () => clearTimeout(exitTimer);
    }, 820);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* Underlying Routes - Smoothly cross-dissolves into view */}
      <div
        className={`min-h-screen transition-all duration-500 ease-out ${
          splashPhase === 'visible'
            ? 'opacity-0 scale-[0.99] blur-[1px]'
            : 'opacity-100 scale-100 blur-0'
        }`}
        style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
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

      {/* Signature Neo-Brutalist Loading Splash Screen Overlay */}
      {splashPhase !== 'hidden' && (
        <div
          className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 nb-grid-bg transition-opacity duration-450 ${
            splashPhase === 'exiting' ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          style={{ background: 'var(--color-canvas)', transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
        >
          <div
            className={`nb-splash-card ${splashPhase === 'exiting' ? 'exiting' : ''} flex flex-col items-center gap-3.5 px-8 py-7 w-full max-w-xs text-center select-none`}
            style={{
              border: '3px solid #000',
              boxShadow: '8px 8px 0px 0px #000',
              background: '#FFD93D',
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
              <img src="/logo-icon.png" alt="SkyCode" width={62} height={62} fetchPriority="high" className="w-full h-full object-cover" />
            </div>
            <div className="text-2xl font-black uppercase tracking-tight text-black">SkyCode</div>
            <div className="text-xs font-black uppercase tracking-widest text-black/75">Online IDE</div>

            {/* Smooth animated progress line */}
            <div className="w-full h-2.5 bg-black/15 border-2 border-black mt-2 overflow-hidden">
              <div className="h-full bg-black nb-progress-load" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
