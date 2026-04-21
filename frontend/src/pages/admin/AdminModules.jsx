import { useState } from 'react';
import { Search, Plus, Filter, MoreHorizontal } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { mockModules } from '../../context/AppContext';

export default function AdminModules() {
  const [search, setSearch] = useState('');

  const filtered = mockModules.filter(m => m.title.toLowerCase().includes(search.toLowerCase()) || m.tutor.toLowerCase().includes(search.toLowerCase()));

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Gestion des Modules</h1>
          <p className="text-gray-500 text-sm">Consultez et gérez les modules proposés sur la plateforme.</p>
        </div>
        <button className="btn-primary text-sm py-2 px-4"><Plus size={15} /> Ajouter</button>
      </div>

      <div className="card mb-5 flex gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Rechercher un module..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-9" />
        </div>
        <button className="btn-secondary text-sm py-2 px-4"><Filter size={14} /> Filtrer</button>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Module', 'Tuteur', 'Catégorie', 'Niveau', 'Statut', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(m => (
                <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">{m.title}</td>
                  <td className="px-4 py-3 text-gray-600">{m.tutor}</td>
                  <td className="px-4 py-3 text-gray-500">{m.category}</td>
                  <td className="px-4 py-3"><span className="badge-blue">{m.level}</span></td>
                  <td className="px-4 py-3">
                    <span className={m.status === 'published' ? 'badge-green' : 'badge-orange'}>
                      {m.status === 'published' ? 'Publié' : 'En attente'}
                    </span>
                  </td>
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
          {[{ val: '45', label: 'Modules publiés', color: 'text-green-600' }, { val: '8', label: 'En attente', color: 'text-orange-500' }, { val: '5', label: 'Catégories', color: 'text-blue-600' }, { val: '98%', label: "Taux d'acceptation", color: 'text-primary-600' }].map(s => (
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
