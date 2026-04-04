import React from 'react';

const ToastContext = React.createContext(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = React.useState([]);

  function addToast({ type = 'info', title = '', message = '', timeout = 4000 }) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const t = { id, type, title, message };
    setToasts(s => [t, ...s]);
    if (timeout > 0) {
      setTimeout(() => removeToast(id), timeout);
    }
    return id;
  }

  function removeToast(id) {
    setToasts(s => s.filter(x => x.id !== id));
  }

  const api = React.useMemo(() => ({
    success: (m, title) => addToast({ type: 'success', title: title || '', message: m }),
    error: (m, title) => addToast({ type: 'error', title: title || '', message: m, timeout: 6000 }),
    remove: removeToast
  }), []);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed right-4 top-4 z-50 flex flex-col gap-3 max-w-sm">
        {toasts.map(t => (
          <div key={t.id} className={`w-80 p-3 rounded shadow-lg border ${t.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : t.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-white border-gray-200 text-gray-900'}`}>
            {t.title && <div className="font-semibold mb-1">{t.title}</div>}
            <div className="text-sm">{t.message}</div>
            <button onClick={() => removeToast(t.id)} className="text-xs mt-2 text-gray-500 hover:underline">Dismiss</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
