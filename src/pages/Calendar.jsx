import React, { useEffect, useState } from 'react';
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

    useEffect(() => { fetchTasks(); }, []);
    useEffect(() => { fetchCategories(); }, []);

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
        if (!catId) return '';
        const found = categories.find(c => String(c.id) === String(catId));
        return found ? found.name : '';
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
        try {
            const p = new URLSearchParams();
            p.append('title', form.title);
            p.append('description', form.description || '');
            p.append('priority', form.priority);
            p.append('deadline', fromInputDateTimeToBackend(form.deadline));
            p.append('category', form.category);

            await api.request('/?c=task&a=create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: p.toString()
            });

            await fetchTasks();
            setShowCreate(false);
            setForm({ title: '', description: '', priority: 2, deadline: '', category: '' });
        } catch {
            setError('Create failed');
        }
    }

    return (
        <div className="min-h-screen">

            <div className="flex justify-between p-6">
                <h1 className="text-2xl font-bold">Kalendár</h1>
                <div className="flex gap-2">
                    <button onClick={() => setViewMode('day')} className="btn">Day</button>
                    <button onClick={() => setViewMode('3days')} className="btn">3 Days</button>
                    <button onClick={() => setViewMode('week')} className="btn">Week</button>
                    <button onClick={() => setViewMode('month')} className="btn">Month</button>
                </div>
            </div>

            {error && <div className="px-6 text-red-600">{error}</div>}

            {/* Navigation controls */}
            <div className="px-6 flex items-center justify-between gap-2">
                <div className="flex gap-2">
                    <button className="btn" onClick={() => navigate(-1)}>Prev</button>
                    <button className="btn" onClick={setToToday}>Today</button>
                    <button className="btn" onClick={() => navigate(1)}>Next</button>
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
                        tasks={tasks}
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
                        tasks={tasks}
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
                        tasks={tasks}
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
                        tasks={tasks}
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
                    <div className="bg-white p-4 rounded w-full max-w-xl">
                        <input className="border p-2 w-full mb-2" placeholder="Title"
                               value={form.title} onChange={e => updateForm('title', e.target.value)} />

                        <select className="border p-2 w-full mb-2"
                                value={form.category}
                                onChange={e => updateForm('category', e.target.value)}>
                            <option value="">— category —</option>
                            {categories.map(c =>
                                <option key={c.id} value={c.id}>{c.name}</option>
                            )}
                        </select>

                        <input type="datetime-local" className="border p-2 w-full mb-2"
                               value={form.deadline}
                               onChange={e => updateForm('deadline', e.target.value)} />

                        <div className="flex gap-2">
                            <button className="bg-green-600 text-white px-4 py-2 rounded">Create</button>
                            <button type="button" onClick={() => setShowCreate(false)}
                                    className="bg-gray-200 px-4 py-2 rounded">Cancel</button>
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