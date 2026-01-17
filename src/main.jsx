import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import Calendar from "./pages/Calendar.jsx";
import Users from "./pages/Users.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import "../index.css"; // fix: correct path inside src

import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import RequireAuth from './components/RequireAuth.jsx';

function AppInner() {
    const { auth, loading } = useAuth();

    console.debug('[AppInner] auth=', auth, 'loading=', loading);

    // While auth is being checked, show a full-screen loader to avoid any protected content rendering
    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading app...</div>;

    // If not authenticated, expose only public routes (login/register). Any other path redirects to /login.
    if (!auth) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <main className="w-full max-w-2xl p-6">
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="*" element={<Navigate to="/login" replace />} />
                    </Routes>
                </main>
            </div>
        );
    }

    // Authenticated: render the app layout with sidebar and protected routes
    return (
        <div className="min-h-screen flex bg-gray-50">
            <Sidebar />
            <main className="flex-1 p-6">
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/calendar" element={<Calendar />} />
                    <Route path="/users" element={<Users />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>

            </main>
        </div>
    );
}

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <AppInner />
            </BrowserRouter>
        </AuthProvider>
    );
}

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);