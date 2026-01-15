// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import Calendar from "./pages/Calendar.jsx";
import Users from "./pages/Users.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import "../index.css"; // fix: correct path inside `src`

function AppContent() {
    // get current location to decide when to hide the sidebar
    const location = useLocation();
    const search = new URLSearchParams(location.search);

    // hide sidebar on explicit routes /login and /register
    // and also when query param c=login is present (you used that earlier)
    const hideSidebar =
        location.pathname === "/" ||
        location.pathname === "/login" ||
        location.pathname === "/register" ||
        search.get("c") === "login";

    return (
        <div className="min-h-screen flex bg-gray-50">
            {!hideSidebar && <Sidebar />}
            <main
                className={
                    hideSidebar
                        ? "flex-1 flex items-center justify-center min-h-screen p-0"
                        : "flex-1 p-6"
                }
            >
                <Routes>
                    <Route path="/" element={<Login />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/calendar" element={<Calendar />} />
                    <Route path="/users" element={<Users />} />
                </Routes>
            </main>
        </div>
    );
}

function App() {
    // BrowserRouter must wrap any component that uses routing hooks like useLocation
    return (
        <BrowserRouter>
            <AppContent />
        </BrowserRouter>
    );
}

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
