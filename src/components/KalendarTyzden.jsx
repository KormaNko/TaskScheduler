// Import React a hookov
import React, { useRef, useEffect, useState } from 'react';
import { useOptions } from '../contexts/OptionsContext.jsx';

// Týždenný kalendár s časovou osou vľavo
export default function KalendarTyzden({
                                           startDate = new Date(),
                                           tasks = [],
                                           categories = [],
                                           resolveCategory = () => '',
                                           onEventClick = () => {},
                                           onDayClick = () => {}
                                       }) {
    const { t } = useOptions();

    // Pomocné funkcie na prácu s dátumom
    const pad = n => String(n).padStart(2, '0');
    const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

    // Vypočítame pondelok aktuálneho týždňa
    const start = new Date(startDate);
    const jsDay = start.getDay();
    const mondayOffset = (jsDay + 6) % 7;
    start.setDate(start.getDate() - mondayOffset);

    // 7 dní v týždni
    const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return d;
    });

    // Vyfiltruje úlohy pre konkrétny deň
    const eventsFor = d =>
        (Array.isArray(tasks) ? tasks : []).filter(t => {
            if (!t?.deadline) return false;
            const dd = new Date(String(t.deadline).replace(' ', 'T'));
            if (isNaN(dd.getTime())) return false;
            return dateKey(dd) === dateKey(d);
        });

    // Zistí farbu kategórie (id / objekt / string)
    const getCategoryColor = catId => {
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

        const found = categories.find(
            c => String(c.id) === String(cat) || String(c.name) === String(cat)
        );
        return found?.color || null;
    };

    // Prevod času na minúty dňa
    const minutesOfDay = deadline => {
        if (!deadline) return null;
        const d = new Date(String(deadline).replace(' ', 'T'));
        if (isNaN(d.getTime())) return null;
        return d.getHours() * 60 + d.getMinutes();
    };

    // Layout
    const slotHeight = 80; // výška 1 hodiny
    const totalHeight = 24 * slotHeight;

    const scrollRef = useRef(null);
    const axisRef = useRef(null);
    const [axisWidth, setAxisWidth] = useState(80);

    // Zmeria šírku ľavej časovej osi
    useEffect(() => {
        const measure = () => {
            if (axisRef.current?.offsetWidth) {
                setAxisWidth(axisRef.current.offsetWidth);
            }
        };
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, []);

    // Aktuálny čas (červená čiara)
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const nowTop = (nowMinutes / (24 * 60)) * totalHeight;

    // Scroll na aktuálny čas
    function scrollToNow() {
        const el = scrollRef.current;
        if (!el) return;
        el.scrollTop = Math.max(0, nowTop - el.clientHeight / 2);
    }

    useEffect(() => {
        setTimeout(scrollToNow, 50);
    }, [startDate]);

    // Klik do stĺpca → dátum + čas
    function dateFromClick(baseDate, e) {
        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const minutes = Math.round((y / rect.height) * 24 * 60);
        const snapped = Math.round(minutes / 30) * 30;
        const d = new Date(baseDate);
        d.setHours(0, 0, 0, 0);
        d.setMinutes(Math.max(0, Math.min(24 * 60 - 30, snapped)));
        return d;
    }

    return (
        <div className="calendar-root" style={{ overflowX: 'hidden' }}>

            {/* Horný panel */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                <button
                    onClick={scrollToNow}
                    className="px-3 py-1 bg-indigo-600 text-white rounded text-sm"
                >
                    {t ? t('now') : 'Now'}
                </button>
            </div>

            {/* Grid hlavičky + timeline */}
            <div
                className="bg-white rounded border border-gray-100 p-4"
                style={{
                    display: 'grid',
                    gridTemplateColumns: `${axisWidth}px repeat(7, minmax(0, 1fr))`,
                    gap: '0.5rem'
                }}
            >
                {/* Prázdny roh */}
                <div />

                {/* Hlavička dní */}
                {days.map((d, i) => (
                    <div key={i} className="text-center">
                        <div className="text-xs text-gray-500">
                            {d.toLocaleDateString(undefined, { weekday: 'short' })}
                        </div>
                        <div className="font-semibold">{d.getDate()}</div>
                    </div>
                ))}

                {/* Ľavá časová os */}
                <div ref={axisRef}>
                    <div style={{ height: totalHeight }}>
                        {Array.from({ length: 24 }).map((_, h) => (
                            <div
                                key={h}
                                style={{
                                    height: slotHeight,
                                    display: 'flex',
                                    justifyContent: 'flex-end'
                                }}
                                className="text-xs text-gray-500 pr-2"
                            >
                                {String(h).padStart(2, '0')}:00
                            </div>
                        ))}
                    </div>
                </div>

                {/* Timeline */}
                <div
                    ref={scrollRef}
                    className="relative"
                    style={{
                        gridColumn: '2 / span 7',
                        maxHeight: '70vh',        // // výška scrollovateľného kalendára
                        overflowY: 'auto',        // // scroll len tu
                        overflowX: 'hidden'       // // nikdy horizontálny scroll
                    }}
                >
                    <div className="grid grid-cols-7 relative" style={{ height: totalHeight }}>

                        {days.map((d, i) => (
                            <div
                                key={i}
                                className="relative border-l last:border-r"
                                style={{ height: totalHeight }}
                                onClick={e => onDayClick(dateFromClick(d, e))}
                            >
                                {/* === HORIZONTÁLNE ČIARY (HODINY) === */}
                                {Array.from({ length: 24 }).map((_, h) => (
                                    <div
                                        key={h}
                                        style={{
                                            position: 'absolute',
                                            left: 0,
                                            right: 0,
                                            top: `${h * slotHeight}px`,
                                            height: 0
                                        }}
                                    >
                                        <div style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }} />
                                    </div>
                                ))}

                                {/* Eventy */}
                                {eventsFor(d).map(ev => {
                                    const min = minutesOfDay(ev.deadline);
                                    if (min === null) return null;

                                    const top = (min / (24 * 60)) * totalHeight;
                                    const catKey = ev.category ?? ev.category_id ?? null;
                                    const bg = getCategoryColor(catKey) || '#e6f4ea';

                                    return (
                                        <button
                                            key={ev.id}
                                            onClick={e => {
                                                e.stopPropagation();
                                                onEventClick(ev);
                                            }}
                                            className="absolute left-2 right-2 bg-white border rounded px-2 py-1 shadow-sm flex gap-2"
                                            style={{ top, zIndex: 10 }}
                                        >
                                            <span
                                                style={{
                                                    width: 8,
                                                    height: 8,
                                                    background: bg,
                                                    borderRadius: 4
                                                }}
                                            />
                                            <span className="truncate">{ev.title}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                    </div>

                    {/* Červená čiara aktuálneho času */}
                    {nowTop >= 0 && nowTop <= totalHeight && (
                        <div
                            style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                top: nowTop,
                                pointerEvents: 'none'
                            }}
                        >
                            <div style={{ borderTop: '2px solid rgba(220,38,38,0.9)' }} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}