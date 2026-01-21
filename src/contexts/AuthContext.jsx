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
        // Prefer the dedicated session endpoint which returns { authenticated:true, id, name }
        const data = await api.get('/?c=login&a=me');
        if (cancelled) return;
        if (data && data.authenticated) {
          setAuth(true);
          try { localStorage.setItem('isLoggedIn', '1'); } catch (e) {}
          try { if (data.id || data.name) localStorage.setItem('currentUser', JSON.stringify({ id: data.id, name: data.name })); } catch (e) {}
        } else {
          setAuth(false);
          try { localStorage.removeItem('isLoggedIn'); } catch (e) {}
          try { localStorage.removeItem('currentUser'); } catch (e) {}
        }
      } catch (err) {
        if (cancelled) return;
        setAuth(false);
        try { localStorage.removeItem('isLoggedIn'); } catch (e) {}
        try { localStorage.removeItem('currentUser'); } catch (e) {}
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    check();

    // listen for global logout events (from api wrapper or other parts)
    function onLoggedOut() {
      setAuth(false);
      try { localStorage.removeItem('isLoggedIn'); } catch (e) {}
      try { localStorage.removeItem('currentUser'); } catch (e) {}
    }

    // also listen for explicit login events and mark auth true (currentUser should already be stored by Login component)
    function onLoggedIn() {
      setAuth(true);
      try { localStorage.setItem('isLoggedIn', '1'); } catch (e) {}
    }

    window.addEventListener('app:logged-out', onLoggedOut);
    window.addEventListener('app:logged-in', onLoggedIn);

    return () => {
      cancelled = true;
      window.removeEventListener('app:logged-out', onLoggedOut);
      window.removeEventListener('app:logged-in', onLoggedIn);
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
