// Lightweight API wrapper that always sends cookies and handles 401 centrally
// Use VITE_API_BASE when provided; otherwise default to '/api' so Vite dev proxy forwards requests and avoids CORS during development.
//tuto logiku tiez cele AI
const API_BASE = (import.meta.env.VITE_API_BASE ?? '/api').replace(/\/$/, '');

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

  // If server redirected to a login page (common when session expired), treat it as unauthorized
  // fetch sets `res.redirected` when a redirect was followed; some backends may return 301/302 with a Location header
  const locationHeader = res.headers && typeof res.headers.get === 'function' ? res.headers.get('location') : null;
  const redirectedToLogin = res.redirected || (locationHeader && /auth&a=login/.test(locationHeader));
  if (res.status === 401 || redirectedToLogin) {
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
