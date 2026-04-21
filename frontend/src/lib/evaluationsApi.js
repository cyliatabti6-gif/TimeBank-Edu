import { getApiBase } from './api';

function firstErrorMessage(data) {
  if (!data || typeof data !== 'object') return 'Erreur inconnue';
  if (typeof data.detail === 'string') return data.detail;
  for (const v of Object.values(data)) {
    if (Array.isArray(v) && v.length && typeof v[0] === 'string') return v[0];
    if (typeof v === 'string') return v;
  }
  return 'Impossible d’enregistrer l’évaluation.';
}

/** Détecte l’erreur DRF « pk invalide » (souvent réservation locale sans ligne Django). */
export function humanizeEvaluationError(err) {
  const raw = err instanceof Error ? err.message : String(err || '');
  if (raw.includes('Clé primaire') || /Invalid pk/i.test(raw) || /does not exist/i.test(raw)) {
    return (
      'Cette réservation n’existe pas sur le serveur. Si la séance venait du mode hors ligne du navigateur, '
      + 'elle ne peut pas être notée : utilisez une séance complétée enregistrée dans Django (depuis « Mes tutorats » avec l’API active).'
    );
  }
  return raw || 'Impossible d’enregistrer l’évaluation.';
}

/**
 * @param {string} accessToken
 * @param {{ reservation: number, note: number, commentaire?: string }} body
 */
export async function submitSessionEvaluation(accessToken, body) {
  const base = getApiBase();
  const r = await fetch(`${base}/api/evaluations/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      reservation: body.reservation,
      note: body.note,
      commentaire: (body.commentaire || '').trim().slice(0, 500),
    }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(firstErrorMessage(data));
  return data;
}

/** Avis reçus par le tuteur connecté (JWT). */
export async function fetchTutorEvaluationsRecues(accessToken) {
  const base = getApiBase();
  const r = await fetch(`${base}/api/tuteur/evaluations-recues/`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!r.ok) throw new Error(`evaluations-recues ${r.status}`);
  return r.json();
}

/** Avis publics sur un tuteur (sans auth). Étudiants masqués côté API. */
export async function fetchTutorPublicAvis(tutorId) {
  const base = getApiBase();
  const r = await fetch(`${base}/api/tuteurs/${tutorId}/avis/`);
  if (!r.ok) throw new Error(`avis tuteur ${r.status}`);
  return r.json();
}
