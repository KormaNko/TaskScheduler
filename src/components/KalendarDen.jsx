import React, { useRef, useEffect, useMemo } from 'react';
import { useOptions } from '../contexts/OptionsContext.jsx';

// Day view with single left time axis and scrollable timeline
export default function KalendarDen({
                                        date = new Date(),
                                        tasks = [],
                                        onEventClick = () => {},
                                        onDayClick = () => {}
                                    }) {
    const { t } = useOptions();


    const pad = n => String(n).padStart(2, '0');
    const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

    /* -------------------- CATEGORY COLOR -------------------- */
    const getCategoryColor = (cat) => {
        // Under the new contract `cat` is a category object or null.
        if (!cat || typeof cat !== 'object') return null;
        return cat.color ?? null;
    };
    //AI
    /* -------------------- TASK PARSING -------------------- */
    const parsedTasks = useMemo(() => (
        Array.isArray(tasks) ? tasks.map(t => {
            const d = t.deadline
                ? new Date(String(t.deadline).replace(' ', 'T'))
                : null;

            return {
                ...t,
                _date: d && !isNaN(d) ? d : null,
                _minutes: d ? d.getHours() * 60 + d.getMinutes() : null
            };
        }) : []
    ), [tasks]);

    //zoznam udalostí pre daný deň ktore maju deadline samozrejme
    const eventsForDay = d =>
        parsedTasks.filter(t =>
            t._date && dateKey(t._date) === dateKey(d)
        );

    /* -------------------- LAYOUT -------------------- */
    const slotHeight = 80;
    const totalHeight = 24 * slotHeight;
    const scrollRef = useRef(null);

    /* -------------------- NOW LINE -------------------- */
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const nowTop = (nowMinutes / (24 * 60)) * totalHeight;

    function scrollToNow() {
        const el = scrollRef.current;
        if (!el) return;
        el.scrollTop = Math.max(0, nowTop - el.clientHeight / 2);
    }

    useEffect(() => {
        scrollToNow();
    }, []);

    /* -------------------- CLICK → TIME -------------------- */
    //AI
    function dateFromClick(baseDate, e) {
        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const frac = Math.max(0, Math.min(1, y / rect.height));
        let minutes = Math.round(frac * 24 * 60 / 30) * 30;
        minutes = Math.min(Math.max(0, minutes), 24 * 60 - 30);

        const d = new Date(baseDate);
        d.setHours(0, minutes, 0, 0);
        return d;
    }
    //AI
    /* -------------------- RENDER -------------------- */
    return (
        <div className="calendar-root" style={{ overflowX: 'hidden' }}>

            {/* HEADER */}
            <div className="calendar-control-bar flex justify-between items-center mb-2">
                <div>
                    <div className="text-lg font-semibold">
                        {date.toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-500">
                        {t ? t('view_day') : 'Day view'}
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={scrollToNow}
                        className="px-3 py-1 bg-indigo-600 text-white rounded text-sm"
                    >
                        {t ? t('now') : 'Now'}
                    </button>

                    <button
                        className="w-8 h-8 rounded-full bg-green-600 text-white"
                        onClick={() => {
                            const d = new Date(date);
                            d.setHours(9, 0, 0, 0);
                            onDayClick(d);
                        }}
                    >
                        +
                    </button>
                </div>
            </div>

            {/* TIMELINE */}
            <div
                ref={scrollRef}
                className="flex bg-white rounded border overflow-y-auto"
                style={{ maxHeight: '70vh' }}
            >

                {/* LEFT AXIS */}
                <div className="w-20 pr-2 sticky left-0 z-10">
                    <div style={{ height: totalHeight }}>
                        {Array.from({ length: 24 }).map((_, h) => (
                            <div
                                key={h}
                                style={{ height: slotHeight }}
                                className="text-xs text-gray-500 flex justify-end pr-2"
                            >
                                {String(h).padStart(2, '0')}:00
                            </div>
                        ))}
                    </div>
                </div>

                {/* DAY COLUMN */}
                <div
                    className="flex-1 relative"
                    style={{ height: totalHeight }}
                    onClick={e => onDayClick(dateFromClick(date, e))}
                >

                    {/* HOUR LINES */}
                    {Array.from({ length: 24 }).map((_, h) => (
                        <div
                            key={h}
                            style={{
                                position: 'absolute',
                                top: h * slotHeight,
                                left: 0,
                                right: 0,
                                borderTop: '1px solid rgba(0,0,0,0.05)'
                            }}
                        />
                    ))}

                    {/* EVENTS */}
                    {eventsForDay(date).map(ev => {
                        const top = ev._minutes != null
                            ? (ev._minutes / (24 * 60)) * totalHeight
                            : null;

                        const bg = getCategoryColor(ev.category) || '#e6f4ea';

                        const timeLabel = ev._date
                            ? ev._date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '';

                        if (top === null) return null;

                        return (
                            <button
                                key={ev.id}
                                className="absolute left-2 right-2 bg-white border rounded px-2 py-1 flex gap-2 items-center shadow-sm"
                                style={{ top }}
                                onClick={e => {
                                    e.stopPropagation();
                                    onEventClick(ev);
                                }}
                            >
                                <span
                                    style={{
                                        width: 8,
                                        height: 8,
                                        background: bg,
                                        borderRadius: 4
                                    }}
                                />
                                <span className="truncate flex-1">
                                    {ev.title}
                                </span>
                                <span className="text-xs text-gray-500">
                                    {timeLabel}
                                </span>
                            </button>
                        );
                    })}

                    {/* NOW LINE */}
                    {nowTop >= 0 && nowTop <= totalHeight && (
                        <div
                            style={{
                                position: 'absolute',
                                top: nowTop,
                                left: 0,
                                right: 0,
                                borderTop: '2px solid rgba(220,38,38,0.9)',
                                pointerEvents: 'none',
                                zIndex: 20
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}