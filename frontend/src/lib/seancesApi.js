import { getApiBase } from './api';
import { parseDrfErrorBody } from './apiErrors';

/**
 * Séances de tutorat où l’utilisateur connecté est l’étudiant (JWT).
 * @returns {Promise<Array<{ id, tutor, tutorId, module, date, time, duration, status }>>}
 */
/** Tuteurs liés à l’étudiant (passé + à venir), agrégés depuis les réservations. */
function mesTuteursErrorMessage(status) {
  if (status === 401) return 'Session expirée ou non valide : reconnectez-vous.';
  if (status === 403) return 'Accès refusé à la liste des tutorats.';
  if (status === 0 || status >= 500) return 'Le serveur ne répond pas correctement. Vérifiez que Django est démarré (ex. http://127.0.0.1:8000).';
  return `Impossible de charger vos tutorats (erreur ${status}).`;
}

export async function fetchMyTutors(accessToken) {
  const base = getApiBase();
  const r = await fetch(`${base}/api/etudiant/mes-tuteurs/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!r.ok) throw new Error(mesTuteursErrorMessage(r.status));
  return r.json();
}

export async function fetchStudentSeances(accessToken) {
  const base = getApiBase();
  const r = await fetch(`${base}/api/seances/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!r.ok) throw new Error(`seances ${r.status}`);
  return r.json();
}

/** Mes réservations côté serveur (détail, pour fusion dans le navigateur). */
export async function fetchStudentReservationsFromServer(accessToken) {
  const base = getApiBase();
  const r = await fetch(`${base}/api/etudiant/reservations/`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!r.ok) throw new Error(`etudiant/reservations ${r.status}`);
  return r.json();
}

/** Demandes reçues en tant que tuteur (serveur). */
export async function fetchTutorIncomingReservations(accessToken) {
  const base = getApiBase();
  const r = await fetch(`${base}/api/tuteur/reservations-recues/`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!r.ok) throw new Error(`tuteur/reservations-recues ${r.status}`);
  return r.json();
}

/** Détail d’une séance (étudiant ou tuteur de la réservation). */
export async function fetchSeanceById(seanceId, accessToken, options = {}) {
  const base = getApiBase();
  const r = await fetch(`${base}/api/seances/${seanceId}/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    signal: options.signal,
  });
  if (!r.ok) {
    const err = new Error(`seance ${r.status}`);
    err.status = r.status;
    throw err;
  }
  return r.json();
}

/** Confirmation de fin de séance (double confirmation côté serveur). */
/** Crée une demande de tutorat côté Django (statut pending). */
export async function createStudentReservation(accessToken, body) {
  const base = getApiBase();
  const r = await fetch(`${base}/api/etudiant/reservations/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const parsed = parseDrfErrorBody(data);
    const msg =
      parsed ||
      (typeof data?.detail === 'string' ? data.detail : null) ||
      (r.status === 400 ? 'Données invalides pour la réservation.' : `Erreur réservation (HTTP ${r.status}).`);
    const err = new Error(msg);
    err.status = r.status;
    err.data = data;
    throw err;
  }
  return data;
}

/** Annulation par l’étudiant (pending → cancelled), synchronisée Django. */
export async function cancelReservationAsStudent(reservationId, accessToken) {
  const base = getApiBase();
  const r = await fetch(`${base}/api/etudiant/reservations/${reservationId}/annuler/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const parsed = parseDrfErrorBody(data);
    const msg = parsed || (typeof data?.detail === 'string' ? data.detail : null) || `Annulation impossible (HTTP ${r.status}).`;
    const err = new Error(msg);
    err.status = r.status;
    err.data = data;
    throw err;
  }
  return data;
}

/** Le tuteur accepte une demande (pending → confirmed). */
export async function acceptReservationAsTutor(seanceId, accessToken) {
  const base = getApiBase();
  const r = await fetch(`${base}/api/seances/${seanceId}/accepter-tuteur/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = typeof data.detail === 'string' ? data.detail : `accepter ${r.status}`;
    throw new Error(msg);
  }
  return data;
}

/**
 * Définit ou efface le lien de visio (tuteur uniquement).
 * @param {number} seanceId
 * @param {string | null | undefined} meetUrl - URL https ou chaîne vide pour effacer
 * @param {string} accessToken
 */
export async function patchSeanceMeetUrl(seanceId, meetUrl, accessToken) {
  const base = getApiBase();
  const r = await fetch(`${base}/api/seances/${seanceId}/meet-url/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ meet_url: meetUrl === null || meetUrl === undefined ? '' : String(meetUrl) }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const parsed = parseDrfErrorBody(data);
    const msg =
      parsed ||
      (typeof data?.detail === 'string' ? data.detail : null) ||
      (typeof data?.meet_url === 'string' ? data.meet_url : null) ||
      `Erreur enregistrement du lien (HTTP ${r.status}).`;
    const err = new Error(msg);
    err.status = r.status;
    err.data = data;
    throw err;
  }
  return data;
}

export async function confirmSeanceEndOnServer(seanceId, accessToken) {
  const base = getApiBase();
  const r = await fetch(`${base}/api/seances/${seanceId}/confirmer-fin/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = typeof data.detail === 'string' ? data.detail : `confirmer-fin ${r.status}`;
    const err = new Error(msg);
    err.status = r.status;
    throw err;
  }
  return data;
}
