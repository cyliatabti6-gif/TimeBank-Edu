import { createElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, BookOpen, Clock, AlertTriangle, TrendingUp, ChevronRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import DashboardLayout from '../../components/layout/DashboardLayout';

const chartData = [
  { month: 'Fév', tutorats: 30, heures: 50 }, { month: 'Mar', tutorats: 60, heures: 90 },
  { month: 'Avr', tutorats: 80, heures: 120 }, { month: 'Mai', tutorats: 110, heures: 180 }, { month: 'Juin', tutorats: 150, heures: 220 },
];
const pieData = [{ name: 'Étudiants', value: 85 }, { name: 'Tuteurs', value: 30 }, { name: 'Admins', value: 5 }];
const COLORS = ['#0d9488', '#3b82f6', '#f97316'];

const topModules = [
  { name: 'Algorithme', sessions: 45 }, { name: 'Base de Données', sessions: 32 }, { name: 'Python', sessions: 28 }, { name: 'Analyse 1', sessions: 22 },
];
const recentActivity = [
  { icon: '👤', color: 'bg-green-100', text: 'Nouvel utilisateur', sub: 'Sara Benali a rejoint la plateforme', time: 'Il y a 5 min' },
  { icon: '📚', color: 'bg-blue-100', text: 'Nouveau module', sub: 'Algorithme - L2 par Ahmed Moussa', time: 'Il y a 15 min' },
  { icon: '⚠️', color: 'bg-red-100', text: 'Litige signalé', sub: 'Absence non justifiée par Ali Karim', time: 'Il y a 30 min' },
  { icon: '⭐', color: 'bg-yellow-100', text: 'Évaluation déposée', sub: 'Lina Farah a évalué un tutorat', time: 'Il y a 1h' },
];
const recentDisputes = [
  { user: 'Ali Karim', issue: 'Absence non justifiée', status: 'En attente', time: 'Il y a 30 min' },
  { user: 'Fatima Zahra', issue: 'Problème de comportement', status: 'En cours', time: 'Il y a 2h' },
  { user: 'Yassine K.', issue: 'Annulation abusive', status: 'En cours', time: 'Il y a 5h' },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tableau de Bord</h1>
        <p className="text-gray-500 text-sm">Vue d'ensemble de la plateforme</p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        {[
          { icon: Users, val: '120', label: 'Utilisateurs', trend: '+12 ce mois', color: 'text-blue-600 bg-blue-50' },
          { icon: BookOpen, val: '45', label: 'Tutorats', trend: '+8 ce mois', color: 'text-primary-600 bg-primary-50' },
          { icon: Clock, val: '320h', label: 'Heures échangées', trend: '+24h ce mois', color: 'text-purple-600 bg-purple-50' },
          { icon: AlertTriangle, val: '8', label: 'Litiges ouverts', trend: '-2 ce mois', color: 'text-orange-600 bg-orange-50' },
          { icon: TrendingUp, val: '92%', label: "Taux de satisfaction", trend: '+3% ce mois', color: 'text-green-600 bg-green-50' },
        ].map((row) => (
          <div key={row.label} className="card">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${row.color.split(' ')[1]}`}>
              {createElement(row.icon, { size: 18, className: row.color.split(' ')[0] })}
            </div>
            <p className="text-2xl font-bold text-gray-900">{row.val}</p>
            <p className="text-xs text-gray-500">{row.label}</p>
            <p className="text-xs text-green-500 mt-0.5">{row.trend}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {/* Recent Activity */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Activité Récente</h2>
          </div>
          <div className="space-y-3">
            {recentActivity.map((a, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-8 h-8 ${a.color} rounded-full flex items-center justify-center text-sm flex-shrink-0`}>{a.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800">{a.text}</p>
                  <p className="text-xs text-gray-500 truncate">{a.sub}</p>
                  <p className="text-[11px] text-gray-400">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="text-xs text-primary-600 w-full text-center mt-3 hover:underline">Voir toute l'activité</button>
        </div>

        {/* Chart */}
        <div className="card lg:col-span-1">
          <h2 className="font-semibold text-gray-900 mb-4">Statistiques Générales</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="tutorats" name="Tutorats" stroke="#0d9488" fill="#ccfbf1" strokeWidth={2} />
              <Area type="monotone" dataKey="heures" name="Heures" stroke="#3b82f6" fill="#dbeafe" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Disputes + Pie */}
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900 text-sm">Litiges Récents</h2>
              <button onClick={() => navigate('/admin/litiges')} className="text-xs text-primary-600 hover:underline flex items-center gap-1">Voir tous <ChevronRight size={12} /></button>
            </div>
            <div className="space-y-2">
              {recentDisputes.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div>
                    <p className="font-medium text-gray-800">{d.user}</p>
                    <p className="text-gray-400">{d.issue}</p>
                  </div>
                  <span className={d.status === 'En attente' ? 'badge-orange' : 'badge-blue'}>{d.status}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-2 text-sm">Répartition des Utilisateurs</h2>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={pieData} cx="40%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Legend iconSize={8} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Modules */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4">Top Modules</h2>
        <div className="space-y-3">
          {topModules.map(m => (
            <div key={m.name} className="flex items-center gap-3">
              <span className="text-sm text-gray-600 w-28">{m.name}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div className="bg-primary-500 h-2 rounded-full transition-all" style={{ width: `${(m.sessions / 45) * 100}%` }} />
              </div>
              <span className="text-xs font-semibold text-gray-700 w-16 text-right">{m.sessions} tutorats</span>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
