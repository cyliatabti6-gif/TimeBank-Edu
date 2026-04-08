import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import DashboardLayout from '../../components/layout/DashboardLayout';

const data = [
  { month: 'Jan', enseignement: 5, apprentissage: 2 }, { month: 'Fév', enseignement: 8, apprentissage: 3 },
  { month: 'Mar', enseignement: 6, apprentissage: 1 }, { month: 'Avr', enseignement: 10, apprentissage: 2 },
  { month: 'Mai', enseignement: 12, apprentissage: 3 },
];

const activityData = Array.from({ length: 7 }, (_, week) =>
  ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].reduce((acc, day) => ({ ...acc, [day]: Math.floor(Math.random() * 4) }), { week: `S${week + 1}` })
);

export default function TutorStats() {
  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mes Statistiques</h1>
          <p className="text-gray-500 text-sm">Analysez vos performances en détail.</p>
        </div>
        <select className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none">
          <option>Cette année</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Heures d'enseignement", val: '120h', trend: '+8h', color: 'text-primary-600' },
          { label: "Heures d'apprentissage", val: '85h', trend: '+2h', color: 'text-blue-600' },
          { label: 'Séances', val: '43', trend: '+3 ce mois', color: 'text-purple-600' },
          { label: 'Score moyen', val: '4.7/5', trend: '', color: 'text-yellow-600' },
        ].map(s => (
          <div key={s.label} className="card">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
            {s.trend && <p className="text-xs text-green-500 mt-1">{s.trend}</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4 text-sm">Évolution des heures</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="enseignement" name="Enseignement" stroke="#0d9488" fill="#ccfbf1" strokeWidth={2} />
              <Area type="monotone" dataKey="apprentissage" name="Apprentissage" stroke="#3b82f6" fill="#dbeafe" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4 text-sm">Répartition des modules</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={[
              { name: 'Algo', sessions: 45 }, { name: 'BDD', sessions: 32 }, { name: 'Python', sessions: 28 }, { name: 'Analyse', sessions: 22 }
            ]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="sessions" fill="#0d9488" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Activity Calendar */}
      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-4 text-sm">Activités par mois</h3>
        <div className="overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {activityData.map(week => (
              <div key={week.week} className="flex flex-col gap-1">
                {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => {
                  const val = week[day];
                  return (
                    <div key={day} title={`${val} séances`}
                      className={`w-4 h-4 rounded-sm ${val === 0 ? 'bg-gray-100' : val === 1 ? 'bg-primary-200' : val === 2 ? 'bg-primary-400' : 'bg-primary-600'}`} />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
