import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { loginRequest, logoutRequest, meRequest, registerRequest } from '../api/auth';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('skycode_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(() => {
    const token = localStorage.getItem('skycode_token');
    const saved = localStorage.getItem('skycode_user');
    return Boolean(token && !saved);
  });

  const refresh = async () => {
    const token = localStorage.getItem('skycode_token');
    if (!token) {
      setUser(null);
      try { localStorage.removeItem('skycode_user'); } catch {}
      setLoading(false);
      return;
    }

    try {
      const currentUser = await meRequest();
      setUser(currentUser);
      try { localStorage.setItem('skycode_user', JSON.stringify(currentUser)); } catch {}
    } catch (err) {
      // ONLY invalidate credentials on explicit 401 Unauthorized
      // Under high traffic / concurrent users, temporary 502/503/429/timeout MUST NOT log the user out!
      if (err.response && err.response.status === 401) {
        localStorage.removeItem('skycode_token');
        try { localStorage.removeItem('skycode_user'); } catch {}
        setUser(null);
      } else {
        console.warn('Backend busy or recovering, retaining active user session:', err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();

    // Keep Render backend awake while browser tab is open
    const keepAlive = setInterval(() => {
      fetch('https://skycode-t3ry.onrender.com/api/health').catch(() => {});
    }, 4 * 60 * 1000);
    return () => clearInterval(keepAlive);
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    login: async (email, password) => {
      const currentUser = await loginRequest({ email, password });
      setUser(currentUser);
      try { localStorage.setItem('skycode_user', JSON.stringify(currentUser)); } catch {}
    },
    register: async (email, password, displayName) => {
      const currentUser = await registerRequest({ email, password, displayName });
      setUser(currentUser);
      try { localStorage.setItem('skycode_user', JSON.stringify(currentUser)); } catch {}
    },
    logout: async () => {
      await logoutRequest();
      localStorage.removeItem('skycode_token');
      try { localStorage.removeItem('skycode_user'); } catch {}
      setUser(null);
    },
    refresh
  }), [loading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
