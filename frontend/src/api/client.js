const BASE_URL = '/api';

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('devloop_pos_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const config = {
    ...options,
    headers
  };

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body);
  }

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, config);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 401 && endpoint !== '/auth/login' && endpoint !== '/auth/unlock-pin') {
        // Token expired
        localStorage.removeItem('devloop_pos_token');
        window.dispatchEvent(new CustomEvent('auth:expired'));
      }
      throw new Error(data.message || `Request failed with status ${res.status}`);
    }

    return data;
  } catch (err) {
    throw err;
  }
}
