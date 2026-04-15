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
  const [success, setSuccess] = useState(null);
  // Track which task IDs are currently having their category removed
  const [removingIds, setRemovingIds] = useState([]);
  // Selected task ids for bulk actions
  const [selectedIds, setSelectedIds] = useState([]);

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
    setLoading(true); setError(null); setSuccess(null);
    try {
      const data = await api.get(ENDPOINTS.list);
      // debug log to inspect raw response in browser console when modal opens
      try { console.debug('[ModalMisscheduledTasks] fetched data:', data); } catch (e) { /* ignore */ }
      const list = Array.isArray(data) ? data : data?.data ?? [];
      setTasks(Array.isArray(list) ? list : []);
      // reset selection on refresh
      setSelectedIds([]);
    } catch (e) {
      setError(e?.message || 'Failed to load mis-scheduled tasks');
    } finally { setLoading(false); }
  }

  // low-level helper to send the removeCategory request for a single id
  async function sendRemoveById(id) {
    if (!id) throw new Error('Missing id');
    // mark removing
    setRemovingIds((s) => (Array.isArray(s) ? [...s, String(id)] : [String(id)]));
    try {
      await api.request('/?c=misscheduledTasks&a=removeCategory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: Number(id) })
      });
      return { ok: true };
    } catch (err) {
      console.error('sendRemoveById error', id, err, err?.response);
      const serverResp = err?.response;
      const serverMsg = serverResp?.message || serverResp?.error || (serverResp ? JSON.stringify(serverResp) : null);
      return { ok: false, message: serverMsg || err?.message || 'Failed' };
    } finally {
      // clear removing mark for this id
      setRemovingIds((s) => (Array.isArray(s) ? s.filter(x => String(x) !== String(id)) : []));
    }
  }

  // Remove category from a task by calling the backend. The backend may accept id either
  // in the POST body or as a query param; try body first then fallback to query param.
  async function removeCategoryFromTask(task) {
    const id = read(task, 'id');
    if (!id) return;
    if (!confirm(t ? t('confirmRemoveCategory') || 'Remove category from this task?' : 'Remove category from this task?')) return;
    setError(null); setSuccess(null);
    const res = await sendRemoveById(id);
    if (!res.ok) { setError(res.message || 'Failed to remove category'); return; }
    setSuccess(t ? t('categoryRemoved') || 'Category removed' : 'Category removed');
    try { await fetchMisScheduled(); } catch (e) { /* ignore */ }
    try { if (typeof onRefresh === 'function') onRefresh(); } catch (e) { /* ignore */ }
  }

  // Bulk remove selected task categories
  async function removeSelected() {
    if (!selectedIds || selectedIds.length === 0) return;
    if (!confirm(t ? t('confirmRemoveCategorySelected') || `Remove category from ${selectedIds.length} selected tasks?` : `Remove category from ${selectedIds.length} selected tasks?`)) return;
    setError(null); setSuccess(null);
    const errors = [];
    for (const id of selectedIds.slice()) {
      const res = await sendRemoveById(id);
      if (!res.ok) errors.push({ id, message: res.message });
    }
    try { await fetchMisScheduled(); } catch (e) { /* ignore */ }
    try { if (typeof onRefresh === 'function') onRefresh(); } catch (e) { /* ignore */ }
    if (errors.length) {
      setError(`${errors.length} operations failed. See console for details.`);
      console.error('removeSelected errors', errors);
    } else {
      setSuccess(t ? t('categoriesRemoved') || 'Categories removed' : 'Categories removed');
    }
  }

  // Remove category from all tasks that currently have category
  async function removeAllCategories() {
    const ids = (tasks || []).filter((task) => !!(task && (task.category || read(task, 'category_id', 'category')))).map((task) => String(read(task, 'id'))).filter(Boolean);
    if (ids.length === 0) return;
    if (!confirm(t ? t('confirmRemoveCategoryAll') || `Remove category from ALL (${ids.length}) tasks?` : `Remove category from ALL (${ids.length}) tasks?`)) return;
    setError(null); setSuccess(null);
    const errors = [];
    for (const id of ids) {
      const res = await sendRemoveById(id);
      if (!res.ok) errors.push({ id, message: res.message });
    }
    try { await fetchMisScheduled(); } catch (e) { /* ignore */ }
    try { if (typeof onRefresh === 'function') onRefresh(); } catch (e) { /* ignore */ }
    if (errors.length) {
      setError(`${errors.length} operations failed. See console for details.`);
      console.error('removeAllCategories errors', errors);
    } else {
      setSuccess(t ? t('categoriesRemoved') || 'Categories removed' : 'Categories removed');
    }
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
          {success && <div className="p-3 bg-green-50 text-green-800 rounded">{String(success)}</div>}
          {error && <div className="p-3 bg-red-50 text-red-700 rounded break-words">{String(error)}</div>}

          {/* Bulk action controls */}
          {!loading && tasks.length > 0 && (
            <div className="mb-2 flex items-center gap-2">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedIds.length > 0 && selectedIds.length === tasks.filter(t => !!(t && (t.category || read(t, 'category_id', 'category')))).length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      const ids = (tasks || []).filter((task) => !!(task && (task.category || read(task, 'category_id', 'category')))).map((task) => String(read(task, 'id'))).filter(Boolean);
                      setSelectedIds(ids);
                    } else setSelectedIds([]);
                  }}
                />
                <span className="text-sm text-gray-600">{t ? t('selectAllWithCategory') || 'Select all with category' : 'Select all with category'}</span>
              </label>
              <button onClick={removeSelected} disabled={selectedIds.length === 0} className="px-3 py-1 bg-red-600 text-white rounded text-sm disabled:opacity-50">{t ? t('removeSelected') : 'Remove selected'}</button>
              <button onClick={removeAllCategories} className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm">{t ? t('removeAll') : 'Remove all categories'}</button>
            </div>
          )}

          {!loading && !error && tasks.length === 0 && (
            <div className="p-4 bg-green-50 text-green-800 rounded">{t ? t('noMisScheduled') : 'No mis-scheduled tasks'}</div>
          )}

          {!loading && tasks.length > 0 && (
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b">
                    <th className="p-2">&nbsp;</th>
                    <th className="p-2">{t ? t('title') : 'Title'}</th>
                    <th className="p-2">{t ? t('deadline') : 'Deadline'}</th>
                    <th className="p-2">{t ? t('plannedStart') : 'Planned start'}</th>
                    <th className="p-2">{t ? t('plannedEnd') : 'Planned end'}</th>
                    <th className="p-2">{t ? t('status') : 'Status'}</th>
                    <th className="p-2">{t ? t('actions') : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map(task => {
                    const id = read(task, 'id');
                    const title = read(task, 'title', 'name') || `#${id}`;
                    const dl = read(task, 'deadline', 'deadline_at', 'deadline_date', 'deadlineDate');
                    const ps = read(task, 'planned_start', 'plannedStart', 'planned_start_at');
                    const pe = read(task, 'planned_end', 'plannedEnd', 'planned_end_at');
                    const plannedAfter = isPlannedAfterDeadline(task);
                    const categoryPresent = !!(task && (task.category || read(task, 'category_id', 'category') ));
                    const isRemoving = removingIds.includes(String(id));
                    const isSelected = selectedIds.includes(String(id));

                    return (
                      <tr key={read(task, 'id') || title} className="border-b">
                        <td className="p-2 align-top">
                          {categoryPresent ? (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedIds((s) => Array.isArray(s) ? [...s, String(id)] : [String(id)]);
                                else setSelectedIds((s) => (Array.isArray(s) ? s.filter(x => String(x) !== String(id)) : []));
                              }}
                            />
                          ) : null}
                        </td>
                        <td className="p-2 align-top">{title}</td>
                        <td className="p-2 align-top">{dl ? formatDate(dl) : '-'}</td>
                        <td className="p-2 align-top">{ps ? formatDate(ps) : '-'}</td>
                        <td className="p-2 align-top">{pe ? formatDate(pe) : '-'}</td>
                        <td className={`p-2 align-top ${plannedAfter ? 'text-red-700' : 'text-gray-600'}`}>
                          {plannedAfter ? (t ? t('plannedAfterDeadline') : 'Planned after deadline') : (t ? t('ok') : 'OK')}
                        </td>
                        <td className="p-2 align-top">
                          {categoryPresent ? (
                            <button
                              type="button"
                              onClick={() => removeCategoryFromTask(task)}
                              disabled={isRemoving}
                              className={`px-2 py-1 rounded text-sm ${isRemoving ? 'bg-gray-200 text-gray-600' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                              title={t ? t('removeCategory') : 'Remove category'}
                            >
                              {isRemoving ? (t ? t('removing') : 'Removing…') : (t ? t('removeCategory') : 'Remove category')}
                            </button>
                          ) : null}
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
