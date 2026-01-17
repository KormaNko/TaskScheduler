import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(false);
  const [loading, setLoading] = useState(true);

  // initial session check
  useEffect(() => {
    let cancelled = false;

    async function check() {
      setLoading(true);
      try {
        // try a protected endpoint to verify session
        // use users list endpoint which is protected server-side to reliably detect auth
        const data = await api.get('/?c=users&a=list');
        if (cancelled) return;
        setAuth(true);
        try { localStorage.setItem('isLoggedIn', '1'); } catch (e) {}
      } catch (err) {
        if (cancelled) return;
        setAuth(false);
        try { localStorage.removeItem('isLoggedIn'); } catch (e) {}
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    check();

    // listen for global logout events (from api wrapper or other parts)
    function onLoggedOut() {
      setAuth(false);
      try { localStorage.removeItem('isLoggedIn'); } catch (e) {}
    }
    window.addEventListener('app:logged-out', onLoggedOut);

    return () => {
      cancelled = true;
      window.removeEventListener('app:logged-out', onLoggedOut);
    };
  }, []);

  const value = {
    auth,
    setAuth,
    loading,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
