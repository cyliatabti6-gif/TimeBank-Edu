import { getApiBase } from './api';

function authHeaders(accessToken) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
}

export async function fetchNotifications(accessToken) {
  const base = getApiBase();
  const r = await fetch(`${base}/api/notifications/`, {
    headers: authHeaders(accessToken),
  });
  if (!r.ok) {
    const err = new Error(`notifications ${r.status}`);
    err.status = r.status;
    throw err;
  }
  return r.json();
}

export async function markNotificationRead(accessToken, notificationId) {
  const base = getApiBase();
  const r = await fetch(`${base}/api/notifications/${notificationId}/read/`, {
    method: 'PATCH',
    headers: authHeaders(accessToken),
  });
  if (!r.ok) {
    const err = new Error(`notifications/read ${r.status}`);
    err.status = r.status;
    throw err;
  }
  return r.json();
}

export async function markAllNotificationsRead(accessToken) {
  const base = getApiBase();
  const r = await fetch(`${base}/api/notifications/read-all/`, {
    method: 'PATCH',
    headers: authHeaders(accessToken),
  });
  if (!r.ok) {
    const err = new Error(`notifications/read-all ${r.status}`);
    err.status = r.status;
    throw err;
  }
  return r.json();
}
