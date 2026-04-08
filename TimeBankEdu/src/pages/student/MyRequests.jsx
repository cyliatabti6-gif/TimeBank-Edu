import { useState } from 'react';
import { MessageCircle, Check, X, Clock } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Avatar from '../../components/common/Avatar';
import { mockRequests } from '../../context/AppContext';

const tabs = ['Toutes', 'En attente', 'Confirmées', 'Terminées', 'Annulées'];

export default function MyRequests() {
  const [activeTab, setActiveTab] = useState('Toutes');
  const [view, setView] = useState('sent'); // 'sent' or 'received'

  const filtered = mockRequests.filter(r => {
    if (activeTab === 'En attente') return r.status === 'pending';
    if (activeTab === 'Confirmées') return r.status === 'confirmed';
    if (activeTab === 'Terminées') return r.status === 'completed';
    if (activeTab === 'Annulées') return r.status === 'cancelled';
    return true;
  });

  const statusBadge = (status) => {
    if (status === 'pending') return <span className="badge-orange">En attente</span>;
    if (status === 'confirmed') return <span className="badge-green">Confirmée</span>;
    if (status === 'completed') return <span className="badge-blue">Terminée</span>;
    if (status === 'cancelled') return <span className="badge-red">Annulée</span>;
    return null;
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Mes Réservations</h1>
        <p className="text-gray-500 text-sm">Gérez vos demandes et réservations de tutorat.</p>
      </div>

      {/* View Toggle */}
      <div className="flex bg-gray-100 rounded-lg p-1 mb-5 max-w-xs">
        {['sent', 'received'].map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-all ${view === v ? 'bg-white shadow text-primary-600' : 'text-gray-500'}`}>
            {v === 'sent' ? 'Demandes Envoyées' : 'Demandes Reçues'}
          </button>
        ))}
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
            <Avatar initials={req.from.split(' ').map(w => w[0]).join('')} size="md" />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-sm text-gray-900">{req.from}</span>
                {statusBadge(req.status)}
              </div>
              <p className="text-sm text-gray-600 mt-0.5">{req.module}</p>
              <p className="text-xs text-gray-400">{req.date} • {req.time} • {req.duration}h</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {req.status === 'pending' && (
                <>
                  <button className="flex items-center gap-1 bg-primary-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-primary-700 transition-colors">
                    <Check size={13} /> Accepter
                  </button>
                  <button className="flex items-center gap-1 bg-red-100 text-red-600 text-xs px-3 py-1.5 rounded-lg hover:bg-red-200 transition-colors">
                    <X size={13} /> Refuser
                  </button>
                </>
              )}
              {req.status === 'confirmed' && (
                <>
                  <button className="flex items-center gap-1 bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors">
                    <Check size={13} /> Démarrer
                  </button>
                  <button className="flex items-center gap-1 bg-red-100 text-red-600 text-xs px-3 py-1.5 rounded-lg">
                    <X size={13} /> Annuler
                  </button>
                </>
              )}
              <button className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                <MessageCircle size={14} className="text-gray-500" />
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Clock size={40} className="mx-auto mb-3 opacity-30" />
            <p>Aucune demande dans cette catégorie</p>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center mt-6">
        Répondez dans les 24h, sinon vous serez notifié de rappel.
      </p>
    </DashboardLayout>
  );
}
