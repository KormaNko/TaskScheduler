import React from 'react';

// Simple day view component
// Props: date (Date object), tasks (array), categories (array), resolveCategory(fn), loading (bool), onEventClick(fn), onDayClick(fn)
export default function KalendarDen({ date = new Date(), tasks = [], categories = [], resolveCategory = () => '', loading = false, onEventClick = () => {}, onDayClick = () => {} }) {
    const pad = n => String(n).padStart(2, '0');
    const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    const key = dateKey(date);

    const getCategoryColor = (catId) => {
        if (!categories || !categories.length) return null;
        const found = categories.find(c => String(c.id) === String(catId) || String(c.name) === String(catId));
        return found?.color || null;
    };

    const events = (Array.isArray(tasks) ? tasks : []).filter(t => {
        if (!t?.deadline) return false;
        const d = new Date(String(t.deadline).replace(' ', 'T'));
        if (isNaN(d.getTime())) return false;
        return dateKey(d) === key;
    });

    return (
        <div className="border rounded p-4 group" onClick={() => onDayClick(date)}>
            <div className="flex justify-between items-center mb-4">
                <div>
                    <div className="text-lg font-semibold">{date.toLocaleDateString()}</div>
                    <div className="text-sm text-gray-500">Day view</div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" className="w-8 h-8 flex items-center justify-center bg-green-600 text-white rounded-full hover:bg-green-700 focus:outline-none" onClick={(e) => { e.stopPropagation(); onDayClick(date); }}>+</button>
                </div>
            </div>

            {loading && <div className="text-sm text-gray-500">Loading...</div>}

            {!loading && events.length === 0 && (
                <div className="text-gray-600">No events for this day.</div>
            )}

            <div className="flex flex-col gap-2">
                {events.map(ev => {
                    const stripe = getCategoryColor(ev.category) || '#e6f4ea';
                    return (
                        <div key={ev.id} className="p-2 border rounded bg-white shadow-sm cursor-pointer" onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}>
                            <div className="flex items-start gap-3">
                                <div style={{ width: 6, minHeight: 36, background: stripe, borderRadius: 4 }} />
                                <div className="flex-1">
                                    <div className="font-medium">{ev.title}</div>
                                    <div className="text-sm text-gray-500">{ev.deadline ? new Date(String(ev.deadline).replace(' ', 'T')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''} • {resolveCategory(ev.category)}</div>
                                    {ev.description ? <div className="text-sm text-gray-700 mt-1">{ev.description}</div> : null}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
