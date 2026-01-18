import React from 'react';

// Simple week view component
// Props: startDate (Date), tasks (array), categories (array), resolveCategory(fn), loading (bool), onEventClick(fn), onDayClick(fn)
export default function KalendarTyzden({ startDate = new Date(), tasks = [], categories = [], resolveCategory = () => '', loading = false, onEventClick = () => {}, onDayClick = () => {} }) {
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

    const getCategoryColor = (catId) => {
        if (!categories || !categories.length) return null;
        const found = categories.find(c => String(c.id) === String(catId) || String(c.name) === String(catId));
        return found?.color || null;
    };
    const textColorForBg = (hex) => {
        if (!hex) return '#111827';
        try {
            const h = hex.replace('#','');
            const r = parseInt(h.substring(0,2),16)/255;
            const g = parseInt(h.substring(2,4),16)/255;
            const b = parseInt(h.substring(4,6),16)/255;
            const lum = 0.2126*r + 0.7152*g + 0.0722*b;
            return lum > 0.6 ? '#111827' : '#ffffff';
        } catch (e) { return '#ffffff'; }
    };

    return (
        <div>
            <div className="grid grid-cols-7 gap-2">
                {days.map((d, idx) => (
                    <div key={idx} className="relative group border rounded p-2" onClick={() => onDayClick(d)}>
                        <div className="flex justify-between items-start mb-1">
                            <div className="font-semibold">{d.toLocaleDateString()}</div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <button type="button" className="w-7 h-7 flex items-center justify-center bg-green-600 text-white rounded-full hover:bg-green-700 focus:outline-none" onClick={(e) => { e.stopPropagation(); onDayClick(d); }}>+</button>
                            </div>
                        </div>
                        {loading && <div className="text-sm text-gray-500">Loading...</div>}
                        <div className="flex flex-col gap-2">
                            {eventsFor(d).map(ev => {
                                const bg = getCategoryColor(ev.category) || '#e6f4ea';
                                const color = textColorForBg(bg);
                                return (
                                    <div key={ev.id} className="p-1 rounded bg-white cursor-pointer" onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}>
                                        <div className="flex items-center gap-2">
                                            <span style={{ background: bg, color }} className="px-2 py-0.5 rounded-full text-xs overflow-hidden" title={ev.title}>{ev.title}</span>
                                            <div className="text-xs text-gray-500">{ev.deadline ? new Date(String(ev.deadline).replace(' ', 'T')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''} • {resolveCategory(ev.category)}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
