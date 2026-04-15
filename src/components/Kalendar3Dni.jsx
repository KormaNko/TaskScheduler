import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { useOptions } from '../contexts/OptionsContext.jsx';


//dostanem od ktoreho dna zacat ulohy ak kliknem na ulohu a ak kliknem na den
export default function Kalendar3Dni({
                                         startDate = new Date(),
                                         tasks = [],
                                         onEventClick = () => {},
                                         onDayClick = () => {}
                                     }) {
    const { t } = useOptions();


    /* -------------------- CATEGORY COLOR -------------------- */
    const getCategoryColor = (cat) => {
        if (!cat || typeof cat !== 'object') return null;
        return cat.color ?? null;
    };

    //vytvorim datum bez casu na porovnavanie dni
    //AI
    const pad = n => String(n).padStart(2, '0');
    const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    /* ---------- days ---------- */
    //vytvorim 3 dni dnes zajtra a pozajtra
    const days = useMemo(() => (
        [0, 1, 2].map(off => {
            const d = new Date(startDate);
            d.setDate(d.getDate() + off);
            d.setHours(0, 0, 0, 0);
            return d;
        })
    ), [startDate]);

    /* ---------- normalize tasks once ---------- */
    // parse plannedStart/plannedEnd first, fallback to deadline. store _start/_end and base minutes
    const parsedTasks = useMemo(() => (
        Array.isArray(tasks) ? tasks.map(t => {
            const tryParse = v => {
                if (!v) return null;
                const dt = new Date(String(v).replace(' ', 'T'));
                return isNaN(dt.getTime()) ? null : dt;
            };
            const start = tryParse(t.plannedStart) || tryParse(t.deadline) || null;
            const end = tryParse(t.plannedEnd) || null;
            return {
                ...t,
                _start: start,
                _end: end,
                _minutes: start ? start.getHours() * 60 + start.getMinutes() : null
            };
        }) : []
    ), [tasks]);

    //vyberam ulohy pre konkretny den
    const eventsForDay = d => {
        const dayStart = new Date(d); dayStart.setHours(0,0,0,0);
        const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
        return parsedTasks.map(t => {
            const s = t._start;
            const e = t._end;
            let include = false;
            if (!s && !e) return null;
            if (s) {
                if (dateKey(s) === dateKey(d)) include = true;
                if (s < dayEnd && (e === null || e > dayStart)) include = true;
            }
            if (!include) return null;
            const displayMinutes = s ? ((s < dayStart) ? 0 : (s.getHours()*60 + s.getMinutes())) : null;
            return { ...t, _displayMinutes: displayMinutes };
        }).filter(Boolean);
    };

    /* ---------- layout ---------- */
    //jedna hodina ma 80px
    const slotHeight = 80;
    const totalHeight = 24 * slotHeight;

    const scrollRef = useRef(null);
    const axisRef = useRef(null);
    const [axisWidth, setAxisWidth] = useState(80);

    // measure axis width to align header columns with timeline (same approach as other views)
    useEffect(() => {
        const measure = () => {
            if (axisRef.current?.offsetWidth) setAxisWidth(axisRef.current.offsetWidth);
        };
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, []);

    /* ---------- now line ---------- */
    const [nowTs, setNowTs] = useState(Date.now());
    // keep now timestamp updated every 30s so the now-line moves smoothly
    useEffect(() => {
        const id = setInterval(() => setNowTs(Date.now()), 30 * 1000);
        return () => clearInterval(id);
    }, []);
    const now = new Date(nowTs);
    const nowTop = ((now.getHours() * 60 + now.getMinutes()) / (24 * 60)) * totalHeight;

    const scrollToNow = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        el.scrollTop = Math.max(0, nowTop - el.clientHeight / 2);
    }, [nowTop]);

    //AI
    useEffect(() => {
        scrollToNow();
        // named resize handler so it can be removed properly
        const onResize = () => {
            // keep scroll centered
            scrollToNow();
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [scrollToNow]);

    useEffect(() => {
        const a = axisRef.current;
        if (a?.offsetWidth) setAxisWidth(a.offsetWidth);
        // initial measurement of now-line
    }, []);

    // update now-line while user scrolls inside the scroll area
    useEffect(() => {
        const sc = scrollRef.current;
        if (!sc) return;
        const onScroll = () => {};
        sc.addEventListener('scroll', onScroll);
        // also update when the scroll container resizes (Mutation/resize observers could be used, but window resize covers most cases)
        return () => sc.removeEventListener('scroll', onScroll);
    }, []);

    //zistujem kde som klikol a zaokruhlujem na 30minut
    //AI
    function dateFromClick(baseDate, e) {
        const rect = e.currentTarget.getBoundingClientRect();
        const frac = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
        let minutes = Math.round(frac * 24 * 60 / 30) * 30;
        minutes = Math.min(Math.max(minutes, 0), 1410);
        const d = new Date(baseDate);
        d.setHours(0, minutes, 0, 0);
        return d;
    }

    // header grid alignment handled inline where needed; removed unused `headerGridStyle` constant
    return (
        <div className="calendar-root" style={{ overflowX: 'hidden' }}>
            {/* Control bar */}
            <div className="calendar-control-bar flex justify-between items-center mb-2">
                <div>
                    <div className="text-lg font-semibold">{days[0].toLocaleDateString()} — {days[days.length-1].toLocaleDateString()}</div>
                    {/* use the correct translation key for the 3-day view */}
                    <div className="text-sm text-gray-500">{t ? t('view_3days') : '3-day view'}</div>
                </div>
                <div className="flex gap-2">
                    <button onClick={scrollToNow} className="px-3 py-1 bg-indigo-600 text-white rounded text-sm">{t ? t('now') : 'Now'}</button>
                    <button className="w-8 h-8 rounded-full bg-green-600 text-white" onClick={() => { const d = new Date(startDate); d.setHours(9,0,0,0); onDayClick(d); }}>+</button>
                </div>
            </div>

            {/* Container with header grid + timeline (same pattern as week view) */}
            <div className="bg-white rounded p-4" style={{ display: 'grid', gridTemplateColumns: `${axisWidth}px repeat(3, minmax(0, 1fr))`, gap: '0.5rem' }}>
                <div />
                {days.map((d, i) => (
                    <div key={i} className="text-center">
                        <div className="text-xs text-gray-500">{d.toLocaleDateString(undefined, { weekday: 'short' })}</div>
                        <div className="text-lg font-semibold">{d.getDate()}</div>
                    </div>
                ))}

                <div ref={scrollRef} className="flex bg-white rounded border overflow-y-auto relative" style={{ gridColumn: '1 / span 4', maxHeight: '70vh' }}>
                    {/* time axis */}
                    <div ref={axisRef} className="w-20 pr-2 sticky left-0 z-10">
                        <div style={{ height: totalHeight }}>
                            {Array.from({ length: 24 }).map((_, h) => (
                                <div key={h} style={{ height: slotHeight }} className="text-xs text-gray-500 flex justify-end pr-2">{String(h).padStart(2,'0')}:00</div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 relative flex-1" style={{ height: totalHeight }}>
                        {days.map((d, idx) => (
                            // match KalendarTyzden: use border-l and last:border-r so vertical separators are perfectly straight
                            <div key={idx} className="relative border-l last:border-r" style={{ height: totalHeight }} onClick={e => onDayClick(dateFromClick(d, e))}>
                                {Array.from({ length: 24 }).map((_, h) => (
                                    <div key={h} style={{ position: 'absolute', left: 0, right: 0, top: `${h * slotHeight}px`, height: 0 }}>
                                        <div style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }} />
                                    </div>
                                ))}

                                {eventsForDay(d).map(ev => {
                                     const minutes = ev._displayMinutes != null ? ev._displayMinutes : ev._minutes;
                                     const top = minutes !== null && minutes !== undefined ? (minutes / (24 * 60)) * totalHeight : null;
                                     const badgeBg = getCategoryColor(ev.category) || '#e6f4ea';
                                     return (
                                         <button key={ev.id} onClick={e => { e.stopPropagation(); onEventClick(ev); }} className="absolute left-2 right-2 bg-white border rounded px-2 py-1 shadow-sm flex gap-2 items-center" style={{ top, zIndex: 10 }}>
                                            <span style={{ width: 8, height: 8, background: badgeBg, borderRadius: 4 }} />
                                            {ev.title}
                                        </button>
                                     );
                                 })}
                            </div>
                         ))}

                    </div>

                    {/* NOW LINE placed here so it spans the entire timeline container (same as KalendarTyzden) */}
                    {nowTop >= 0 && nowTop <= totalHeight && (
                        <div style={{ position: 'absolute', top: nowTop, left: 0, right: 0, borderTop: '2px solid rgba(220,38,38,0.9)', pointerEvents: 'none', zIndex: 20 }} />
                    )}
                 </div>
             </div>
         </div>
     );
 }
