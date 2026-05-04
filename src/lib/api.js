// Lightweight API wrapper that always sends cookies and handles 401 centrally
// Use VITE_API_BASE when provided; otherwise default to '/api' so Vite dev proxy forwards requests and avoids CORS during development.
//tuto logiku tiez cele AI
const API_BASE = (import.meta.env.VITE_API_BASE ?? '/api').replace(/\/$/, '');

async function request(path, opts = {}) {
  const url = `${API_BASE}${path}`;
  let res;

  // Prepare method and headers, and automatically attach CSRF token for mutating requests
  const method = (opts.method || 'GET').toUpperCase();
  const headers = { Accept: 'application/json', ...(opts.headers || {}) };

  // pridať CSRF token pre mutácie
  if (method !== 'GET') {
    try {
      // Try multiple locations: localStorage keys and common cookie names
      let csrf = null;
      try { csrf = localStorage.getItem('csrfToken') ?? localStorage.getItem('csrf_token') ?? localStorage.getItem('csrfToken'); } catch (e) { csrf = null; }
      if (!csrf && typeof document !== 'undefined' && document.cookie) {
        const cookies = Object.fromEntries(document.cookie.split(';').map(s => s.split('=').map(p => p && p.trim())));
        const cookieKeys = ['csrfToken','csrf_token','XSRF-TOKEN','XSRF_TOKEN','X-CSRF-Token','token'];
        for (const k of cookieKeys) {
          if (cookies[k]) { csrf = decodeURIComponent(cookies[k]); break; }
        }
      }
      if (csrf) csrf = String(csrf).trim();
      if (csrf) {
        // Send multiple common header variants so backend accepts whichever it expects
        headers['X-CSRF-Token'] = csrf;
        headers['X-XSRF-TOKEN'] = csrf;
        headers['X-CSRFToken'] = csrf;
        headers['XSRF-TOKEN'] = csrf;
      }
    } catch (e) { /* ignore */ }
  }

  try {
    res = await fetch(url, {
      method,
      mode: 'cors',
      credentials: 'include',
      headers,
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
  // Inject CSRF token into JSON body for servers that expect token there
  let payload = body;
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    try {
      const token = (typeof localStorage !== 'undefined' && (localStorage.getItem('csrfToken') ?? localStorage.getItem('csrf_token'))) || null;
      if (token && !payload.csrf_token && !payload.csrfToken) {
        payload = { ...payload, csrf_token: String(token).trim() };
      }
    } catch (e) { /* ignore */ }
  } else if (!payload) {
    // ensure body is at least an empty object so we can include token when present
    try {
      const token = (typeof localStorage !== 'undefined' && (localStorage.getItem('csrfToken') ?? localStorage.getItem('csrf_token'))) || null;
      if (token) payload = { csrf_token: String(token).trim() };
    } catch (e) { /* ignore */ }
  }

  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  const opts2 = { method: 'POST', body: typeof payload === 'string' ? payload : JSON.stringify(payload), headers, ...opts };
  return request(path, opts2);
}
export default { get, post, request, API_BASE };
