import { getApiBase } from './api';
import { getAccessToken } from './authStorage';

function authHeaders() {
  const token = getAccessToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function parseJsonSafe(response) {
  return response.json().catch(() => ({}));
}

async function request(path, options = {}) {
  const base = getApiBase();
  const response = await fetch(`${base}${path}`, {
    headers: authHeaders(),
    ...options,
  });
  const data = await parseJsonSafe(response);
  if (!response.ok) {
    const err = new Error(data?.detail || `HTTP ${response.status}`);
    err.status = response.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const fetchAdminUsers = () => request('/api/admin/users/');
export const createAdminUser = (body) =>
  request('/api/admin/users/', { method: 'POST', body: JSON.stringify(body) });
export const patchAdminUser = (id, body) =>
  request(`/api/admin/users/${id}/`, { method: 'PATCH', body: JSON.stringify(body) });

export const fetchAdminModules = () => request('/api/admin/modules/');
export const createAdminModule = (body) =>
  request('/api/admin/modules/', { method: 'POST', body: JSON.stringify(body) });
export const patchAdminModule = (id, body) =>
  request(`/api/admin/modules/${id}/`, { method: 'PATCH', body: JSON.stringify(body) });

export const fetchAdminTransactions = () => request('/api/admin/transactions/');

export const fetchAdminDisputes = () => request('/api/admin/disputes/');
export const patchAdminDispute = (id, body) =>
  request(`/api/admin/disputes/${id}/`, { method: 'PATCH', body: JSON.stringify(body) });

export const fetchAdminStats = () => request('/api/admin/stats/');

export const fetchAdminSettings = () => request('/api/admin/settings/');
export const patchAdminSettings = (body) =>
  request('/api/admin/settings/', { method: 'PATCH', body: JSON.stringify(body) });
