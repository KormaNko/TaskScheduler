import React, { useEffect, useState } from 'react';

/**
 * CategoryManager (backend-compatible)
 * - Adaptované pre backend routing: /?c=category&a=<action>&id=<id>
 * - List:   GET  /?c=category&a=index
 * - Create: POST /?c=category&a=create      (JSON body)
 * - Update: POST /?c=category&a=update&id=ID (JSON body)
 * - Delete: POST /?c=category&a=delete&id=ID (no body required, id in query)
 *
 * Uses credentials: 'include' (same as original).
 */

// Use VITE_API_BASE if provided (e.g. VITE_API_BASE="http://localhost:8080/api"),
// otherwise default to '/api' which works with the Vite dev proxy.
const API_BASE = (import.meta && import.meta.env && import.meta.env.VITE_API_BASE) || '/api';
const COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

// 15-color palette for quick selection
const PALETTE = [
    '#EF4444', // red
    '#F97316', // orange
    '#F59E0B', // amber
    '#EAB308', // yellow
    '#10B981', // emerald
    '#06B6D4', // cyan
    '#3B82F6', // blue
    '#6366F1', // indigo
    '#8B5CF6', // violet
    '#EC4899', // pink
    '#DB2777', // fuchsia
    '#84CC16', // lime
    '#14B8A6', // teal
    '#F97316', // orange (duplicate to reach 15)
    '#9CA3AF', // gray
];

function apiUrl(action, id = null) {
    // Build URL under /api so Vite's proxy can forward to backend root which expects ?c=category
    const base = `${API_BASE}/?c=category&a=${action}`;
    return id ? `${base}&id=${encodeURIComponent(id)}` : base;
}

function CategoryRow({ cat, onEdit, onDelete }) {
    return (
        <tr className="border-t">
            <td className="p-3">{cat.id}</td>
            <td className="p-3">{cat.name}</td>
            <td className="p-3 text-center">
                <div className="mx-auto" style={{ width: 34, height: 20, background: cat.color || '#ffffff', border: '1px solid #e5e7eb', borderRadius: 6 }} />
            </td>
            <td className="p-3 text-right">
                <button type="button" onClick={() => onEdit(cat)} className="mr-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">Upraviť</button>
                <button type="button" onClick={() => onDelete(cat)} className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700">Zmazať</button>
            </td>
        </tr>
    );
}

export default function CategoryManager() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [errorDetails, setErrorDetails] = useState(null);
    const [useMock, setUseMock] = useState(false);

    // form state for create/edit
    const [editing, setEditing] = useState(null); // null or category object
    const [name, setName] = useState('');
    const [color, setColor] = useState('');
    const [saving, setSaving] = useState(false);

    // sample mock data for offline dev
    const mockSample = [
        { id: 1, name: 'General', color: '#6366F1' },
        { id: 2, name: 'Work', color: '#10B981' },
        { id: 3, name: 'Personal', color: '#F59E0B' },
    ];

    // fetch categories
    const fetchCategories = async () => {
        setLoading(true);
        setError(null);
        setErrorDetails(null);

        if (useMock) {
            setTimeout(() => {
                setCategories(mockSample);
                setLoading(false);
            }, 200);
            return;
        }

        try {
            const res = await fetch(apiUrl('index'), { credentials: 'include' });

            if (!res.ok) {
                const txt = await res.text().catch(() => null);
                const msg = txt ? `${res.status} ${res.statusText}: ${txt}` : `Fetch failed: ${res.status}`;
                const details = {
                    status: res.status,
                    statusText: res.statusText,
                    headers: Object.fromEntries(res.headers.entries()),
                    body: txt,
                };
                const err = new Error(msg);
                err.details = details;
                throw err;
            }

            const ct = (res.headers.get('content-type') || '').toLowerCase();
            let data;
            if (ct.includes('application/json')) {
                data = await res.json().catch(() => {
                    const details = { status: res.status, statusText: res.statusText, contentType: ct };
                    const e = new Error('Invalid JSON response from server');
                    e.details = details;
                    throw e;
                });
            } else {
                const txt = await res.text().catch(() => null);
                if (txt === null) {
                    const e = new Error('Empty response from server');
                    e.details = { status: res.status, statusText: res.statusText, contentType: ct };
                    throw e;
                }
                try {
                    data = JSON.parse(txt);
                } catch (e) {
                    const details = { status: res.status, statusText: res.statusText, contentType: ct, body: txt };
                    const err = new Error(`Unexpected content-type (${ct || 'none'}) with body: ${txt}`);
                    err.details = details;
                    throw err;
                }
            }

            // backend returns { status: 'ok', data: [...] } so handle both shapes
            const list = Array.isArray(data) ? data : (data.data ?? []);
            setCategories(list);
        } catch (e) {
            console.error('Category fetch error:', e, e?.details);
            setError(e.message || 'Failed to load');
            setErrorDetails(e?.details || null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, [useMock]);

    const resetForm = () => {
        setEditing(null);
        setName('');
        setColor('');
    };

    const startCreate = () => {
        resetForm();
        setEditing({}); // empty marker -> create
    };

    const startEdit = (cat) => {
        setEditing(cat);
        setName(cat.name || '');
        setColor(cat.color || '');
    };

    const handleDelete = async (cat) => {
        if (!window.confirm(`Delete category "${cat.name}"?`)) return;
        setError(null);
        try {
            if (useMock) {
                setCategories(prev => prev.filter(c => c.id !== cat.id));
                if (editing && editing.id === cat.id) resetForm();
                return;
            }

            // Backend expects POST with id in query param (?c=category&a=delete&id=ID)
            const res = await fetch(apiUrl('delete', cat.id), {
                method: 'POST',
                credentials: 'include',
                headers: { 'Accept': 'application/json' },
            });
            const body = await res.json().catch(() => null);
            if (!res.ok) {
                throw new Error(body?.message || `Delete failed (${res.status})`);
            }
            setCategories((prev) => prev.filter(c => c.id !== cat.id));
            if (editing && editing.id === cat.id) resetForm();
        } catch (e) {
            setError(e.message || 'Failed to delete');
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setError(null);

        const trimmedName = (name || '').trim();
        if (trimmedName === '') {
            setError('Name is required');
            return;
        }
        if (color && color !== '' && !COLOR_REGEX.test(color)) {
            setError('Color must be hex like #RRGGBB or empty');
            return;
        }

        setSaving(true);
        try {
            const payload = { name: trimmedName, color: color === '' ? null : color };

            if (useMock) {
                if (editing && editing.id) {
                    setCategories(prev => prev.map(c => (c.id === editing.id ? { ...c, ...payload } : c)));
                } else {
                    const newId = Math.max(0, ...categories.map(c => c.id || 0)) + 1;
                    setCategories(prev => [{ id: newId, ...payload }, ...prev]);
                }
                resetForm();
                return;
            }

            let res;
            if (editing && editing.id) {
                // Backend expects POST for update with id in query string
                res = await fetch(apiUrl('update', editing.id), {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify(payload),
                });
            } else {
                // Create
                res = await fetch(apiUrl('create'), {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify(payload),
                });
            }

            const body = await res.json().catch(() => null);
            if (!res.ok) {
                throw new Error(body?.message || `Save failed (${res.status})`);
            }

            const saved = body?.data ?? body;
            if (editing && editing.id) {
                setCategories(prev => prev.map(c => (c.id === saved.id ? saved : c)));
            } else {
                setCategories(prev => [saved, ...prev]);
            }
            resetForm();
        } catch (e) {
            setError(e.message || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-semibold">Category Manager</h1>
                <div className="flex items-center gap-2">
                    <button onClick={startCreate} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-semibold">New Category</button>
                    <button onClick={fetchCategories} className="px-3 py-2 bg-white border rounded">Refresh</button>
                    <label className="ml-4 text-sm flex items-center gap-2"><input type="checkbox" checked={useMock} onChange={e => setUseMock(e.target.checked)} />Use mock data</label>
                </div>
            </div>

            {useMock && (
                <div className="mb-4 p-3 bg-yellow-50 border rounded text-sm">Mock mode enabled — actions are local only and not sent to any server.</div>
            )}

            {error && <div className="mb-4 text-red-600 font-medium">{error}</div>}
            {errorDetails && (
                <pre className="mb-4 p-3 bg-gray-100 rounded text-sm overflow-auto">{JSON.stringify(errorDetails, null, 2)}</pre>
            )}

            <div className="overflow-x-auto bg-white rounded shadow">
                <table className="w-full table-auto">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="text-left p-3">ID</th>
                            <th className="text-left p-3">Name</th>
                            <th className="p-3">Color</th>
                            <th className="text-right p-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-6 text-center text-gray-500">No categories</td>
                            </tr>
                        ) : (
                            categories.map(cat => (
                                <CategoryRow key={cat.id} cat={cat} onEdit={startEdit} onDelete={handleDelete} />
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {editing !== null && (
                <div className="mt-6 bg-white p-6 shadow rounded">
                    <h2 className="text-lg font-semibold mb-4">{editing.id ? 'Edit category' : 'Create category'}</h2>
                    <form onSubmit={handleSave}>
                        <label className="block mb-3">
                            <div className="text-sm font-medium mb-1">Name</div>
                            <input value={name} onChange={e => setName(e.target.value)} className={`mt-1 block w-full p-2 border rounded ${saving ? 'opacity-60' : ''}`} placeholder="Category name" disabled={saving} />
                        </label>

                        <div className="mb-3">
                            <div className="text-sm font-medium mb-2">Color</div>
                            <div className="flex gap-2 flex-wrap mb-3">
                                {PALETTE.map(c => (
                                    <button key={c} type="button" title={c} onClick={() => setColor(c)} className={`w-8 h-6 rounded-md border ${c.toLowerCase() === (color || '').toLowerCase() ? 'ring-2 ring-offset-1 ring-black' : 'border-gray-200'}`} style={{ background: c }} />
                                ))}
                            </div>

                            <div className="flex items-center gap-3">
                                <input type="color" value={color || '#ffffff'} onChange={e => setColor(e.target.value)} disabled={saving} className="w-14 h-10 p-0 border-0" />
                                <div className="text-sm text-gray-600">{color || 'No color selected'}</div>
                                <button type="button" onClick={() => setColor('')} className="ml-4 px-3 py-1 bg-white border rounded">Clear</button>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
                            <button type="button" onClick={resetForm} className="px-3 py-2 bg-white border rounded">Cancel</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
