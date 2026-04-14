import React, { useEffect, useState } from 'react';
import api from '../lib/api.js';
import { useOptions } from '../contexts/OptionsContext.jsx';

// Modal that lists mis-scheduled tasks (tasks whose planned times are after their deadline).
// NOTE: Backend endpoint for these tasks is `/?c=misscheduledTasks&a=index`.
// The backend sometimes returns snake_case or camelCase fields; this component tolerates both.
export default function ModalMisscheduledTasks({ open = false, onClose = () => {}, onRefresh = null, listEndpoint = null, initialTasks = null }) {
  const { t } = useOptions();
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    if (initialTasks && Array.isArray(initialTasks)) {
      setTasks(initialTasks);
      setError(null);
      setLoading(false);
      return;
    }
    fetchMisScheduled();
  }, [open, initialTasks]);

  // Helper to read a value from task using multiple possible field names
  function read(task, ...names) {
    for (const n of names) {
      if (task == null) break;
      const v = task[n];
      if (v !== undefined && v !== null && String(v) !== '') return v;
    }
    return null;
  }

  function formatDate(s) {
    if (!s) return '';
    const iso = String(s).replace(' ', 'T');
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(s);
    return d.toLocaleString();
  }

  const DEFAULT_LIST = '/?c=misscheduledTasks&a=index';
  const ENDPOINTS = { list: listEndpoint || DEFAULT_LIST };

  async function fetchMisScheduled() {
    setLoading(true); setError(null);
    try {
      const data = await api.get(ENDPOINTS.list);
      // debug log to inspect raw response in browser console when modal opens
      try { console.debug('[ModalMisscheduledTasks] fetched data:', data); } catch (e) { /* ignore */ }
      setTasks(Array.isArray(data) ? data : data?.data ?? []);
    } catch (e) {
      setError(e?.message || 'Failed to load mis-scheduled tasks');
    } finally { setLoading(false); }
  }

  function isPlannedAfterDeadline(task) {
    try {
      // Match backend: require deadline IS NOT NULL, planned_start IS NOT NULL and planned_end IS NOT NULL
      // and both planned_start > deadline AND planned_end > deadline
      const dlRaw = read(task, 'deadline', 'deadline_at', 'deadlineDate', 'deadline_date');
      const psRaw = read(task, 'planned_start', 'plannedStart', 'planned_start_at');
      const peRaw = read(task, 'planned_end', 'plannedEnd', 'planned_end_at');

      if (!dlRaw || !psRaw || !peRaw) return false;
      const dl = Date.parse(String(dlRaw).replace(' ', 'T'));
      const ps = Date.parse(String(psRaw).replace(' ', 'T'));
      const pe = Date.parse(String(peRaw).replace(' ', 'T'));
      if (isNaN(dl) || isNaN(ps) || isNaN(pe)) return false;
      return (ps > dl) && (pe > dl);
    } catch (e) { return false; }
  }

  if (!open) return null;

  // Close handler that also triggers optional onRefresh so parent can refresh its data
  function handleClose() {
    try { if (typeof onRefresh === 'function') onRefresh(); } catch (e) { /* ignore */ }
    try { onClose(); } catch (e) { /* ignore */ }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start md:items-center justify-center z-50">
      <div className="relative bg-white w-full max-w-3xl mx-4 rounded-xl shadow-lg p-6 z-10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold">{t ? t('misScheduledTasks') : 'Mis-scheduled tasks'}</h3>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">×</button>
        </div>

        <div className="mt-4">
          {loading && <div className="p-3 bg-white rounded shadow">Loading…</div>}
          {error && <div className="p-3 bg-red-50 text-red-700 rounded break-words">{String(error)}</div>}

          {!loading && !error && tasks.length === 0 && (
            <div className="p-4 bg-green-50 text-green-800 rounded">{t ? t('noMisScheduled') : 'No mis-scheduled tasks'}</div>
          )}

          {!loading && tasks.length > 0 && (
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b">
                    <th className="p-2">{t ? t('title') : 'Title'}</th>
                    <th className="p-2">{t ? t('deadline') : 'Deadline'}</th>
                    <th className="p-2">{t ? t('plannedStart') : 'Planned start'}</th>
                    <th className="p-2">{t ? t('plannedEnd') : 'Planned end'}</th>
                    <th className="p-2">{t ? t('status') : 'Status'}</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map(task => {
                    const title = read(task, 'title', 'name') || `#${read(task, 'id')}`;
                    const dl = read(task, 'deadline', 'deadline_at', 'deadline_date', 'deadlineDate');
                    const ps = read(task, 'planned_start', 'plannedStart', 'planned_start_at');
                    const pe = read(task, 'planned_end', 'plannedEnd', 'planned_end_at');
                    const plannedAfter = isPlannedAfterDeadline(task);

                    return (
                      <tr key={read(task, 'id') || title} className="border-b">
                        <td className="p-2 align-top">{title}</td>
                        <td className="p-2 align-top">{dl ? formatDate(dl) : '-'}</td>
                        <td className="p-2 align-top">{ps ? formatDate(ps) : '-'}</td>
                        <td className="p-2 align-top">{pe ? formatDate(pe) : '-'}</td>
                        <td className={`p-2 align-top ${plannedAfter ? 'text-red-700' : 'text-gray-600'}`}>
                          {plannedAfter ? (t ? t('plannedAfterDeadline') : 'Planned after deadline') : (t ? t('ok') : 'OK')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <button onClick={handleClose} className="px-4 py-2 bg-gray-100 rounded">Close</button>
        </div>
      </div>
    </div>
  );
}
