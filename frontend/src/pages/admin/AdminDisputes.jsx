import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Filter } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { fetchAdminDisputes, patchAdminDispute } from '../../lib/adminApi';

const tabs = ['Tous', 'En attente', 'En cours', 'Résolus'];

export default function AdminDisputes() {
  const [activeTab, setActiveTab] = useState('Tous');
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const rows = await fetchAdminDisputes();
        if (!cancelled) setDisputes(Array.isArray(rows) ? rows : []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => disputes.filter(d => {
    if (activeTab === 'En attente') return d.status === 'En attente';
    if (activeTab === 'En cours') return d.status === 'En cours';
    if (activeTab === 'Résolus') return d.status === 'Résolu';
    return true;
  }), [disputes, activeTab]);

  const markInProgress = async (d) => {
    const nextStatus = d.status === 'En attente' ? 'in_progress' : 'resolved';
    const updated = await patchAdminDispute(d.id, { status: nextStatus });
    setDisputes((prev) => prev.map((row) => (row.id === d.id ? updated : row)));
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Gestion des Litiges</h1>
        <p className="text-gray-500 text-sm">Consultez et gérez les signalements et litiges ouverts.</p>
      </div>

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

      <div className="space-y-3">
        {loading && (
          <div className="card text-gray-500 text-sm">Chargement...</div>
        )}
        {!loading && filtered.map(d => (
          <div key={d.id} className="card hover:shadow-md transition-all">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={18} className="text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 text-sm">{d.title}</h3>
                  <span className={d.statusCls}>{d.status}</span>
                </div>
                <p className="text-sm text-gray-600">{d.desc}</p>
                <p className="text-xs text-gray-400 mt-1">{d.sub} • {d.time}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button type="button" onClick={() => markInProgress(d)} className="text-xs bg-primary-50 text-primary-600 px-3 py-1.5 rounded-lg hover:bg-primary-100 font-medium">Traiter</button>
                <button type="button" className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-200 font-medium">Détails</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 bg-primary-50 border border-primary-100 rounded-xl px-4 py-3 text-sm text-primary-700 text-center">
        Traitez les litiges équitablement pour maintenir la confiance dans la communauté.
      </div>
    </DashboardLayout>
  );
}
