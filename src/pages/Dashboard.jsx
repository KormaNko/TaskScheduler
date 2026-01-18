import React, { useEffect, useState } from 'react';
import TaskCard from '../components/TaskCard';
import NewTaskButton from '../components/NewTaskButton';
import api from '../lib/api';

// Vite env (like your UsersPage)
const API_BASE = (import.meta.env.VITE_API_BASE || 'http://localhost').replace(/\/$/, '');

const STATUS_OPTIONS = [
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In progress' },
    { value: 'completed', label: 'Completed' },
];

// CATEGORY_OPTIONS come from the backend user categories. We will fetch them on mount.

export default function Dashboard() {
    const [tasks, setTasks] = useState([]);
    const [categories, setCategories] = useState([]);
    const [showDebug, setShowDebug] = useState(false);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ title: '', description: '', priority: 2, deadline: '', category: '' });
    const [editing, setEditing] = useState(null);

    useEffect(() => { fetchTasks(); }, []);

    // fetch categories on mount
    useEffect(() => { fetchCategories(); }, []);

    async function fetchTasks() {
        setLoading(true); setError(null); setSuccess(null);
        try {
            const data = await api.get('/?c=task&a=index');
            console.debug('fetchTasks: raw response', data);
            const list = Array.isArray(data) ? data : data?.data ?? data;
            console.debug('fetchTasks: normalized list', list);
            // Normalize tasks: ensure category is a primitive id or name when possible
            const normalize = (t) => {
                const task = { ...t };
                // if category is a JSON string, parse it
                try {
                    if (typeof task.category === 'string' && (task.category.trim().startsWith('{') || task.category.trim().startsWith('['))) {
                        task.category = JSON.parse(task.category);
                    }
                } catch (e) { /* ignore */ }

                // if category is object, prefer id or name
                if (task.category && typeof task.category === 'object') {
                    task._categoryObj = task.category;
                    task.category = task.category.id ?? task.category.name ?? task.category;
                }

                // if no category present, try alternate fields
                if (!task.category || task.category === '') {
                    if (task.category_id) task.category = task.category_id;
                    else if (task.cat) task.category = task.cat;
                    else if (task.cat_id) task.category = task.cat_id;
                }

                // coerce primitive category values to string so select controls match option values
                if (task.category !== undefined && task.category !== null && typeof task.category !== 'object') {
                    task.category = String(task.category);
                }

                return task;

            };

            const finalList = Array.isArray(list) ? list.map(normalize) : [];
            setTasks(finalList);
         } catch (e) {
             console.error('fetchTasks', e);
             setError(e.message || 'Failed to load tasks');
         } finally { setLoading(false); }
    }

    async function fetchCategories() {
        try {
            const data = await api.get('/?c=category&a=index');
            console.debug('fetchCategories: raw response', data);
            const list = Array.isArray(data) ? data : data?.data ?? [];
            console.debug('fetchCategories: normalized list', list);
            setCategories(Array.isArray(list) ? list : []);
        } catch (e) {
            console.error('fetchCategories', e);
            // non-fatal: categories might be empty
            setCategories([]);
        }
    }

    function updateForm(k, v) { setForm((s) => ({ ...s, [k]: v })); }

    function toInputDateTimeBackend(dateString) {
        if (!dateString) return '';
        const d = new Date(String(dateString).replace(' ', 'T'));
        if (isNaN(d.getTime())) return '';
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    function fromInputDateTimeToBackend(value) {
        if (!value) return '';
        const d = new Date(value);
        if (isNaN(d.getTime())) return '';
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }

    async function createTask(e) {
        e?.preventDefault?.();
        setError(null); setSuccess(null);
        if (!form.title?.trim()) { setError('Title is required'); return; }
        setActionLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('title', form.title);
            params.append('description', form.description || '');
            params.append('priority', String(form.priority ?? 2));
            if (form.deadline) params.append('deadline', fromInputDateTimeToBackend(form.deadline));
            if (form.category) {
                // send both 'category' and 'category_id' when category is numeric to support different backend expectations
                const catStr = String(form.category);
                params.append('category', form.category);
                if (/^\d+$/.test(catStr)) params.append('category_id', catStr);
            }

            console.debug('createTask: sending params', Object.fromEntries(params.entries()));

            await api.request('/?c=task&a=create', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString() });
            await fetchTasks();
            setShowCreate(false);
            setForm({ title: '', description: '', priority: 2, deadline: '', category: '' });
            setSuccess('Task created');
        } catch (err) {
            console.error('createTask', err);
            setError(err.message || 'Create failed');
        } finally { setActionLoading(false); }
    }

    async function handleDelete(id) {
        if (!confirm('Delete task?')) return;
        setError(null); setActionLoading(true);
        try {
            const p = new URLSearchParams(); p.append('id', String(id));
            await api.request('/?c=task&a=delete', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: p.toString() });
            setTasks((prev) => prev.filter((t) => String(t.id) !== String(id)));
            setSuccess('Task deleted');
        } catch (err) {
            console.error('delete', err);
            setError(err.message || 'Delete failed');
        } finally { setActionLoading(false); }
    }

    function openEdit(task) { setEditing({ ...task, deadline: task?.deadline ? toInputDateTimeBackend(task.deadline) : '', category: task?.category !== undefined && task?.category !== null ? String(task.category) : '' }); }

    async function saveEdit(e) {
        e?.preventDefault?.();
        if (!editing) return;
        setError(null); setActionLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('id', String(editing.id));
            params.append('title', editing.title ?? '');
            params.append('description', editing.description ?? '');
            if (editing.status !== undefined && editing.status !== null) params.append('status', editing.status);
            if (editing.priority !== undefined && editing.priority !== null) params.append('priority', String(editing.priority));
            params.append('deadline', editing.deadline ? fromInputDateTimeToBackend(editing.deadline) : '');
            if (editing.category !== undefined && editing.category !== null) {
                const catStr = String(editing.category);
                params.append('category', editing.category);
                if (/^\d+$/.test(catStr)) params.append('category_id', catStr);
            }

            await api.request('/?c=task&a=update', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString() });
            await fetchTasks();
            setEditing(null);
            setSuccess('Task updated');
        } catch (err) {
            console.error('saveEdit', err);
            setError(err.message || 'Update failed');
        } finally { setActionLoading(false); }
    }

    // Clear in-memory tasks immediately when the app dispatches a logout event
    React.useEffect(() => {
        function onLoggedOut() {
            setTasks([]);
            setLoading(false);
            setActionLoading(false);
            setError(null);
            setSuccess(null);
        }
        window.addEventListener('app:logged-out', onLoggedOut);
        return () => window.removeEventListener('app:logged-out', onLoggedOut);
    }, []);

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold">Tasks Dashboard</h1>
                <div className="flex items-center gap-2">
                    <NewTaskButton onOpen={() => setShowCreate(true)} />
                    <button type="button" onClick={() => setShowDebug(s => !s)} className="px-3 py-2 bg-gray-100 border rounded">{showDebug ? 'Hide debug' : 'Show debug'}</button>
                </div>
            </div>

            {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
            {success && <div className="mb-4 text-sm text-green-600">{success}</div>}

            {showDebug && (
                <div className="mb-4 p-3 bg-gray-50 border rounded text-sm overflow-auto">
                    <div className="mb-2 font-semibold">Categories (raw)</div>
                    <pre className="text-xs mb-2">{JSON.stringify(categories, null, 2)}</pre>
                    <div className="mb-2 font-semibold">Tasks (id + raw category)</div>
                    <pre className="text-xs">{JSON.stringify(tasks.map(t => ({ id: t.id, category: t.category })), null, 2)}</pre>
                </div>
            )}

            {showCreate && (
                <form onSubmit={createTask} className="mb-6 bg-white p-4 rounded shadow">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium">Title</label>
                            <input className="mt-1 block w-full border p-2 rounded" value={form.title} onChange={(e) => updateForm('title', e.target.value)} />
                            <label className="block text-sm font-medium mt-2">Description</label>
                            <textarea className="mt-1 block w-full border p-2 rounded" value={form.description} onChange={(e) => updateForm('description', e.target.value)} />
                        </div>

                        <div>
                            <div className="text-sm text-gray-700 py-2">Status: <strong>Pending</strong></div>

                            <label className="block text-sm font-medium mt-2">Priority</label>
                            <input type="number" min="1" max="5" className="mt-1 block w-32 border p-2 rounded" value={form.priority} onChange={(e) => updateForm('priority', Number(e.target.value))} />

                            <label className="block text-sm font-medium mt-2">Category</label>
                            <select className="mt-1 block w-full border p-2 rounded" value={form.category} onChange={(e) => updateForm('category', e.target.value)}>
                                <option value="">—</option>
                                {categories.map((c) => (
                                    // prefer id if available, otherwise use name; ensure value is a string
                                    <option key={c.id ?? c.name} value={String(c.id ?? c.name)}>{c.name ?? String(c)}</option>
                                ))}
                            </select>

                            <label className="block text-sm font-medium mt-2">Deadline</label>
                            <input type="datetime-local" className="mt-1 block w-full border p-2 rounded" value={form.deadline} onChange={(e) => updateForm('deadline', e.target.value)} />

                            <div className="mt-4 flex gap-2">
                                <button type="submit" disabled={actionLoading} className="px-4 py-2 bg-green-600 text-white rounded">{actionLoading ? 'Creating...' : 'Create'}</button>
                                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                            </div>
                        </div>
                    </div>
                </form>
            )}

            <section className="bg-white rounded shadow">
                <table className="w-full table-auto">
                    <thead className="bg-gray-100">
                    <tr>
                        <th className="p-3 text-left">ID</th>
                        <th className="p-3 text-left">Title</th>
                        <th className="p-3 text-left">Status</th>
                        <th className="p-3 text-left">Prio</th>
                        <th className="p-3 text-left">Category</th>
                        <th className="p-3 text-left">Deadline</th>
                        <th className="p-3 text-left">Created</th>
                        <th className="p-3 text-left">Updated</th>
                        <th className="p-3 text-left">Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {loading ? (
                        <tr><td colSpan={9} className="p-4">Loading...</td></tr>
                    ) : tasks.length === 0 ? (
                        <tr><td colSpan={9} className="p-4">No tasks</td></tr>
                    ) : tasks.length === 0 ? (
                        <tr><td colSpan={9} className="p-4">No tasks</td></tr>
                    ) : tasks.map((t) => <TaskCard key={t.id} task={t} categories={categories} onEdit={openEdit} onDelete={handleDelete} />)}
                     </tbody>
                 </table>
             </section>

            {editing && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
                    <div className="bg-white p-4 rounded w-full max-w-3xl">
                        <h3 className="text-lg font-semibold mb-2">Edit Task #{editing.id}</h3>
                        <form onSubmit={saveEdit} className="grid gap-3">
                            <input className="border p-2" value={editing.title ?? ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
                            <textarea className="border p-2" value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
                            <div className="flex gap-2">
                                <select value={editing.status ?? ''} onChange={(e) => setEditing({ ...editing, status: e.target.value })} className="border p-2">
                                    {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                </select>
                                <input type="number" min="1" max="5" value={editing.priority ?? 2} onChange={(e) => setEditing({ ...editing, priority: Number(e.target.value) })} className="border p-2 w-28" />
                                <select value={editing.category ?? ''} onChange={(e) => setEditing({ ...editing, category: e.target.value })} className="border p-2">
                                    <option value="">—</option>
                                    {categories.map(c => <option key={c.id ?? c.name} value={String(c.id ?? c.name)}>{c.name ?? String(c)}</option>)}
                                </select>
                                <input type="datetime-local" value={editing.deadline ?? ''} onChange={(e) => setEditing({ ...editing, deadline: e.target.value })} className="border p-2" />
                            </div>

                            <div className="flex gap-2">
                                <button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded">Save</button>
                                <button type="button" onClick={() => setEditing(null)} className="px-3 py-2 bg-gray-200 rounded">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
