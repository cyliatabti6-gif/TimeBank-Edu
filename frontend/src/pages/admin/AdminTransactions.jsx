import { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Avatar from '../../components/common/Avatar';

const transactions = [
  { id: 1234, date: '15/05/2024', from: 'Ahmed Moussa', fromAvatar: 'AM', to: 'Sara Benali', toAvatar: 'SB', hours: 2, session: '#1234', type: 'Donnée' },
  { id: 1235, date: '15/05/2024', from: 'Sara Benali', fromAvatar: 'SB', to: 'Ahmed Moussa', toAvatar: 'AM', hours: 2, session: '#1234', type: 'Reçue' },
  { id: 1236, date: '14/05/2024', from: 'Lina Farah', fromAvatar: 'LF', to: 'Ali Karim', toAvatar: 'AK', hours: 1, session: '#1233', type: 'Donnée' },
  { id: 1237, date: '14/05/2024', from: 'Ali Karim', fromAvatar: 'AK', to: 'Lina Farah', toAvatar: 'LF', hours: 1, session: '#1233', type: 'Reçue' },
  { id: 1238, date: '13/05/2024', from: 'Yassine K.', fromAvatar: 'YK', to: 'Fatima Zahra', toAvatar: 'FZ', hours: 2, session: '#1232', type: 'Donnée' },
  { id: 1239, date: '13/05/2024', from: 'Fatima Zahra', fromAvatar: 'FZ', to: 'Yassine K.', toAvatar: 'YK', hours: 2, session: '#1232', type: 'Reçue' },
];

const tabs = ['Toutes', 'Données', 'Reçues'];

export default function AdminTransactions() {
  const [activeTab, setActiveTab] = useState('Toutes');
  const [search, setSearch] = useState('');

  const filtered = transactions.filter(t => {
    if (activeTab === 'Données') return t.type === 'Donnée';
    if (activeTab === 'Reçues') return t.type === 'Reçue';
    return true;
  });

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Historique des Transactions</h1>
        <p className="text-gray-500 text-sm">Suivez les échanges d'heures entre utilisateurs.</p>
      </div>

      <div className="flex gap-1 mb-5">
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === tab ? 'bg-primary-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200'}`}>
            {tab}
          </button>
        ))}
        <div className="relative ml-auto">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
            className="border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-40" />
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Date', 'De', 'Vers', 'Heures', 'Séance', 'Type'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500">{t.date}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar initials={t.fromAvatar} size="xs" />
                      <span className="text-gray-800">{t.from}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar initials={t.toAvatar} size="xs" color="blue" />
                      <span className="text-gray-800">{t.to}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-primary-600">+{t.hours}h</td>
                  <td className="px-4 py-3 text-gray-500">{t.session}</td>
                  <td className="px-4 py-3">
                    <span className={t.type === 'Donnée' ? 'badge-green' : 'badge-blue'}>{t.type}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-between text-sm text-gray-500">
          <span>Total échangé: <span className="font-bold text-primary-600">320h</span></span>
          <span>Données: <span className="font-semibold text-green-600">160h (50%)</span> | Reçues: <span className="font-semibold text-blue-600">160h (50%)</span> | Litiges ouverts: <span className="text-red-500">0</span></span>
        </div>
      </div>
    </DashboardLayout>
  );
}
