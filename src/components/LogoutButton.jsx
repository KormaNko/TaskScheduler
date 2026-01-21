import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext.jsx';
//AI
export default function LogoutButton() {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { setAuth } = useAuth();

    async function handleLogout(e) {
        e?.preventDefault?.();
        if (loading) return;
        setLoading(true);
        try {
            await api.post('/?c=logout&a=index', {});
            try { localStorage.removeItem('authToken'); localStorage.removeItem('isLoggedIn'); } catch (err) {}
            try { localStorage.removeItem('currentUser'); } catch (e) {}
            // notify app and set auth false
            try { window.dispatchEvent(new Event('app:logged-out')); } catch (e) {}
            try { setAuth(false); } catch (e) {}
            navigate('/login', { replace: true });
         } catch (err) {
            console.warn('Logout request failed', err);
            // still clear client state as fallback
            try { localStorage.removeItem('authToken'); localStorage.removeItem('isLoggedIn'); } catch (e) {}
            try { localStorage.removeItem('currentUser'); } catch (e) {}
            try { window.dispatchEvent(new Event('app:logged-out')); } catch (e) {}
            try { setAuth(false); } catch (e) {}
            navigate('/login', { replace: true });
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
                md:w-full md:px-3 md:py-2 md:rounded md:bg-transparent md:text-red-700 md:hover:bg-red-100
                justify-center md:justify-start
                w-10 h-10 rounded-md bg-red-50/30
                `
            }
        >
            <LogOut size={16} />
            <span className="hidden md:inline ml-1">Odhlásiť sa</span>
        </button>
    );
}
