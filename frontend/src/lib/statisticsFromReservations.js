import { parseDateLabelToLocalDate } from './planningUtils';

const MONTH_FR_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

export function isCancelled(r) {
  return r?.status === 'cancelled';
}

export function filterReservationsByStudent(reservations, userId) {
  const uid = Number(userId);
  if (!Number.isFinite(uid)) return [];
  return (reservations || []).filter((r) => Number(r?.studentId) === uid);
}

export function filterReservationsByTutor(reservations, userId) {
  const uid = Number(userId);
  if (!Number.isFinite(uid)) return [];
  return (reservations || []).filter((r) => Number(r?.tutorId) === uid);
}

export function metricsFromRows(rows) {
  const active = (rows || []).filter((r) => !isCancelled(r));
  const totalSessions = active.length;
  const completedSessions = (rows || []).filter((r) => r?.status === 'completed').length;
  const pendingSessions = (rows || []).filter((r) => r?.status === 'pending').length;
  const confirmedStrict = (rows || []).filter((r) => r?.status === 'confirmed').length;
  return {
    totalSessions,
    completedSessions,
    pendingSessions,
    confirmedSessions: confirmedStrict,
    confirmedStrict,
    inProgressSessions: 0,
  };
}

export function sumCompletedHours(rows) {
  let sum = 0;
  for (const r of rows || []) {
    if (r?.status !== 'completed') continue;
    const d = Number(r?.duration);
    sum += Number.isFinite(d) && d > 0 ? d : 0;
  }
  return Math.round(sum * 100) / 100;
}

export function displayRating(currentUser) {
  const raw = Number(currentUser?.score);
  return Number.isFinite(raw) && raw > 0 ? raw : 4.7;
}

export function displayBalanceValue(displayBalance, currentUser) {
  const b = displayBalance != null ? Number(displayBalance) : Number(currentUser?.balance);
  if (!Number.isFinite(b)) return 0;
  return Math.round(b * 100) / 100;
}

/** Séances par mois (fenêtre glissante `monthsBack` mois). */
export function groupSessionsByMonth(reservations, monthsBack = 12) {
  const byMonth = new Map();
  for (const r of reservations || []) {
    if (isCancelled(r)) continue;
    const d = parseDateLabelToLocalDate(r?.date);
    if (!d) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    byMonth.set(key, (byMonth.get(key) || 0) + 1);
  }
  const rows = [];
  const now = new Date();
  for (let i = monthsBack - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    rows.push({
      month: MONTH_FR_SHORT[d.getMonth()],
      seances: byMonth.get(key) || 0,
    });
  }
  return rows;
}

/** pending | confirmed | completed */
export function statusDistributionForPie(reservations) {
  let pending = 0;
  let confirmed = 0;
  let completed = 0;
  for (const r of reservations || []) {
    if (isCancelled(r)) continue;
    const st = r?.status;
    if (st === 'pending') pending += 1;
    else if (st === 'completed') completed += 1;
    else confirmed += 1;
  }
  return [
    { name: 'En attente', value: pending, fill: '#f97316' },
    { name: 'Confirmées', value: confirmed, fill: '#2563eb' },
    { name: 'Complétées', value: completed, fill: '#16a34a' },
  ].filter((x) => x.value > 0);
}

function subjectLabel(r) {
  const raw = r?.subject ?? r?.module;
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  return 'Non spécifié';
}

export function sessionsBySubjectBar(reservations, limit = 8) {
  const m = new Map();
  for (const r of reservations || []) {
    if (isCancelled(r)) continue;
    const k = subjectLabel(r);
    m.set(k, (m.get(k) || 0) + 1);
  }
  return Array.from(m.entries())
    .map(([matiere, seances]) => ({ matiere, seances }))
    .sort((a, b) => b.seances - a.seances)
    .slice(0, limit);
}

/** Compte par jour sur les `days` derniers jours (aujourd’hui inclus). */
export function dailySessionCounts(reservations, days = 30) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const keys = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    keys.push({
      iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      jour: `${d.getDate()}/${d.getMonth() + 1}`,
    });
  }
  const map = new Map(keys.map((k) => [k.iso, 0]));
  for (const r of reservations || []) {
    if (isCancelled(r)) continue;
    const dt = parseDateLabelToLocalDate(r?.date);
    if (!dt) continue;
    const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    if (map.has(iso)) map.set(iso, (map.get(iso) || 0) + 1);
  }
  return keys.map(({ iso, jour }) => ({ jour, seances: map.get(iso) ?? 0 }));
}

export function upcomingConfirmedSessions(reservations, limit = 5) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rows = [];
  for (const r of reservations || []) {
    if (isCancelled(r)) continue;
    if (r?.status !== 'confirmed') continue;
    const d = parseDateLabelToLocalDate(r?.date);
    if (!d) continue;
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (day < today) continue;
    rows.push({ r, t: day.getTime() });
  }
  rows.sort((a, b) => a.t - b.t);
  return rows.slice(0, limit).map(({ r }) => r);
}

/** Références croisées optionnelles — pas de double comptage avec les réservations. */
export function sessionHistoryCountForUser(sessionHistory, userId) {
  const uid = Number(userId);
  if (!Number.isFinite(uid)) return 0;
  return (sessionHistory || []).filter(
    (h) => Number(h?.studentId) === uid || Number(h?.tutorId) === uid,
  ).length;
}
