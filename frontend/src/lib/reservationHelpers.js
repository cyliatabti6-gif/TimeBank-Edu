/**
 * Corps pour POST /api/etudiant/reservations/ (champs alignés sur ReservationDemandeCreateSerializer).
 * @param {object} mod — module catalogue (GET /api/modules/:id/)
 * @param {{ selectedCreneau: object, message?: string }} opts
 */
export function parseDureeHeuresFromLabel(dureeLabel) {
  const s = String(dureeLabel || '')
    .trim()
    .toLowerCase();
  const m = /^(\d+(?:\.\d+)?)\s*h/.exec(s);
  if (m) {
    const n = Number(m[1]);
    if (Number.isFinite(n)) return Math.min(24, Math.max(0.25, n));
  }
  return 2;
}

function isoDateToFr(iso) {
  if (!iso || typeof iso !== 'string') return '';
  const p = iso.trim().split('-');
  if (p.length === 3 && p[0].length === 4) return `${p[2]}/${p[1]}/${p[0]}`;
  return '';
}

/**
 * Libellé créneau pour l’API (sans suffixe technique ; affichage carte).
 */
function creneauLabelForApi(c) {
  if (!c || typeof c !== 'object') return '';
  const lib = String(c.libelle || '').trim();
  if (lib) return lib;
  if (c.heure_debut) {
    return `${c.heure_debut}${c.heure_fin ? ` – ${c.heure_fin}` : ''}`.trim();
  }
  return '';
}

/** Retire un éventuel suffixe « · id:… » stocké avant la simplification du libellé. */
export function stripCreneauLabelForDisplay(label) {
  return String(label || '')
    .replace(/\s*·\s*id:.+$/, '')
    .trim();
}

function isValidCreneauId(id) {
  if (id == null || id === '') return false;
  if (typeof id === 'string' && !id.trim()) return false;
  if (typeof id === 'number' && !Number.isFinite(id)) return false;
  return true;
}

/**
 * Vérifie que le module et le créneau permettent un POST (IDs réels, créneau disponible).
 * @param {object} mod — module catalogue (GET /api/modules/:id/)
 * @param {object|null|undefined} selectedCreneau — créneau à jour depuis mod.creneaux (lookup par id au moment du clic)
 * @param {{ studentId?: number|string, selectedCreneauId?: string|number|null }} [options]
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function validateReservationPrerequisites(mod, selectedCreneau, options = {}) {
  const { studentId, selectedCreneauId } = options;

  if (!mod || typeof mod !== 'object') {
    return { ok: false, reason: 'Module manquant.' };
  }
  const tutorId = Number(mod.tutorId);
  const moduleId = Number(mod.id);
  if (!Number.isInteger(tutorId) || tutorId < 1) {
    return { ok: false, reason: 'Identifiant tuteur invalide.' };
  }
  if (!Number.isInteger(moduleId) || moduleId < 1) {
    return { ok: false, reason: 'Identifiant module invalide.' };
  }
  const tp = mod.tutorProfile;
  if (tp && tp.id != null && String(tp.id) !== '' && Number(tp.id) !== tutorId) {
    return { ok: false, reason: 'Incohérence entre le tuteur du module et le profil.' };
  }

  if (studentId != null && String(studentId) !== '' && Number(studentId) === tutorId) {
    return { ok: false, reason: 'Vous ne pouvez pas réserver une séance avec vous-même.' };
  }

  const idMissing =
    selectedCreneauId == null || selectedCreneauId === '';
  if (idMissing) {
    return { ok: false, reason: 'Veuillez sélectionner un créneau' };
  }

  if (selectedCreneau == null || typeof selectedCreneau !== 'object') {
    return { ok: false, reason: "Ce créneau n'est plus disponible" };
  }

  if (!isValidCreneauId(selectedCreneau.id)) {
    return { ok: false, reason: 'Créneau invalide' };
  }

  if (selectedCreneau.disponible === false) {
    return { ok: false, reason: "Ce créneau n'est plus disponible" };
  }

  return { ok: true };
}

export function buildReservationBodyFromModule(mod, opts = {}) {
  const { selectedCreneau, message = '' } = opts;
  const module_titre = `${mod.title} - ${mod.level}`.trim();

  let date_label = '';
  let creneau_label = '';

  if (selectedCreneau && typeof selectedCreneau === 'object') {
    date_label = String(selectedCreneau.date || '').trim();
    if (!date_label && selectedCreneau.date_iso) {
      date_label = isoDateToFr(selectedCreneau.date_iso);
    }
    creneau_label = creneauLabelForApi(selectedCreneau);
  }

  const duree_heures = parseDureeHeuresFromLabel(mod.dureeLabel);
  /* format_seance est imposé côté serveur par le module (POST sans format_seance). */

  const tutor = Number(mod.tutorId);
  const module_propose = Number(mod.id);
  if (!Number.isInteger(tutor) || tutor < 1) {
    throw new Error('Identifiant tuteur invalide : utilisez un module issu du catalogue (API).');
  }
  if (!Number.isInteger(module_propose) || module_propose < 1) {
    throw new Error('Identifiant module invalide : utilisez un module issu du catalogue (API).');
  }

  const creneau_ref =
    selectedCreneau && selectedCreneau.id != null && String(selectedCreneau.id).trim()
      ? String(selectedCreneau.id).trim()
      : '';

  return {
    tutor,
    module_propose,
    module_titre,
    date_label,
    creneau_label,
    creneau_ref,
    duree_heures,
    message: String(message || '').slice(0, 2000),
  };
}
