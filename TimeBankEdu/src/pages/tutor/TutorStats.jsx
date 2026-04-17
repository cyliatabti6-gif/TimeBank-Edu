import { useCallback, useEffect, useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useApp } from '../../context/AppContext';
import { getAccessToken } from '../../lib/authStorage';
import { fetchTutorIncomingReservations } from '../../lib/seancesApi';

function sameId(a, b) {
  return Number(a) === Number(b);
}

function parseReservationDate(r) {
  const s = r?.date;
  if (!s || s === '—') return null;
  const m = String(s).match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (!m) return null;
  const d = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10) - 1;
  let y = parseInt(m[3], 10);
  if (y < 100) y += 2000;
  const dt = new Date(y, mo, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function inPeriod(dt, period) {
  if (!dt) return true;
  const now = new Date();
  if (period === 'all') return true;
  if (period === 'year') return dt.getFullYear() === now.getFullYear();
  if (period === 'month') return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth();
  if (period === 'week') {
    const start = new Date(now);
    start.setDate(now.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    return dt >= start && dt <= now;
  }
  return true;
}

export default function TutorStats() {
  const { currentUser, reservations, bulkUpsertReservationsFromApiDetails } = useApp();
  const [period, setPeriod] = useState('year');

  const loadServerReservations = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    if (currentUser?.role !== 'tutor' && currentUser?.role !== 'both') return;
    try {
      const rows = await fetchTutorIncomingReservations(token);
      if (Array.isArray(rows) && rows.length > 0) bulkUpsertReservationsFromApiDetails(rows);
    } catch {
      /* hors ligne */
    }
  }, [bulkUpsertReservationsFromApiDetails, currentUser?.role]);

  useEffect(() => {
    void loadServerReservations();
  }, [loadServerReservations]);

  const uid = currentUser?.id;

  const asTutor = useMemo(() => {
    if (uid == null) return [];
    return reservations.filter((r) => sameId(r.tutorId, uid));
  }, [reservations, uid]);

  const filteredByPeriod = useMemo(
    () =>
      asTutor.filter((r) => {
        const dt = parseReservationDate(r);
        if (!dt && (r.status === 'completed' || r.status === 'cancelled')) return period === 'all';
        if (!dt) return period === 'all';
        return inPeriod(dt, period);
      }),
    [asTutor, period],
  );

  const completed = useMemo(() => filteredByPeriod.filter((r) => r.status === 'completed'), [filteredByPeriod]);
  const upcoming = useMemo(
    () => filteredByPeriod.filter((r) => r.status === 'confirmed' || r.status === 'in_progress'),
    [filteredByPeriod],
  );
  const cancelled = useMemo(() => filteredByPeriod.filter((r) => r.status === 'cancelled'), [filteredByPeriod]);

  const teachingHours = useMemo(
    () => completed.reduce((s, r) => s + (Number(r.duration) || 0), 0),
    [completed],
  );
  const plannedHours = useMemo(
    () => upcoming.reduce((s, r) => s + (Number(r.duration) || 0), 0),
    [upcoming],
  );

  const evolutionData = useMemo(() => {
    const byKey = {};
    for (const r of asTutor) {
      const dt = parseReservationDate(r);
      if (!dt || !inPeriod(dt, period)) continue;
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      const label = dt.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
      if (!byKey[key]) byKey[key] = { sortKey: key, month: label, enseignement: 0, planifie: 0 };
      const d = Number(r.duration) || 0;
      if (r.status === 'completed') byKey[key].enseignement += d;
      if (r.status === 'confirmed' || r.status === 'in_progress') byKey[key].planifie += d;
    }
    return Object.values(byKey)
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .slice(-12);
  }, [asTutor, period]);

  const moduleDistribution = useMemo(() => {
    const map = {};
    for (const r of completed) {
      const m = (r.module || 'Autre').trim() || 'Autre';
      map[m] = (map[m] || 0) + 1;
    }
    return Object.entries(map)
      .map(([name, sessions]) => ({ name, sessions }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 8);
  }, [completed]);

  const activityByWeekday = useMemo(() => {
    const labels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const counts = Array(7).fill(0);
    for (const r of completed) {
      const dt = parseReservationDate(r);
      if (!dt) continue;
      const idx = (dt.getDay() + 6) % 7;
      counts[idx] += 1;
    }
    return labels.map((label, idx) => ({ label, val: counts[idx] }));
  }, [completed]);

  const scoreDisplay = currentUser?.score != null ? `${Number(currentUser.score).toFixed(1)}/5` : '—';
  const periodLabel =
    period === 'year'
      ? 'Cette année'
      : period === 'month'
        ? 'Ce mois'
        : period === 'week'
          ? '7 derniers jours'
          : 'Toutes périodes';

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mes Statistiques</h1>
          <p className="text-gray-500 text-sm">Analysez vos performances de tuteur (données réelles).</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="year">Cette année</option>
            <option value="month">Ce mois</option>
            <option value="week">7 derniers jours</option>
            <option value="all">Toutes périodes</option>
          </select>
          <button
            type="button"
            onClick={() => void loadServerReservations()}
            className="text-xs text-primary-600 border border-primary-200 rounded-lg px-3 py-1.5 hover:bg-primary-50"
          >
            Synchroniser
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Heures d&apos;enseignement</p>
          <p className="text-2xl font-bold text-primary-600">{teachingHours}h</p>
          <p className="text-xs text-green-500 mt-1">{periodLabel}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Heures planifiées</p>
          <p className="text-2xl font-bold text-blue-600">{plannedHours}h</p>
          <p className="text-xs text-gray-500 mt-1">Confirmées + en cours</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Séances réalisées</p>
          <p className="text-2xl font-bold text-purple-600">{completed.length}</p>
          <p className="text-xs text-gray-500 mt-1">Annulées : {cancelled.length}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Score moyen</p>
          <p className="text-2xl font-bold text-yellow-600">{scoreDisplay}</p>
          <p className="text-xs text-gray-500 mt-1">Profil tuteur</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4 text-sm">Évolution des heures</h3>
          {evolutionData.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">Aucune donnée sur cette période.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="enseignement"
                  name="Enseignement (réalisé)"
                  stroke="#0d9488"
                  fill="#ccfbf1"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="planifie"
                  name="Planifié (confirmé/en cours)"
                  stroke="#3b82f6"
                  fill="#dbeafe"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4 text-sm">Répartition des modules (séances réalisées)</h3>
          {moduleDistribution.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">Aucune séance complétée sur cette période.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={moduleDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip formatter={(v) => [`${v}`, 'Séances']} />
                <Bar dataKey="sessions" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-4 text-sm">Activité par jour de semaine</h3>
        {activityByWeekday.every((x) => x.val === 0) ? (
          <p className="text-sm text-gray-400">Aucune activité complétée pour cette période.</p>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {activityByWeekday.map((d) => {
              const val = d.val;
              const cls =
                val === 0
                  ? 'bg-gray-100 text-gray-400'
                  : val === 1
                    ? 'bg-primary-200 text-primary-700'
                    : val === 2
                      ? 'bg-primary-400 text-white'
                      : 'bg-primary-600 text-white';
              return (
                <div key={d.label} className={`rounded-lg p-3 text-center ${cls}`} title={`${val} séances`}>
                  <p className="text-xs font-semibold">{d.label}</p>
                  <p className="text-lg font-bold mt-1">{val}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
