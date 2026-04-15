import React, { useEffect, useState } from 'react';
import { useOptions } from '../contexts/OptionsContext.jsx';

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
// New validation regex for time and integer
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const NONNEG_INT_REGEX = /^\d+$/;

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
//AI
function CategoryRow({ cat, onEdit, onDelete }) {
    const { t } = useOptions();
    // Visual style similar to MissedTasks: colored left border + faint background tint
    const catColor = cat.color || null;
    const borderStyle = catColor ? { borderLeft: `6px solid ${catColor}` } : {};
    const cardStyle = { ...borderStyle, backgroundColor: catColor ? hexToRGBA(catColor, 0.06) : undefined };
    const badgeBg = catColor || '#eee';
    const badgeColor = getContrastYIQ(badgeBg);

    return (
        <div className="p-3 bg-white rounded shadow-sm flex items-center justify-between" style={cardStyle}>
            <div className="flex items-center gap-3 min-w-0">
                <div style={{ width: 12, height: 12, background: cat.color || '#ffffff', border: '1px solid #e5e7eb', borderRadius: 4 }} />
                <div className="min-w-0">
                    <div className="font-medium text-base truncate">{cat.name}</div>
                    <div className="text-sm text-gray-500 truncate">
                        {cat.id} · {cat.planFrom || '—'}{cat.planFrom && cat.planTo ? '–' : ''}{cat.planTo || ''} · {cat.maxDuration ? `${cat.maxDuration} min` : '—'}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 ml-4">
                {/* small pill showing color/name */}
                <span className="inline-block px-2 py-0.5 rounded-full text-xs" style={{ background: badgeBg, color: badgeColor }}>{cat.name}</span>

                <button type="button" onClick={() => onEdit(cat)} className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-blue-500 shadow-sm hover:from-indigo-600 hover:to-blue-600">{t ? t('edit') : 'Edit'}</button>
                <button type="button" onClick={() => onDelete(cat)} className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium text-white bg-red-600 hover:bg-red-700">{t ? t('delete') : 'Delete'}</button>
            </div>
        </div>
    );
}
//AI
export default function CategoryManager() {
    const { t } = useOptions();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [errorDetails, setErrorDetails] = useState(null);

    // form state for create/edit
    const [editing, setEditing] = useState(null); // null or category object
    const [name, setName] = useState('');
    const [color, setColor] = useState('');
    // New states
    const [planFrom, setPlanFrom] = useState('');
    const [planTo, setPlanTo] = useState('');
    const [maxDuration, setMaxDuration] = useState(''); // string to allow empty
    const [saving, setSaving] = useState(false);

    // fetch categories
    const fetchCategories = async () => {
        setLoading(true);
        setError(null);
        setErrorDetails(null);

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
                console.error('Category fetch failed:', msg, details);
                setError(msg);
                setErrorDetails(details);
                setLoading(false);
                return; // stop further processing
            }

            // parse response safely
            const ct = (res.headers.get('content-type') || '').toLowerCase();
            let data;
            try {
                if (ct.includes('application/json')) {
                    data = await res.json();
                } else {
                    const txt = await res.text().catch(() => null);
                    if (txt === null) {
                        const details = { status: res.status, statusText: res.statusText, contentType: ct };
                        const msg = 'Empty response from server';
                        console.error(msg, details);
                        setError(msg);
                        setErrorDetails(details);
                        setLoading(false);
                        return;
                    }
                    try {
                        data = JSON.parse(txt);
                    } catch (parseErr) {
                        const details = { status: res.status, statusText: res.statusText, contentType: ct, body: txt };
                        const msg = `Unexpected content-type (${ct || 'none'}) with body: ${txt}`;
                        console.error(msg, details);
                        setError(msg);
                        setErrorDetails(details);
                        setLoading(false);
                        return;
                    }
                }
            } catch (e) {
                console.error('Category fetch error parsing response:', e);
                setError(e.message || 'Invalid JSON response from server');
                setErrorDetails(e?.details || null);
                setLoading(false);
                return;
            }

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
    }, []);

    const resetForm = () => {
        setEditing(null);
        setName('');
        setColor('');
        setPlanFrom('');
        setPlanTo('');
        setMaxDuration('');
    };

    const startCreate = () => {
        resetForm();
        setEditing({}); // empty marker -> create
    };

    const startEdit = (cat) => {
        setEditing(cat);
        setName(cat.name || '');
        setColor(cat.color || '');
        setPlanFrom(cat.planFrom || '');
        setPlanTo(cat.planTo || '');
        setMaxDuration(cat.maxDuration != null ? String(cat.maxDuration) : '');
    };
    //AI
    const handleDelete = async (cat) => {
        if (!window.confirm(`Delete category "${cat.name}"?`)) return;
        setError(null);
        try {
            // Backend expects POST with id in query param (?c=category&a=delete&id=ID)
            const res = await fetch(apiUrl('delete', cat.id), {
                method: 'POST',
                credentials: 'include',
                headers: { 'Accept': 'application/json' },
            });
            const body = await res.json().catch(() => null);
            if (!res.ok) {
                const msg = body?.message || `Delete failed (${res.status})`;
                console.error('Category delete failed:', msg, body);
                setError(msg);
                setErrorDetails(body);
                return;
            }
            setCategories((prev) => prev.filter(c => c.id !== cat.id));
            if (editing && editing.id === cat.id) resetForm();
        } catch (e) {
            setError(e.message || 'Failed to delete');
        }
    };
    //AI
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
        if (planFrom && planFrom !== '' && !TIME_REGEX.test(planFrom)) {
            setError('planFrom must be a time like HH:MM or HH:MM:SS');
            return;
        }
        if (planTo && planTo !== '' && !TIME_REGEX.test(planTo)) {
            setError('planTo must be a time like HH:MM or HH:MM:SS');
            return;
        }
        if (maxDuration && maxDuration !== '' && !NONNEG_INT_REGEX.test(maxDuration)) {
            setError('maxDuration must be a non-negative integer (minutes)');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                name: trimmedName,
                color: color === '' ? null : color,
                planFrom: planFrom === '' ? null : planFrom,
                planTo: planTo === '' ? null : planTo,
                maxDuration: maxDuration === '' ? null : parseInt(maxDuration, 10),
            };

            // perform real save via API
            let res;
            if (editing && editing.id) {
                const bodyToSend = { id: editing.id, ...payload };
                res = await fetch(apiUrl('update', editing.id), {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify(bodyToSend),
                });
            } else {
                res = await fetch(apiUrl('create'), {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify(payload),
                });
            }

            const body = await res.json().catch(() => null);
            if (!res.ok) {
                if (body && body.errors) {
                    const firstKey = Object.keys(body.errors)[0];
                    const msg = body.errors[firstKey] || 'Save failed (validation)';
                    setError(msg);
                    setErrorDetails(body);
                    setSaving(false);
                    return;
                }
                const msg = body?.message || `Save failed (${res.status})`;
                setError(msg);
                setErrorDetails(body);
                setSaving(false);
                return;
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
    //AI
    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-semibold">{t ? t('categoryManager') : 'Category Manager'}</h1>
                <div className="flex items-center gap-2">
                    <button onClick={startCreate} className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full hover:from-green-600 hover:to-emerald-600 font-semibold">{t ? t('newCategory') : 'New Category'}</button>
                </div>
            </div>

            {loading && <div className="mb-4 text-sm text-gray-600">{t ? t('loadingCategories') : 'Loading categories…'}</div>}

            {error && <div className="mb-4 text-red-600 font-medium">{error}</div>}
            {errorDetails && (
                <pre className="mb-4 p-3 bg-gray-100 rounded text-sm overflow-auto">{JSON.stringify(errorDetails, null, 2)}</pre>
            )}

            {/* Replaced table layout with card-style list like MissedTasks */}
            <div className="grid gap-3">
                {categories.length === 0 ? (
                    <div className="p-6 text-center text-gray-500 bg-white rounded shadow">{t ? t('noCategories') : 'No categories'}</div>
                ) : (
                    categories.map(cat => (
                        <CategoryRow key={cat.id} cat={cat} onEdit={startEdit} onDelete={handleDelete} />
                    ))
                )}
            </div>

            {editing !== null && (
                <div className="mt-6 bg-white p-6 shadow rounded">
                    <h2 className="text-lg font-semibold mb-4">{editing.id ? (t ? t('editCategory') : 'Edit category') : (t ? t('createCategory') : 'Create category')}</h2>
                    <form onSubmit={handleSave}>
                        <label className="block mb-3">
                            <div className="text-sm font-medium mb-1">{t ? t('name') : 'Name'}</div>
                            <input value={name} onChange={e => setName(e.target.value)} className={`mt-1 block w-full p-2 border rounded ${saving ? 'opacity-60' : ''}`} placeholder={t ? t('name') : 'Category name'} disabled={saving} />
                        </label>

                        <div className="mb-3">
                            <div className="text-sm font-medium mb-2">{t ? t('color') : 'Color'}</div>
                            <div className="flex gap-2 flex-wrap mb-3">
                                {PALETTE.map(c => (
                                    <button key={c} type="button" title={c} onClick={() => setColor(c)} className={`w-8 h-6 rounded-md border ${c.toLowerCase() === (color || '').toLowerCase() ? 'ring-2 ring-offset-1 ring-black' : 'border-gray-200'}`} style={{ background: c }} />
                                ))}
                            </div>

                            <div className="flex items-center gap-3 mb-3">
                                <input type="color" value={color || '#ffffff'} onChange={e => setColor(e.target.value)} disabled={saving} className="w-14 h-10 p-0 border-0" />
                                <div className="text-sm text-gray-600">{color || (t ? t('noCategories') : 'No color selected')}</div>
                                <button type="button" onClick={() => setColor('')} className="ml-4 px-3 py-1 bg-white border rounded">{t ? t('clear') : 'Clear'}</button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <div className="text-sm font-medium mb-1">{t ? t('planFrom') : 'Plan from'}</div>
                                    <div className="flex items-center gap-2">
                                        <input type="time" value={planFrom} onChange={e => setPlanFrom(e.target.value)} disabled={saving} className="p-2 border rounded" />
                                        <button type="button" onClick={() => setPlanFrom('')} className="px-2 py-1 bg-white border rounded">{t ? t('clear') : 'Clear'}</button>
                                    </div>
                                </div>

                                <div>
                                    <div className="text-sm font-medium mb-1">{t ? t('planTo') : 'Plan to'}</div>
                                    <div className="flex items-center gap-2">
                                        <input type="time" value={planTo} onChange={e => setPlanTo(e.target.value)} disabled={saving} className="p-2 border rounded" />
                                        <button type="button" onClick={() => setPlanTo('')} className="px-2 py-1 bg-white border rounded">{t ? t('clear') : 'Clear'}</button>
                                    </div>
                                </div>

                                <div>
                                    <div className="text-sm font-medium mb-1">{t ? t('maxDuration') : 'Max duration (minutes)'}</div>
                                    <input type="number" min="0" step="1" value={maxDuration} onChange={e => setMaxDuration(e.target.value)} disabled={saving} className="p-2 border rounded w-full" placeholder="e.g. 120" />
                                </div>
                            </div>

                            {/* atomic task option removed from categories */}
                        </div>

                        <div className="flex items-center gap-3">
                            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold" disabled={saving}>{saving ? (t ? t('saving') : 'Saving…') : (t ? t('save') : 'Save')}</button>
                            <button type="button" onClick={resetForm} className="px-3 py-2 bg-white border rounded">{t ? t('cancel') : 'Cancel'}</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

// utility to compute readable text color based on background
function getContrastYIQ(hexcolor) {
    try {
        let c = String(hexcolor || '').replace('#', '');
        if (c.length === 3) c = c.split('').map(s => s + s).join('');
        const r = parseInt(c.substr(0,2),16);
        const g = parseInt(c.substr(2,2),16);
        const b = parseInt(c.substr(4,2),16);
        const yiq = ((r*299)+(g*587)+(b*114))/1000;
        return (yiq >= 128) ? '#111' : '#fff';
    } catch (e) {
        return '#111';
    }
}

// convert hex color to rgba string with given alpha (fallbacks included)
function hexToRGBA(hex, alpha = 0.06) {
    try {
        if (!hex) return undefined;
        let c = String(hex).trim();
        if (c[0] === '#') c = c.slice(1);
        if (c.length === 3) c = c.split('').map(ch => ch + ch).join('');
        if (c.length !== 6) return undefined;
        const r = parseInt(c.slice(0,2), 16);
        const g = parseInt(c.slice(2,4), 16);
        const b = parseInt(c.slice(4,6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    } catch (e) {
        return undefined;
    }
}
