import React, { useEffect, useState, useMemo, useRef, useLayoutEffect } from 'react';
import TaskCard from '../components/TaskCard';
import NewTaskButton from '../components/NewTaskButton';
import api from '../lib/api';
import { Menu } from 'lucide-react';
import { useOptions } from '../contexts/OptionsContext.jsx';

const STATUS_OPTIONS = [
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In progress' },
    { value: 'completed', label: 'Completed' },
];

// CATEGORY_OPTIONS come from the backend user categories. We will fetch them on mount.

export default function Dashboard() {
    const tableWrapperRef = useRef(null);
    const tableRef = useRef(null);
    const modalRef = useRef(null);
    const formRef = useRef(null);
    const [tasks, setTasks] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ title: '', description: '', priority: 2, deadline: '', category_id: '' });
    const [editing, setEditing] = useState(null);
    const [search, setSearch] = useState('');
    const [sortOrder, setSortOrder] = useState('none'); // 'none' | 'priority_asc' | 'priority_desc' | 'title_asc' | 'title_desc' | 'time_asc' | 'time_desc'
    const [viewMode, setViewMode] = useState('detailed'); // 'simple' | 'detailed'
    const [statusFilter, setStatusFilter] = useState(''); // '' | 'pending' | 'in_progress' | 'completed'
    const [isMobile, setIsMobile] = useState(false);
    const [detailTask, setDetailTask] = useState(null);
    const [editFullScreen, setEditFullScreen] = useState(false);

    const { opts, t } = useOptions();

    // Map option sort names to dashboard internal sort names
    function mapOptionSortToDashboard(v) {
        if (!v) return 'none';
        switch (v) {
            case 'deadline_asc': return 'time_asc';
            case 'deadline_desc': return 'time_desc';
            default: return v; // title_asc, title_desc, priority_asc, priority_desc, none
        }
    }

    // When options change, adopt them into the dashboard's local filter/sort (non-destructive)
    //AI
    useEffect(() => {
        if (!opts) return;
        try {
            const tf = opts.taskFilter ?? opts.task_filter ?? 'all';
            setStatusFilter(tf === 'all' ? '' : tf);
            const ts = opts.taskSort ?? opts.task_sort ?? 'none';
            setSortOrder(mapOptionSortToDashboard(ts));
        } catch (e) { /* ignore */ }
    }, [opts]);

    // On initial mount, set simple view for small screens so mobile shows stacked layout
    //AI
    useEffect(() => {
        try {
            if (typeof window !== 'undefined' && window.innerWidth < 768) {
                setViewMode('simple');
            }
        } catch (e) { /* ignore */ }
    }, []);
    //AI
    // track resize and enforce simple mode on small screens; hide toggle there
    useEffect(() => {
        function update() {
            const mobile = typeof window !== 'undefined' && window.innerWidth < 768;
            setIsMobile(mobile);
            if (mobile) setViewMode('simple');
            // check overflow when resizing
            checkOverflow();
        }
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);

    // check if table overflows its wrapper (used to auto-switch to simple mode on narrow spaces)
    //AI
    function checkOverflow() {
        try {
            const wrap = tableWrapperRef.current;
            const table = tableRef.current;
            if (!wrap || !table) return false;
            // horizontal overflow: treat even slight overflow as overflow (use 92% tolerance)
            const horizOverflow = table.scrollWidth > wrap.clientWidth * 0.8; // more aggressive: switch earlier
            // vertical overflow: check if table height exceeds available viewport space below the wrapper top
            const wrapTop = wrap.getBoundingClientRect().top;
            const availableHeight = (typeof window !== 'undefined') ? (window.innerHeight - wrapTop - 120) : Infinity; // 120px buffer for headers/controls
            const vertOverflow = table.scrollHeight > availableHeight;

            const overflow = horizOverflow || vertOverflow;
            if (overflow && viewMode !== 'simple') {
                setViewMode('simple');
                return true;
            }
            return overflow;
        } catch (e) {
            return false;
        }
    }

    // filtered tasks by search (id or title)
    const filteredTasks = useMemo(() => {
        const q = String(search || '').trim().toLowerCase();
        return (tasks || []).filter(t => {
            if (!t) return false;
            // filter by status if set
            if (statusFilter && String(t.status || '') !== String(statusFilter)) return false;
            if (!q) return true;
            const idStr = String(t.id ?? '');
            const title = String(t.title ?? '').toLowerCase();
            return idStr.includes(q) || title.includes(q);
        });
    }, [tasks, search, statusFilter]);

    // apply sorting to the filtered tasks (priority, title, remaining time)
    //AI
    const displayedTasks = useMemo(() => {
        const arr = Array.isArray(filteredTasks) ? filteredTasks.slice() : [];

        const parseDeadlineTs = (t) => {
            if (!t) return Number.POSITIVE_INFINITY;
            const val = (t.deadline ?? t.deadline_at ?? t.deadline_date ?? t) || '';
            if (!val) return Number.POSITIVE_INFINITY;
            // try to handle common formats: "YYYY-MM-DD HH:mm:ss" or ISO
            const s = String(val).trim().replace(' ', 'T');
            const ms = Date.parse(s);
            return isNaN(ms) ? Number.POSITIVE_INFINITY : ms;
        };

        switch (sortOrder) {
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
            case 'time_asc': // soonest deadline first (smallest timestamp)
                arr.sort((a, b) => parseDeadlineTs(a) - parseDeadlineTs(b));
                break;
            case 'time_desc': // latest/no-deadline first
                arr.sort((a, b) => parseDeadlineTs(b) - parseDeadlineTs(a));
                break;
            default:
                // none: preserve original order
                break;
        }
        return arr;
    }, [filteredTasks, sortOrder]);

    // run an immediate check after rendering when the displayed tasks change
    useLayoutEffect(() => {
        checkOverflow();
        // don't try to switch back to detailed automatically here — user can toggle on larger screens
    }, [displayedTasks]);

    useEffect(() => { fetchTasks(); }, []);

    // fetch categories on mount
    useEffect(() => { fetchCategories(); }, []);

    async function fetchTasks() {
        setLoading(true); setError(null); setSuccess(null);
        try {
            const data = await api.get('/?c=task&a=index');
            const list = Array.isArray(data) ? data : data?.data ?? data;
            // Backend now guarantees `task.category` is either an object or null.
            // Store tasks as-is.
            setTasks(Array.isArray(list) ? list : []);
         } catch (e) {
             console.error('fetchTasks', e);
             setError(e.message || 'Failed to load tasks');
         } finally { setLoading(false); }
    }

    async function fetchCategories() {
        try {
            const data = await api.get('/?c=category&a=index');
            const list = Array.isArray(data) ? data : data?.data ?? [];
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
    //AI
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
            // send only category_id per new contract
            if (form.category_id !== undefined && form.category_id !== null && form.category_id !== '') params.append('category_id', String(form.category_id));

            await api.request('/?c=task&a=create', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString() });
            await fetchTasks();
            setShowCreate(false);
            setForm({ title: '', description: '', priority: 2, deadline: '', category_id: '' });
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
    //AI
    async function changeStatus(id, newStatus) {
        if (!id) return;
        setError(null);
        setActionLoading(true);
        // optimistic update: update local state first so UI responds immediately
        const prevTasks = tasks;
        setTasks((prev) => prev.map((t) => (String(t.id) === String(id) ? { ...t, status: String(newStatus) } : t)));
        try {
            const params = new URLSearchParams();
            params.append('id', String(id));
            params.append('status', String(newStatus));
            await api.request('/?c=task&a=update', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString() });
            setSuccess('Status updated');
            // do not refetch entire list to avoid visual "refresh"; single-item update is enough
        } catch (err) {
            console.error('changeStatus', err);
            // revert optimistic update on error
            setTasks(prevTasks);
            setError(err.message || 'Failed to update status');
        } finally { setActionLoading(false); }
    }

    function openEdit(task) {
        const category_id = task?.category?.id ?? '';
        setEditing({ ...task, deadline: task?.deadline ? toInputDateTimeBackend(task.deadline) : '', category_id });
    }

    // When editing opens, measure the form height and decide whether to show full-screen edit
    //AI
    useEffect(() => {
        if (!editing) {
            // restore body overflow when modal closed
            try { document.body.style.overflow = ''; document.documentElement.style.overflowX = ''; } catch (e) {}
            setEditFullScreen(false);
            return;
        }

        // prevent horizontal page scroll while modal is open
        try { document.documentElement.style.overflowX = 'hidden'; document.body.style.overflow = 'hidden'; } catch (e) {}

        // measurement helper (also used on resize)
        const measure = () => {
            try {
                const formEl = formRef.current;
                const viewportH = (typeof window !== 'undefined') ? window.innerHeight : 800;
                const estimatedHeight = formEl ? formEl.scrollHeight + 120 /* header+footer buffer */ : 0;
                setEditFullScreen(estimatedHeight > viewportH);
            } catch (e) { console.error(e); }
        };

        // measure after next paint
        const id = setTimeout(measure, 30);

        // re-measure on resize while editing is open so we adapt dynamically
        //AI
        function onResize() { measure(); }
        window.addEventListener('resize', onResize);
        window.addEventListener('orientationchange', onResize);

        return () => {
            clearTimeout(id);
            window.removeEventListener('resize', onResize);
            window.removeEventListener('orientationchange', onResize);
            // restore body/document overflow when modal closes or effect cleans up
            try { document.body.style.overflow = ''; document.documentElement.style.overflowX = ''; } catch (e) {}
        };
    }, [editing]);
    //AI
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
            // send only category_id
            if (editing.category_id !== undefined && editing.category_id !== null && editing.category_id !== '') params.append('category_id', String(editing.category_id));

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

    // helper: toggle sidebar on mobile by dispatching the event Sidebar listens for
    function toggleMobileSidebar() {
        try {
            window.dispatchEvent(new Event('app:toggle-mobile-sidebar'));
        } catch (e) { /* ignore */ }
    }

    function openDetails(task) {
        setDetailTask(task);
    }

    function closeDetails() {
        setDetailTask(null);
    }
    //AI
    return (
        <div className="p-6">
            <div className="flex items-start justify-between mb-4 flex-col md:flex-row gap-4 flex-wrap">
                <div className="flex items-center gap-2 w-full md:w-auto min-w-0">
                    {/* Mobile menu button - only visible on small screens */}
                    <button type="button" onClick={toggleMobileSidebar} className="p-2 rounded border md:hidden mr-2" title={t ? t('dashboard') : 'Open menu'}>
                        <Menu size={18} />
                    </button>

                    <h1 className="text-2xl font-bold">{t ? t('tasksDashboard') : 'Tasks Dashboard'}</h1>
                </div>

                <div className="flex flex-col md:flex-row md:items-center gap-2 w-full flex-wrap">
                    <div className="flex flex-col md:flex-row md:items-center gap-2 flex-1">
                        {/* First row: search and sort (keeps them side-by-side on md+) */}
                        <div className="flex items-center gap-2 w-full md:w-auto min-w-0">
                            <input
                                type="text"
                                className="px-4 py-2 border border-gray-200 rounded-full w-full md:w-64 min-w-0 shadow-sm bg-white"
                                placeholder={t ? t('searchPlaceholder') : 'Search by title or ID'}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            <select className="px-3 py-2 border border-gray-200 rounded-full bg-white shadow-sm w-full md:w-auto min-w-0" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} title="Sort">
                                <option value="none">Sort: none</option>
                                <optgroup label="Priority">
                                    <option value="priority_asc">Priority ↑</option>
                                    <option value="priority_desc">Priority ↓</option>
                                </optgroup>
                                <optgroup label="Title">
                                    <option value="title_asc">Title A → Z</option>
                                    <option value="title_desc">Title Z → A</option>
                                </optgroup>
                                <optgroup label="Remaining time">
                                    <option value="time_asc">Deadline: soonest first</option>
                                    <option value="time_desc">Deadline: latest first</option>
                                </optgroup>
                            </select>
                        </div>

                        {/* Status filter buttons: placed below search+sort so they're visible even in wide (detailed) mode */}
                        <div className="flex items-center gap-2 flex-wrap mt-2 md:mt-0">
                            <button type="button" onClick={() => setStatusFilter('')} className={`px-3 py-1 rounded-full border text-sm ${statusFilter === '' ? 'bg-indigo-600 text-white ring-1 ring-indigo-200' : 'bg-white text-gray-700 border-indigo-100'}`}>{t ? t('all') : 'All'}</button>
                            <button type="button" onClick={() => setStatusFilter('pending')} className={`px-3 py-1 rounded-full border text-sm ${statusFilter === 'pending' ? 'bg-indigo-600 text-white ring-1 ring-indigo-200' : 'bg-white text-gray-700 border-indigo-100'}`}>{t ? t('pending') : 'Pending'}</button>
                            <button type="button" onClick={() => setStatusFilter('in_progress')} className={`px-3 py-1 rounded-full border text-sm ${statusFilter === 'in_progress' ? 'bg-indigo-600 text-white ring-1 ring-indigo-200' : 'bg-white text-gray-700 border-indigo-100'}`}>{t ? t('in_progress') : 'In progress'}</button>
                            <button type="button" onClick={() => setStatusFilter('completed')} className={`px-3 py-1 rounded-full border text-sm ${statusFilter === 'completed' ? 'bg-indigo-600 text-white ring-1 ring-indigo-200' : 'bg-white text-gray-700 border-indigo-100'}`}>{t ? t('completed') : 'Completed'}</button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 min-w-0">
                        {/* hide view toggle on mobile - mobile always shows simple mode */}
                        {!isMobile && (
                            <button
                                type="button"
                                onClick={() => setViewMode((v) => (v === 'detailed' ? 'simple' : 'detailed'))}
                                className="px-3 py-1 rounded-full border border-gray-200 bg-white shadow-sm"
                                title={t ? t('switchViewSimple') : 'Toggle view'}
                            >
                                {viewMode === 'detailed' ? (t ? t('switchViewSimple') : 'Switch to Simple') : (t ? t('switchViewDetailed') : 'Switch to Detailed')}
                            </button>
                        )}
                        <div className="flex-shrink-0">
                            <NewTaskButton onOpen={() => setShowCreate(true)} />
                        </div>
                    </div>
                </div>
            </div>

            {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
            {success && <div className="mb-4 text-sm text-green-600">{success}</div>}

            {showCreate && (
                <form onSubmit={createTask} className="mb-6 bg-white p-6 rounded-lg shadow-sm ring-1 ring-gray-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium">{t ? t('title') : 'Title'}</label>
                            <input className="mt-1 block w-full border border-gray-200 p-3 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-200" value={form.title} onChange={(e) => updateForm('title', e.target.value)} />
                            <label className="block text-sm font-medium mt-4">{t ? t('description') : 'Description'}</label>
                            <textarea className="mt-1 block w-full border border-gray-200 p-3 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-200" value={form.description} onChange={(e) => updateForm('description', e.target.value)} />
                        </div>

                        <div>
                            <div className="text-sm text-gray-700 py-2">{t ? t('statusLabel') : 'Status'}: <strong>{t ? t('pending') : 'Pending'}</strong></div>

                            <label className="block text-sm font-medium mt-2">{t ? t('prio') : 'Priority'}</label>
                            <input type="number" min="1" max="5" className="mt-1 block w-32 border border-gray-200 p-3 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-200" value={form.priority} onChange={(e) => updateForm('priority', Number(e.target.value))} />

                            <label className="block text-sm font-medium mt-4">{t ? t('categoryLabel') : 'Category'}</label>
                            <select className="mt-1 block w-full border border-gray-200 p-3 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-200" value={form.category_id} onChange={(e) => updateForm('category_id', e.target.value === '' ? '' : Number(e.target.value))}>
                                <option value="">—</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>

                            <label className="block text-sm font-medium mt-4">{t ? t('deadline') : 'Deadline'}</label>
                            <input type="datetime-local" className="mt-1 block w-full border border-gray-200 p-3 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-200" value={form.deadline} onChange={(e) => updateForm('deadline', e.target.value)} />

                            <div className="mt-6 flex gap-2">
                                <button type="submit" disabled={actionLoading} className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-lg shadow-sm">{actionLoading ? (t ? t('creating') : 'Creating...') : (t ? t('create') : 'Create')}</button>
                                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 border border-gray-200 rounded-lg">{t ? t('cancel') : 'Cancel'}</button>
                            </div>
                        </div>
                    </div>
                </form>
            )}

            <section className="bg-white rounded shadow-md ring-1 ring-indigo-50">
                <div ref={tableWrapperRef} className="overflow-x-auto">
                <table ref={tableRef} className="w-full table-auto">
                     <thead className="bg-indigo-50">
                    {viewMode === 'simple' ? (
                        <tr>
                            <th colSpan={9} className="p-3 text-left text-sm font-semibold text-indigo-700">{t ? t('tasks') : 'Tasks'}</th>
                        </tr>
                    ) : (
                        <tr>
                            <th className="p-3 text-left text-sm font-semibold text-indigo-700 border-b border-indigo-100">{t ? t('id') : 'ID'}</th>
                            <th className="p-3 text-left text-sm font-semibold text-indigo-700 border-b border-indigo-100">{t ? t('title') : 'Title'}</th>
                            <th className="p-3 text-left text-sm font-semibold text-indigo-700 border-b border-indigo-100">{t ? t('statusLabel') : 'Status'}</th>
                            <th className="p-3 text-left text-sm font-semibold text-indigo-700 border-b border-indigo-100">{t ? t('prio') : 'Prio'}</th>
                            <th className="p-3 text-left text-sm font-semibold text-indigo-700 border-b border-indigo-100">{t ? t('categoryLabel') : 'Category'}</th>
                            <th className="p-3 text-left text-sm font-semibold text-indigo-700 border-b border-indigo-100">{t ? t('deadline') : 'Deadline'}</th>
                            <th className="p-3 text-left text-sm font-semibold text-indigo-700 border-b border-indigo-100">{t ? t('created') : 'Created'}</th>
                            <th className="p-3 text-left text-sm font-semibold text-indigo-700 border-b border-indigo-100">{t ? t('updated') : 'Updated'}</th>
                            <th className="p-3 text-left text-sm font-semibold text-indigo-700 border-b border-indigo-100">{t ? t('actions') : 'Actions'}</th>
                        </tr>
                    )}
                    </thead>
                    <tbody>
                    {loading ? (
                        <tr><td colSpan={9} className="p-4">{t ? t('loading') : 'Loading...'}</td></tr>
                    ) : tasks.length === 0 ? (
                        <tr><td colSpan={9} className="p-4">{t ? t('noTasks') : 'No tasks'}</td></tr>
                    ) : filteredTasks.length === 0 ? (
                        <tr><td colSpan={9} className="p-4">{t ? t('noMatchingTasks') : 'No matching tasks'}</td></tr>
                    ) : displayedTasks.map((t) => (
                        <TaskCard
                            key={t.id}
                            task={t}
                            categories={categories}
                            onEdit={openEdit}
                            onDelete={handleDelete}
                            onChangeStatus={changeStatus}
                            actionLoading={actionLoading}
                            viewMode={viewMode}
                            onOpenDetails={openDetails}
                        />
                     ))}
                       </tbody>
                   </table>
                 </div>
               </section>

            {/* Detail modal: show all details for a single task on mobile when a task is clicked */}
            {detailTask && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white p-4 rounded w-full max-w-lg mx-4">
                        <div className="flex justify-between items-start gap-4">
                            <div>
                                <h2 className="text-lg font-semibold">{detailTask.title}</h2>
                                <div className="text-sm text-gray-600">ID: {detailTask.id}</div>
                            </div>
                            <div>
                                <button onClick={closeDetails} className="px-2 py-1 bg-gray-200 rounded">Close</button>
                            </div>
                        </div>

                        <div className="mt-3 space-y-2 text-sm">
                            {detailTask.description ? <div><strong>Description</strong><div className="text-gray-700 mt-1 whitespace-pre-wrap">{detailTask.description}</div></div> : null}
                            <div><strong>Status:</strong> <span className="ml-2">{detailTask.status ?? '-'}</span></div>
                            <div><strong>Priority:</strong> <span className="ml-2">{detailTask.priority ?? '-'}</span></div>
                            <div><strong>Category:</strong> <span className="ml-2">{detailTask?.category?.name ?? '-'}</span></div>
                            <div><strong>Deadline:</strong> <span className="ml-2">{detailTask.deadline ? String(detailTask.deadline).replace(' ', 'T') : '-'}</span></div>
                        </div>

                        <div className="mt-4 flex justify-end gap-2">
                            <button onClick={() => { setDetailTask(null); openEdit(detailTask); }} className="px-3 py-2 bg-blue-600 text-white rounded">Edit</button>
                            <button onClick={() => { handleDelete(detailTask.id); setDetailTask(null); }} className="px-3 py-2 bg-red-600 text-white rounded">Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {editing && (
                <div
                    ref={modalRef}
                    className={"fixed inset-0 bg-black/40 flex " + (editFullScreen ? 'items-stretch' : 'items-end md:items-center') + " justify-center z-50 overflow-hidden"}
                >
                    <div className={"bg-white " + (editFullScreen ? 'w-full h-screen rounded-none' : 'w-full max-w-3xl rounded-t-xl md:rounded mx-auto') + " p-6 md:p-8 box-border flex flex-col overflow-hidden shadow-sm ring-1 ring-gray-100"}>
                        {/* header */}
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-semibold">Edit Task #{editing.id}</h3>
                            <button type="button" onClick={() => setEditing(null)} className="text-gray-600 hover:text-gray-800 px-2 py-1">✕</button>
                        </div>

                        {/* content (non-horizontal-scrollable). place formRef to measure height */}
                        <div className={"flex-1 " + (editFullScreen ? 'overflow-auto' : '')}>
                             <form ref={formRef} onSubmit={saveEdit} className="flex flex-col gap-4">
                                 <label className="text-sm font-medium">Title</label>
                                 <input className="border border-gray-200 p-3 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-200 w-full" value={editing.title ?? ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />

                                 <label className="text-sm font-medium">Description</label>
                                 <textarea className="border border-gray-200 p-3 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-200 w-full min-h-[120px]" value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />

                                <div className="flex flex-col md:flex-row gap-4">
                                    <div className="flex-1">
                                        <label className="text-sm font-medium">Status</label>
                                        <select value={editing.status ?? ''} onChange={(e) => setEditing({ ...editing, status: e.target.value })} className="border border-gray-200 p-3 w-full rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-200">
                                            <option value="">—</option>
                                            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                        </select>
                                    </div>

                                    <div className="w-full md:w-32">
                                        <label className="text-sm font-medium">Priority</label>
                                        <input type="number" min="1" max="5" value={editing.priority ?? 2} onChange={(e) => setEditing({ ...editing, priority: Number(e.target.value) })} className="border border-gray-200 p-3 w-full rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-200" />
                                    </div>

                                    <div className="flex-1">
                                         <label className="text-sm font-medium">Category</label>
                                        <select value={editing.category_id ?? ''} onChange={(e) => setEditing({ ...editing, category_id: e.target.value === '' ? '' : Number(e.target.value) })} className="border border-gray-200 p-3 w-full rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-200">
                                            <option value="">—</option>
                                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                     </div>

                                    <div className="w-full md:w-auto">
                                         <label className="text-sm font-medium">Deadline</label>
                                         <input type="datetime-local" value={editing.deadline ?? ''} onChange={(e) => setEditing({ ...editing, deadline: e.target.value })} className="border border-gray-200 p-3 w-full rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-200" />
                                     </div>
                                </div>

                                {/* footer inside form so submit works; align buttons together left on small, right on md+ */}
                                <div className="mt-2 flex justify-start md:justify-end gap-2">
                                    <button type="submit" className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-lg shadow-sm flex-shrink-0">Save</button>
                                    <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 border border-gray-200 rounded-lg">Cancel</button>
                                </div>
                             </form>
                         </div>
                     </div>
                 </div>
              )}

        </div>
    );
}
