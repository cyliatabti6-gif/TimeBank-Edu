import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import DashboardLayout from '../../components/layout/DashboardLayout';

const areaData = [
  { month: 'Jan', heures: 2 }, { month: 'Fév', heures: 3 }, { month: 'Mar', heures: 1 },
  { month: 'Avr', heures: 4 }, { month: 'Mai', heures: 5 }, { month: 'Juin', heures: 3 },
];
const doubleData = [
  { month: 'Jan', donnees: 1, recues: 2 }, { month: 'Fév', donnees: 2, recues: 1 },
  { month: 'Mar', donnees: 1, recues: 0 }, { month: 'Avr', donnees: 3, recues: 1 },
  { month: 'Mai', donnees: 4, recues: 1 }, { month: 'Juin', donnees: 2, recues: 2 },
];
const pieData = [
  { name: 'Algorithme', value: 40 }, { name: 'Analyse 1', value: 25 },
  { name: 'Base de Données', value: 20 }, { name: 'Autre', value: 15 },
];
const COLORS = ['#0d9488', '#3b82f6', '#8b5cf6', '#f97316'];

export default function Statistics() {
  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mes Statistiques</h1>
          <p className="text-gray-500 text-sm">Analysez votre activité sur la plateforme.</p>
        </div>
        <select className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none">
          <option>Cette année</option>
          <option>Ce mois</option>
          <option>Cette semaine</option>
        </select>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Heures enseignées', val: '5h', trend: '+1h', color: 'text-primary-600' },
          { label: 'Heures reçues', val: '8h', trend: '+2h', color: 'text-blue-600' },
          { label: 'Séances', val: '7', trend: '+2 ce mois', color: 'text-purple-600' },
          { label: 'Score moyen', val: '4.7 ★', trend: '+0.2', color: 'text-yellow-600' },
        ].map(s => (
          <div key={s.label} className="card">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
            <p className="text-xs text-green-500 mt-1">{s.trend}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4 text-sm">Évolution des heures</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={doubleData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="donnees" name="Enseignées" stroke="#0d9488" fill="#ccfbf1" strokeWidth={2} />
              <Area type="monotone" dataKey="recues" name="Reçues" stroke="#3b82f6" fill="#dbeafe" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4 text-sm">Répartition des activités</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Modules & Tutors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4 text-sm">Matières les plus tutorées</h3>
          <div className="space-y-3">
            {[{ label: 'Algorithme', val: 3 }, { label: 'Analyse 1', val: 2 }, { label: 'Base de Données', val: 1 }, { label: 'Python', val: 1 }].map(m => (
              <div key={m.label} className="flex items-center gap-3">
                <span className="text-xs text-gray-600 w-28">{m.label}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className="bg-primary-500 h-2 rounded-full" style={{ width: `${(m.val / 3) * 100}%` }} />
                </div>
                <span className="text-xs font-semibold text-gray-700">{m.val}h</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4 text-sm">Meilleurs tuteurs avec qui j'ai travaillé</h3>
          <div className="space-y-3">
            {[{ name: 'Ahmed Moussa', score: 4.9 }, { name: 'Lina Farah', score: 4.8 }, { name: 'Yassine K.', score: 4.7 }].map(t => (
              <div key={t.name} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{t.name}</span>
                <span className="text-sm font-semibold text-yellow-600">{t.score} ★</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
