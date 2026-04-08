import { useState } from 'react';
import { Filter, Clock } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Avatar from '../../components/common/Avatar';

const allHistory = [
  { id: 1, date: '15/05/2024', tutor: 'Ahmed Moussa', avatar: 'AM', module: 'Algorithme - L2', duration: 2, type: 'Donné', status: 'Complété', hours: '+2h' },
  { id: 2, date: '08/05/2024', tutor: 'Lina Farah', avatar: 'LF', module: 'Analyse 1 - L1', duration: 1, type: 'Reçu', status: 'Complété', hours: '-1h' },
  { id: 3, date: '01/05/2024', tutor: 'Yassine K.', avatar: 'YK', module: 'Base de Données - L2', duration: 2, type: 'Donné', status: 'Complété', hours: '+2h' },
  { id: 4, date: '25/04/2024', tutor: 'Fatima Zahra', avatar: 'FZ', module: 'Python - L2', duration: 2, type: 'Reçu', status: 'Complété', hours: '-2h' },
  { id: 5, date: '18/04/2024', tutor: 'Lina Farah', avatar: 'LF', module: 'Analyse 1 - L1', duration: 1, type: 'Reçu', status: 'Annulé', hours: '0h' },
  { id: 6, date: '10/04/2024', tutor: 'Ali Karim', avatar: 'AK', module: 'Analyse 1 - L1', duration: 1, type: 'Reçu', status: 'Complété', hours: '-1h' },
];

const tabs = ['Toutes', 'Données', 'Reçues', 'Évaluations'];

export default function History() {
  const [activeTab, setActiveTab] = useState('Toutes');

  const filtered = allHistory.filter(h => {
    if (activeTab === 'Données') return h.type === 'Donné';
    if (activeTab === 'Reçues') return h.type === 'Reçu';
    return true;
  });

  const totalGiven = allHistory.filter(h => h.type === 'Donné' && h.status === 'Complété').reduce((s, h) => s + h.duration, 0);
  const totalReceived = allHistory.filter(h => h.type === 'Reçu' && h.status === 'Complété').reduce((s, h) => s + h.duration, 0);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Historique des Transactions</h1>
        <p className="text-gray-500 text-sm">Retrouvez toutes vos séances et échanges d'heures.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5">
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === tab ? 'bg-primary-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200'}`}>
            {tab}
          </button>
        ))}
        <button className="ml-auto flex items-center gap-1 text-sm text-gray-500 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50">
          <Filter size={14} /> Filtrer
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Date', 'Avec', 'Module', 'Durée', 'Type', 'Statut', 'Heures'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(h => (
                <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-600">{h.date}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar initials={h.avatar} size="xs" />
                      <span className="text-gray-800">{h.tutor}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{h.module}</td>
                  <td className="px-4 py-3 text-gray-600">{h.duration}h</td>
                  <td className="px-4 py-3">
                    <span className={h.type === 'Donné' ? 'badge-green' : 'badge-blue'}>{h.type}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={h.status === 'Complété' ? 'badge-green' : 'badge-red'}>{h.status}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    <span className={h.hours.startsWith('+') ? 'text-green-600' : h.hours.startsWith('-') ? 'text-red-500' : 'text-gray-400'}>{h.hours}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-between text-sm">
          <span className="text-gray-500">Solde actuel : <span className="font-semibold text-primary-600">3h</span></span>
          <span className="text-gray-500">Total donné : <span className="font-semibold text-green-600">{totalGiven}h</span> | Total reçu : <span className="font-semibold text-blue-600">{totalReceived}h</span></span>
        </div>
      </div>
    </DashboardLayout>
  );
}
