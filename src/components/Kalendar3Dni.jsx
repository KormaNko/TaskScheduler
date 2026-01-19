import React, { useRef, useEffect, useState } from 'react';

// 3-day view with single left time axis and scrollable timeline
export default function Kalendar3Dni({ startDate = new Date(), tasks = [], categories = [], resolveCategory = () => '', onEventClick = () => {}, onDayClick = () => {} }) {
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
        let cat = catId;
        if (cat && typeof cat === 'object') {
            if (cat.color) return cat.color;
            const byId = categories.find(c => String(c.id) === String(cat.id));
            if (byId) return byId.color ?? null;
            const byName = categories.find(c => (c.name ?? '').toLowerCase() === String(cat.name ?? '').toLowerCase());
            if (byName) return byName.color ?? null;
            return null;
        }
        if (typeof cat === 'string' && (cat.trim().startsWith('{') || cat.trim().startsWith('['))) {
            try { const parsed = JSON.parse(cat); return getCategoryColor(parsed); } catch (e) { /* ignore */ }
        }
        const found = categories.find(c => String(c.id) === String(cat) || String(c.name) === String(cat));
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

    const minutesOfDay = (deadline) => {
        if (!deadline) return null;
        const d = new Date(String(deadline).replace(' ', 'T'));
        if (isNaN(d.getTime())) return null;
        return d.getHours() * 60 + d.getMinutes();
    };

    // layout sizing
    const slotHeight = 80; // px per hour
    const totalHeight = 24 * slotHeight;

    const scrollRef = useRef(null);
    const axisRef = useRef(null);
    const [axisWidth, setAxisWidth] = useState(80);
    useEffect(() => {
        function measure() {
            try {
                const el = scrollRef.current;
                if (el) el.scrollTop = Math.max(0, nowTop - (el.clientHeight / 2));
            } catch (e) {}
        }
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, []);

    // measure left axis width (so header grid first column matches exactly)
    useEffect(() => {
        function measureAxis() {
            try {
                const a = axisRef.current;
                if (a && a.offsetWidth) setAxisWidth(a.offsetWidth);
            } catch (e) {}
        }
        measureAxis();
        window.addEventListener('resize', measureAxis);
        return () => window.removeEventListener('resize', measureAxis);
    }, []);

    // now indicator (for 3-day view we will render a single line spanning all day columns)
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const nowTop = (nowMinutes / (24 * 60)) * totalHeight;

    function scrollToNow() {
        try {
            const el = scrollRef.current;
            if (!el) return;
            el.scrollTop = Math.max(0, nowTop - (el.clientHeight / 2));
        } catch (e) {}
    }

    // header formatter: weekday short + day number (no year)
    const fmtHeader = (d) => {
        const weekday = d.toLocaleDateString(undefined, { weekday: 'short' });
        const day = d.getDate();
        return { weekday, day };
    };

    return (
        <div>
            <div className="bg-white rounded border border-gray-100 p-4">
                <div className="mb-2 items-center" style={{ display: 'grid', gridTemplateColumns: `${axisWidth}px repeat(3, 1fr)`, gap: '0.5rem', alignItems: 'center' }}>
                    <div />
                    {days.map((d, idx) => {
                        const { weekday, day } = fmtHeader(d);
                        return (
                            <div key={idx} className="text-center flex flex-col items-center justify-center">
                                <div className="text-xs text-gray-500 uppercase">{weekday}</div>
                                <div className="text-lg font-semibold">{day}</div>
                            </div>
                        );
                    })}
                    <div style={{ gridColumn: '2 / span 3', display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                        <button onClick={scrollToNow} className="px-3 py-1 bg-indigo-600 text-white rounded text-sm">Now</button>
                    </div>
                </div>

                {/* timeline area */}
                <div ref={scrollRef} className="flex overflow-y-auto" style={{ maxHeight: '70vh', position: 'relative' }}>
                     {/* left time axis */}
                     <div ref={axisRef} className="pr-2 bg-transparent sticky left-0 z-20" style={{ alignSelf: 'flex-start', width: `${axisWidth}px` }}>
                         <div style={{ height: totalHeight, position: 'relative' }}>
                             {Array.from({ length: 24 }).map((_, h) => (
                                 <div key={h} style={{ height: `${slotHeight}px`, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end' }} className="text-xs text-gray-500 pr-2">{String(h).padStart(2,'0')}:00</div>
                             ))}
                         </div>
                     </div>

                    {/* 3 day columns */}
                    <div className="flex-1 grid grid-cols-3" style={{ minWidth: 600, position: 'relative' }}>
                        {days.map((d, idx) => (
                            <div key={idx} className="relative border-l last:border-r" style={{ height: totalHeight }} onClick={() => onDayClick(d)}>
                                {/* horizontal hour lines */}
                                {Array.from({ length: 24 }).map((_, h) => (
                                    <div key={h} style={{ position: 'absolute', left: 0, right: 0, top: `${h * slotHeight}px`, height: 0 }}>
                                        <div style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }} />
                                    </div>
                                ))}

                                {/* events for this day */}
                                {eventsFor(d).map(ev => {
                                    const min = minutesOfDay(ev.deadline);
                                    const topPx = min === null ? null : (min / (24 * 60)) * totalHeight;
                                    const stripe = getCategoryColor(ev.category) || '#e6f4ea';
                                    const textCol = textColorForBg(stripe);
                                    const timeLabel = ev.deadline ? new Date(String(ev.deadline).replace(' ', 'T')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

                                    if (topPx === null) return (
                                        <div key={ev.id} className="m-2 p-1 rounded bg-white cursor-pointer" onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}>
                                            <div className="flex items-center gap-2">
                                                <span style={{ background: stripe, color: textCol }} className="px-2 py-0.5 rounded-full text-xs">{resolveCategory(ev.category)}</span>
                                                <div className="text-xs text-gray-500">{timeLabel}</div>
                                            </div>
                                        </div>
                                    );

                                    return (
                                        <button key={ev.id} onClick={(e) => { e.stopPropagation(); onEventClick(ev); }} className="absolute left-2 right-2 rounded shadow-sm bg-white border px-2 py-1 flex items-center gap-2" style={{ top: `${Math.min(Math.max(0, topPx), totalHeight - 1)}px`, zIndex: 10 }} title={ev.title}>
                                            <span style={{ width: 8, height: 8, background: stripe, borderRadius: 4, display: 'inline-block' }} />
                                            <span className="text-sm font-medium truncate">{ev.title}</span>
                                            <span className="text-xs text-gray-500 ml-2">{timeLabel}</span>
                                        </button>
                                    );
                                })}

                                {/* no per-day now indicator here; we'll render a single line that spans all day columns */}
                             </div>
                         ))}

                        {/* single now-line spanning all day columns */}
                        {nowTop >= 0 && nowTop <= totalHeight && (
                            <div style={{ position: 'absolute', left: 0, right: 0, top: `${nowTop}px`, pointerEvents: 'none', zIndex: 120 }}>
                                <div style={{ height: 0 }}>
                                    <div style={{ borderTop: '2px solid rgba(220,38,38,0.9)' }} />
                                </div>
                            </div>
                        )}

                    </div>

                 </div>
             </div>
         </div>
     );
 }
