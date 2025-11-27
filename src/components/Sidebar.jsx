import { NavLink } from "react-router-dom";
import { CheckSquare, Calendar, Users, LayoutDashboard } from "lucide-react";

export default function Sidebar() {
    return (
        <aside className="w-64 bg-white border-r min-h-screen p-6">
            {/* Logo / Názov */}
            <div className="flex items-center gap-2 mb-8">
                <CheckSquare className="text-blue-600" />
                <h1 className="font-semibold text-lg">Task Manager</h1>
            </div>

            {/* Navigácia */}
            <nav className="flex flex-col gap-2 text-gray-700">
                <NavItem to="/" icon={<LayoutDashboard size={18} />} label="Dashboard" />
                <NavItem to="/calendar" icon={<Calendar size={18} />} label="Kalendár" />
                <NavItem to="/users" icon={<Users size={18} />} label="Správa používateľov" />
            </nav>
        </aside>
    );
}

function NavItem({ to, icon, label }) {
    return (
        <NavLink
            to={to}
            className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition
         ${isActive ? "bg-blue-50 text-blue-600 font-medium" : ""}`
            }
        >
            {icon}
            {label}
        </NavLink>
    );
}
