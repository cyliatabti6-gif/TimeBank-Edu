import { useState } from 'react';
import { Search, Plus, Filter, MoreHorizontal } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Avatar from '../../components/common/Avatar';

const users = [
  { id: 1, name: 'Sara Benali', role: 'Étudiant', status: 'Actif', date: '15/03/2024', avatar: 'SB' },
  { id: 2, name: 'Ahmed Moussa', role: 'Tuteur', status: 'Actif', date: '01/02/2024', avatar: 'AM' },
  { id: 3, name: 'Ali Karim', role: 'Étudiant', status: 'Actif', date: '05/01/2024', avatar: 'AK' },
  { id: 4, name: 'Fatima Zahra', role: 'Tuteur', status: 'Suspendu', date: '20/01/2024', avatar: 'FZ' },
  { id: 5, name: 'Yassine K.', role: 'Tuteur', status: 'Actif', date: '12/03/2024', avatar: 'YK' },
  { id: 6, name: 'Lina Farah', role: 'Étudiant', status: 'Actif', date: '18/02/2024', avatar: 'LF' },
];

export default function AdminUsers() {
  const [search, setSearch] = useState('');

  const filtered = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Gestion des Utilisateurs</h1>
          <p className="text-gray-500 text-sm">Gérez les comptes des étudiants et tuteurs.</p>
        </div>
        <button className="btn-primary text-sm py-2 px-4">
          <Plus size={15} /> Ajouter
        </button>
      </div>

      {/* Search + Filter */}
      <div className="card mb-5 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Rechercher un utilisateur..." value={search}
            onChange={e => setSearch(e.target.value)} className="input-field pl-9" />
        </div>
        <button className="btn-secondary text-sm py-2 px-4">
          <Filter size={14} /> Filtrer
        </button>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Utilisateur', 'Rôle', 'Statut', "Date d'inscription", 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar initials={u.avatar} size="sm" />
                      <span className="font-medium text-gray-800">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={u.role === 'Tuteur' ? 'badge-blue' : 'badge-green'}>{u.role}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={u.status === 'Actif' ? 'badge-green' : 'badge-red'}>{u.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.date}</td>
                  <td className="px-4 py-3">
                    <button className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
                      <MoreHorizontal size={16} className="text-gray-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 grid grid-cols-4 gap-4 text-center text-xs">
          {[{ val: '120', label: 'Utilisateurs', color: 'text-gray-800' }, { val: '65', label: 'Étudiants', color: 'text-primary-600' }, { val: '55', label: 'Tuteurs', color: 'text-blue-600' }, { val: '3', label: 'Suspendus', color: 'text-red-500' }].map(s => (
            <div key={s.label}>
              <p className={`text-lg font-bold ${s.color}`}>{s.val}</p>
              <p className="text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
