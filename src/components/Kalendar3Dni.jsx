import React from 'react';

// Simple 3-day view component
// Props: startDate (Date), tasks (array), resolveCategory(fn), loading (bool), onEventClick(fn), onDayClick(fn)
export default function Kalendar3Dni({ startDate = new Date(), tasks = [], resolveCategory = () => '', loading = false, onEventClick = () => {}, onDayClick = () => {} }) {
    const pad = n => String(n).padStart(2, '0');
    const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

    const days = [0,1,2].map(off => {
        const d = new Date(startDate);
        d.setDate(d.getDate() + off);
        return d;
    });

    const eventsFor = (d) => (Array.isArray(tasks) ? tasks : []).filter(t => {
        if (!t?.deadline) return false;
        const dd = new Date(String(t.deadline).replace(' ', 'T'));
        if (isNaN(dd.getTime())) return false;
        return dateKey(dd) === dateKey(d);
    });

    return (
        <div>
            <div className="grid grid-cols-3 gap-4">
                {days.map((d, idx) => (
                    <div key={idx} className="border rounded p-3" onClick={() => onDayClick(d)}>
                        <div className="flex justify-between items-start mb-2">
                            <div className="font-semibold">{d.toLocaleDateString()}</div>
                            <div>
                                <button type="button" className="btn" onClick={(e) => { e.stopPropagation(); onDayClick(d); }}>Add</button>
                            </div>
                        </div>
                        {loading && <div className="text-sm text-gray-500">Loading...</div>}
                        {!loading && eventsFor(d).length === 0 && <div className="text-gray-600">No events</div>}
                        <div className="flex flex-col gap-2 mt-2">
                            {eventsFor(d).map(ev => (
                                <div key={ev.id} className="p-2 border rounded bg-white cursor-pointer" onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}>
                                    <div className="font-medium">{ev.title}</div>
                                    <div className="text-sm text-gray-500">{ev.deadline ? new Date(String(ev.deadline).replace(' ', 'T')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''} • {resolveCategory(ev.category)}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
