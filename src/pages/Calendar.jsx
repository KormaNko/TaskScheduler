import React, { useEffect, useState, useMemo } from 'react';
import KalendarMesiac from '../components/KalendarMesaic.jsx';
import KalendarDen from '../components/KalendarDen.jsx';
import Kalendar3Dni from '../components/Kalendar3Dni.jsx';
import KalendarTyzden from '../components/KalendarTyzden.jsx';
import api from '../lib/api';
import { useOptions } from '../contexts/OptionsContext.jsx';
import ModalMisscheduledTasks from '../components/ModalMisscheduledTasks.jsx';

export default function Calendar() {

    const [tasks, setTasks] = useState([]);
    const [categories, setCategories] = useState([]);
    const [misScheduledTasks, setMisScheduledTasks] = useState(null); // pre-fetched mis-scheduled tasks to show in modal
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [viewMode, setViewMode] = useState('month');
    const [baseDate, setBaseDate] = useState(new Date());

    const [showCreate, setShowCreate] = useState(false);
    // forms now use category_id per new backend contract (number | '')
    // `time_to_complete` stored as string '' (empty) or numeric-string; sent as snake_case to backend
    const [form, setForm] = useState({ title: '', description: '', priority: 2, deadline: '', category_id: '', time_to_complete: '', atomic_task: 0, is_dynamic: 0, planned_start: '', planned_end: '' });
    const [editing, setEditing] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [success, setSuccess] = useState(null);
    const [showMissedModal, setShowMissedModal] = useState(false);

    const { opts, t } = useOptions();

    useEffect(() => { fetchTasks(); }, []);
    useEffect(() => { fetchCategories(); }, []);

    // normalize tasks to attach category object and ensure category is string for consistent rendering
    const normalizedTasks = useMemo(() => {

        if (!Array.isArray(tasks)) return [];
        let arr = tasks.slice();

         //AI
         try {
             const tf = opts?.taskFilter ?? opts?.task_filter ?? 'all';
             if (tf && tf !== 'all') {
                 arr = arr.filter(t => String(t.status ?? '') === String(tf));
             }
         } catch (e) { /* ignore */ }

         //AI
         try {
             const ts = opts?.taskSort ?? opts?.task_sort ?? 'none';
             switch (ts) {
                 case 'priority_asc':
                     arr.sort((a, b) => (Number(a.priority ?? 0) - Number(b.priority ?? 0)));
                     break;
                 case 'priority_desc':
                     arr.sort((a, b) => (Number(b.priority ?? 0) - Number(a.priority ?? 0)));
                     break;
                 case 'title_asc':
                     arr.sort((a, b) => String(a.title ?? '').localeCompare(String(b.title ?? ''), undefined, { sensitivity: 'base' }));
                     break;
                 case 'title_desc':
                     arr.sort((a, b) => String(b.title ?? '').localeCompare(String(a.title ?? ''), undefined, { sensitivity: 'base' }));
                     break;
                 case 'deadline_asc':
                     arr.sort((a, b) => {
                         const pa = Date.parse(String(a.deadline ?? a.deadline_at ?? '').replace(' ', 'T')) || Number.POSITIVE_INFINITY;
                         const pb = Date.parse(String(b.deadline ?? b.deadline_at ?? '').replace(' ', 'T')) || Number.POSITIVE_INFINITY;
                         return pa - pb;
                     });
                     break;
                 case 'deadline_desc':
                     arr.sort((a, b) => {
                         const pa = Date.parse(String(a.deadline ?? a.deadline_at ?? '').replace(' ', 'T')) || Number.POSITIVE_INFINITY;
                         const pb = Date.parse(String(b.deadline ?? b.deadline_at ?? '').replace(' ', 'T')) || Number.POSITIVE_INFINITY;
                         return pb - pa;
                     });
                     break;
                 default:
                     break;
             }
         } catch (e) { /* ignore */ }

         return arr;
     }, [tasks, categories, opts]);


     async function fetchTasks() {
        setLoading(true); setError(null);
        try {
            const data = await api.get('/?c=task&a=index');
            const list = Array.isArray(data) ? data : data?.data ?? [];
            setTasks(Array.isArray(list) ? list : []);
        } catch (e) {
            setError('Failed to load tasks');
        } finally { setLoading(false); }
     }

     async function fetchCategories() {
         try {
             const data = await api.get('/?c=category&a=index');
             const list = Array.isArray(data) ? data : data?.data ?? [];
             setCategories(list);
         } catch {
             setCategories([]);
         }
     }

     function updateForm(k, v) {
         setForm(s => ({ ...s, [k]: v }));
     }

    // derived helper for readability in JSX
    const isDynamic = Number(form.is_dynamic) === 1;

     function fromInputDateTimeToBackend(value) {
         if (!value) return '';
         const d = new Date(value);
         const pad = n => String(n).padStart(2, '0');
         return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
     }

     /* ========= NAVIGATION HELPERS ========= */
    //AI
     function navigate(delta) {
         setBaseDate(d => {
             const n = new Date(d);
             if (viewMode === 'month') {
                 n.setMonth(n.getMonth() + delta);
             } else if (viewMode === 'week') {
                 n.setDate(n.getDate() + (delta * 7));
             } else if (viewMode === '3days') {
                 n.setDate(n.getDate() + (delta * 3));
             } else { // day
                 n.setDate(n.getDate() + delta);
             }
             return n;
         });
     }

     function setToToday() {
         setBaseDate(new Date());
     }

     const pad = n => String(n).padStart(2, '0');
     function openCreateForDate(a, b, year) {
         // Accept either a Date object or (day, month, year)
         let d;
         if (a instanceof Date) {
             d = a;
         } else {
             const day = a; // 1-based
             d = new Date(year, (b - 1), day, 9, 0, 0);
         }
         // set datetime-local value
         const hhmm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
         const s = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${hhmm}`;
         // reset form to defaults but prefill the deadline so atomic/is_dynamic are default (0)
         setForm({ title: '', description: '', priority: 2, deadline: s, category_id: '', time_to_complete: '', atomic_task: 0, is_dynamic: 0, planned_start: '', planned_end: '' });
         setShowCreate(true);
     }

     /* ========= UI ACTIONS ========= */
    //AI
     async function createTask(e) {
         e.preventDefault();
         setError(null); setSuccess(null);
         if (!form.title || !form.title.trim()) { setError('Title is required'); return; }
         setActionLoading(true);
         try {
             const p = new URLSearchParams();
             p.append('title', form.title);
             p.append('description', form.description || '');
             p.append('priority', String(form.priority ?? 2));
             if (form.deadline) p.append('deadline', fromInputDateTimeToBackend(form.deadline));
             // send only category_id per new contract
             if (form.category_id !== undefined && form.category_id !== null && form.category_id !== '') p.append('category_id', String(form.category_id));

            // planned_start / planned_end: allow empty string to clear, otherwise convert
            if (form.planned_start) p.append('planned_start', fromInputDateTimeToBackend(form.planned_start)); else p.append('planned_start', '');
            if (form.planned_end) p.append('planned_end', fromInputDateTimeToBackend(form.planned_end)); else p.append('planned_end', '');

             // time_to_complete: allow empty string to indicate "clear", otherwise integer >= 0
             const ttcRaw = form.time_to_complete;
             if (ttcRaw !== undefined && ttcRaw !== null && ttcRaw !== '') {
                 const ttcInt = Number.isNaN(Number(ttcRaw)) ? NaN : parseInt(ttcRaw, 10);
                 if (isNaN(ttcInt) || ttcInt < 0) { setError('time_to_complete must be an integer >= 0'); setActionLoading(false); return; }
                 p.append('time_to_complete', String(ttcInt));
             } else {
                 p.append('time_to_complete', '');
             }

             // atomic_task: always include explicit 0 or 1
             const atRaw = form.atomic_task;
             const atVal = (atRaw === undefined || atRaw === null) ? 0 : (Number(atRaw) ? 1 : 0);
             p.append('atomic_task', String(atVal));

             // is_dynamic: always include explicit 0 or 1
             const idRaw = form.is_dynamic;
             const idVal = (idRaw === undefined || idRaw === null) ? 0 : (Number(idRaw) ? 1 : 0);
             p.append('is_dynamic', String(idVal));

             await api.request('/?c=task&a=create', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                 body: p.toString()
             });

             await fetchTasks();
             setShowCreate(false);
             setForm({ title: '', description: '', priority: 2, deadline: '', category_id: '', time_to_complete: '', atomic_task: 0, is_dynamic: 0, planned_start: '', planned_end: '' });
             setSuccess('Task created');
            // Always open the mis-scheduled modal after creating a task so the user can see results.
            // The modal will fetch `/?c=misscheduledTasks&a=index` itself.
             setMisScheduledTasks(null);
             setShowMissedModal(true);
         } catch (err) {
             setError(err?.message || 'Create failed');
         } finally {
             setActionLoading(false);
         }
     }
    //AI
     return (
        <div className="p-6 bg-gradient-to-b from-slate-50 to-white min-h-screen">
            <div className="mx-auto max-w-7xl">

            <div className="px-6 flex items-center justify-between mb-4 gap-4 flex-wrap">
                 <div className="flex items-center gap-2 w-full md:w-auto min-w-0 self-center">
                     <h1 className="text-2xl font-bold leading-none m-0">Kalendár</h1>
                 </div>

                {/* view buttons: keep side-by-side even on small screens and use Dashboard-style rounded pills */}
                <div className="flex items-center gap-2 w-full md:w-auto self-center">
                     <div className="bg-gradient-to-r from-indigo-50 via-white to-sky-50 py-1.5 px-3 rounded-xl shadow-md flex items-center gap-2 flex-nowrap overflow-x-auto border border-gray-100">
                        <button
                            onClick={() => setViewMode('day')}
                            className={`shrink-0 px-3 py-2 rounded-full border text-sm ${viewMode === 'day' ? 'bg-indigo-600 text-white border-transparent' : 'bg-white text-indigo-700'}`}
                        >{t ? t('view_day') : 'Deň'}</button>

                        <button
                            onClick={() => setViewMode('3days')}
                            className={`shrink-0 px-3 py-2 rounded-full border text-sm ${viewMode === '3days' ? 'bg-indigo-600 text-white border-transparent' : 'bg-white text-indigo-700'}`}
                        >{t ? t('view_3days') : '3 Dni'}</button>

                        <button
                            onClick={() => setViewMode('week')}
                            className={`shrink-0 px-3 py-2 rounded-full border text-sm ${viewMode === 'week' ? 'bg-indigo-600 text-white border-transparent' : 'bg-white text-indigo-700'}`}
                        >{t ? t('view_week') : 'Týždeň'}</button>

                        <button
                            onClick={() => setViewMode('month')}
                            className={`shrink-0 px-3 py-2 rounded-full border text-sm ${viewMode === 'month' ? 'bg-indigo-600 text-white border-transparent' : 'bg-white text-indigo-700'}`}
                        >{t ? t('view_month') : 'Mesiac'}</button>
                    </div>
                </div>
             </div>

             {error && <div className="px-6 text-red-600">{error}</div>}
             {loading && <div className="px-6 text-gray-600">{t ? t('loading') : 'Loading...'}</div>}

             {/* Navigation controls */}
            <div className="px-6 flex items-center justify-between gap-2">
                <div className="flex gap-2 items-center">
                    <button
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-full border text-sm bg-white text-indigo-700 shadow-sm hover:shadow-md transition transform active:scale-95"
                        onClick={() => navigate(-1)}
                        title={t ? t('prev') : 'Pred'}
                    >
                        <span className="text-lg">←</span>
                        <span className="hidden sm:inline">{t ? t('prev') : 'Pred'}</span>
                    </button>

                    <button
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-full border text-sm bg-white text-indigo-700 shadow-sm hover:shadow-md transition transform active:scale-95"
                        onClick={setToToday}
                        title={t ? t('today') : 'Dnes'}
                    >
                        <span className="text-lg">⦿</span>
                        <span className="hidden sm:inline">{t ? t('today') : 'Dnes'}</span>
                    </button>

                    <button
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-full border text-sm bg-white text-indigo-700 shadow-sm hover:shadow-md transition transform active:scale-95"
                        onClick={() => navigate(1)}
                        title={t ? t('next') : 'Nasl'}
                    >
                        <span className="text-lg">→</span>
                        <span className="hidden sm:inline">{t ? t('next') : 'Nasl'}</span>
                    </button>
                </div>
                <div className="text-sm text-gray-600">{t ? t('view') : 'Zobrazenie'}: <strong className="text-indigo-700">{viewMode === 'day' ? (t ? t('view_day') : 'Deň') : viewMode === '3days' ? (t ? t('view_3days') : '3 dni') : viewMode === 'week' ? (t ? t('view_week') : 'Týždeň') : (t ? t('view_month') : 'Mesiac')}</strong> • {baseDate.toLocaleDateString()}</div>
            </div>

            <div className="p-6">
                <div className="bg-white/80 rounded-lg shadow overflow-hidden border border-gray-100 p-4">
                    {viewMode === 'month' && (
                          <KalendarMesiac
                           rows={5}
                           cols={7}
                           month={baseDate.getMonth()+1}
                           year={baseDate.getFullYear()}
                           tasks={normalizedTasks}
                           loading={loading}
                           onEventClick={setEditing}
                           onDayClick={(dt) => openCreateForDate(dt)}
                          />
                      )}

                     {viewMode === 'week' && (
                          <KalendarTyzden
                              startDate={baseDate}
                              tasks={normalizedTasks}
                              loading={loading}
                              onEventClick={setEditing}
                              onDayClick={(d) => openCreateForDate(d)}
                          />
                      )}

                     {viewMode === '3days' && (
                          <Kalendar3Dni
                              startDate={baseDate}
                              tasks={normalizedTasks}
                              loading={loading}
                              onEventClick={setEditing}
                              onDayClick={(d) => openCreateForDate(d)}
                          />
                      )}

                     {viewMode === 'day' && (
                          <KalendarDen
                              date={baseDate}
                              tasks={normalizedTasks}
                              loading={loading}
                              onEventClick={setEditing}
                              onDayClick={(d) => openCreateForDate(d)}
                          />
                      )}
                </div>
            </div>

             {/* CREATE MODAL */}
             {showCreate && (
                <form onSubmit={createTask} className="fixed inset-0 bg-black/40 flex items-start md:items-center justify-center z-50">
                    <div className="relative bg-white w-full max-w-3xl mx-4 rounded-xl shadow-lg p-6 z-10 max-h-[90vh] overflow-y-auto">
                        {error && <div className="mb-2 text-sm text-red-600">{error}</div>}
                        {success && <div className="mb-2 text-sm text-green-600">{success}</div>}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Title</label>
                                <input autoFocus className="mt-1 block w-full border border-gray-200 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-200" placeholder="Title" value={form.title} onChange={e => updateForm('title', e.target.value)} />

                                <label className="block text-sm font-medium text-gray-700 mt-2">Time to complete (minutes)</label>
                                <input name="time_to_complete" type="number" min="0" step="1" disabled={!isDynamic} className={`mt-1 block w-full border border-gray-200 p-2 rounded-md focus:outline-none ${!isDynamic ? 'opacity-60 cursor-not-allowed bg-gray-50' : 'focus:ring-2 focus:ring-indigo-200'}`} value={form.time_to_complete} onChange={e => updateForm('time_to_complete', e.target.value)} />

                                <label className="block text-sm font-medium text-gray-700 mt-3">Description</label>
                                <textarea rows={6} className="mt-1 block w-full border border-gray-200 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-200" value={form.description} onChange={e => updateForm('description', e.target.value)} />

                                <label className="block text-sm font-medium text-gray-700 mt-2">Planned start</label>
                                <input name="planned_start" type="datetime-local" disabled={isDynamic} className={`mt-1 block w-full border border-gray-200 p-2 rounded-md focus:outline-none ${isDynamic ? 'opacity-60 cursor-not-allowed bg-gray-50' : 'focus:ring-2 focus:ring-indigo-200'}`} value={form.planned_start} onChange={e => updateForm('planned_start', e.target.value)} />

                                <label className="block text-sm font-medium text-gray-700 mt-2">Planned end</label>
                                <input name="planned_end" type="datetime-local" disabled={isDynamic} className={`mt-1 block w-full border border-gray-200 p-2 rounded-md focus:outline-none ${isDynamic ? 'opacity-60 cursor-not-allowed bg-gray-50' : 'focus:ring-2 focus:ring-indigo-200'}`} value={form.planned_end} onChange={e => updateForm('planned_end', e.target.value)} />

                                <label className="block text-sm font-medium text-gray-700 mt-2">Deadline</label>
                                <input name="deadline" type="datetime-local" disabled={!isDynamic} className={`mt-1 block w-full border border-gray-200 p-2 rounded-md focus:outline-none ${!isDynamic ? 'opacity-60 cursor-not-allowed bg-gray-50' : 'focus:ring-2 focus:ring-indigo-200'}`} value={form.deadline} onChange={e => updateForm('deadline', e.target.value)} />

                                {/* atomic_task checkbox: include hidden input before checkbox so non-checked state still sends value in plain HTML forms; also controlled via React state */}
                                 <div className="mt-3">
                                     <label className="inline-flex items-center gap-2">
                                         <input type="hidden" name="atomic_task" value="0" />
                                         <input type="checkbox" name="atomic_task" value="1" checked={Number(form.atomic_task) === 1} onChange={(e) => updateForm('atomic_task', e.target.checked ? 1 : 0)} className="rounded" />
                                         <span className="text-sm">{t ? t('atomicTask') : 'Task that cannot be split'}</span>
                                     </label>
                                 </div>

                                 {/* is_dynamic checkbox: same pattern as atomic_task */}
                                 <div className="mt-2">
                                     <label className="inline-flex items-center gap-2">
                                         <input type="hidden" name="is_dynamic" value="0" />
                                         <input type="checkbox" name="is_dynamic" value="1" checked={Number(form.is_dynamic) === 1} onChange={(e) => { const v = e.target.checked ? 1 : 0; updateForm('is_dynamic', v); if (v === 1) { updateForm('planned_start', ''); updateForm('planned_end', ''); } else { updateForm('deadline', ''); } }} className="rounded" />
                                         <span className="text-sm">{t ? t('dynamic') : 'Dynamic'}</span>
                                     </label>
                                 </div>

                                <div className="mt-4 flex gap-2">
                                     <button type="submit" disabled={actionLoading} className={`inline-flex items-center gap-2 px-4 py-2 ${actionLoading?"bg-green-500":"bg-green-600"} text-white rounded-md shadow-sm`}>{actionLoading ? 'Creating...' : 'Create'}</button>
                                     <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 border border-gray-200 rounded-md bg-white text-gray-700">Cancel</button>
                                 </div>
                              </div>
                          </div>
                      </div>
                  </form>
              )}

             {/* EDIT MODAL */}
             {editing && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white p-4 rounded w-full max-w-md">
                        <div className="text-lg font-semibold mb-2">{editing.title}</div>
                        <div className="text-sm text-gray-500 mb-2">{editing.deadline ? new Date(String(editing.deadline).replace(' ', 'T')).toLocaleString() : ''}</div>
                        <div className="text-sm text-gray-500 mb-2">Planned start: {editing.plannedStart ? new Date(String(editing.plannedStart).replace(' ', 'T')).toLocaleString() : '-'}</div>
                        <div className="text-sm text-gray-500 mb-2">Planned end: {editing.plannedEnd ? new Date(String(editing.plannedEnd).replace(' ', 'T')).toLocaleString() : '-'}</div>
                        <div className="mb-2">{editing?.category?.name ?? ''}</div>
                        {editing.description ? <div className="mb-4 text-gray-700">{editing.description}</div> : null}
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setEditing(null)} className="bg-gray-200 px-4 py-2 rounded">Close</button>
                        </div>
                    </div>
                </div>
             )}

             {/* Missed tasks modal: shows after creating a task if the scheduler assigned any tasks to the past */}
             <ModalMisscheduledTasks open={showMissedModal} onClose={() => setShowMissedModal(false)} onRefresh={fetchTasks} initialTasks={misScheduledTasks} />

            </div>
        </div>
     );
 }
