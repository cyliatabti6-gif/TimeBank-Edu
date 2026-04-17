import { useMemo, useState, useEffect, useCallback } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useApp } from '../../context/AppContext';
import { getAccessToken } from '../../lib/authStorage';
import { fetchStudentReservationsFromServer } from '../../lib/seancesApi';

const COLORS = ['#0d9488', '#3b82f6', '#8b5cf6', '#f97316', '#ec4899', '#14b8a6'];

function ModulePieTooltip({ active, payload, total }) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-3 py-2.5 shadow-lg text-left max-w-[260px]">
      <p className="text-xs font-semibold text-gray-900 leading-snug break-words">{name}</p>
      <p className="text-xs text-gray-600 mt-1.5">
        <span className="font-semibold text-primary-600">{value} h</span>
        <span className="text-gray-400"> · </span>
        {pct}% du total
      </p>
    </div>
  );
}

function sameId(a, b) {
  return Number(a) === Number(b);
}

/** Tente d’extraire une date depuis le libellé affiché (ex. 15/05/2024). */
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
  if (period === 'month') {
    return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth();
  }
  if (period === 'week') {
    const start = new Date(now);
    start.setDate(now.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    return dt >= start && dt <= now;
  }
  return true;
}

export default function Statistics() {
  const { currentUser, reservations, bulkUpsertReservationsFromApiDetails } = useApp();
  const [period, setPeriod] = useState('year');

  const loadServerReservations = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    if (currentUser?.role !== 'student' && currentUser?.role !== 'both') return;
    try {
      const rows = await fetchStudentReservationsFromServer(token);
      if (Array.isArray(rows) && rows.length > 0) bulkUpsertReservationsFromApiDetails(rows);
    } catch {
      /* hors ligne */
    }
  }, [bulkUpsertReservationsFromApiDetails, currentUser?.role]);

  useEffect(() => {
    void loadServerReservations();
  }, [loadServerReservations]);

  const uid = currentUser?.id;

  const asStudent = useMemo(() => {
    if (uid == null) return [];
    return reservations.filter((r) => sameId(r.studentId, uid));
  }, [reservations, uid]);

  const filteredByPeriod = useMemo(() => {
    return asStudent.filter((r) => {
      const dt = parseReservationDate(r);
      if (!dt && (r.status === 'completed' || r.status === 'cancelled')) return period === 'all';
      if (!dt) return period === 'all';
      return inPeriod(dt, period);
    });
  }, [asStudent, period]);

  const completedInPeriod = useMemo(
    () => filteredByPeriod.filter((r) => r.status === 'completed'),
    [filteredByPeriod],
  );

  const cancelledInPeriod = useMemo(
    () => filteredByPeriod.filter((r) => r.status === 'cancelled'),
    [filteredByPeriod],
  );

  const hoursReceived = useMemo(
    () => completedInPeriod.reduce((s, r) => s + (Number(r.duration) || 0), 0),
    [completedInPeriod],
  );

  const sessionsCompleted = completedInPeriod.length;
  const sessionsCancelled = cancelledInPeriod.length;

  /** Évolution mensuelle des heures de tutorat reçues (séances complétées uniquement). */
  const evolutionData = useMemo(() => {
    const byKey = {};
    for (const r of asStudent.filter((x) => x.status === 'completed')) {
      const dt = parseReservationDate(r);
      if (!dt) continue;
      if (!inPeriod(dt, period)) continue;
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      const label = dt.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
      if (!byKey[key]) byKey[key] = { sortKey: key, month: label, heures: 0 };
      byKey[key].heures += Number(r.duration) || 0;
    }
    return Object.values(byKey)
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .slice(-12);
  }, [asStudent, period]);

  /** Répartition par module (heures complétées). */
  const pieData = useMemo(() => {
    const map = {};
    for (const r of completedInPeriod) {
      const m = (r.module || 'Autre').trim() || 'Autre';
      map[m] = (map[m] || 0) + (Number(r.duration) || 0);
    }
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [completedInPeriod]);

  const pieTotalHours = useMemo(() => pieData.reduce((s, p) => s + p.value, 0), [pieData]);

  /** Barres modules : top par heures. */
  const moduleBars = useMemo(() => {
    const max = Math.max(...pieData.map((p) => p.value), 1);
    return pieData.slice(0, 8).map((p) => ({ ...p, pct: (p.value / max) * 100 }));
  }, [pieData]);

  /** Tuteurs avec qui vous avez le plus suivi (heures complétées). */
  const tutorRanking = useMemo(() => {
    const map = {};
    for (const r of completedInPeriod) {
      const name = r.tutorName || '—';
      if (!map[name]) map[name] = { name, hours: 0, score: r.studentScore };
      map[name].hours += Number(r.duration) || 0;
      if (r.studentScore != null) map[name].score = r.studentScore;
    }
    return Object.values(map)
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 8);
  }, [completedInPeriod]);

  const scoreDisplay =
    currentUser?.score != null ? `${Number(currentUser.score).toFixed(1)} ★` : '—';

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
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mes Statistiques</h1>
          <p className="text-gray-500 text-sm">
            Données de votre espace <strong>étudiant</strong> uniquement (tutorat reçu).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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

      {/* KPI — uniquement côté étudiant */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Heures de tutorat reçues</p>
          <p className="text-2xl font-bold text-blue-600">{hoursReceived}h</p>
          <p className="text-[11px] text-gray-400 mt-1">{periodLabel}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Séances complétées</p>
          <p className="text-2xl font-bold text-primary-600">{sessionsCompleted}</p>
          <p className="text-[11px] text-gray-400 mt-1">Transfert d&apos;heures effectué</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Séances annulées</p>
          <p className="text-2xl font-bold text-red-600">{sessionsCancelled}</p>
          <p className="text-[11px] text-gray-400 mt-1">Annulations enregistrées</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Mon score</p>
          <p className="text-2xl font-bold text-yellow-600">{scoreDisplay}</p>
          <p className="text-[11px] text-gray-400 mt-1">Profil étudiant</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4 text-sm">Évolution des heures reçues</h3>
          {evolutionData.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">
              Aucune séance complétée avec une date reconnue pour cette période.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip formatter={(v) => [`${v} h`, 'Heures reçues']} />
                <Area
                  type="monotone"
                  dataKey="heures"
                  name="Heures reçues"
                  stroke="#2563eb"
                  fill="#dbeafe"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="card overflow-hidden">
          <div className="px-1 sm:px-0">
            <h3 className="font-semibold text-gray-800 mb-1 text-sm">Répartition par module (heures)</h3>
            <p className="text-[11px] text-gray-500 mb-4">
              Survolez le graphique pour le détail. La liste à droite reprend les mêmes données sans chevauchement.
            </p>
          </div>
          {pieData.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">Pas encore de séances complétées sur cette période.</p>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-stretch gap-6 sm:gap-8 -mx-1 sm:mx-0">
              <div className="flex justify-center sm:justify-start shrink-0 mx-auto sm:mx-0 w-full max-w-[240px] sm:max-w-[200px]">
                <div className="w-full aspect-square max-h-[220px] min-h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius="58%"
                        outerRadius="88%"
                        dataKey="value"
                        paddingAngle={3}
                        stroke="#fff"
                        strokeWidth={2}
                        label={false}
                        isAnimationActive
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} className="outline-none" />
                        ))}
                      </Pie>
                      <Tooltip
                        content={<ModulePieTooltip total={pieTotalHours} />}
                        wrapperStyle={{ outline: 'none' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <ul className="flex-1 min-w-0 space-y-3 sm:pt-1 sm:border-l sm:border-gray-100 sm:pl-6">
                {pieData.map((item, i) => {
                  const pct = pieTotalHours > 0 ? ((item.value / pieTotalHours) * 100).toFixed(1) : '0';
                  return (
                    <li key={item.name} className="flex gap-3 text-sm">
                      <span
                        className="w-3.5 h-3.5 rounded-md shrink-0 mt-0.5 shadow-sm ring-1 ring-black/5"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-gray-900 font-medium leading-snug break-words">{item.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          <span className="font-semibold tabular-nums text-gray-700">{item.value} h</span>
                          <span className="text-gray-300"> · </span>
                          {pct}%
                        </p>
                      </div>
                    </li>
                  );
                })}
                <li className="pt-2 mt-1 border-t border-gray-100 text-xs text-gray-500">
                  Total : <span className="font-semibold text-gray-800">{pieTotalHours} h</span>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4 text-sm">Modules suivis (heures complétées)</h3>
          {moduleBars.length === 0 ? (
            <p className="text-sm text-gray-400">Aucune donnée pour cette période.</p>
          ) : (
            <div className="space-y-3">
              {moduleBars.map((m) => (
                <div key={m.name} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 w-32 truncate shrink-0" title={m.name}>
                    {m.name}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2 min-w-0">
                    <div className="bg-primary-500 h-2 rounded-full transition-all" style={{ width: `${m.pct}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 w-10 text-right shrink-0">{m.value}h</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4 text-sm">Tuteurs (heures de tutorat reçues)</h3>
          {tutorRanking.length === 0 ? (
            <p className="text-sm text-gray-400">Aucune séance complétée sur cette période.</p>
          ) : (
            <div className="space-y-3">
              {tutorRanking.map((t) => (
                <div key={t.name} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-gray-700 truncate">{t.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-500">{t.hours}h</span>
                    {t.score != null ? (
                      <span className="text-sm font-semibold text-yellow-600">{Number(t.score).toFixed(1)} ★</span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
