import React from "react";
import NewTaskButton from "../components/NewTaskButton.jsx";

export default function Dashboard() {
    return (
        <div className="min-h-screen relative bg-white">
            <div className="absolute top-2 right-3">
                <NewTaskButton />
            </div>

            <div className="pt-16 px-6">
                <h1 className="font-semibold text-4xl absolute top-2 left-6">Dashboard</h1>
                <h2 className="font-semibold text-lg text-gray-700 mt-2">Prehľad všetkých úloh.</h2>

                <div className="p-6 mt-6 ">
                    {/* ostatný obsah dashboardu */}
                </div>
            </div>
        </div>
    );
}
