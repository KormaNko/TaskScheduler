import React from 'react';
import { useNavigate } from 'react-router-dom';
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

  const navigate = useNavigate();

  // Date formatter for planned_start / planned_end
  const dateFormatter = React.useMemo(() => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }), []);
  function formatDate(s) {
    if (!s) return '';
    // backend often returns 'YYYY-MM-DD HH:MM:SS' — convert to ISO-ish for Date parsing
    const iso = String(s).replace(' ', 'T');
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(s);
    return dateFormatter.format(d);
  }

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
      const arr = await fetchMissedRaw();
      setTasks(arr);
    } catch (e) {
      setError(e?.message || 'Failed to load missed tasks');
    } finally {
      setLoading(false);
    }
  }

  // fetch raw data from server and return array (tries query-style then REST fallback)
  async function fetchMissedRaw() {
    try {
      const data = await api.get(ENDPOINTS.list);
      return Array.isArray(data) ? data : data?.data ?? [];
    } catch (e) {
      if (e && e.status === 404) {
        try {
          const data2 = await api.get('/missed-tasks');
          return Array.isArray(data2) ? data2 : data2?.data ?? [];
        } catch (e2) {
          console.debug('REST fallback failed', e2);
        }
      }
      throw e;
    }
  }

  // wait helper
  function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

  async function markCompleted(id) {
    if (!window.confirm(t ? t('confirmMarkCompleted') : 'Mark this task as completed?')) return;
    setProcessing(p => ({ ...p, [id]: true }));
    try {
      // send id in querystring like other endpoints in the app (backend expects id param)
      const res = await api.post(`${ENDPOINTS.complete}&id=${encodeURIComponent(id)}`, {});
      // poll server up to a few times to ensure the task no longer appears on the missed list
      let gone = false;
      for (let i = 0; i < 4; i++) {
        const arr = await fetchMissedRaw();
        if (!arr.find(x => String(x.id) === String(id))) { gone = true; break; }
        await wait(300);
      }
      // final fetch to update UI
      await fetchMissed();
      if (gone) {
        toast.success(res?.message || (t ? t('taskMarkedCompleted') : 'Task marked as completed'));
      } else {
        toast.error(t ? t('warnPersistDelay') : 'Marked locally but server still reports task as missed — retrying shortly');
      }
    } catch (e) {
      // fallback to REST-style POST if first attempt returned 404
      if (e && e.status === 404) {
        try {
          const res2 = await api.post(`/missed-tasks/${id}/complete`, {});
          let gone2 = false;
          for (let i = 0; i < 4; i++) {
            const arr = await fetchMissedRaw();
            if (!arr.find(x => String(x.id) === String(id))) { gone2 = true; break; }
            await wait(300);
          }
          await fetchMissed();
          if (gone2) {
            toast.success(res2?.message || (t ? t('taskMarkedCompleted') : 'Task marked as completed'));
          } else {
            toast.error(t ? t('warnPersistDelay') : 'Marked locally but server still reports task as missed — retrying shortly');
          }
        } catch (e2) {
          console.debug('REST fallback complete failed', e2);
        }
      }
      const msg = e?.response?.message || e?.message || (t ? t('failedMarkCompleted') : 'Failed to mark completed');
      toast.error(msg);
      console.debug('markCompleted error response:', e?.response ?? e);
    } finally {
      setProcessing(p => ({ ...p, [id]: false }));
    }
  }

  async function markNotCompleted(id) {
    if (!window.confirm(t ? t('confirmMarkNotCompleted') : 'Mark this task as NOT completed and reschedule?')) return;
    setProcessing(p => ({ ...p, [id]: true }));
    try {
      const res = await api.post(`${ENDPOINTS.notComplete}&id=${encodeURIComponent(id)}`, {});
      let gone = false;
      for (let i = 0; i < 4; i++) {
        const arr = await fetchMissedRaw();
        if (!arr.find(x => String(x.id) === String(id))) { gone = true; break; }
        await wait(300);
      }
      await fetchMissed();
      if (gone) {
        toast.success(res?.message || (t ? t('taskReenabled') : 'Task re-enabled and scheduler triggered'));
      } else {
        toast.error(t ? t('warnPersistDelay') : 'Operation reported success but server still returns task as missed');
      }
    } catch (e) {
      // fallback to REST-style POST if first attempt returned 404
      if (e && e.status === 404) {
        try {
          const res2 = await api.post(`/missed-tasks/${id}/not-complete`, {});
          let gone2 = false;
          for (let i = 0; i < 4; i++) {
            const arr = await fetchMissedRaw();
            if (!arr.find(x => String(x.id) === String(id))) { gone2 = true; break; }
            await wait(300);
          }
          await fetchMissed();
          if (gone2) {
            toast.success(res2?.message || (t ? t('taskReenabled') : 'Task re-enabled and scheduler triggered'));
          } else {
            toast.error(t ? t('warnPersistDelay') : 'Operation reported success but server still returns task as missed');
          }
        } catch (e2) {
          console.debug('REST fallback not-complete failed', e2);
        }
      }
      const msg = e?.response?.message || e?.message || (t ? t('failedUpdateTask') : 'Failed to update task');
      toast.error(msg);
      console.debug('markNotCompleted error response:', e?.response ?? e);
    } finally {
      setProcessing(p => ({ ...p, [id]: false }));
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">{t ? t('missedTasks') : 'Missed Tasks'}</h2>

      {loading && <div className="p-4 bg-white rounded shadow">Loading…</div>}
      {error && <div className="p-4 bg-red-50 text-red-700 rounded break-words">{String(error)}</div>}

      {!loading && !error && tasks.length === 0 && (
        <div className="p-4 bg-white rounded shadow">{t ? t('noMissedTasks') : 'No missed tasks'}</div>
      )}

      <div className="grid gap-3">
        {tasks.map(task => (
          <div key={task.id} className="p-4 bg-white rounded shadow flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <div className="font-medium text-lg">{task.title || task.name || `#${task.id}`}</div>
              <div className="text-sm text-gray-600">{task.description}</div>
              <div className="text-xs text-gray-500 mt-2">
                {task.planned_start ? `Planned: ${formatDate(task.planned_start)}` : ''}
                {task.planned_end ? ` — ${formatDate(task.planned_end)}` : ''}
              </div>
            </div>

            <div className="mt-3 md:mt-0 flex gap-2">
              <button
                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                onClick={() => markCompleted(task.id)}
                disabled={!!processing[task.id]}
              >
                {processing[task.id] ? '…' : (t ? t('iDidIt') : 'I did it')}
              </button>

              <button
                className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                onClick={() => markNotCompleted(task.id)}
                disabled={!!processing[task.id]}
              >
                {processing[task.id] ? '…' : (t ? t('notDone') : "Didn't do it")}
              </button>

              <button
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                onClick={() => navigate(`/calendar?task=${task.id}`)}
              >
                {t ? t('viewInCalendar') : 'View'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
