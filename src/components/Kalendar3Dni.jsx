import React from 'react';

// Simple 3-day view component
// Props: startDate (Date), tasks (array), categories (array), resolveCategory(fn), loading (bool), onEventClick(fn), onDayClick(fn)
export default function Kalendar3Dni({ startDate = new Date(), tasks = [], categories = [], resolveCategory = () => '', loading = false, onEventClick = () => {}, onDayClick = () => {} }) {
    // reference resolveCategory so static analyzers don't flag it as unused
    void resolveCategory;
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

    const pillBase = 'block px-2 py-1 rounded-full text-xs overflow-hidden';

    return (
        <div>
            <div className="grid grid-cols-3 gap-4">
                {days.map((d, idx) => (
                    <div key={idx} className="relative group border rounded p-3" onClick={() => onDayClick(d)}>
                        <div className="flex justify-between items-start mb-2">
                            <div className="font-semibold">{d.toLocaleDateString()}</div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <button type="button" className="w-7 h-7 flex items-center justify-center bg-green-600 text-white rounded-full hover:bg-green-700 focus:outline-none" onClick={(e) => { e.stopPropagation(); onDayClick(d); }}>+</button>
                            </div>
                        </div>
                        {loading && <div className="text-sm text-gray-500">Loading...</div>}
                        {!loading && eventsFor(d).length === 0 && <div className="text-gray-600">No events</div>}
                        <div className="flex flex-col gap-2 mt-2">
                            {eventsFor(d).map(ev => {
                                const stripe = getCategoryColor(ev.category) || '#e6f4ea';
                                return (
                                    <div key={ev.id} className="p-2 border rounded bg-white cursor-pointer" onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}>
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
                ))}
            </div>
        </div>
    );
}
