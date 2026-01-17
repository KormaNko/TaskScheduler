import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';

export default function LogoutButton() {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Use same default API base as other pages (matches Dashboard.jsx)
    const API_BASE = (import.meta.env.VITE_API_BASE || 'http://localhost').replace(/\/$/, '');

    async function handleLogout(e) {
        e?.preventDefault?.();
        if (loading) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/?c=logout&a=index`, {
                method: 'POST',
                credentials: 'include', // send cookies (PHP session)
                headers: { 'Content-Type': 'application/json' },
            });
            if (res.ok) {
                try { localStorage.removeItem('authToken'); localStorage.removeItem('isLoggedIn'); } catch (err) {}
                console.debug('Logout POST ok, checking server session...');
                // verify server session is destroyed by requesting the tasks endpoint
                try {
                    const check = await fetch(`${API_BASE}/?c=task&a=index`, { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } });
                    if (check.ok) {
                        // server still returns data -> logout probably failed
                        const json = await check.json().catch(() => null);
                        const list = Array.isArray(json) ? json : json?.data ?? json;
                        if (Array.isArray(list) && list.length > 0) {
                            alert('Logout appears to have failed on the server — you are still authenticated. Try again.');
                            setLoading(false);
                            return;
                        }
                    }
                    console.debug('Session check returned', check.status);
                } catch (err) {
                    // network error on check - still navigate + reload to be safe
                    console.warn('Error checking session after logout', err);
                }

                // Notify app to clear in-memory data immediately
                try { window.dispatchEvent(new Event('app:logged-out')); } catch (e) {}
                // If we reach here, logout succeeded server-side or check failed; navigate and reload to reset app state
                try { navigate('/login', { replace: true }); } catch (e) { /* ignore */ }
                window.location.reload();
                return;
            }
            // if server returned non-ok, still navigate to login and reload so app resets
            const json = await res.json().catch(() => ({}));
            console.warn('Logout failed:', json);
            navigate('/login', { replace: true });
            window.location.reload();
        } catch (err) {
            console.error('Logout error', err);
            // on error also navigate to login
            navigate('/login', { replace: true });
            window.location.reload();
        } finally {
            setLoading(false);
        }
    }

    return (
        // responsive: icon-only on small screens, full label on md+
        <button
            onClick={handleLogout}
            disabled={loading}
            title="Odhlásiť sa"
            className={
                `
                flex items-center gap-2 disabled:opacity-60
                md:w-full md:px-3 md:py-2 md:rounded md:bg-red-50 md:text-red-700 md:hover:bg-red-100
                justify-center md:justify-start
                w-10 h-10 rounded-md bg-red-50/30 md:bg-transparent
                `
            }
        >
            <LogOut size={16} />
            <span className="hidden md:inline ml-1">Odhlásiť sa</span>
        </button>
    );
}
