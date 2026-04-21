import { getApiBase } from './api';
import { getAccessToken } from './authStorage';

function authHeaders() {
  const t = getAccessToken();
  const h = { 'Content-Type': 'application/json' };
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

/** GET /api/messenger-users/ — all users except current (for sidebar). */
export async function fetchMessengerUsers() {
  const base = getApiBase();
  const r = await fetch(`${base}/api/messenger-users/`, { headers: authHeaders() });
  if (!r.ok) throw new Error(`messenger-users ${r.status}`);
  return r.json();
}

/** GET /api/conversations/ */
export async function fetchConversations() {
  const base = getApiBase();
  const r = await fetch(`${base}/api/conversations/`, { headers: authHeaders() });
  if (!r.ok) throw new Error(`conversations ${r.status}`);
  return r.json();
}

/** POST /api/conversations/ — { other_user_id } */
export async function createOrGetConversation(otherUserId) {
  const base = getApiBase();
  const r = await fetch(`${base}/api/conversations/`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ other_user_id: otherUserId }),
  });
  if (!r.ok) throw new Error(`conversations POST ${r.status}`);
  return r.json();
}

/** GET /api/messages/:conversationId/?page= */
export async function fetchMessageHistory(conversationId, page = 1) {
  const base = getApiBase();
  const q = new URLSearchParams({ page: String(page) });
  const r = await fetch(`${base}/api/messages/${conversationId}/?${q}`, { headers: authHeaders() });
  if (r.status === 403) throw new Error('forbidden');
  if (!r.ok) throw new Error(`messages ${r.status}`);
  return r.json();
}

/** GET /api/tuteurs/ — pick contact (student). */
export async function fetchTutorsForPicker() {
  const base = getApiBase();
  const r = await fetch(`${base}/api/tuteurs/`);
  if (!r.ok) throw new Error(`tuteurs ${r.status}`);
  return r.json();
}

/** GET /api/etudiants/ — pick contact (tutor). */
export async function fetchStudentsForPicker() {
  const base = getApiBase();
  const r = await fetch(`${base}/api/etudiants/`);
  if (!r.ok) throw new Error(`etudiants ${r.status}`);
  return r.json();
}
