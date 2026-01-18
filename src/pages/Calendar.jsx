import React, { useEffect, useState, useMemo } from 'react';
import KalendarMesiac from '../components/KalendarMesaic.jsx';
import KalendarDen from '../components/KalendarDen.jsx';
import Kalendar3Dni from '../components/Kalendar3Dni.jsx';
import KalendarTyzden from '../components/KalendarTyzden.jsx';
import api from '../lib/api';

export default function Calendar() {

    const [tasks, setTasks] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [viewMode, setViewMode] = useState('month');
    const [baseDate, setBaseDate] = useState(new Date());

    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ title: '', description: '', priority: 2, deadline: '', category: '' });
    const [editing, setEditing] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [success, setSuccess] = useState(null);

    useEffect(() => { fetchTasks(); }, []);
    useEffect(() => { fetchCategories(); }, []);

    // normalize tasks to attach category object and ensure category is string for consistent rendering
    const normalizedTasks = useMemo(() => {
        if (!Array.isArray(tasks)) return [];
        return tasks.map(t => {
            const task = { ...t };
            // prefer any provided object-like category on the task
            const catObj = task.category && typeof task.category === 'object' ? task.category : null;
            // try to find matching category from categories list by id or name
            const match = (catObj && (categories.find(c => String(c.id) === String(catObj.id) || String(c.name) === String(catObj.name))))
                || categories.find(c => String(c.id) === String(task.category) || String(c.name) === String(task.category) || String(c.id) === String(task.category_id) || String(c.name) === String(task.category_id));
            if (match) task._categoryObj = match;
            // ensure primitive category is a string when present
            if (task.category !== undefined && task.category !== null && typeof task.category !== 'object') task.category = String(task.category);
            return task;
        });
    }, [tasks, categories]);


    async function fetchTasks() {
        setLoading(true); setError(null);
        try {
            const data = await api.get('/?c=task&a=index');
            const list = Array.isArray(data) ? data : data?.data ?? [];
            setTasks(list);
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

    function fromInputDateTimeToBackend(value) {
        if (!value) return '';
        const d = new Date(value);
        const pad = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
    }

    /* ========= CATEGORY RESOLVER ========= */
    function resolveCategory(catId) {
        if (!catId && catId !== 0) return '';
        // if it's an object, prefer its name
        let cat = catId;
        if (typeof cat === 'string' && (cat.trim().startsWith('{') || cat.trim().startsWith('['))) {
            try { cat = JSON.parse(cat); } catch (e) { /* ignore */ }
        }
        if (cat && typeof cat === 'object') {
            return cat.name ?? '';
        }
        // try to find by id or name
        const found = categories.find(c => String(c.id) === String(cat) || String(c.name) === String(cat));
        return found ? (found.name || '') : '';
    }

    /* ========= NAVIGATION HELPERS ========= */
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
    function openCreateForDate(day, month, year) {
        // month is 1-based here
        const hhmm = '09:00';
        const s = `${year}-${pad(month)}-${pad(day)}T${hhmm}`;
        setForm(f => ({ ...f, deadline: s }));
        setShowCreate(true);
    }
    function openCreateForDateFromDate(d) {
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const day = d.getDate();
        openCreateForDate(day, m, y);
    }

    /* ========= UI ACTIONS ========= */
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
            if (form.category) p.append('category', form.category);

            await api.request('/?c=task&a=create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: p.toString()
            });

            await fetchTasks();
            setShowCreate(false);
            setForm({ title: '', description: '', priority: 2, deadline: '', category: '' });
            setSuccess('Task created');
        } catch (err) {
            setError(err?.message || 'Create failed');
        } finally {
            setActionLoading(false);
        }
    }

    return (
        <div className="min-h-screen">

            <div className="flex justify-between p-6">
                <h1 className="text-2xl font-bold">Kalendár</h1>
                <div className="flex gap-2">
                    <button onClick={() => setViewMode('day')} className="px-3 py-2 bg-white border rounded">Day</button>
                    <button onClick={() => setViewMode('3days')} className="px-3 py-2 bg-white border rounded">3 Days</button>
                    <button onClick={() => setViewMode('week')} className="px-3 py-2 bg-white border rounded">Week</button>
                    <button onClick={() => setViewMode('month')} className="px-3 py-2 bg-white border rounded">Month</button>
                </div>
            </div>

            {error && <div className="px-6 text-red-600">{error}</div>}

            {/* Navigation controls */}
            <div className="px-6 flex items-center justify-between gap-2">
                <div className="flex gap-2">
                    <button className="px-3 py-2 bg-white border rounded" onClick={() => navigate(-1)}>Prev</button>
                    <button className="px-3 py-2 bg-white border rounded" onClick={setToToday}>Today</button>
                    <button className="px-3 py-2 bg-white border rounded" onClick={() => navigate(1)}>Next</button>
                </div>
                <div className="text-sm text-gray-600">Viewing: {viewMode} • {baseDate.toLocaleDateString()}</div>
            </div>

            <div className="p-6">
                {viewMode === 'month' && (
                    <KalendarMesiac
                     rows={5}
                     cols={7}
                     month={baseDate.getMonth()+1}
                     year={baseDate.getFullYear()}
                     tasks={normalizedTasks}
                     categories={categories}
                     resolveCategory={resolveCategory}
                     loading={loading}
                     onEventClick={setEditing}
                     onDayClick={(day, month, year) => openCreateForDate(day, month, year)}
                 />
                )}

                {viewMode === 'week' && (
                    <KalendarTyzden
                        startDate={baseDate}
                        tasks={normalizedTasks}
                        categories={categories}
                        resolveCategory={resolveCategory}
                        loading={loading}
                        onEventClick={setEditing}
                        onDayClick={(d) => openCreateForDateFromDate(d)}
                    />
                )}

                {viewMode === '3days' && (
                    <Kalendar3Dni
                        startDate={baseDate}
                        tasks={normalizedTasks}
                        categories={categories}
                        resolveCategory={resolveCategory}
                        loading={loading}
                        onEventClick={setEditing}
                        onDayClick={(d) => openCreateForDateFromDate(d)}
                    />
                )}

                {viewMode === 'day' && (
                    <KalendarDen
                        date={baseDate}
                        tasks={normalizedTasks}
                        categories={categories}
                        resolveCategory={resolveCategory}
                        loading={loading}
                        onEventClick={setEditing}
                        onDayClick={(d) => openCreateForDateFromDate(d)}
                    />
                )}
            </div>

            {/* CREATE MODAL */}
            {showCreate && (
                <form onSubmit={createTask} className="fixed inset-0 bg-black/40 flex items-center justify-center">
                    <div className="bg-white p-4 rounded w-full max-w-2xl">
                        {error && <div className="mb-2 text-sm text-red-600">{error}</div>}
                        {success && <div className="mb-2 text-sm text-green-600">{success}</div>}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium">Title</label>
                                <input className="mt-1 block w-full border p-2 rounded" placeholder="Title" value={form.title} onChange={e => updateForm('title', e.target.value)} />

                                <label className="block text-sm font-medium mt-3">Description</label>
                                <textarea className="mt-1 block w-full border p-2 rounded" value={form.description} onChange={e => updateForm('description', e.target.value)} />
                            </div>

                            <div>
                                <div className="text-sm text-gray-700 py-2">Create task</div>

                                <label className="block text-sm font-medium mt-2">Priority</label>
                                <input type="number" min="1" max="5" className="mt-1 block w-32 border p-2 rounded" value={form.priority} onChange={(e) => updateForm('priority', Number(e.target.value))} />

                                <label className="block text-sm font-medium mt-2">Category</label>
                                <select className="mt-1 block w-full border p-2 rounded" value={form.category} onChange={e => updateForm('category', e.target.value)}>
                                    <option value="">—</option>
                                    {categories.map(c => <option key={c.id ?? c.name} value={c.id ?? c.name}>{c.name ?? String(c)}</option>)}
                                </select>

                                <label className="block text-sm font-medium mt-2">Deadline</label>
                                <input type="datetime-local" className="mt-1 block w-full border p-2 rounded" value={form.deadline} onChange={e => updateForm('deadline', e.target.value)} />

                                <div className="mt-4 flex gap-2">
                                    <button type="submit" disabled={actionLoading} className="px-4 py-2 bg-green-600 text-white rounded">{actionLoading ? 'Creating...' : 'Create'}</button>
                                    <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                                </div>
                             </div>
                         </div>
                     </div>
                 </form>
             )}

            {/* EDIT MODAL */}
            {editing && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
                    <div className="bg-white p-4 rounded w-full max-w-md">
                        <div className="text-lg font-semibold mb-2">{editing.title}</div>
                        <div className="text-sm text-gray-500 mb-2">{editing.deadline ? new Date(String(editing.deadline).replace(' ', 'T')).toLocaleString() : ''}</div>
                        <div className="mb-2">{resolveCategory(editing.category)}</div>
                        {editing.description ? <div className="mb-4 text-gray-700">{editing.description}</div> : null}
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setEditing(null)} className="bg-gray-200 px-4 py-2 rounded">Close</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}