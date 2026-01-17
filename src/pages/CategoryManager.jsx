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

function apiUrl(action, id = null) {
    // Build URL under /api so Vite's proxy can forward to backend root which expects ?c=category
    const base = `${API_BASE}/?c=category&a=${action}`;
    return id ? `${base}&id=${encodeURIComponent(id)}` : base;
}

function CategoryRow({ cat, onEdit, onDelete }) {
    return (
        <tr>
            <td>{cat.id}</td>
            <td>{cat.name}</td>
            <td style={{ textAlign: 'center' }}>
                <div style={{ width: 28, height: 18, background: cat.color || '#ffffff', border: '1px solid #ddd', margin: '0 auto' }} />
            </td>
            <td>
                <button type="button" onClick={() => onEdit(cat)} style={styles.button}>Edit</button>
                <button type="button" onClick={() => onDelete(cat)} style={{ ...styles.button, ...styles.danger }}>Delete</button>
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
                data = await res.json().catch(err => {
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
        <div style={styles.container}>
            <h2>Category Manager</h2>

            <div style={styles.topRow}>
                <div>
                    <button onClick={startCreate} style={styles.button}>New Category</button>
                </div>
                <div>
                    <button onClick={fetchCategories} style={styles.button}>Refresh</button>
                    <label style={{ marginLeft: 8, fontSize: 13 }}>
                        <input type="checkbox" checked={useMock} onChange={e => setUseMock(e.target.checked)} style={{ marginRight: 6 }} />
                        Use mock data
                    </label>
                </div>
            </div>

            {useMock && (
                <div style={{ background: '#fff7ed', padding: 8, border: '1px solid #ffedd5', borderRadius: 6, marginBottom: 8 }}>
                    Mock mode enabled — actions are local only and not sent to any server.
                </div>
            )}

            {error && <div style={styles.error}>{error}</div>}
            {errorDetails && (
                <pre style={{ background: '#f8f8f8', padding: 10, borderRadius: 6, overflowX: 'auto' }}>{JSON.stringify(errorDetails, null, 2)}</pre>
            )}
            {loading ? <div>Loading...</div> : (
                <>
                    <table style={styles.table}>
                        <thead>
                        <tr>
                            <th style={{ width: 60 }}>ID</th>
                            <th>Name</th>
                            <th style={{ width: 80 }}>Color</th>
                            <th style={{ width: 170 }}>Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {categories.length === 0 ? (
                            <tr><td colSpan="4" style={{ textAlign: 'center', padding: 18 }}>No categories</td></tr>
                        ) : categories.map(cat => (
                            <CategoryRow key={cat.id} cat={cat} onEdit={startEdit} onDelete={handleDelete} />
                        ))}
                        </tbody>
                    </table>
                </>
            )}

            {editing !== null && (
                <div style={styles.formWrap}>
                    <h3>{editing.id ? 'Edit category' : 'Create category'}</h3>
                    <form onSubmit={handleSave}>
                        <div style={styles.formRow}>
                            <label style={styles.label}>Name</label>
                            <input
                                value={name}
                                onChange={e => setName(e.target.value)}
                                style={styles.input}
                                placeholder="Category name"
                                disabled={saving}
                            />
                        </div>

                        <div style={styles.formRow}>
                            <label style={styles.label}>Color</label>
                            <input
                                value={color || ''}
                                onChange={e => setColor(e.target.value)}
                                style={styles.input}
                                placeholder="#RRGGBB or leave empty"
                                disabled={saving}
                            />
                        </div>

                        <div style={styles.formActions}>
                            <button type="submit" style={styles.button} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
                            <button type="button" onClick={resetForm} style={{ ...styles.button, marginLeft: 8 }}>Cancel</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

const styles = {
    container: { maxWidth: 820, margin: '18px auto', fontFamily: 'system-ui,Segoe UI,Roboto,Helvetica,Arial', color: '#222' },
    topRow: { display: 'flex', justifyContent: 'space-between', marginBottom: 12 },
    table: { width: '100%', borderCollapse: 'collapse', marginBottom: 12 },
    button: { padding: '6px 10px', cursor: 'pointer', borderRadius: 4, border: '1px solid #ccc', background: '#f6f6f6' },
    danger: { background: '#ffecec', borderColor: '#f5c2c2' },
    error: { color: '#a00', marginBottom: 8 },
    formWrap: { border: '1px solid #e6e6e6', padding: 12, borderRadius: 6, marginTop: 12 },
    formRow: { display: 'flex', alignItems: 'center', marginBottom: 8 },
    label: { width: 80, marginRight: 8 },
    input: { flex: 1, padding: '6px 8px', borderRadius: 4, border: '1px solid #ddd' },
    formActions: { marginTop: 10 },
};
