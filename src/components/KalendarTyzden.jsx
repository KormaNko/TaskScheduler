import React from 'react';

// Simple week view component
// Props: startDate (Date), tasks (array), resolveCategory(fn), loading (bool), onEventClick(fn), onDayClick(fn)
export default function KalendarTyzden({ startDate = new Date(), tasks = [], resolveCategory = () => '', loading = false, onEventClick = () => {}, onDayClick = () => {} }) {
    const pad = n => String(n).padStart(2, '0');
    const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

    // compute Monday as start of week
    const start = new Date(startDate);
    const jsDay = start.getDay();
    const mondayOffset = (jsDay + 6) % 7; // 0..6 where 0=Monday
    start.setDate(start.getDate() - mondayOffset);

    const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
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
            <div className="grid grid-cols-7 gap-2">
                {days.map((d, idx) => (
                    <div key={idx} className="border rounded p-2" onClick={() => onDayClick(d)}>
                        <div className="flex justify-between items-start mb-1">
                            <div className="font-semibold">{d.toLocaleDateString()}</div>
                            <div>
                                <button type="button" className="btn" onClick={(e) => { e.stopPropagation(); onDayClick(d); }}>Add</button>
                            </div>
                        </div>
                        {loading && <div className="text-sm text-gray-500">Loading...</div>}
                        <div className="flex flex-col gap-2">
                            {eventsFor(d).map(ev => (
                                <div key={ev.id} className="p-1 border rounded bg-white cursor-pointer" onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}>
                                    <div className="text-sm font-medium">{ev.title}</div>
                                    <div className="text-xs text-gray-500">{ev.deadline ? new Date(String(ev.deadline).replace(' ', 'T')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''} • {resolveCategory(ev.category)}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
