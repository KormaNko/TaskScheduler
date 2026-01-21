// filepath suggestion: frontend/src/pages/SettingsPage.jsx
import React, { useEffect, useState } from 'react';
import { useOptions } from '../contexts/OptionsContext.jsx';

const LANG_VALUES = [
    { value: 'SK', label: 'Slovenčina (SK)' },
    { value: 'EN', label: 'English (EN)' },
];

const THEME_VALUES = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
];

const FILTER_VALUES = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In progress' },
    { value: 'completed', label: 'Completed' },
];

const SORT_VALUES = [
    { value: 'none', label: 'None' },
    { value: 'priority_asc', label: 'Priority ↑' },
    { value: 'priority_desc', label: 'Priority ↓' },
    { value: 'title_asc', label: 'Title A → Z' },
    { value: 'title_desc', label: 'Title Z → A' },
    { value: 'deadline_asc', label: 'Deadline: soonest first' },
    { value: 'deadline_desc', label: 'Deadline: latest first' },
];

export default function SettingsPage() {
    const { opts, loading, saving, error, saveOptions, t } = useOptions();

    // local form state mirrors the options so user can edit and save
    const [language, setLanguage] = useState('SK');
    const [theme, setTheme] = useState('light');
    const [taskFilter, setTaskFilter] = useState('all');
    const [taskSort, setTaskSort] = useState('none');
    const [localError, setLocalError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);


    // initialize from context opts
    //AI
    useEffect(() => {
        if (!opts) return;
        setLanguage(opts.language ?? 'SK');
        setTheme(opts.theme ?? 'light');
        setTaskFilter(opts.taskFilter ?? 'all');
        setTaskSort(opts.taskSort ?? 'none');
        // local state now reflects opts; further local changes may be pushed to context

        // ensure document theme matches saved opts when we first load
        //AI
        try {
            const el = document?.documentElement;
            if (el) {
                if ((opts.theme ?? 'light') === 'dark') el.classList.add('app-dark');
                else el.classList.remove('app-dark');
            }
        } catch (e) { /* ignore */ }
    }, [opts]);

    // Preview theme locally when user changes the select, but do not write to context immediately.
    // This prevents a loop where updating context triggers other effects and causes flicker.
    //AI
    useEffect(() => {
        try {
            const el = document?.documentElement;
            if (!el) return;
            if (theme === 'dark') el.classList.add('app-dark');
            else el.classList.remove('app-dark');
        } catch (e) { /* ignore */ }

    }, [theme]);

    async function handleSave(e) {
        e?.preventDefault?.();
        setIsSaving(true);
        setLocalError(null);
        try {
            const payload = {
                language,
                theme,
                task_filter: taskFilter,
                task_sort: taskSort,
            };
            const res = await saveOptions(payload);
            if (!res.ok) {
                setLocalError(res?.error?.message || (t ? t('actionFailed') : 'Failed to save'));
            }
        } catch (e) {
            setLocalError(e?.message || String(e));
        } finally {
            setIsSaving(false);
        }
    }

    if (loading) return <div className="p-6">{t ? t('loading') : 'Loading settings...'}</div>;
    //AI
    return (
        <div className="max-w-2xl mx-auto p-6">
            <h1 className="text-2xl font-semibold mb-4">{t ? t('settings') : 'Settings'}</h1>
            {(error || localError) && <div className="mb-4 text-red-600">Error: {localError || error}</div>}
            <form onSubmit={handleSave} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium mb-1">{t ? t('name') : 'Language'}</label>
                    <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="block w-full rounded border-gray-300 shadow-sm p-2"
                    >
                        {LANG_VALUES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">{t ? t('theme') : 'Theme'}</label>
                    <select
                        value={theme}
                        onChange={(e) => setTheme(e.target.value)}
                        className="block w-full rounded border-gray-300 shadow-sm p-2"
                    >
                        {THEME_VALUES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">{t ? t('tasks') : 'Task filter'}</label>
                    <select
                        value={taskFilter}
                        onChange={(e) => setTaskFilter(e.target.value)}
                        className="block w-full rounded border-gray-300 shadow-sm p-2"
                    >
                        {FILTER_VALUES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">{t ? t('prio') : 'Task sorting'}</label>
                    <select
                        value={taskSort}
                        onChange={(e) => setTaskSort(e.target.value)}
                        className="block w-full rounded border-gray-300 shadow-sm p-2"
                    >
                        {SORT_VALUES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>

                <div className="flex items-center space-x-3">
                    <button
                        type="submit"
                        disabled={isSaving || saving}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
                    >
                        {isSaving || saving ? (t ? t('saving') : 'Saving...') : (t ? t('saveSettings') : 'Save settings')}
                    </button>
                </div>
            </form>
        </div>
    );
}
