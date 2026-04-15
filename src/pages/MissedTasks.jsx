import React from 'react';
import { useOptions } from '../contexts/OptionsContext.jsx';
import api from '../lib/api.js';
import { useToast } from '../components/ToastContext.jsx';

export default function MissedTasks() {
  const { t } = useOptions();
  const toast = useToast();
  const [tasks, setTasks] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [processing, setProcessing] = React.useState({}); // id -> true
  const [selected, setSelected] = React.useState({}); // id -> true
  const [search, setSearch] = React.useState('');
  const [selectAll, setSelectAll] = React.useState(false);

  // Date formatter for planned_start / planned_end
  // (no per-item date formatting needed in compact list)

  React.useEffect(() => {
    fetchMissed();
    // listen to global refresh events (e.g., after reschedule)
    function onRefresh() { fetchMissed(); }
    window.addEventListener('app:refresh-missed-tasks', onRefresh);
    return () => window.removeEventListener('app:refresh-missed-tasks', onRefresh);
  }, []);

  // Use the project's query-style controller endpoints (consistent with other pages)
  const ENDPOINTS = {
    list: '/?c=missedTasks&a=index',
    complete: '/?c=missedTasks&a=complete',
    notComplete: '/?c=missedTasks&a=notComplete'
  };

  // fetch data and set component state
  async function fetchMissed() {
    setLoading(true);
    setError(null);
    try {
      // Send client-side current time as `before` to avoid server/client NOW() mismatch
      // Add a small future buffer to include borderline tasks (in seconds)
      const BUFFER_SECONDS = Number(import.meta.env.VITE_MISSED_BUFFER_SEC ?? 30);
      const now = new Date(Date.now() + (BUFFER_SECONDS * 1000));
      const pad = (n) => String(n).padStart(2, '0');
      const before = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      const path = `${ENDPOINTS.list}&before=${encodeURIComponent(before)}`;
      const data = await api.get(path);
      setTasks(Array.isArray(data) ? data : data?.data ?? []);
      // reset selection on refetch
      setSelected({});
      setSelectAll(false);
    } catch (e) {
      setError(e?.message || 'Failed to load missed tasks');
    } finally {
      setLoading(false);
    }
  }

  // Bulk actions - perform per-item requests (safe without assuming backend bulk API)
  async function markCompletedMany(ids) {
    if (!ids || ids.length === 0) return;
    if (!window.confirm(t ? t('confirmMarkCompletedMany') : `Mark ${ids.length} task(s) as completed?`)) return;
    // set all processing
    const proc = {};
    ids.forEach(id => { proc[id] = true; });
    setProcessing(p => ({ ...p, ...proc }));
    let errors = 0;
    for (const id of ids) {
      try {
        // call single-item endpoint
        // eslint-disable-next-line no-await-in-loop
        await api.post(`${ENDPOINTS.complete}&id=${encodeURIComponent(id)}`, {});
      } catch (e) {
        errors++;
      }
    }
    await fetchMissed();
    if (errors === 0) toast.success(t ? t('tasksMarkedCompleted') : `${ids.length} task(s) marked completed`);
    else toast.error(t ? t('someTasksFailed') : `Completed ${ids.length - errors}/${ids.length}; some failed`);
  }

  async function markNotCompletedMany(ids) {
    if (!ids || ids.length === 0) return;
    if (!window.confirm(t ? t('confirmMarkNotCompletedMany') : `Mark ${ids.length} task(s) as NOT completed and reschedule?`)) return;
    const proc = {};
    ids.forEach(id => { proc[id] = true; });
    setProcessing(p => ({ ...p, ...proc }));
    let errors = 0;
    for (const id of ids) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await api.post(`${ENDPOINTS.notComplete}&id=${encodeURIComponent(id)}`, {});
      } catch (e) {
        errors++;
      }
    }
    await fetchMissed();
    if (errors === 0) toast.success(t ? t('tasksReenabled') : `${ids.length} task(s) re-enabled`);
    else toast.error(t ? t('someTasksFailed') : `Updated ${ids.length - errors}/${ids.length}; some failed`);
  }

  // selection helpers
  function toggleSelect(id) {
    setSelected(s => {
      const next = { ...s };
      if (next[id]) delete next[id];
      else next[id] = true;
      setSelectAll(false);
      return next;
    });
  }
  function toggleSelectAll(visibleIds) {
    if (selectAll) {
      setSelected({});
      setSelectAll(false);
      return;
    }
    const next = {};
    visibleIds.forEach(id => { next[id] = true; });
    setSelected(next);
    setSelectAll(true);
  }

  // derived filtered list
  const visibleTasks = React.useMemo(() => {
    const q = String(search || '').trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter(t => {
      // exclude specific task id 729 per user request
      const idStr = String(t.id || '');
      if (idStr === '729') return false;
      return (
        String(t.title || t.name || '').toLowerCase().includes(q) ||
        String(t.description || '').toLowerCase().includes(q) ||
        String(t.category_name || t.category || '').toLowerCase().includes(q) ||
        idStr.toLowerCase().includes(q)
      );
    });
  }, [tasks, search]);

  const selectedCount = Object.keys(selected).length;

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">{t ? t('missedTasks') : 'Missed Tasks'}</h2>

      {/* Top controls: search + refresh */}
      <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-2 w-full md:w-1/2">
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t ? t('searchPlaceholder') : 'Search tasks by title, description, category or id...'}
            className="w-full px-3 py-2 border rounded shadow-sm"
            aria-label={t ? t('searchTasks') : 'Search tasks'}
          />
        </div>

        <div className="flex gap-2 items-center">
          <div className="text-sm text-gray-600">{visibleTasks.length} {t ? t('visible') : 'visible'}</div>
        </div>
      </div>

      {loading && <div className="p-4 bg-white rounded shadow">Loading…</div>}
      {error && <div className="p-4 bg-red-50 text-red-700 rounded break-words">{String(error)}</div>}

      {!loading && !error && tasks.length === 0 && (
        <div className="p-4 bg-white rounded shadow">{t ? t('noMissedTasks') : 'No missed tasks'}</div>
      )}

      {/* Bulk action bar: only visible when there is at least one selection */}
      {selectedCount > 0 && (
        <div className="mb-3 flex items-center justify-between bg-white border rounded p-3 shadow-sm">
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={() => toggleSelectAll(visibleTasks.map(v => v.id))}
                className="form-checkbox h-4 w-4"
              />
              <span className="text-sm">{t ? t('selectAll') : 'Select all visible'}</span>
            </label>

            <div className="text-sm text-gray-600">{selectedCount} {t ? t('selected') : 'selected'}</div>
          </div>

          <div className="flex gap-2">
            <button
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-blue-500 shadow-sm hover:from-indigo-600 hover:to-blue-600"
              onClick={() => markCompletedMany(Object.keys(selected))}
            >
              {t ? t('completed') : 'Completed'}
            </button>

            <button
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600"
              onClick={() => markNotCompletedMany(Object.keys(selected))}
            >
              {t ? t('notCompleteYet') : 'Not complete yet'}
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-2">
        {visibleTasks.map(task => {
          // determine category color or fallback
          const catColor = task.category_color || task.category?.color || task.color || null;
          const borderStyle = catColor ? { borderLeft: `6px solid ${catColor}` } : {};
          const cardStyle = { ...borderStyle, backgroundColor: catColor ? hexToRGBA(catColor, 0.06) : undefined };
          return (
            <div key={task.id} className="p-2 bg-white rounded shadow-sm flex items-center justify-between" style={cardStyle}>
              <div className="flex items-center gap-3 w-full">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!selected[task.id]}
                    onChange={() => toggleSelect(task.id)}
                    disabled={!!processing[task.id]}
                    className="form-checkbox h-4 w-4"
                  />
                </label>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium text-base truncate">{task.title || task.name}</div>
                    {task.category_name || task.category?.name ? (
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs ml-2" style={{ background: catColor ? catColor : '#eee', color: catColor ? (getContrastYIQ(catColor)) : '#333' }}>{task.category_name || task.category?.name}</span>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* actions live only in the top bulk bar */}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// utility to compute readable text color based on background
function getContrastYIQ(hexcolor) {
  try {
    let c = hexcolor.replace('#', '');
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
