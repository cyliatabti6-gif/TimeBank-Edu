import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useApp } from '../../context/AppContext';
import { getAccessToken } from '../../lib/authStorage';
import { fetchTutorIncomingReservations } from '../../lib/seancesApi';

const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const HOURS = Array.from({ length: 12 }, (_, i) => 8 + i); // 8h -> 19h

function startOfWeek(date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // monday=0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function sameDate(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function parseDateLabel(label) {
  if (!label) return null;
  const m = String(label).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  const d = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10) - 1;
  const y = parseInt(m[3], 10);
  const dt = new Date(y, mo, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function parseStartHour(creneauLabel) {
  if (!creneauLabel) return null;
  const raw = String(creneauLabel);
  const hMatch = raw.match(/(\d{1,2})\s*h/i);
  if (hMatch) return parseInt(hMatch[1], 10);
  const colonMatch = raw.match(/(\d{1,2}):(\d{2})/);
  if (colonMatch) return parseInt(colonMatch[1], 10);
  return null;
}

export default function Planning() {
  const { currentUser, reservations, bulkUpsertReservationsFromApiDetails } = useApp();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const now = new Date();

  const loadServerReservations = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    if (currentUser?.role !== 'tutor' && currentUser?.role !== 'both') return;
    setLoading(true);
    setError('');
    try {
      const rows = await fetchTutorIncomingReservations(token);
      if (Array.isArray(rows) && rows.length > 0) bulkUpsertReservationsFromApiDetails(rows);
    } catch {
      setError('Impossible de synchroniser le planning avec le serveur.');
    } finally {
      setLoading(false);
    }
  }, [bulkUpsertReservationsFromApiDetails, currentUser?.role]);

  useEffect(() => {
    void loadServerReservations();
  }, [loadServerReservations]);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const acceptedSessions = useMemo(
    () =>
      reservations
        .filter(
          (r) =>
            Number(r.tutorId) === Number(currentUser?.id) &&
            (r.status === 'confirmed' || r.status === 'in_progress'),
        )
        .map((r) => ({ ...r, parsedDate: parseDateLabel(r.date), startHour: parseStartHour(r.creneauLabel) }))
        .sort((a, b) => Number(b.id) - Number(a.id)),
    [reservations, currentUser?.id],
  );

  const weekSessions = useMemo(
    () =>
      acceptedSessions.filter((s) => {
        if (!s.parsedDate) return false;
        const end = addDays(weekStart, 7);
        return s.parsedDate >= weekStart && s.parsedDate < end;
      }),
    [acceptedSessions, weekStart],
  );

  const cells = useMemo(() => {
    const out = {};
    for (const s of weekSessions) {
      const dayIdx = Math.floor((s.parsedDate - weekStart) / (24 * 60 * 60 * 1000));
      let hour = Number.isFinite(s.startHour) ? s.startHour : 14;
      if (hour < HOURS[0]) hour = HOURS[0];
      if (hour > HOURS[HOURS.length - 1]) hour = HOURS[HOURS.length - 1];
      const hourIdx = hour - HOURS[0];
      const key = `${dayIdx}-${hourIdx}`;
      if (!out[key]) out[key] = s; // éviter chevauchement visuel
    }
    return out;
  }, [weekSessions, weekStart]);

  const outsideGridSessions = useMemo(
    () => acceptedSessions.filter((s) => !s.parsedDate || !s.creneauLabel),
    [acceptedSessions],
  );

  const monthLabel = weekStart.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mon Planning</h1>
          <p className="text-gray-500 text-sm">
            Vue semaine uniquement. Les séances apparaissent automatiquement dès qu&apos;une réservation est acceptée.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-primary-700 bg-primary-50 border border-primary-100 rounded-lg px-2.5 py-1">
            Semaine
          </span>
          <button
            type="button"
            onClick={() => void loadServerReservations()}
            className="btn-primary text-sm py-2 px-4 disabled:opacity-60"
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> {loading ? 'Sync…' : 'Synchroniser'}
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-3 text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">{error}</div>
      ) : null}

      {/* Navigation */}
      <div className="flex items-center gap-3 mb-4">
        <button
          type="button"
          onClick={() => setWeekStart((w) => addDays(w, -7))}
          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="font-semibold text-gray-800 capitalize">{monthLabel}</span>
        <button
          type="button"
          onClick={() => setWeekStart((w) => addDays(w, 7))}
          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
        >
          <ChevronRight size={16} />
        </button>
        <button
          type="button"
          onClick={() => setWeekStart(startOfWeek(new Date()))}
          className="ml-2 text-xs text-primary-600 border border-primary-200 px-2 py-1 rounded-lg hover:bg-primary-50"
        >
          Aujourd&apos;hui
        </button>
      </div>

      {/* Weekly Grid */}
      <div className="card overflow-hidden p-0">
        <div className="grid overflow-x-auto" style={{ minWidth: '600px' }}>
          {/* Header */}
          <div className="grid grid-cols-8 border-b border-gray-100">
            <div className="p-3 text-xs text-gray-400 font-medium" />
            {weekDays.map((d, i) => (
              <div key={i} className={`p-3 text-center border-l border-gray-100 ${sameDate(d, now) ? 'bg-primary-50' : ''}`}>
                <p className="text-xs font-semibold text-gray-600">{days[i]}</p>
                <p className={`text-lg font-bold ${sameDate(d, now) ? 'text-primary-600' : 'text-gray-800'}`}>
                  {d.getDate()}
                </p>
              </div>
            ))}
          </div>
          {/* Time slots */}
          {HOURS.map((h, hi) => (
            <div key={h} className="grid grid-cols-8 border-b border-gray-50">
              <div
                className={`px-3 py-2 text-xs border-r border-gray-100 flex items-start ${
                  h === now.getHours() ? 'text-primary-700 bg-primary-50/60 font-medium' : 'text-gray-400'
                }`}
              >
                {h}h
              </div>
              {weekDays.map((d, di) => {
                const event = cells[`${di}-${hi}`];
                const isNowCell = sameDate(d, now) && h === now.getHours();
                return (
                  <div
                    key={di}
                    className={`border-l border-gray-50 min-h-[40px] p-1 relative ${
                      isNowCell ? 'bg-primary-50/40' : event ? '' : 'hover:bg-gray-50 cursor-pointer'
                    }`}
                  >
                    {event && (
                      <div
                        className={`border rounded-lg p-1.5 text-[10px] font-medium leading-tight h-full ${
                          event.status === 'in_progress'
                            ? 'bg-orange-100 text-orange-700 border-orange-300'
                            : 'bg-primary-100 text-primary-700 border-primary-300'
                        }`}
                        title={`${event.module} · ${event.studentName}`}
                      >
                        <div>{event.module}</div>
                        <div>{event.studentName}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {outsideGridSessions.length > 0 ? (
        <div className="card mt-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Séances confirmées hors grille horaire</h3>
          <ul className="space-y-2">
            {outsideGridSessions.map((s) => (
              <li key={s.id} className="text-xs text-gray-600 border border-gray-100 rounded-lg px-3 py-2">
                <span className="font-medium text-gray-800">{s.module}</span> · {s.studentName} · {s.date || 'Date non définie'}
                {s.creneauLabel ? ` · ${s.creneauLabel}` : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Legend */}
      <div className="flex gap-4 mt-3 text-xs text-gray-500">
        {[
          { color: 'bg-primary-200', label: 'Séances confirmées' },
          { color: 'bg-orange-200', label: 'Séances en cours' },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded ${l.color}`} />
            {l.label}
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
