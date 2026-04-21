/**
 * Validation locale des créneaux (même jour, plages HH:MM) avant envoi API.
 * L’heure de fin est dérivée de l’heure de début + durée indicative (1h, 1.5h, 2h, 3h).
 */

/** @param {string} t "HH:MM" */
export function timeToMinutes(t) {
  if (!t || typeof t !== 'string') return null;
  const m = t.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(mi) || h < 0 || h > 23 || mi < 0 || mi > 59) return null;
  return h * 60 + mi;
}

export const DURATION_MINUTES_MAP = {
  '1h': 60,
  '1.5h': 90,
  '2h': 120,
  '3h': 180,
};

/**
 * Heure de fin (HH:MM) = début + durée. Chaîne vide si durée inconnue ou fin après minuit.
 * @param {string} heureDebut "HH:MM"
 * @param {string} durationLabel ex. "2h"
 */
export function computeEndFromDuration(heureDebut, durationLabel) {
  const start = timeToMinutes(heureDebut);
  const add = DURATION_MINUTES_MAP[durationLabel];
  if (start == null || add == null) return '';
  const end = start + add;
  const h = Math.floor(end / 60);
  const m = end % 60;
  if (h >= 24) return '';
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Ajoute heure_fin calculée pour chaque ligne ayant date + début. */
export function augmentSlotsWithComputedEnd(rows, durationLabel) {
  if (!durationLabel) return [];
  const out = [];
  for (const r of rows) {
    if (!r?.date_iso || !r.heure_debut?.trim()) continue;
    const heure_fin = computeEndFromDuration(r.heure_debut, durationLabel);
    if (!heure_fin) continue;
    out.push({ ...r, heure_fin });
  }
  return out;
}

/** @param {string} dateIso YYYY-MM-DD */
export function buildLibelleFromParts(dateIso, heureDebut, heureFin) {
  if (!dateIso || !heureDebut || !heureFin) return '';
  try {
    const d = new Date(`${dateIso}T12:00:00`);
    if (Number.isNaN(d.getTime())) return '';
    const datePart = d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    return `${datePart} · ${heureDebut} – ${heureFin}`;
  } catch {
    return '';
  }
}

/**
 * @param {{ id: string, date_iso?: string, heure_debut?: string, heure_fin?: string }[]} rows — heure_fin optionnelle (sinon calcul via durationLabel)
 * @param {string} durationLabel clé DURATION_MINUTES_MAP
 */
export function validateStructuredSlots(rows, durationLabel) {
  if (!durationLabel) {
    return { ok: false, message: 'Choisissez une durée indicative pour calculer la fin de chaque créneau.' };
  }
  const structured = [];
  for (const r of rows) {
    if (!r.date_iso || !r.heure_debut?.trim()) continue;
    const fin = r.heure_fin?.trim() || computeEndFromDuration(r.heure_debut, durationLabel);
    if (!fin) {
      return {
        ok: false,
        message:
          'Avec cette durée, un créneau se termine après minuit : avancez l’heure de début ou raccourcissez la durée.',
      };
    }
    structured.push({ ...r, heure_fin: fin });
  }
  for (const r of structured) {
    const a = timeToMinutes(r.heure_debut);
    const b = timeToMinutes(r.heure_fin);
    if (a == null || b == null) {
      return { ok: false, message: 'Format d’heure invalide (utilisez HH:MM).' };
    }
    if (b <= a) {
      return { ok: false, message: 'L’heure de fin calculée doit être après l’heure de début.' };
    }
  }
  const byDate = new Map();
  for (const r of structured) {
    const a = timeToMinutes(r.heure_debut);
    const b = timeToMinutes(r.heure_fin);
    if (!byDate.has(r.date_iso)) byDate.set(r.date_iso, []);
    byDate.get(r.date_iso).push({ id: r.id, a, b });
  }
  for (const [, list] of byDate) {
    list.sort((x, y) => x.a - y.a);
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (list[j].a < list[i].b && list[i].a < list[j].b) {
          return {
            ok: false,
            message: 'Deux créneaux se chevauchent le même jour. Ajustez les horaires.',
          };
        }
      }
    }
  }
  const keys = new Set();
  for (const r of structured) {
    const k = `${r.date_iso}|${r.heure_debut}|${r.heure_fin}`;
    if (keys.has(k)) {
      return { ok: false, message: 'Créneau en double (même date et mêmes heures).' };
    }
    keys.add(k);
  }
  return { ok: true };
}
