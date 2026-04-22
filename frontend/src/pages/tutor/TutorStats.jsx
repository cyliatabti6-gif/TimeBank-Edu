import { useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useApp } from '../../context/AppContext';
import {
  filterReservationsByTutor,
  metricsFromRows,
  groupSessionsByMonth,
  statusDistributionForPie,
  sessionsBySubjectBar,
  displayRating,
  displayBalanceValue,
  sumCompletedHours,
  sessionHistoryCountForUser,
} from '../../lib/statisticsFromReservations';

const PIE_EXTRA = ['#8b5cf6', '#94a3b8'];
const MODULE_COLORS = ['#0ea5a4', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#6366f1'];

export default function TutorStats() {
  const { currentUser, reservations, sessionHistory, displayBalance } = useApp();
  const [periode, setPeriode] = useState('annee');

  const uid = currentUser?.id;

  const rows = useMemo(() => filterReservationsByTutor(reservations, uid), [reservations, uid]);

  const kpis = useMemo(() => {
    const m = metricsFromRows(rows);
    const hoursTeaching = sumCompletedHours(rows);
    const rating = displayRating(currentUser);
    const balance = displayBalanceValue(displayBalance, currentUser);
    const histCount = sessionHistoryCountForUser(sessionHistory, uid);
    return { ...m, hoursTeaching, rating, balance, histCount };
  }, [rows, currentUser, displayBalance, sessionHistory, uid]);

  const monthsBack = periode === 'mois' ? 6 : 12;
  const monthlyData = useMemo(
    () => groupSessionsByMonth(rows, monthsBack),
    [rows, monthsBack],
  );

  const moduleSessions = useMemo(() => sessionsBySubjectBar(rows, 8), [rows]);
  const modulePieData = useMemo(() => {
    const total = moduleSessions.reduce((s, x) => s + (Number(x.seances) || 0), 0);
    if (total <= 0) return [];
    return moduleSessions.map((x, i) => ({
      name: x.matiere,
      value: Number(x.seances) || 0,
      percent: ((Number(x.seances) || 0) * 100) / total,
      fill: MODULE_COLORS[i % MODULE_COLORS.length],
    }));
  }, [moduleSessions]);

  const monthlyEmpty = monthlyData.every((x) => x.seances === 0);
  const pieEmpty = modulePieData.length === 0;
  const barEmpty = moduleSessions.length === 0;

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mes Statistiques</h1>
          <p className="text-gray-500 text-sm mt-1">
            Performance tuteur · Note {kpis.rating.toFixed(1)}/5
          </p>
        </div>
        <select
          className="input-field max-w-xs text-sm"
          value={periode}
          onChange={(e) => setPeriode(e.target.value)}
        >
          <option value="annee">Cette année</option>
          <option value="mois">Ce mois</option>
          <option value="semaine">Cette semaine</option>
        </select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: 'Séances totales',
            val: String(kpis.totalSessions),
            sub: 'Sessions non annulées',
          },
          {
            label: 'Complétées',
            val: String(kpis.completedSessions),
            sub: `Heures données (complétées) : ${kpis.hoursTeaching}h`,
          },
          {
            label: 'En attente',
            val: String(kpis.pendingSessions),
            sub: `Confirmées : ${kpis.confirmedStrict} · En cours : ${kpis.inProgressSessions}`,
          },
          {
            label: 'Solde (heures)',
            val: `${kpis.balance}h`,
            sub: 'Solde compte',
          },
        ].map((k) => (
          <div key={k.label} className="card">
            <p className="text-xs text-gray-500">{k.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{k.val}</p>
            <p className="text-xs text-gray-500 mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4 text-sm">Activité mensuelle (séances)</h3>
          {monthlyEmpty ? (
            <div className="flex h-[240px] items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50/80 text-sm text-gray-500">
              Pas assez de réservations datées.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [v, 'Séances']} />
                <Area
                  type="monotone"
                  dataKey="seances"
                  name="Séances"
                  stroke="#0d9488"
                  fill="#ccfbf1"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4 text-sm">Répartition par module (%)</h3>
          {pieEmpty ? (
            <div className="flex h-[240px] items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50/80 text-sm text-gray-500">
              Aucune séance à afficher.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={modulePieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={88}
                    dataKey="value"
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {modulePieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, _n, ctx) => [`${v} séance(s)`, ctx?.payload?.name || 'Module']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {modulePieData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between gap-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.fill }} />
                      <span className="text-gray-700 truncate">{item.name}</span>
                    </div>
                    <span className="font-semibold text-gray-800">{item.percent.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mb-8">
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4 text-sm">Séances par module</h3>
          {barEmpty ? (
            <div className="flex h-[240px] items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50/80 text-sm text-gray-500">
              Aucun module renseigné.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={moduleSessions}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="category" dataKey="matiere" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [v, 'Séances']} />
                <Bar dataKey="seances" name="Séances" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {kpis.histCount > 0 ? (
        <p className="text-xs text-gray-400">
          Journal d&apos;activité local : {kpis.histCount} entrée
          {kpis.histCount > 1 ? 's' : ''} (validation croisée, hors agrégats graphiques).
        </p>
      ) : null}
    </DashboardLayout>
  );
}
