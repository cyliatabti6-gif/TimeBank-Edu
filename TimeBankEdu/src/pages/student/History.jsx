import { useMemo, useState } from 'react';
import { Filter, Clock } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Avatar from '../../components/common/Avatar';
import { useApp } from '../../context/AppContext';

const tabs = ['Toutes', 'Données', 'Reçues', 'Évaluations'];

function initials(name) {
  return (name || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function sameId(a, b) {
  return Number(a) === Number(b);
}

export default function History() {
  const [activeTab, setActiveTab] = useState('Toutes');
  const { sessionHistory, currentUser, displayBalance } = useApp();

  const rows = useMemo(() => {
    const uid = currentUser?.id;
    if (uid == null) return [];
    return [...sessionHistory]
      .map((h) => {
        const asStudent = sameId(h.studentId, uid);
        const asTutor = sameId(h.tutorId, uid);
        if (!asStudent && !asTutor) return null;
        const partnerName = asStudent ? h.tutorName : h.studentName;
        const type = asStudent ? 'Reçu' : 'Donné';
        const hoursStr = asStudent ? `-${h.duration}h` : `+${h.duration}h`;
        const date = (() => {
          try {
            return new Date(h.at).toLocaleDateString('fr-FR');
          } catch {
            return '—';
          }
        })();
        return {
          id: h.id,
          date,
          partnerName,
          avatar: initials(partnerName),
          module: h.module,
          duration: h.duration,
          type,
          status: 'Complété',
          hours: hoursStr,
        };
      })
      .filter(Boolean)
      .sort((a, b) => String(b.id).localeCompare(String(a.id)));
  }, [sessionHistory, currentUser?.id]);

  const filtered = rows.filter((h) => {
    if (activeTab === 'Données') return h.type === 'Donné';
    if (activeTab === 'Reçues') return h.type === 'Reçu';
    return true;
  });

  const totalGiven = rows.filter((h) => h.type === 'Donné').reduce((s, h) => s + h.duration, 0);
  const totalReceived = rows.filter((h) => h.type === 'Reçu').reduce((s, h) => s + h.duration, 0);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Historique des transactions</h1>
        <p className="text-gray-500 text-sm">Séances terminées après double confirmation (transfert d&apos;heures).</p>
      </div>

      <div className="flex gap-1 mb-5 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === tab ? 'bg-primary-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {tab}
          </button>
        ))}
        <button
          type="button"
          className="ml-auto flex items-center gap-1 text-sm text-gray-500 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50"
        >
          <Filter size={14} /> Filtrer
        </button>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Date', 'Avec', 'Module', 'Durée', 'Type', 'Statut', 'Heures'].map((col) => (
                  <th key={col} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                    <Clock size={36} className="mx-auto mb-2 opacity-30" />
                    Aucune transaction enregistrée pour le moment. Les séances complétées apparaîtront ici après
                    confirmation par l&apos;étudiant et le tuteur.
                  </td>
                </tr>
              ) : (
                filtered.map((h) => (
                  <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-600">{h.date}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar initials={h.avatar} size="xs" />
                        <span className="text-gray-800">{h.partnerName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{h.module}</td>
                    <td className="px-4 py-3 text-gray-600">{h.duration}h</td>
                    <td className="px-4 py-3">
                      <span className={h.type === 'Donné' ? 'badge-green' : 'badge-blue'}>{h.type}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge-green">{h.status}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      <span
                        className={
                          h.hours.startsWith('+') ? 'text-green-600' : h.hours.startsWith('-') ? 'text-red-500' : 'text-gray-400'
                        }
                      >
                        {h.hours}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row sm:justify-between gap-2 text-sm">
          <span className="text-gray-500">
            Solde actuel :{' '}
            <span className="font-semibold text-primary-600">
              {displayBalance != null ? displayBalance : currentUser?.balance ?? 0}h
            </span>
          </span>
          <span className="text-gray-500">
            Total donné : <span className="font-semibold text-green-600">{totalGiven}h</span> | Total reçu :{' '}
            <span className="font-semibold text-blue-600">{totalReceived}h</span>
          </span>
        </div>
      </div>
    </DashboardLayout>
  );
}
