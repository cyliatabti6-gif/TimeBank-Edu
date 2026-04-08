import { useState } from 'react';
import { Check, X, MessageCircle, Search } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Avatar from '../../components/common/Avatar';
import StarRating from '../../components/common/StarRating';
import { mockRequests } from '../../context/AppContext';

const tabs = ['Toutes', 'En attente', 'Confirmées', 'Terminées', 'Annulées'];

export default function ReceivedRequests() {
  const [activeTab, setActiveTab] = useState('Toutes');
  const [search, setSearch] = useState('');

  const filtered = mockRequests.filter(r => {
    if (activeTab === 'En attente') return r.status === 'pending';
    if (activeTab === 'Confirmées') return r.status === 'confirmed';
    return true;
  });

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Demandes Reçues</h1>
          <p className="text-gray-500 text-sm">Gérez les demandes de tutorat de vos étudiants.</p>
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
            className="border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-48" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${activeTab === tab ? 'bg-primary-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Request Cards */}
      <div className="space-y-3">
        {filtered.map(req => (
          <div key={req.id} className="card flex flex-col sm:flex-row sm:items-center gap-4">
            <Avatar initials={req.from.split(' ').map(w=>w[0]).join('')} size="md" />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-semibold text-sm">{req.from}</span>
                <div className="flex items-center gap-1">
                  <StarRating rating={req.score} size={11} />
                  <span className="text-xs text-gray-500">{req.score}</span>
                </div>
              </div>
              <p className="text-sm text-primary-600 font-medium">{req.module}</p>
              <p className="text-xs text-gray-500">{req.date} • {req.time} • {req.duration}h</p>
              {req.message && <p className="text-xs text-gray-400 mt-1 italic">"{req.message}"</p>}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {req.status === 'pending' ? (
                <>
                  <button className="flex items-center gap-1.5 bg-primary-600 text-white text-xs px-4 py-2 rounded-lg hover:bg-primary-700 font-medium">
                    <Check size={13} /> Accepter
                  </button>
                  <button className="flex items-center gap-1.5 bg-red-100 text-red-600 text-xs px-4 py-2 rounded-lg hover:bg-red-200 font-medium">
                    <X size={13} /> Refuser
                  </button>
                </>
              ) : (
                <span className="badge-green">Confirmée</span>
              )}
              <button className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                <MessageCircle size={15} className="text-gray-500" />
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p>Aucune demande dans cette catégorie</p>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center mt-6 bg-yellow-50 border border-yellow-100 rounded-lg px-4 py-3">
        ⚠️ Répondez dans les 24h, sinon vous ne serez pas notifié de rappel.
      </p>
    </DashboardLayout>
  );
}
