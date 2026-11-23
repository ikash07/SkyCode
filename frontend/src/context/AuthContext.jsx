import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { loginRequest, logoutRequest, meRequest, registerRequest } from '../api/auth';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const token = localStorage.getItem('skycode_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const currentUser = await meRequest();
      setUser(currentUser);
    } catch {
      localStorage.removeItem('skycode_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();

    // Keep Render backend awake while browser tab is open
    const keepAlive = setInterval(() => {
      fetch('/api/health').catch(() => {});
    }, 4 * 60 * 1000);
    return () => clearInterval(keepAlive);
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    login: async (email, password) => {
      const currentUser = await loginRequest({ email, password });
      setUser(currentUser);
    },
    register: async (email, password, displayName) => {
      const currentUser = await registerRequest({ email, password, displayName });
      setUser(currentUser);
    },
    logout: async () => {
      await logoutRequest();
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
