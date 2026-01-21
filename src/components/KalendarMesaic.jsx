// Import React knižnice a hooku useState na prácu so stavom komponentu
import React, { useState } from "react";
import { useOptions } from '../contexts/OptionsContext.jsx';

// Komponent mesačného kalendára
// Props: rows, cols, month, year, tasks (array), onEventClick(fn), loading, onDayClick
export default function KalendarMesiac({ rows = 6, cols = 7, month, year, tasks = [], onEventClick = () => {}, loading = false, onDayClick = () => {} }) {
    const { t } = useOptions();
    // helper: get category color by object
    const getCategoryColor = (cat) => {
        // Under the new contract `cat` is either a category object or null.
        return cat?.color ?? null;
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

    // Názvy mesiacov v slovenčine
    const months = [
        'Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún',
        'Júl', 'August', 'September', 'Október', 'November', 'December'
    ];

    // Skratky dní v týždni (pondelok..nedeľa)
    const daysOfWeek = ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'];

    // Aktuálny mesiac/rok (so zodpovedajúcimi defaultami)
    const [currentMonth, setCurrentMonth] = useState(month ?? new Date().getMonth() + 1);
    const [currentYear, setCurrentYear] = useState(year ?? new Date().getFullYear());

    // If parent supplies month/year, use them as effective values (controlled mode)
    const effectiveMonth = (typeof month === 'number') ? month : currentMonth;
    const effectiveYear = (typeof year === 'number') ? year : currentYear;

    // Zmena mesiaca o delta (-1 alebo +1) - only update internal state when uncontrolled
    function changeMonth(delta) {
        if (typeof month === 'number' && typeof year === 'number') {
            // controlled by parent - no internal change
            return;
        }
        let m = currentMonth + delta;
        let y = currentYear;
        if (m < 1) { m = 12; y -= 1; }
        if (m > 12) { m = 1; y += 1; }
        setCurrentMonth(m);
        setCurrentYear(y);
    }

    // Výpočty potrebné pre vykreslenie dní - use effectiveMonth/effectiveYear
    const monthIndex = Math.max(0, Math.min(11, effectiveMonth - 1));
    const daysInMonth = new Date(effectiveYear, monthIndex + 1, 0).getDate();
    const firstJsDay = new Date(effectiveYear, monthIndex, 1).getDay();
    const firstDayMondayIndex = (firstJsDay + 6) % 7;
    const leading = Array.from({ length: firstDayMondayIndex }, () => null);
    const dateCells = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const totalNeeded = leading.length + dateCells.length;
    const baseGridCells = rows * cols;
    const totalGridCells = Math.max(baseGridCells, Math.ceil(totalNeeded / cols) * cols);
    const displayCells = [...leading, ...dateCells];
    while (displayCells.length < totalGridCells) displayCells.push(null);

    // Build events map for current month
    const eventsByDay = {};
    if (Array.isArray(tasks) && tasks.length) {
        for (const t of tasks) {
            if (!t) continue;
            const raw = t.deadline ?? t.date ?? t.start ?? null;
            if (!raw) continue;
            const d = new Date(String(raw).replace(' ', 'T'));
            if (isNaN(d.getTime())) continue;
            if (d.getFullYear() !== effectiveYear) continue;
            if (d.getMonth() !== monthIndex) continue;
            const day = d.getDate();
            if (!eventsByDay[day]) eventsByDay[day] = [];
            eventsByDay[day].push(t);
        }
    }

    // styles
    const cellMinHeight = `calc((100vh - 260px) / ${rows})`;
    const containerStyle = { width: '100%', maxWidth: '100%', margin: '0 auto', padding: '12px', boxSizing: 'border-box', overflowX: 'hidden' };
    const controlBarStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '12px' };
    const controlGroupStyle = { display: 'flex', gap: '8px', alignItems: 'center' };
    const titleStyle = { textAlign: 'center', fontWeight: 600, flex: 1 };
    const gridWrapperStyle = { overflowY: 'auto', overflowX: 'hidden', borderRadius: '8px', maxWidth: '100%', height: `calc(100vh - 220px)` };
    const gridStyle = { display: 'grid', gap: '6px', padding: '6px', background: 'transparent', ...{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }, alignContent: 'start', height: '100%' };
    const headerStyle = { height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '6px', color: '#111827' };
    const cellStyle = { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px', display: 'flex', flexDirection: 'column', padding: '8px', minHeight: cellMinHeight, boxSizing: 'border-box', fontSize: '14px', color: '#111827', minWidth: 0 };
    const dateNumberStyle = { fontSize: '12px', fontWeight: 500, color: '#374151' };
    const eventsStyle = { marginTop: '6px', fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
    function cellCombinedStyle(isEmpty) { return { ...cellStyle, background: isEmpty ? 'transparent' : cellStyle.background, minWidth: 0 }; }
    const eventPillStyleBase = { display: 'block', padding: '2px 6px', borderRadius: '999px', cursor: 'pointer', marginTop: '4px', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis' };

    // For month view we use a static time (09:00) when creating a new task from a day cell
    function dateFromCellStatic(yearVal, monthIdx, dayNumber) {
        return new Date(yearVal, monthIdx, dayNumber, 9, 0, 0);
    }

    // ------------------
    // Render
    // ------------------
    return (
        <div style={containerStyle} className="calendar-root">

            {/* Horný ovládací panel kalendára */}
            <div style={controlBarStyle} className="calendar-control-bar">
                <div style={controlGroupStyle}>
                    {/* Only show internal controls when not controlled by parent */}
                    {!(typeof month === 'number' && typeof year === 'number') && (
                        <>
                            <button onClick={() => changeMonth(-1)} aria-label="Predchádzajúci mesiac" className="btn">{t ? t('prev') : 'Prev'}</button>
                            <button onClick={() => { setCurrentMonth(new Date().getMonth() + 1); setCurrentYear(new Date().getFullYear()); }} aria-label="Dnešný mesiac" className="btn" style={{ background: '#ffffff' }}>{t ? t('today') : 'Dnes'}</button>
                        </>
                    )}
                 </div>

                <div style={titleStyle} className="calendar-title"><div style={{ fontWeight: 700 }}>{months[monthIndex]} {effectiveYear}</div></div>

                <div style={controlGroupStyle}>
                    {!(typeof month === 'number' && typeof year === 'number') && (
                        <button onClick={() => changeMonth(1)} aria-label="Nasledujúci mesiac" className="btn">{t ? t('next') : 'Next'}</button>
                    )}
                 </div>
             </div>

            {loading && (<div style={{ padding: 8, color: '#374151', fontSize: 13 }}>{t ? t('loading') : 'Loading tasks...'}</div>)}

            {/* Grid s dňami */}
            <div style={gridWrapperStyle} className="month-grid">
                <div style={gridStyle}>

                    {/* Hlavička dní */}
                    {daysOfWeek.slice(0, cols).map((d, i) => (<div key={`header-${i}`} style={headerStyle} className="calendar-header-cell">{d}</div>))}

                    {/* Dni mesiaca */}
                    {displayCells.map((v, i) => (
                        <div key={i} style={cellCombinedStyle(v === null)} onClick={() => { if (v !== null) { const dt = dateFromCellStatic(effectiveYear, monthIndex, v); onDayClick(dt); } }}>
                             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                 <div style={dateNumberStyle}>{v !== null ? v : ''}</div>
                             </div>

                             <div style={eventsStyle}>
                                {v !== null && eventsByDay[v] ? (
                                      <>
                                          {eventsByDay[v].slice(0,2).map((ev, idx) => {
                                            const category = ev.category; // object or null per backend contract
                                            const stripe = getCategoryColor(category) || '#e6f4ea';
                                            const catColor = getCategoryColor(category) || null;
                                            const catName = category?.name ?? '';
                                             const pillTextColor = textColorForBg(catColor);
                                              return (
                                                  <div key={String(ev.id) + '-' + idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 6, cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); onEventClick(ev); }} title={ev.title}>
                                                      <div style={{ width: 6, minHeight: 28, background: stripe, borderRadius: 4 }} />
                                                      <div style={{ flex: 1, overflow: 'hidden' }}>
                                                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                              <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{ev.title}</div>
                                                              {catColor ? (<span style={{ ...eventPillStyleBase, background: catColor, color: pillTextColor }}>{catName}</span>) : null}
                                                          </div>
                                                          <div style={{ fontSize: 11, color: '#6b7280' }}>{ev.deadline ? new Date(String(ev.deadline).replace(' ', 'T')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</div>
                                                      </div>
                                                  </div>
                                              );
                                          })}
                                          {eventsByDay[v].length > 2 ? (<div style={{ marginTop: 4, color: '#374151', fontSize: 12 }}>+{eventsByDay[v].length - 2} {t ? t('more') : 'more'}</div>) : null}
                                      </>
                                  ) : null}
                             </div>
                         </div>
                     ))}
                 </div>
             </div>

         </div>
     );
 }
