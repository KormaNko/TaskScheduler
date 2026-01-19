// filepath suggestion: frontend/src/pages/SettingsPage.jsx
import React, { useEffect, useState } from 'react';
import api from '../lib/api';

const LANG_OPTIONS = [
    { value: 'SK', label: 'Slovenčina (SK)' },
    { value: 'EN', label: 'English (EN)' },
];

const THEME_OPTIONS = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
];

const FILTER_OPTIONS = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In progress' },
    { value: 'completed', label: 'Completed' },
];

const SORT_OPTIONS = [
    { value: 'none', label: 'None' },
    { value: 'priority_asc', label: 'Priority ↑' },
    { value: 'priority_desc', label: 'Priority ↓' },
    { value: 'title_asc', label: 'Title A → Z' },
    { value: 'title_desc', label: 'Title Z → A' },
    { value: 'deadline_asc', label: 'Deadline: soonest first' },
    { value: 'deadline_desc', label: 'Deadline: latest first' },
];

export default function SettingsPage() {
    const [opts, setOpts] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    // local form state
    const [language, setLanguage] = useState('SK');
    const [theme, setTheme] = useState('light');
    const [taskFilter, setTaskFilter] = useState('all');
    const [taskSort, setTaskSort] = useState('none');

    useEffect(() => {
        async function load() {
            setLoading(true);
            setError(null);
            try {
                // use api wrapper so requests go to API_BASE (e.g. /api)
                const data = await api.get('/?c=options&a=index');

                // backend may return camelCase or snake_case; normalize
                const normalize = (d) => ({
                    language: d.language ?? d.language ?? 'SK',
                    theme: d.theme ?? d.theme ?? 'light',
                    taskFilter: d.taskFilter ?? d.task_filter ?? 'all',
                    taskSort: d.taskSort ?? d.task_sort ?? 'none',
                });
                const n = normalize(data || {});
                setOpts(data);
                setLanguage(n.language);
                setTheme(n.theme);
                setTaskFilter(n.taskFilter);
                setTaskSort(n.taskSort);
            } catch (e) {
                setError(e.message || String(e));
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    async function handleSave(e) {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            const payload = {
                language,
                theme,
                taskFilter,
                taskSort,
            };

            // use api.post to route through API_BASE and send JSON
            const data = await api.post('/?c=options&a=update', payload);

            // update local state with returned values (normalize)
            setOpts(data);
            setLanguage(data.language ?? data.language ?? language);
            setTheme(data.theme ?? data.theme ?? theme);
            setTaskFilter(data.taskFilter ?? data.task_filter ?? taskFilter);
            setTaskSort(data.taskSort ?? data.task_sort ?? taskSort);
        } catch (e) {
            setError(e.message || String(e));
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return <div className="p-6">Loading settings...</div>;
    }

    return (
        <div className="max-w-2xl mx-auto p-6">
            <h1 className="text-2xl font-semibold mb-4">Settings</h1>
            {error && <div className="mb-4 text-red-600">Error: {error}</div>}
            <form onSubmit={handleSave} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium mb-1">Language</label>
                    <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="block w-full rounded border-gray-300 shadow-sm p-2"
                    >
                        {LANG_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Theme</label>
                    <select
                        value={theme}
                        onChange={(e) => setTheme(e.target.value)}
                        className="block w-full rounded border-gray-300 shadow-sm p-2"
                    >
                        {THEME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Task filter</label>
                    <select
                        value={taskFilter}
                        onChange={(e) => setTaskFilter(e.target.value)}
                        className="block w-full rounded border-gray-300 shadow-sm p-2"
                    >
                        {FILTER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Task sorting</label>
                    <select
                        value={taskSort}
                        onChange={(e) => setTaskSort(e.target.value)}
                        className="block w-full rounded border-gray-300 shadow-sm p-2"
                    >
                        {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>

                <div className="flex items-center space-x-3">
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
                    >
                        {saving ? 'Saving...' : 'Save settings'}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            // reset to last saved
                            setLanguage(opts?.language ?? opts?.language ?? 'SK');
                            setTheme(opts?.theme ?? opts?.theme ?? 'light');
                            setTaskFilter(opts?.taskFilter ?? opts?.task_filter ?? 'all');
                            setTaskSort(opts?.taskSort ?? opts?.task_sort ?? 'none');
                        }}
                        className="px-3 py-2 border rounded"
                    >
                        Reset
                    </button>
                </div>
            </form>
        </div>
    );
}
