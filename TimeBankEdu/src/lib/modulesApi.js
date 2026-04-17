import { getApiBase } from './api';

/**
 * Liste les modules du tuteur connecté (JWT).
 * @param {string} accessToken
 */
export async function fetchMyTutorModules(accessToken) {
  const base = getApiBase();
  const r = await fetch(`${base}/api/tuteur/modules/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!r.ok) throw new Error(`mes-modules ${r.status}`);
  return r.json();
}

/**
 * Publie un module (tuteur connecté, JWT).
 * @param {object} body — titre, niveau, format_seance, creneaux, planning?, description?, duree_label?, tags?
 * @param {string} accessToken
 */
export async function createTutorModule(body, accessToken) {
  const base = getApiBase();
  const r = await fetch(`${base}/api/tuteur/modules/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = typeof data === 'object' && data && (data.detail || data.message);
    const err = new Error(msg || `Erreur ${r.status}`);
    err.status = r.status;
    err.data = data;
    throw err;
  }
  return data;
}

/**
 * Détail d'un module appartenant au tuteur connecté (JWT).
 * @param {number|string} moduleId
 * @param {string} accessToken
 */
export async function fetchMyTutorModuleById(moduleId, accessToken) {
  const base = getApiBase();
  const r = await fetch(`${base}/api/tuteur/modules/${moduleId}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = typeof data === 'object' && data && (data.detail || data.message);
    const err = new Error(msg || `Erreur ${r.status}`);
    err.status = r.status;
    err.data = data;
    throw err;
  }
  return data;
}

/**
 * Met à jour un module appartenant au tuteur connecté (JWT).
 * @param {number|string} moduleId
 * @param {object} body
 * @param {string} accessToken
 */
export async function updateTutorModule(moduleId, body, accessToken) {
  const base = getApiBase();
  const r = await fetch(`${base}/api/tuteur/modules/${moduleId}/`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = typeof data === 'object' && data && (data.detail || data.message);
    const err = new Error(msg || `Erreur ${r.status}`);
    err.status = r.status;
    err.data = data;
    throw err;
  }
  return data;
}

/**
 * Liste des modules proposés (catalogue).
 * @param {{ niveau?: string }} params — ex. { niveau: 'L2' }
 */
export async function fetchModules(params = {}) {
  const base = getApiBase();
  const q = new URLSearchParams();
  if (params.niveau) q.set('niveau', params.niveau);
  const qs = q.toString();
  const url = `${base}/api/modules/${qs ? `?${qs}` : ''}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`modules ${r.status}`);
  return r.json();
}

export async function fetchModuleById(id) {
  const base = getApiBase();
  const r = await fetch(`${base}/api/modules/${id}/`);
  if (!r.ok) throw new Error(`module ${r.status}`);
  return r.json();
}

/** Modules publiés d’un tuteur (id utilisateur), sans token. */
export async function fetchPublishedModulesByTutorId(tutorId) {
  const base = getApiBase();
  const r = await fetch(`${base}/api/tuteurs/${tutorId}/modules/`);
  if (!r.ok) throw new Error(`modules-tuteur ${r.status}`);
  return r.json();
}
