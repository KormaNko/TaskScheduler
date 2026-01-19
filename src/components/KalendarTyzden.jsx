import React, { useRef, useEffect, useState } from 'react';

// Week view with single left time axis and scrollable timeline
export default function KalendarTyzden({ startDate = new Date(), tasks = [], categories = [], resolveCategory = () => '', onEventClick = () => {}, onDayClick = () => {} }) {
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

    // minutes helper
    const minutesOfDay = (deadline) => {
        if (!deadline) return null;
        const d = new Date(String(deadline).replace(' ', 'T'));
        if (isNaN(d.getTime())) return null;
        return d.getHours() * 60 + d.getMinutes();
    };
    // layout sizing
    const slotHeight = 80; // px per hour (bigger)
    const totalHeight = 24 * slotHeight;

    const scrollRef = useRef(null);
    const axisRef = useRef(null);
    const [axisWidth, setAxisWidth] = useState(80); // measured width of left time axis in px
    const [_visibleHeight, setVisibleHeight] = useState(600);
    useEffect(() => {
        function measure() {
            try {
                const el = scrollRef.current;
                if (el) setVisibleHeight(el.clientHeight);
            } catch (e) {}
        }
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, []);

    // measure left axis width so header can align exactly
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

    // layout overlapping point-events into columns to avoid visual overlap
    function layoutPointEvents(items, minGap = 40) {
        // items: [{ id, top }]
        const cols = [];
        // sort by top
        const arr = (items || []).slice().sort((a,b) => a.top - b.top);
        for (const it of arr) {
            let placed = false;
            for (let ci = 0; ci < cols.length; ci++) {
                const col = cols[ci];
                const last = col[col.length - 1];
                if (it.top - last.top >= minGap) {
                    col.push(it);
                    it.col = ci;
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                it.col = cols.length;
                cols.push([it]);
            }
        }
        const colCount = Math.max(1, cols.length);
        return arr.map(it => ({ ...it, leftPct: (it.col * 100) / colCount, widthPct: 100 / colCount }));
    }

    // header formatter: weekday short + day number (no year)
    const fmtHeader = (d) => {
        const weekday = d.toLocaleDateString(undefined, { weekday: 'short' });
        const day = d.getDate();
        return { weekday, day };
    };

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

    // auto-scroll to current time once when component mounts or when the startDate changes
    useEffect(() => {
        // delay slightly to allow layout/measurements to settle
        const t = setTimeout(scrollToNow, 50);
        return () => clearTimeout(t);
    }, [startDate]);

    return (
        <div>
            {/* card that holds both header and timeline so their padding aligns exactly */}
            <div className="bg-white rounded border border-gray-100 p-4 relative" style={{ display: 'grid', gridTemplateColumns: `${axisWidth}px repeat(7, 1fr)`, gridAutoRows: 'auto 1fr', gap: '0.5rem', alignItems: 'start' }}>
                 {/* header row - children are grid cells so columns line up with timeline columns */}
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
                <div style={{ gridColumn: '2 / span 7', display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <button onClick={scrollToNow} className="px-3 py-1 bg-indigo-600 text-white rounded text-sm">Now</button>
                </div>

                {/* timeline area - left axis in col 1, days in cols 2..8 */}
                <div ref={axisRef} style={{ alignSelf: 'flex-start', width: `${axisWidth}px`, gridColumn: '1 / 2' }}>
                    <div style={{ height: totalHeight, position: 'relative' }} className="pr-2">
                        {Array.from({ length: 24 }).map((_, h) => (
                            <div key={h} style={{ height: `${slotHeight}px`, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end' }} className="text-xs text-gray-500 pr-2">{String(h).padStart(2,'0')}:00</div>
                        ))}
                    </div>
                </div>

                <div className="" style={{ gridColumn: '2 / span 7', minWidth: 700, overflow: 'hidden' }}>
                    <div ref={scrollRef} className="relative" style={{ height: totalHeight, overflowY: 'auto' }}>
                        <div className="grid grid-cols-7" style={{ height: totalHeight }}>
                            {days.map((d, idx) => (
                                <div key={idx} className="relative border-l last:border-r" style={{ height: totalHeight }} onClick={() => onDayClick(d)}>
                                    {Array.from({ length: 24 }).map((_, h) => (
                                        <div key={h} style={{ position: 'absolute', left: 0, right: 0, top: `${h * slotHeight}px`, height: 0 }}>
                                            <div style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }} />
                                        </div>
                                    ))}

                                    {(() => {
                                        const evs = eventsFor(d).map(ev => {
                                            const min = minutesOfDay(ev.deadline);
                                            const topPx = min === null ? null : (min / (24 * 60)) * totalHeight;
                                            return { ev, top: topPx, min };
                                        });
                                        const timed = evs.filter(x => x.top !== null);
                                        const laid = layoutPointEvents(timed, 36);

                                        return (
                                            <>
                                                {laid.map(item => {
                                                    const { ev, top, leftPct, widthPct } = item;
                                                    const catKey = ev.category ?? ev.category_id ?? ev.cat ?? ev.cat_id ?? ev._categoryObj ?? null;
                                                    const bg = getCategoryColor(catKey) || '#e6f4ea';
                                                    const timeLabel = ev.deadline ? new Date(String(ev.deadline).replace(' ', 'T')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                                                    return (
                                                        <button key={ev.id} onClick={(e) => { e.stopPropagation(); onEventClick(ev); }} className="absolute rounded shadow-sm bg-white border px-2 py-1 flex items-center gap-2" style={{ top: `${Math.min(Math.max(0, top), totalHeight - 1)}px`, left: `${leftPct}%`, width: `calc(${widthPct}% - 8px)`, zIndex: 10 }} title={ev.title}>
                                                            <span style={{ width: 8, height: 8, background: bg, borderRadius: 4, display: 'inline-block' }} />
                                                            <span className="text-sm font-medium truncate">{ev.title}</span>
                                                            <span className="text-xs text-gray-500 ml-2">{timeLabel}</span>
                                                        </button>
                                                    );
                                                })}

                                                {evs.filter(x => x.top === null).map(x => {
                                                    const ev = x.ev;
                                                    const catKey = ev.category ?? ev.category_id ?? ev.cat ?? ev.cat_id ?? ev._categoryObj ?? null;
                                                    const bg = getCategoryColor(catKey) || '#e6f4ea';
                                                    const textCol = textColorForBg(bg);
                                                    const timeLabel = ev.deadline ? new Date(String(ev.deadline).replace(' ', 'T')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                                                    return (
                                                        <div key={ev.id} className="m-2 p-1 rounded bg-white cursor-pointer" onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}>
                                                            <div className="flex items-center gap-2">
                                                                <span style={{ background: bg, color: textCol }} className="px-2 py-0.5 rounded-full text-xs">{resolveCategory(catKey)}</span>
                                                                <div className="text-xs text-gray-500">{timeLabel}</div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </>
                                        );
                                    })()}

                                    {/* per-column content ends here; now-line will be rendered once for the whole timeline below */}
                                </div>
                            ))}
                        </div>

                        {/* single now-line spanning all day columns inside the scrollable timeline */}
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
        </div>
    );
}
