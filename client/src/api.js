const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}/api${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const data = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

export const api = {
  me: () => request('/auth/me'),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  readings: (params = '') => request(`/readings${params}`),
  createReading: (body) => request('/readings', { method: 'POST', body: JSON.stringify(body) }),
  updateReading: (id, body) => request(`/readings/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteReading: (id) => request(`/readings/${id}`, { method: 'DELETE' }),
  report: (type, date) => request(`/reports/${type}?date=${date}`),
  trend: (date) => request(`/reports/trend?date=${date}`)
};
