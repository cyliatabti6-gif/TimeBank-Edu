import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend, PieChart, Pie, Cell } from 'recharts';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { fetchAdminStats } from '../../lib/adminApi';

const COLORS = ['#0d9488', '#3b82f6', '#f97316'];

export default function AdminStats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await fetchAdminStats();
      if (!cancelled) setStats(data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const monthlyData = useMemo(() => stats?.monthly || [], [stats]);
  const hoursData = useMemo(
    () => monthlyData.map((x) => ({ month: x.month, heures: x.heures })),
    [monthlyData],
  );
  const roleData = stats?.roleData || [];
  const top = stats?.topModules || [];
  const kpis = stats?.kpis || { users: 0, modules: 0, hours: 0, satisfaction: 0 };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Statistiques de la Plateforme</h1>
        <p className="text-gray-500 text-sm">Vue d'ensemble des performances globales.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Utilisateurs total', val: String(kpis.users), trend: 'Données live', color: 'text-primary-600' },
          { label: 'Modules actifs', val: String(kpis.modules), trend: 'Données live', color: 'text-blue-600' },
          { label: 'Heures échangées', val: `${kpis.hours}h`, trend: 'Données live', color: 'text-purple-600' },
          { label: 'Satisfaction', val: `${kpis.satisfaction}%`, trend: 'Données live', color: 'text-green-600' },
        ].map(s => (
          <div key={s.label} className="card">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
            <p className="text-xs text-green-500 mt-1">{s.trend}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4 text-sm">Croissance des utilisateurs et tutorats</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="utilisateurs" name="Utilisateurs" fill="#0d9488" radius={[4, 4, 0, 0]} />
              <Bar dataKey="tutorats" name="Tutorats" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4 text-sm">Évolution des heures échangées</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={hoursData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="heures" name="Heures" stroke="#0d9488" fill="#ccfbf1" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2">
          <h3 className="font-semibold text-gray-800 mb-4 text-sm">Top Tuteurs par Heures Données</h3>
          <div className="space-y-3">
            {top.map(t => (
              <div key={t.name} className="flex items-center gap-3">
                <span className="text-sm text-gray-700 w-32">{t.name}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className="bg-primary-500 h-2 rounded-full" style={{ width: `${(t.sessions / (top[0]?.sessions || 1)) * 100}%` }} />
                </div>
                <span className="text-xs text-gray-500 w-16 text-right">{t.sessions} séances</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4 text-sm">Répartition des Rôles</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={roleData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {roleData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </DashboardLayout>
  );
}
