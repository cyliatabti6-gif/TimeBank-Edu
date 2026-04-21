import { stripCreneauLabelForDisplay } from './reservationHelpers';

/** @param {string} dateLabel */
export function parseDateLabelToLocalDate(dateLabel) {
  if (!dateLabel || typeof dateLabel !== 'string') return null;
  const t = dateLabel.trim();
  let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  if (m) {
    const d = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10) - 1;
    const y = parseInt(m[3], 10);
    const dt = new Date(y, mo, d);
    if (dt.getFullYear() === y && dt.getMonth() === mo && dt.getDate() === d) return dt;
  }
  m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (m) {
    const y = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10) - 1;
    const d = parseInt(m[3], 10);
    const dt = new Date(y, mo, d);
    if (dt.getFullYear() === y && dt.getMonth() === mo && dt.getDate() === d) return dt;
  }
  return null;
}

/**
 * @param {string} creneauLabel
 * @param {number} durationHours
 * @returns {{ startMin: number, endMin: number }}
 */
export function parseCreneauStartEndMinutes(creneauLabel, durationHours) {
  const s = stripCreneauLabelForDisplay(creneauLabel);
  const found = [];
  const re = /(\d{1,2})\s*h(?:\s*[:h]?\s*(\d{2}))?/gi;
  let m;
  while ((m = re.exec(s)) !== null) {
    const h = parseInt(m[1], 10);
    const min = m[2] ? parseInt(m[2], 10) : 0;
    if (Number.isFinite(h)) found.push(h * 60 + (Number.isFinite(min) ? min : 0));
  }
  const dur = Number(durationHours);
  const durMin = Number.isFinite(dur) && dur > 0 ? Math.round(dur * 60) : 120;

  let startMin = found[0] ?? 9 * 60;
  let endMin = found[1];
  if (endMin == null || endMin <= startMin) {
    endMin = startMin + durMin;
  }
  startMin = Math.max(0, Math.min(24 * 60 - 1, startMin));
  endMin = Math.max(startMin + 15, Math.min(24 * 60, endMin));
  return { startMin, endMin };
}

/** Monday 00:00 local */
export function startOfWeekMonday(d) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function isSameCalendarDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

/** @param {Date} dayDate
 * @param {Date} weekStart — Monday 00:00 */
export function isDateInWeek(dayDate, weekStart) {
  const ws = new Date(weekStart);
  ws.setHours(0, 0, 0, 0);
  const we = addDays(ws, 7);
  const x = new Date(dayDate);
  x.setHours(12, 0, 0, 0);
  return x >= ws && x < we;
}

/** @param {object} row — SeanceDetailSerializer JSON */
export function mapApiRowToPlanningEvent(row) {
  if (!row || row.id == null) return null;
  const dayDate = parseDateLabelToLocalDate(row.date);
  if (!dayDate) return null;
  const { startMin, endMin } = parseCreneauStartEndMinutes(row.time, row.duration);
  return {
    id: row.id,
    dayDate,
    startMin,
    endMin,
    module: row.module || 'Séance',
    student: row.student || '',
    tutor: row.tutor || '',
    status: String(row.status || 'pending').toLowerCase(),
    format: row.format,
    raw: row,
  };
}

export function statusPlanningBorderClass(status) {
  switch (status) {
    case 'confirmed':
      return 'border-emerald-500';
    case 'pending':
      return 'border-orange-500';
    case 'completed':
      return 'border-slate-400';
    case 'cancelled':
      return 'border-gray-400';
    default:
      return 'border-gray-300';
  }
}

export function statusPlanningClasses(status) {
  switch (status) {
    case 'confirmed':
      return 'bg-emerald-100 text-emerald-900 border-emerald-300';
    case 'pending':
      return 'bg-orange-100 text-orange-900 border-orange-300';
    case 'completed':
      return 'bg-slate-200 text-slate-800 border-slate-400';
    case 'cancelled':
      return 'bg-gray-100 text-gray-600 border-gray-300 opacity-90';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}

export function statusPlanningLabel(status) {
  switch (status) {
    case 'confirmed':
      return 'Confirmée';
    case 'pending':
      return 'En attente';
    case 'completed':
      return 'Terminée';
    case 'cancelled':
      return 'Annulée';
    default:
      return status;
  }
}
