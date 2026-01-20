import React, { useRef } from 'react';
import { useOptions } from '../contexts/OptionsContext.jsx';

// Day view with single left time axis and scrollable timeline
export default function KalendarDen({ date = new Date(), tasks = [], categories = [], onEventClick = () => {}, onDayClick = () => {} }) {
    const { t } = useOptions();
    const pad = n => String(n).padStart(2, '0');
    const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

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

    const eventsFor = (d) => (Array.isArray(tasks) ? tasks : []).filter(t => {
        if (!t?.deadline) return false;
        const dd = new Date(String(t.deadline).replace(' ', 'T'));
        if (isNaN(dd.getTime())) return false;
        return dateKey(dd) === dateKey(d);
    });

    const minutesOfDay = (deadline) => {
        if (!deadline) return null;
        const d = new Date(String(deadline).replace(' ', 'T'));
        if (isNaN(d.getTime())) return null;
        return d.getHours() * 60 + d.getMinutes();
    };

    const slotHeight = 80; // px per hour
    const totalHeight = 24 * slotHeight;

    const scrollRef = useRef(null);

    // now indicator
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

    // Ensure no horizontal scroll and allow columns to shrink
    const outerStyle = { overflowX: 'hidden', width: '100%', boxSizing: 'border-box' };

    // helper to compute Date from click inside a day column (snapped to 30 min)
    function dateFromClick(baseDate, e) {
        try {
            const rect = e.currentTarget.getBoundingClientRect();
            const y = e.clientY - rect.top;
            const h = rect.height || totalHeight;
            const frac = Math.max(0, Math.min(1, y / h));
            const minutes = Math.round(frac * 24 * 60);
            // snap to 30-minute increments
            let snapped = Math.round(minutes / 30) * 30;
            const maxStart = 24 * 60 - 30; // latest allowed start within same day (23:30)
            if (snapped > maxStart) snapped = maxStart;
            if (snapped < 0) snapped = 0;
            const d = new Date(baseDate);
            d.setHours(0,0,0,0);
            d.setMinutes(snapped);
            return d;
        } catch (err) { return new Date(baseDate); }
    }

    return (
        <div style={outerStyle} className="calendar-root">
            {/* top control bar - buttons moved to the very top to prevent header overflow */}
            <div className="calendar-control-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div>
                    <div className="text-lg font-semibold calendar-title">{date.toLocaleDateString()}</div>
                    <div className="text-sm text-gray-500">{t ? t('view_day') : 'Day view'}</div>
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <button onClick={scrollToNow} className="px-3 py-1 bg-indigo-600 text-white rounded text-sm">{t ? t('now') : 'Now'}</button>
                        <button type="button" aria-label={t ? t('create') : 'Add'} className="w-8 h-8 flex items-center justify-center bg-green-600 text-white rounded-full hover:bg-green-700 focus:outline-none" onClick={(e)=>{ e.stopPropagation(); const defaultDt = new Date(date); defaultDt.setHours(9,0,0,0); onDayClick(defaultDt); }}>+</button>
                    </div>
                </div>
            </div>

            <div ref={scrollRef} className="flex bg-white rounded border border-gray-100 overflow-y-auto day-timeline" style={{ maxHeight: '70vh', overflowX: 'hidden' }}>
                 {/* left time axis */}
                <div className="w-20 pr-2 bg-transparent sticky left-0 z-20 left-axis" style={{ alignSelf: 'flex-start', flex: '0 0 auto', minWidth: 0 }}>
                     <div style={{ height: totalHeight, position: 'relative' }}>
                         {Array.from({ length: 24 }).map((_, h) => (
                             <div key={h} style={{ height: `${slotHeight}px`, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end' }} className="text-xs text-gray-500 pr-2">{String(h).padStart(2,'0')}:00</div>
                         ))}
                     </div>
                 </div>

                 {/* single day column */}
                 <div className="flex-1 relative" style={{ minWidth: 0, width: '100%', height: totalHeight }} onClick={(e) => { const dt = dateFromClick(date, e); onDayClick(dt); }}>
                    {/* hour lines */}
                    {Array.from({ length: 24 }).map((_, h) => (
                        <div key={h} style={{ position: 'absolute', left: 0, right: 0, top: `${h * slotHeight}px`, height: 0 }}>
                            <div style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }} />
                        </div>
                    ))}

                    {/* events */}
                    {eventsFor(date).map(ev => {
                        const min = minutesOfDay(ev.deadline);
                        const topPx = min === null ? null : (min / (24 * 60)) * totalHeight;
                        const catKey = ev.category ?? ev.category_id ?? ev.cat ?? ev.cat_id ?? ev._categoryObj ?? null;
                        const bg = getCategoryColor(catKey) || '#e6f4ea';
                        const timeLabel = ev.deadline ? new Date(String(ev.deadline).replace(' ', 'T')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

                        if (topPx === null) return (
                            <div key={ev.id} className="m-2 p-2 rounded bg-white cursor-pointer border" onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}>
                                <div className="flex items-center gap-2">
                                    <span style={{ width: 8, height: 8, background: bg, borderRadius: 4, display: 'inline-block' }} />
                                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{ev.title}</div>
                                    <div className="text-xs text-gray-500 ml-2" style={{ flex: '0 0 auto' }}>{timeLabel}</div>
                                </div>
                            </div>
                        );

                        return (
                            <button key={ev.id} onClick={(e) => { e.stopPropagation(); onEventClick(ev); }} className="absolute rounded shadow-sm bg-white border px-2 py-1 flex items-center gap-2" style={{ top: `${Math.min(Math.max(0, topPx), totalHeight - 1)}px`, zIndex: 10, left: 8, right: 8 }} title={ev.title}>
                                <span style={{ width: 8, height: 8, background: bg, borderRadius: 4, display: 'inline-block' }} />
                                <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{ev.title}</span>
                                <span className="text-xs text-gray-500 ml-2" style={{ flex: '0 0 auto' }}>{timeLabel}</span>
                            </button>
                        );
                    })}

                    {/* now indicator */}
                    {nowTop >= 0 && nowTop <= totalHeight && (
                        <div style={{ position: 'absolute', left: 0, right: 0, top: `${nowTop}px`, pointerEvents: 'none', zIndex: 50 }}>
                            <div style={{ height: 0 }}>
                                <div style={{ borderTop: '2px solid rgba(220,38,38,0.9)' }} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
