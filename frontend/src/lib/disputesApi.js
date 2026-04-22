import { getApiBase } from './api';

function authHeaders(accessToken) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
}

export async function reportSessionProblem(accessToken, payload) {
  const base = getApiBase();
  const r = await fetch(`${base}/api/disputes/report/`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err = new Error(
      typeof data?.detail === 'string' ? data.detail : `Signalement impossible (${r.status})`,
    );
    err.status = r.status;
    err.data = data;
    throw err;
  }
  return data;
}

export async function fetchTutorDisputes(accessToken) {
  const base = getApiBase();
  const r = await fetch(`${base}/api/tuteur/disputes/`, {
    headers: authHeaders(accessToken),
  });
  const data = await r.json().catch(() => []);
  if (!r.ok) {
    const err = new Error(
      typeof data?.detail === 'string' ? data.detail : `Chargement signalements impossible (${r.status})`,
    );
    err.status = r.status;
    err.data = data;
    throw err;
  }
  return Array.isArray(data) ? data : [];
}

export async function fetchStudentDisputes(accessToken) {
  const base = getApiBase();
  const r = await fetch(`${base}/api/etudiant/disputes/`, {
    headers: authHeaders(accessToken),
  });
  const data = await r.json().catch(() => []);
  if (!r.ok) {
    const err = new Error(
      typeof data?.detail === 'string' ? data.detail : `Chargement signalements impossible (${r.status})`,
    );
    err.status = r.status;
    err.data = data;
    throw err;
  }
  return Array.isArray(data) ? data : [];
}
