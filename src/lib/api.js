// Lightweight API wrapper that always sends cookies and handles 401 centrally
const API_BASE = (import.meta.env.VITE_API_BASE || 'http://localhost').replace(/\/$/, '');

async function request(path, opts = {}) {
  const url = `${API_BASE}${path}`;
  let res;
  try {
    res = await fetch(url, {
      method: opts.method || 'GET',
      mode: 'cors',
      credentials: 'include',
      headers: { Accept: 'application/json', ...(opts.headers || {}) },
      body: opts.body,
    });
  } catch (err) {
    // network or CORS error (fetch throws TypeError)
    const e = new Error(`Network error or CORS blocked: ${err.message || err}`);
    e.cause = err;
    throw e;
  }

  // If server returns 401, dispatch app-wide logged-out event so UI can clear state
  if (res.status === 401) {
    try { window.dispatchEvent(new Event('app:logged-out')); } catch (e) { /* ignore */ }
    const err = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }

  // Try to parse JSON
  let data = null;
  try { data = await res.json(); } catch (e) { /* not JSON or empty */ }

  if (!res.ok) {
    const msg = data?.message || data?.error || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.response = data;
    throw err;
  }

  return data;
}

export async function get(path, opts = {}) { return request(path, { method: 'GET', ...opts }); }
export async function post(path, body, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  const opts2 = { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers, ...opts };
  return request(path, opts2);
}
export default { get, post, request, API_BASE };
