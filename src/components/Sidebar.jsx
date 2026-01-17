import React from "react";
import { NavLink } from "react-router-dom";
import { CheckSquare, Calendar, Users, LayoutDashboard } from "lucide-react";
import LogoutButton from "./LogoutButton.jsx";

export default function Sidebar() {
    return (
        // compact on mobile (w-16), full on md and above (md:w-64)
        // make aside a flex column so children can use flex-1 to fill space
        <aside className="w-16 md:w-64 bg-white border-r border-gray-200 min-h-screen pt-10 px-3 md:px-6 relative flex flex-col">
            {/* thin divider (extra element to ensure consistent 1px line on all browsers) */}
            <div className="absolute top-0 right-0 h-full w-px bg-gray-200 pointer-events-none" />

            {/* inner wrapper - allow it to grow so mt-auto works as expected */}
            <div className="flex flex-col flex-1">
                {/* Logo / Názov - show only icon on mobile, full title on md+ */}
                <div className="flex items-center gap-2 mb-16">
                    <CheckSquare className="text-blue-600" />
                    <h1 className="font-semibold text-lg hidden md:block">Task Manager</h1>
                </div>

                {/* Navigácia */}
                <nav className="flex flex-col gap-2 text-gray-700">
                    <NavItem to="/" icon={<LayoutDashboard size={18} />} label="Dashboard" />
                    <NavItem to="/calendar" icon={<Calendar size={18} />} label="Kalendár" />
                    <NavItem to="/users" icon={<Users size={18} />} label="Správa používateľov" />
                </nav>

                {/* spacer - nav ends here. Logout is placed absolutely so it's always visible */}
                <div className="mt-auto" />

                {/* place logout inside the inner wrapper so it sits at the bottom (flex + mt-auto) */}
                <div className="pt-10">
                    <LogoutButton />
                </div>
            </div>
        </aside>
    );
}

function NavItem({ to, icon, label }) {
    return (
        <NavLink
            to={to}
            className={({ isActive }) =>
                `flex items-center gap-3 px-2 md:px-3 py-2 rounded-lg hover:bg-gray-100 transition ${isActive ? "bg-blue-50 text-blue-600 font-medium" : ""}`
            }
        >
            <div className="flex items-center justify-center w-6">{icon}</div>
            {/* label hidden on small screens */}
            <span className="hidden md:inline">{label}</span>
        </NavLink>
    );
}
