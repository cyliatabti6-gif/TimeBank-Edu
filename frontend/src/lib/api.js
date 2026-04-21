/** Base URL API : en dev, chaîne vide = proxy Vite vers Django. */
export function getApiBase() {
  const raw = import.meta.env.VITE_API_URL;
  if (raw != null && String(raw).trim() !== '') return String(raw).replace(/\/$/, '');
  if (import.meta.env.DEV) return '';
  return 'http://127.0.0.1:8000';
}

/** GET /api/auth/me/ — profil JSON (après transfert d’heures, etc.). */
export async function fetchAuthenticatedProfile(accessToken) {
  const base = getApiBase();
  const r = await fetch(`${base}/api/auth/me/`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!r.ok) throw new Error(`auth/me ${r.status}`);
  return r.json();
}
