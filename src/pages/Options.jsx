// filepath suggestion: frontend/src/pages/SettingsPage.jsx
import React, { useEffect, useState } from 'react';
import { useOptions } from '../contexts/OptionsContext.jsx';

export default function SettingsPage() {
    const { opts, loading, saving, error, saveOptions, t, setLocal } = useOptions();

    // local form state mirrors the options so user can edit and save
    const [language, setLanguage] = useState('SK');
    const [theme, setTheme] = useState('light');
    const [taskFilter, setTaskFilter] = useState('all');
    const [taskSort, setTaskSort] = useState('none');
    // workday times
    const [workdayStart, setWorkdayStart] = useState('09:00');
    const [workdayEnd, setWorkdayEnd] = useState('17:00');
    const [localError, setLocalError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // initialize from context opts
    useEffect(() => {
        if (!opts) return;
        setLanguage(opts.language ?? 'SK');
        setTheme(opts.theme ?? 'light');
        setTaskFilter(opts.taskFilter ?? opts.task_filter ?? 'all');
        setTaskSort(opts.taskSort ?? opts.task_sort ?? 'none');
        // initialize workday times from opts if present (support snake_case and camelCase and backend `work_day_*`)
        // prefer the raw payload returned by the options API (normalize stores it under __raw)
        const rawPayload = opts.__raw ?? {};
        const rawStart = rawPayload.work_day_start ?? opts.work_day_start ?? opts.workdayStart ?? opts.workday_start ?? '';
        const rawEnd = rawPayload.work_day_end ?? opts.work_day_end ?? opts.workdayEnd ?? opts.workday_end ?? '';
        // backend may store times as "HH:MM:SS" — normalize to "HH:MM" for the <input type=time>
        const norm = (v, fallback) => {
            if (!v && v !== 0) return fallback;
            try {
                const s = String(v);
                // extract leading HH:MM if available
                const m = s.match(/^(\d{1,2}:\d{2})/);
                return m ? m[1] : s.slice(0,5);
            } catch (e) { return fallback; }
        };
        setWorkdayStart(norm(rawStart, '09:00'));
        setWorkdayEnd(norm(rawEnd, '17:00'));
        // ensure document theme matches saved opts when we first load
        try {
            const el = document?.documentElement;
            if (el) {
                if ((opts.theme ?? 'light') === 'dark') el.classList.add('app-dark');
                else el.classList.remove('app-dark');
            }
        } catch (e) { /* ignore */ }
    }, [opts]);

    // Preview theme locally when user changes the select
    useEffect(() => {
        try {
            const el = document?.documentElement;
            if (!el) return;
            if (theme === 'dark') el.classList.add('app-dark');
            else el.classList.remove('app-dark');
        } catch (e) { /* ignore */ }
    }, [theme]);

    // build option arrays using centralized translations
    const langOptions = [
        { value: 'SK', label: t ? t('lang_sl') : 'Slovenčina (SK)' },
        { value: 'EN', label: t ? t('lang_en') : 'English (EN)' },
    ];

    const themeOptions = [
        { value: 'light', label: t ? t('theme_light') : 'Light' },
        { value: 'dark', label: t ? t('theme_dark') : 'Dark' },
    ];

    const filterOptions = [
        { value: 'all', label: t ? t('all') : 'All' },
        { value: 'pending', label: t ? t('pending') : 'Pending' },
        { value: 'in_progress', label: t ? t('in_progress') : 'In progress' },
        { value: 'completed', label: t ? t('completed') : 'Completed' },
    ];

    const sortOptions = [
        { value: 'none', label: t ? t('sort_none') : 'None' },
        { value: 'priority_asc', label: t ? t('sort_priority_asc') : 'Priority ↑' },
        { value: 'priority_desc', label: t ? t('sort_priority_desc') : 'Priority ↓' },
        { value: 'title_asc', label: t ? t('sort_title_asc') : 'Title A → Z' },
        { value: 'title_desc', label: t ? t('sort_title_desc') : 'Title Z → A' },
        { value: 'deadline_asc', label: t ? t('sort_deadline_asc') : 'Deadline: soonest first' },
        { value: 'deadline_desc', label: t ? t('sort_deadline_desc') : 'Deadline: latest first' },
    ];

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
                // send work day times to backend using exact keys expected by server
                // backend expects full seconds (HH:MM:SS) — we append :00 if user picked HH:MM
                work_day_start: workdayStart ? `${workdayStart}:00` : '',
                work_day_end: workdayEnd ? `${workdayEnd}:00` : '',
            };
            const res = await saveOptions(payload);
            if (!res.ok) {
                setLocalError(res?.error?.message || (t ? t('actionFailed') : 'Failed to save'));
            }
            // Save workday times into local options (no backend integration yet)
            try {
                // store normalized HH:MM locally, use keys that match backend naming
                setLocal('work_day_start', workdayStart);
                setLocal('work_day_end', workdayEnd);
            } catch (e) {
                console.debug('Failed to set local workday times', e);
            }
        } catch (e) {
            setLocalError(e?.message || String(e));
        } finally {
            setIsSaving(false);
        }
    }

    if (loading) return <div className="p-6">{t ? t('loadingSettings') : 'Loading settings...'}</div>;

    return (
        <div className="max-w-2xl mx-auto p-6">
            <h1 className="text-2xl font-semibold mb-4">{t ? t('settings') : 'Settings'}</h1>
            {(error || localError) && <div className="mb-4 text-red-600">{t ? t('errorPrefix') : 'Error:'} {localError || error}</div>}
            <form onSubmit={handleSave} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium mb-1">{t ? t('language') : 'Language'}</label>
                    <select
                        value={language}
                        onChange={(e) => {
                            const v = e.target.value;
                            setLanguage(v);
                            try { setLocal('language', v); } catch (err) { /* ignore */ }
                        }}
                        className="block w-full rounded border-gray-300 shadow-sm p-2"
                    >
                        {langOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">{t ? t('theme') : 'Theme'}</label>
                    <select
                        value={theme}
                        onChange={(e) => {
                            const v = e.target.value;
                            setTheme(v);
                            try { setLocal('theme', v); } catch (err) { /* ignore */ }
                        }}
                        className="block w-full rounded border-gray-300 shadow-sm p-2"
                    >
                        {themeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">{t ? t('taskFilter') : 'Task filter'}</label>
                    <select
                        value={taskFilter}
                        onChange={(e) => {
                            const v = e.target.value;
                            setTaskFilter(v);
                            try { setLocal('taskFilter', v); } catch (err) { /* ignore */ }
                        }}
                        className="block w-full rounded border-gray-300 shadow-sm p-2"
                    >
                        {filterOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">{t ? t('taskSort') : 'Task sorting'}</label>
                    <select
                        value={taskSort}
                        onChange={(e) => {
                            const v = e.target.value;
                            setTaskSort(v);
                            try { setLocal('taskSort', v); } catch (err) { /* ignore */ }
                        }}
                        className="block w-full rounded border-gray-300 shadow-sm p-2"
                    >
                        {sortOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>

                {/* Workday start/end inputs (local-only for now) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">{t ? t('workdayStart') : 'Workday start'}</label>
                        <input type="time" value={workdayStart} onChange={(e) => setWorkdayStart(e.target.value)} className="block w-full rounded border-gray-300 shadow-sm p-2" />
                        <p className="text-xs text-gray-500 mt-1">{t ? t('selectWorkdayStartHelp') : 'Select when your workday begins.'}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">{t ? t('workdayEnd') : 'Workday end'}</label>
                        <input type="time" value={workdayEnd} onChange={(e) => setWorkdayEnd(e.target.value)} className="block w-full rounded border-gray-300 shadow-sm p-2" />
                        <p className="text-xs text-gray-500 mt-1">{t ? t('selectWorkdayEndHelp') : 'Select when your workday ends.'}</p>
                    </div>
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
