import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);
//cela logika triedy bola AI
export function AuthProvider({ children }) {
  // change: store full user object (or null) and loading
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // initial session check
  useEffect(() => {
    let cancelled = false;

    async function check() {
      setLoading(true);
      try {
        // Prefer the dedicated session endpoint which returns { authenticated:true, id, name, role }
        const data = await api.get('/?c=login&a=me');
        if (cancelled) return;
        if (data && data.authenticated) {
          // normalize role: treat null/undefined as 'user'
          const role = data.role ?? 'user';
          const u = { id: data.id, name: data.name, role };
          setUser(u);
          try { localStorage.setItem('isLoggedIn', '1'); } catch (e) {}
          try { if (data.id || data.name) localStorage.setItem('currentUser', JSON.stringify(u)); } catch (e) {}
        } else {
          setUser(null);
          try { localStorage.removeItem('isLoggedIn'); } catch (e) {}
          try { localStorage.removeItem('currentUser'); } catch (e) {}
        }
      } catch (err) {
        if (cancelled) return;
        setUser(null);
        try { localStorage.removeItem('isLoggedIn'); } catch (e) {}
        try { localStorage.removeItem('currentUser'); } catch (e) {}
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    check();

    // listen for global logout events (from api wrapper or other parts)
    function onLoggedOut() {
      setUser(null);
      try { localStorage.removeItem('isLoggedIn'); } catch (e) {}
      try { localStorage.removeItem('currentUser'); } catch (e) {}
    }

    // also listen for explicit login events and mark auth true (currentUser should already be stored by Login component)
    function onLoggedIn() {
      // when something else fires app:logged-in we just re-run check quickly
      (async () => {
        try {
          const d = await api.get('/?c=login&a=me');
          if (d && d.authenticated) {
            const role = d.role ?? 'user';
            const u = { id: d.id, name: d.name, role };
            setUser(u);
            try { localStorage.setItem('isLoggedIn', '1'); } catch (e) {}
            try { localStorage.setItem('currentUser', JSON.stringify(u)); } catch (e) {}
          }
        } catch (e) {
          // ignore
        }
      })();
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
    user,
    setUser,
    isAdmin: !!(user && user.role === 'admin'),
    loading,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
