import React, { useRef, useEffect, useState, useMemo } from 'react';
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
    const containerRef = useRef(null);
    const [axisWidth, setAxisWidth] = useState(80);

    /* ---------- now line ---------- */
    const now = new Date();
    const nowTop = ((now.getHours() * 60 + now.getMinutes()) / (24 * 60)) * totalHeight;

    // now-line positioning (measured relative to the .bg-white container)
    const [nowLinePos, setNowLinePos] = useState({ left: 0, width: 0, top: 0 });
    //AI
    function updateNowLinePos() {
        const sc = scrollRef.current;
        const ct = containerRef.current;
        if (!sc || !ct) return;
        // left and width of the scroll area relative to container
        const left = sc.offsetLeft;
        const width = sc.clientWidth;
        // top relative to container: position of scroll area + nowTop - how much it's scrolled
        const top = sc.offsetTop + nowTop - sc.scrollTop;
        setNowLinePos({ left, width, top });
    }

    function scrollToNow() {
        const el = scrollRef.current;
        if (el) el.scrollTop = Math.max(0, nowTop - el.clientHeight / 2);
        // update now-line after scrolling
        requestAnimationFrame(updateNowLinePos);
    }
    //AI
    useEffect(() => {
        scrollToNow();
        window.addEventListener('resize', () => {
            updateNowLinePos();
            // keep scroll centered
            scrollToNow();
        });
        return () => window.removeEventListener('resize', scrollToNow);
    }, []);

    useEffect(() => {
        const a = axisRef.current;
        if (a?.offsetWidth) setAxisWidth(a.offsetWidth);
        // initial measurement of now-line
        updateNowLinePos();
    }, []);

    // update now-line while user scrolls inside the scroll area
    useEffect(() => {
        const sc = scrollRef.current;
        if (!sc) return;
        const onScroll = () => updateNowLinePos();
        sc.addEventListener('scroll', onScroll);
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

    const headerGridStyle = {
        display: 'grid',
        gridTemplateColumns: `${axisWidth}px repeat(3, minmax(0, 1fr))`,
        gap: '0.5rem',
        alignItems: 'center'
    };
    //AI
    return (
        <div style={{ overflowX: 'hidden', width: '100%' }}>
            <div className="flex justify-end mb-2">
                <button onClick={scrollToNow}
                        className="px-3 py-1 bg-indigo-600 text-white rounded text-sm">
                    {t ? t('now') : 'Now'}
                </button>
            </div>

            <div ref={containerRef} className="bg-white rounded border p-4" style={{ position: 'relative' }}>
                <div style={headerGridStyle} className="mb-2">
                    <div />
                    {days.map((d, i) => (
                        <div key={i} className="text-center">
                            <div className="text-xs text-gray-500 uppercase">
                                {d.toLocaleDateString(undefined, { weekday: 'short' })}
                            </div>
                            <div className="text-lg font-semibold">{d.getDate()}</div>
                        </div>
                    ))}
                </div>

                <div ref={scrollRef} className="flex overflow-y-auto relative" style={{ maxHeight: '70vh' }}>
                    {/* time axis */}
                    <div ref={axisRef} className="pr-2 sticky left-0 z-10">
                        <div style={{ height: totalHeight }}>

                            {Array.from({ length: 24 }).map((_, h) => (
                                <div key={h} style={{ height: slotHeight }}
                                     className="text-xs text-gray-500 text-right pr-2">
                                    {pad(h)}:00
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* days */}
                    <div className="flex-1 grid grid-cols-3 relative">
                        {days.map((d, idx) => (
                            <div
                                key={idx}
                                className="relative border-l last:border-r"
                                style={{ height: totalHeight }}
                                onClick={e => onDayClick(dateFromClick(d, e))}
                            >

                                {/* horizontal hour lines */}
                                {Array.from({ length: 24 }).map((_, h) => (
                                    <div
                                        key={h}
                                        style={{
                                            position: 'absolute',
                                            left: 0,
                                            right: 0,
                                            top: `${h * slotHeight}px`,
                                            height: 0,
                                            pointerEvents: 'none'
                                        }}
                                    >
                                        <div style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }} />
                                    </div>
                                ))}

                                {/* events */}

                                {eventsForDay(d).map(ev => {
                                    const minutes = ev._displayMinutes != null ? ev._displayMinutes : ev._minutes;
                                    const top = minutes !== null && minutes !== undefined
                                        ? (minutes / (24 * 60)) * totalHeight
                                        : null;

                                    const badgeBg = getCategoryColor(ev.category) || '#e6f4ea';

                                    return (
                                        <button
                                            key={ev.id}
                                            onClick={e => { e.stopPropagation(); onEventClick(ev); }}
                                            className="absolute left-2 right-2 bg-white border rounded px-2 py-1 shadow-sm flex gap-2 items-center"
                                            style={{ top, zIndex: 10 }}
                                        >
                                            <span
                                                style={{
                                                    width: 8,
                                                    height: 8,
                                                    background: badgeBg,
                                                    borderRadius: 4
                                                }}
                                            />
                                            {ev.title}
                                        </button>
                                    );
                                })}
                            </div>
                        ))}

                    </div>

                </div>

                {/* now line: rendered relative to the outer container so it spans full visual width */}
                {nowTop >= 0 && nowTop <= totalHeight && (
                    <div
                        aria-hidden
                        style={{
                            position: 'absolute',
                            left: nowLinePos.left,
                            width: nowLinePos.width,
                            top: nowLinePos.top,
                            pointerEvents: 'none',
                            zIndex: 40
                        }}
                    >
                        <div style={{ borderTop: '2px solid rgba(220,38,38,0.9)' }} />
                    </div>
                )}
            </div>
        </div>
    );
}