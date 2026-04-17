import { useMemo, useState, useEffect, useCallback } from 'react';
import { Filter, Clock } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Avatar from '../../components/common/Avatar';
import { useApp } from '../../context/AppContext';
import { getAccessToken } from '../../lib/authStorage';
import { fetchStudentReservationsFromServer } from '../../lib/seancesApi';

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

/** Ligne d’historique unifiée (serveur + localStorage). */
function mapReservationToRow(r, uid) {
  const asStudent = sameId(r.studentId, uid);
  const asTutor = sameId(r.tutorId, uid);
  if (!asStudent && !asTutor) return null;
  const partnerName = asStudent ? r.tutorName || 'Tuteur' : r.studentName || 'Étudiant';
  const type = asStudent ? 'Reçu' : 'Donné';
  const hoursStr = asStudent ? `-${Number(r.duration) || 0}h` : `+${Number(r.duration) || 0}h`;
  let date = r.date && r.date !== '—' ? r.date : '—';
  if (date === '—' && r.completedAt) {
    try {
      date = new Date(r.completedAt).toLocaleDateString('fr-FR');
    } catch {
      date = '—';
    }
  }
  return {
    id: `res-${r.id}`,
    reservationId: r.id,
    sortKey: Number(r.id) || 0,
    date,
    partnerName,
    avatar: initials(partnerName),
    module: r.module || '—',
    duration: Number(r.duration) || 0,
    type,
    status: 'Complété',
    hours: hoursStr,
    evaluated: Boolean(r.evaluated),
    fromServer: Boolean(r.fromServer),
  };
}

/** Séance annulée (signalement, refus, etc.) — pas de transfert d’heures. */
function mapCancelledReservationToRow(r, uid) {
  const asStudent = sameId(r.studentId, uid);
  const asTutor = sameId(r.tutorId, uid);
  if (!asStudent && !asTutor) return null;
  const partnerName = asStudent ? r.tutorName || 'Tuteur' : r.studentName || 'Étudiant';
  const type = asStudent ? 'Reçu' : 'Donné';
  let date = r.date && r.date !== '—' ? r.date : '—';
  if (date === '—' && r.updatedAt) {
    try {
      date = new Date(r.updatedAt).toLocaleDateString('fr-FR');
    } catch {
      date = '—';
    }
  }
  return {
    id: `res-cancel-${r.id}`,
    reservationId: r.id,
    sortKey: Number(r.id) || 0,
    date,
    partnerName,
    avatar: initials(partnerName),
    module: r.module || '—',
    duration: Number(r.duration) || 0,
    type,
    status: 'Annulée',
    hours: '—',
    evaluated: false,
    fromServer: Boolean(r.fromServer),
  };
}

function mapHistoryRowToRow(h, uid) {
  const asStudent = sameId(h.studentId, uid);
  const asTutor = sameId(h.tutorId, uid);
  if (!asStudent && !asTutor) return null;
  const partnerName = asStudent ? h.tutorName : h.studentName;
  const type = asStudent ? 'Reçu' : 'Donné';
  const hoursStr = asStudent ? `-${h.duration}h` : `+${h.duration}h`;
  let date = '—';
  try {
    date = new Date(h.at).toLocaleDateString('fr-FR');
  } catch {
    date = '—';
  }
  const rid = Number(h.reservationId);
  return {
    id: h.id,
    reservationId: h.reservationId,
    sortKey: Number.isFinite(rid) ? rid : Date.parse(h.at) || 0,
    date,
    partnerName,
    avatar: initials(partnerName),
    module: h.module,
    duration: h.duration,
    type,
    status: 'Complété',
    hours: hoursStr,
    evaluated: false,
    fromServer: false,
  };
}

export default function History() {
  const [activeTab, setActiveTab] = useState('Toutes');
  const {
    sessionHistory,
    currentUser,
    displayBalance,
    reservations,
    bulkUpsertReservationsFromApiDetails,
  } = useApp();

  const loadServerReservations = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    if (currentUser?.role !== 'student' && currentUser?.role !== 'both') return;
    try {
      const rows = await fetchStudentReservationsFromServer(token);
      if (Array.isArray(rows) && rows.length > 0) bulkUpsertReservationsFromApiDetails(rows);
    } catch {
      /* hors ligne */
    }
  }, [bulkUpsertReservationsFromApiDetails, currentUser?.role]);

  useEffect(() => {
    void loadServerReservations();
  }, [loadServerReservations]);

  const rows = useMemo(() => {
    const uid = currentUser?.id;
    if (uid == null) return [];
    const sid = Number(uid);

    const fromApi = reservations
      .map((r) => {
        if (r.status === 'completed') return mapReservationToRow(r, sid);
        if (r.status === 'cancelled') return mapCancelledReservationToRow(r, sid);
        return null;
      })
      .filter(Boolean);

    const coveredIds = new Set(fromApi.map((x) => Number(x.reservationId)));

    const fromLocal = sessionHistory
      .filter((h) => !coveredIds.has(Number(h.reservationId)))
      .map((h) => mapHistoryRowToRow(h, sid))
      .filter(Boolean);

    const merged = [...fromApi, ...fromLocal];
    merged.sort((a, b) => b.sortKey - a.sortKey);
    return merged;
  }, [sessionHistory, reservations, currentUser?.id]);

  const filtered = rows.filter((h) => {
    if (activeTab === 'Données') return h.type === 'Donné';
    if (activeTab === 'Reçues') return h.type === 'Reçu';
    if (activeTab === 'Évaluations') return h.evaluated === true;
    return true;
  });

  const totalGiven = rows
    .filter((h) => h.type === 'Donné' && h.status === 'Complété')
    .reduce((s, h) => s + h.duration, 0);
  const totalReceived = rows
    .filter((h) => h.type === 'Reçu' && h.status === 'Complété')
    .reduce((s, h) => s + h.duration, 0);

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">Historique des transactions</h1>
          <p className="text-gray-500 text-sm">
            Séances terminées (transfert d&apos;heures) et séances annulées (signalement, annulation de demande, etc.).
            Les données serveur sont chargées automatiquement.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadServerReservations()}
          className="text-xs text-primary-600 border border-primary-200 rounded-lg px-3 py-1.5 hover:bg-primary-50 self-start"
        >
          Synchroniser
        </button>
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
                    {activeTab === 'Évaluations' ? (
                      <p>Aucune évaluation enregistrée pour l’instant. Après une séance terminée, vous pourrez noter le tuteur.</p>
                    ) : (
                      <p>
                        Aucune ligne dans cette catégorie. Les séances complétées et les séances annulées apparaissent ici ;
                        utilisez « Synchroniser » si besoin.
                      </p>
                    )}
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
                      <span className={h.status === 'Annulée' ? 'badge-red' : 'badge-green'}>{h.status}</span>
                      {h.evaluated ? (
                        <span className="ml-1 text-[10px] text-primary-600 font-medium">· Évalué</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {h.hours === '—' ? (
                        <span className="text-gray-400 font-normal">—</span>
                      ) : (
                        <span
                          className={
                            h.hours.startsWith('+') ? 'text-green-600' : h.hours.startsWith('-') ? 'text-red-500' : 'text-gray-400'
                          }
                        >
                          {h.hours}
                        </span>
                      )}
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
