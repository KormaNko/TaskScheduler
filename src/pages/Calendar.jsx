import React, { useEffect, useState } from 'react';
import KalendarMesiac   from '../components/KalendarMesaic.jsx';

// Vite env
const API_BASE = (import.meta.env.VITE_API_BASE || 'http://localhost').replace(/\/$/, '');

export default function Calendar() {

    // tasks state and UI flags
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

     const [showCreate, setShowCreate] = useState(false);
     const [form, setForm] = useState({ title: '', description: '', priority: 2, deadline: '', category: '' });
     const [editing, setEditing] = useState(null);

    // small API helper (same idea as Dashboard)
    async function api(path, opts = {}) {
        const res = await fetch(`${API_BASE}${path}`, {
            credentials: 'include',
            headers: { Accept: 'application/json', ...(opts.headers || {}) },
            ...opts,
        });
        if (!res.ok) {
            // try json message, otherwise try text
            let data = null;
            try { data = await res.json(); } catch (e) { /* ignore */ }
            if (data) throw new Error(data?.message || data?.error || `Request failed (${res.status})`);
            const txt = await res.text().catch(() => null);
            throw new Error(txt ? `Server returned HTML. Excerpt: ${txt.slice(0,200)}` : `Request failed (${res.status})`);
        }
        try { return await res.json(); } catch { return null; }
    }

    useEffect(() => { fetchTasks(); }, []);

    async function fetchTasks() {
        setLoading(true); setError(null); setSuccess(null);
        try {
            const data = await api('/?c=task&a=index', { method: 'GET' });
            const list = Array.isArray(data) ? data : data?.data ?? data;
            setTasks(Array.isArray(list) ? list : []);
        } catch (e) {
            console.error('fetchTasks', e);
            setError(e.message || 'Failed to load tasks');
        } finally { setLoading(false); }
    }

    function updateForm(k, v) { setForm((s) => ({ ...s, [k]: v })); }

    function fromInputDateTimeToBackend(value) {
        if (!value) return '';
        const d = new Date(value);
        if (isNaN(d.getTime())) return '';
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }

    // when user clicks a calendar day: prefill create form deadline and open modal
    function handleDayClick(day, month, year) {
        if (!day || !month || !year) return;
        const pad = (n) => String(n).padStart(2, '0');
        const yyyy = String(year);
        const mm = pad(month);
        const dd = pad(day);
        // default time at start of day (00:00). datetime-local expects 'YYYY-MM-DDTHH:mm'
        const inputVal = `${yyyy}-${mm}-${dd}T00:00`;
        setForm((s) => ({ ...s, deadline: inputVal }));
        setShowCreate(true);
    }

    async function createTask(e) {
        e?.preventDefault?.();
        setError(null); setSuccess(null);
        if (!form.title?.trim()) { setError('Title is required'); return; }
        try {
            const params = new URLSearchParams();
            params.append('title', form.title);
            params.append('description', form.description || '');
            params.append('priority', String(form.priority ?? 2));
            if (form.deadline) params.append('deadline', fromInputDateTimeToBackend(form.deadline));
            if (form.category) params.append('category', form.category);

            await api('/?c=task&a=create', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString() });
            await fetchTasks();
            setShowCreate(false);
            setForm({ title: '', description: '', priority: 2, deadline: '', category: '' });
            setSuccess('Task created');
        } catch (err) {
            console.error('createTask', err);
            setError(err.message || 'Create failed');
        }
    }

    async function handleDelete(id) {
        if (!confirm('Delete task?')) return;
        setError(null);
        try {
            const p = new URLSearchParams(); p.append('id', String(id));
            await api('/?c=task&a=delete', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: p.toString() });
            setTasks((prev) => prev.filter((t) => String(t.id) !== String(id)));
            setSuccess('Task deleted');
        } catch (err) {
            console.error('delete', err);
            setError(err.message || 'Delete failed');
        }
    }

    function openEdit(task) { setEditing({ ...task, deadline: task?.deadline ? String(task.deadline).replace(' ', 'T') : '' }); }

    async function saveEdit(e) {
        e?.preventDefault?.(); if (!editing) return;
        setError(null);
        try {
            const params = new URLSearchParams();
            params.append('id', String(editing.id));
            params.append('title', editing.title ?? '');
            params.append('description', editing.description ?? '');
            if (editing.status !== undefined && editing.status !== null) params.append('status', editing.status);
            if (editing.priority !== undefined && editing.priority !== null) params.append('priority', String(editing.priority));
            params.append('deadline', editing.deadline ? fromInputDateTimeToBackend(editing.deadline) : '');
            if (editing.category !== undefined && editing.category !== null) params.append('category', editing.category);

            await api('/?c=task&a=update', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString() });
            await fetchTasks();
            setEditing(null);
            setSuccess('Task updated');
        } catch (err) {
            console.error('saveEdit', err);
            setError(err.message || 'Update failed');
        }
    }

    return (
        <div className="min-h-screen">
            <div className="flex items-center justify-between p-6">
                <h1 className = "left-3 top-3 text-2xl font-bold">Kalendar</h1>
            </div>

            {error && <div className="mb-4 text-sm text-red-600 px-6">{error}</div>}
            {success && <div className="mb-4 text-sm text-green-600 px-6">{success}</div>}
            {loading && <div className="mb-4 text-sm text-gray-700 px-6">Loading tasks...</div>}

            <div className="p-6 mt-6">
                <KalendarMesiac rows={5} cols={7} tasks={tasks} onEventClick={openEdit} loading={loading} onDayClick={handleDayClick} />
             </div>

            {showCreate && (
                <form onSubmit={createTask} className="fixed inset-0 bg-black/40 flex items-center justify-center">
                    <div className="bg-white p-4 rounded w-full max-w-2xl">
                        <h3 className="text-lg font-semibold mb-2">Create Task</h3>
                        <div className="grid grid-cols-1 gap-3">
                            <input className="border p-2" placeholder="Title" value={form.title} onChange={(e) => updateForm('title', e.target.value)} />
                            <textarea className="border p-2" placeholder="Description" value={form.description} onChange={(e) => updateForm('description', e.target.value)} />
                            <div className="flex gap-2">
                                <input type="number" min="1" max="5" value={form.priority} onChange={(e) => updateForm('priority', Number(e.target.value))} className="border p-2 w-28" />
                                <input type="datetime-local" value={form.deadline} onChange={(e) => updateForm('deadline', e.target.value)} className="border p-2" />
                                <select value={form.category} onChange={(e) => updateForm('category', e.target.value)} className="border p-2">
                                    <option value="">—</option>
                                    <option value="school">School</option>
                                    <option value="work">Work</option>
                                    <option value="free_time">Free time</option>
                                    <option value="personal">Personal</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            <div className="flex gap-2 mt-2">
                                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded">Create</button>
                                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                            </div>
                        </div>
                    </div>
                </form>
            )}

            {editing && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
                    <div className="bg-white p-4 rounded w-full max-w-3xl">
                        <h3 className="text-lg font-semibold mb-2">Edit Task #{editing.id}</h3>
                        <form onSubmit={saveEdit} className="grid gap-3">
                            <input className="border p-2" value={editing.title ?? ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
                            <textarea className="border p-2" value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
                            <div className="flex gap-2">
                                <select value={editing.status ?? ''} onChange={(e) => setEditing({ ...editing, status: e.target.value })} className="border p-2">
                                    <option value="pending">Pending</option>
                                    <option value="in_progress">In progress</option>
                                    <option value="completed">Completed</option>
                                </select>
                                <input type="number" min="1" max="5" value={editing.priority ?? 2} onChange={(e) => setEditing({ ...editing, priority: Number(e.target.value) })} className="border p-2 w-28" />
                                <input type="datetime-local" value={editing.deadline ?? ''} onChange={(e) => setEditing({ ...editing, deadline: e.target.value })} className="border p-2" />
                            </div>

                            <div className="flex gap-2">
                                <button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded">Save</button>
                                <button type="button" onClick={() => { setEditing(null); }} className="px-3 py-2 bg-gray-200 rounded">Cancel</button>
                                <button type="button" onClick={() => { handleDelete(editing.id); setEditing(null); }} className="px-3 py-2 bg-red-600 text-white rounded">Delete</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
