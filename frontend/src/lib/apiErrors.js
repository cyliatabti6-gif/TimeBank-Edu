/**
 * Extrait un message lisible depuis une réponse d’erreur DRF (JSON).
 * @param {unknown} data
 * @returns {string | null}
 */
export function parseDrfErrorBody(data) {
  if (data == null) return null;
  if (typeof data === 'string') return data;
  if (typeof data !== 'object') return null;

  if (typeof data.detail === 'string') return data.detail;
  if (Array.isArray(data.detail) && data.detail.length) {
    return data.detail.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ');
  }

  const chunks = [];
  if (Array.isArray(data.non_field_errors) && data.non_field_errors.length) {
    chunks.push(
      ...data.non_field_errors.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))),
    );
  }

  for (const [key, val] of Object.entries(data)) {
    if (key === 'detail' || key === 'non_field_errors') continue;
    if (Array.isArray(val)) {
      chunks.push(`${key}: ${val.map((v) => (typeof v === 'string' ? v : JSON.stringify(v))).join(', ')}`);
    } else if (val != null && typeof val === 'object') {
      chunks.push(`${key}: ${JSON.stringify(val)}`);
    } else if (val != null && val !== '') {
      chunks.push(`${key}: ${String(val)}`);
    }
  }

  return chunks.length ? chunks.join(' · ') : null;
}
