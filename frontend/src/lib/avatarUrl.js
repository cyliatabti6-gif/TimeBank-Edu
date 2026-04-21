import { getApiBase } from './api';

/** Évite d’utiliser des initiales (ex. « SB ») ou texte court comme URL d’image. */
function looksLikeProfilePhotoRef(s) {
  const t = String(s || '').trim();
  if (!t) return false;
  if (/^(https?|blob|data):/i.test(t)) return true;
  if (t.startsWith('/media/') || t.startsWith('/static/')) return true;
  if (/\.(jpe?g|png|gif|webp)$/i.test(t.split('?')[0])) return true;
  if (t.length > 4 && t.includes('/')) return true;
  return false;
}

/**
 * Construit une URL absolue pour les médias relatifs (proxy Vite ou API).
 */
function absolutize(pathOrUrl) {
  const raw = String(pathOrUrl || '').trim();
  if (!raw) return '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  const base = getApiBase();
  // En dev, getApiBase() peut être vide (proxy /api). Les médias ne sont pas proxyfies,
  // donc il faut une origine Django explicite pour /media et /static.
  const mediaOrigin = base || 'http://127.0.0.1:8000';
  const p = raw.startsWith('/') ? raw : `/${raw}`;
  return `${mediaOrigin}${p}`;
}

/**
 * URL affichable pour la photo de profil, ou chaîne vide si aucune.
 * Accepte un objet utilisateur API ({ avatar, avatarUrl, … }) ou une URL brute.
 */
export function resolveAvatarSrc(userOrUrl) {
  if (userOrUrl == null) return '';
  if (typeof userOrUrl === 'string') {
    if (!looksLikeProfilePhotoRef(userOrUrl)) return '';
    return absolutize(userOrUrl);
  }
  if (typeof userOrUrl !== 'object') return '';
  const candidates = [
    userOrUrl.avatarUrl,
    userOrUrl.avatar,
    userOrUrl.profile_photo,
    userOrUrl.tutorProfile?.avatarUrl,
  ];
  let raw = '';
  for (const c of candidates) {
    if (typeof c !== 'string') continue;
    const t = c.trim();
    if (t && looksLikeProfilePhotoRef(t)) {
      raw = t;
      break;
    }
  }
  if (!raw) return '';
  return absolutize(raw);
}
