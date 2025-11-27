import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import Calendar from "./pages/Calendar.jsx";
import Users from "./pages/Users.jsx";
import Sidebar from "./components/Sidebar.jsx";
import '../index.css';

function App() {
    return (
        <BrowserRouter>
            <div className="min-h-screen flex bg-gray-50">
                <Sidebar />
                <main className="flex-1 p-6">
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/calendar" element={<Calendar />} />
                        <Route path="/users" element={<Users />} />
                    </Routes>
                </main>
            </div>
        </BrowserRouter>
    );
}

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
