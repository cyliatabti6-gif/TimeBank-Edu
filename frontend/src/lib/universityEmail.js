/** E-mail institutionnel algérien : domaine en .dz (ex. prenom.nom@univ.dz, @usthb.dz, @univ-blida.dz). */

export const UNIVERSITY_EMAIL_PLACEHOLDER = 'prenom.nom@univ.dz';

export function isAlgerianUniversityEmail(email) {
  const e = (email || '').trim().toLowerCase();
  const parts = e.split('@');
  if (parts.length < 2) return false;
  const domain = parts.pop();
  if (!domain || domain.includes(' ') || !domain.includes('.')) return false;
  return domain.endsWith('.dz');
}
