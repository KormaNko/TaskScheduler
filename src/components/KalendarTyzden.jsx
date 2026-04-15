// Import React a hookov
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useOptions } from '../contexts/OptionsContext.jsx';

// Týždenný kalendár s časovou osou vľavo
export default function KalendarTyzden({
                                           startDate = new Date(),
                                           tasks = [],
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

     // week end for header label
     const weekEnd = new Date(start);
     weekEnd.setDate(start.getDate() + 6);

     // 7 dní v týždni
     const days = Array.from({ length: 7 }, (_, i) => {
         const d = new Date(start);
         d.setDate(start.getDate() + i);
         return d;
     });

     // parse plannedStart/plannedEnd first, fallback to deadline. store _start/_end and base minutes
     const parsedTasks = (Array.isArray(tasks) ? tasks : []).map(t => {
         const tryParse = v => {
             if (!v) return null;
             const dt = new Date(String(v).replace(' ', 'T'));
             return isNaN(dt.getTime()) ? null : dt;
         };
         const start = tryParse(t.plannedStart) || tryParse(t.deadline) || null;
         const end = tryParse(t.plannedEnd) || null;
         return { ...t, _start: start, _end: end, _minutes: start ? (start.getHours()*60 + start.getMinutes()) : null };
     });

     // Vyberie úlohy pre deň: ak ich plánovaný interval zasahuje tento deň
     const eventsFor = d => {
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

     // Zistí farbu kategórie (očekáváme objekt alebo null)
     const getCategoryColor = cat => {
         // Under new backend contract `cat` should be a category object or null.
         if (!cat || typeof cat !== 'object') return null;
         return cat.color ?? null;
     };

     // Layout
     const slotHeight = 80; // výška 1 hodiny
     const totalHeight = 24 * slotHeight;

     const scrollRef = useRef(null);
     const axisRef = useRef(null);
     const [axisWidth, setAxisWidth] = useState(80);

     // Zmeria šírku ľavej časovej osi
     //AI
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

     // keep a moving now timestamp and simple scrollToNow (match KalendarDen behavior)
     const [nowTs, setNowTs] = useState(Date.now());
     useEffect(() => {
         const id = setInterval(() => setNowTs(Date.now()), 30 * 1000);
         return () => clearInterval(id);
     }, []);
     const now = new Date(nowTs);
     const nowMinutes = now.getHours() * 60 + now.getMinutes();
     const nowTop = (nowMinutes / (24 * 60)) * totalHeight;

     const scrollToNow = useCallback(() => {
         const el = scrollRef.current;
         if (!el) return;
         el.scrollTop = Math.max(0, nowTop - el.clientHeight / 2);
     }, [nowTop]);

     // call once on mount to center now (like KalendarDen)
     useEffect(() => { scrollToNow(); }, [scrollToNow]);

     // Klik do stĺpca → dátum + čas
     //AI
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
     //AI
     return (
         <div className="calendar-root" style={{ overflowX: 'hidden' }}>

             {/* Horný panel - consistent control bar */}
             <div className="calendar-control-bar flex justify-between items-center mb-2">
                 <div>
                     <div className="text-lg font-semibold">{start.toLocaleDateString()} — {weekEnd.toLocaleDateString()}</div>
                     <div className="text-sm text-gray-500">{t ? t('view_week') : 'Week view'}</div>
                 </div>

                 <div className="flex gap-2">
                     <button onClick={scrollToNow} className="px-3 py-1 bg-indigo-600 text-white rounded text-sm">{t ? t('now') : 'Now'}</button>
                     <button className="w-8 h-8 rounded-full bg-green-600 text-white" onClick={() => { const d = new Date(startDate); d.setHours(9,0,0,0); onDayClick(d); }}>+</button>
                 </div>
             </div>

             {/* Grid hlavičky + timeline */}
             <div
                 className="bg-white rounded p-4"
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

                 {/* Timeline */}
                 <div
                     ref={scrollRef}
                     className="flex bg-white rounded border overflow-y-auto relative"
                     style={{
                         gridColumn: '1 / span 8',
                         maxHeight: '70vh',        // // výška scrollovateľného kalendára
                         overflowY: 'auto',        // // scroll len tu
                         overflowX: 'hidden'       // // nikdy horizontálny scroll
                     }}
                 >
                     {/* Ľavá časová os (inside scroll container so it scrolls with content) */}
                     <div ref={axisRef} className="w-20 pr-2 sticky left-0 z-10">
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

                     <div className="grid grid-cols-7 relative flex-1" style={{ height: totalHeight }}>

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
                                     const minutes = ev._displayMinutes != null ? ev._displayMinutes : ev._minutes;
                                     if (minutes === null || minutes === undefined) return null;

                                     const top = (minutes / (24 * 60)) * totalHeight;
                                     // rely only on ev.category object or null
                                     const bg = getCategoryColor(ev.category) || '#e6f4ea';

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

                     {/* Červená čiara aktuálneho času - rendered relative to container to keep width aligned with scroll area */}
                     {nowTop >= 0 && nowTop <= totalHeight && (
                         <div style={{ position: 'absolute', top: nowTop, left: 0, right: 0, borderTop: '2px solid rgba(220,38,38,0.9)', pointerEvents: 'none', zIndex: 20 }} />
                     )}
                 </div>
             </div>
          </div>
      );
  }
