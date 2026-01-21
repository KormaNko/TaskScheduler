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


    //vytvorim datum bez casu na porovnavanie dni
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
    //deadline menim na date vypocitavam cas od polnoci
    const parsedTasks = useMemo(() => (
        Array.isArray(tasks) ? tasks.map(t => {
            const date = t.deadline ? new Date(t.deadline.replace(' ', 'T')) : null;
            return {
                ...t,
                _date: date && !isNaN(date) ? date : null,
                _minutes: date && !isNaN(date) ? date.getHours() * 60 + date.getMinutes() : null
            };
        }) : []
    ), [tasks]);

    //vyberam ulohy pre konkretny den
    const eventsForDay = d =>
        parsedTasks.filter(t => t._date && dateKey(t._date) === dateKey(d));

    /* ---------- layout ---------- */
    //jedna hodina ma 80px
    const slotHeight = 80;
    const totalHeight = 24 * slotHeight;

    const scrollRef = useRef(null);
    const axisRef = useRef(null);
    const [axisWidth, setAxisWidth] = useState(80);

    /* ---------- now line ---------- */
    const now = new Date();
    const nowTop = ((now.getHours() * 60 + now.getMinutes()) / (24 * 60)) * totalHeight;

    function scrollToNow() {
        const el = scrollRef.current;
        if (el) el.scrollTop = Math.max(0, nowTop - el.clientHeight / 2);
    }

    useEffect(() => {
        scrollToNow();
        window.addEventListener('resize', scrollToNow);
        return () => window.removeEventListener('resize', scrollToNow);
    }, []);

    useEffect(() => {
        const a = axisRef.current;
        if (a?.offsetWidth) setAxisWidth(a.offsetWidth);
    }, []);

    const textColorForBg = hex => {
        if (!hex) return '#111827';
        const h = hex.replace('#', '');
        const r = parseInt(h.slice(0, 2), 16) / 255;
        const g = parseInt(h.slice(2, 4), 16) / 255;
        const b = parseInt(h.slice(4, 6), 16) / 255;
        return (0.2126 * r + 0.7152 * g + 0.0722 * b) > 0.6 ? '#111827' : '#fff';
    };

    //zistujem kde som klikol a zaokruhlujem na 30minut
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

    return (
        <div style={{ overflowX: 'hidden', width: '100%' }}>
            <div className="flex justify-end mb-2">
                <button onClick={scrollToNow}
                        className="px-3 py-1 bg-indigo-600 text-white rounded text-sm">
                    {t ? t('now') : 'Now'}
                </button>
            </div>

            <div className="bg-white rounded border p-4">
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
                            //vykreslovanie jedneho dna
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
                                //vykreslovanie uloh
                                {eventsForDay(d).map(ev => {
                                    const top = ev._minutes !== null
                                        ? (ev._minutes / (24 * 60)) * totalHeight
                                        : null;

                                    return (
                                        <button
                                            key={ev.id}
                                            onClick={e => { e.stopPropagation(); onEventClick(ev); }}
                                            className="absolute left-2 right-2 bg-white border rounded px-2 py-1 shadow-sm"
                                            style={{ top, zIndex: 10 }}
                                        >
                                            {ev.title}
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                        //ciara ukazujuci aktualny cas
                        {nowTop >= 0 && nowTop <= totalHeight && (
                            <div style={{ position: 'absolute', left: 0, right: 0, top: nowTop, pointerEvents: 'none' }}>
                                <div style={{ borderTop: '2px solid rgba(220,38,38,0.9)' }} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}