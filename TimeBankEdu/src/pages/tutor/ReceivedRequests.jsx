import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, MessageCircle, Search, AlertTriangle } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Avatar from '../../components/common/Avatar';
import StarRating from '../../components/common/StarRating';
import { mapApiUserToAppUser, useApp } from '../../context/AppContext';
import { fetchAuthenticatedProfile } from '../../lib/api';
import { getAccessToken } from '../../lib/authStorage';
import { acceptReservationAsTutor, confirmSeanceEndOnServer, fetchTutorIncomingReservations } from '../../lib/seancesApi';

function sessionEndHint(r, userId) {
  if (r.status !== 'confirmed' || !userId) return null;
  const u = Number(userId);
  const isSt = Number(r.studentId) === u;
  const isTu = Number(r.tutorId) === u;
  if (r.studentSessionConfirm && !r.tutorSessionConfirm) {
    if (isTu) return 'Confirmez la fin de séance pour créditer vos heures.';
    if (isSt) return 'En attente de la confirmation du tuteur.';
    return 'En attente du tuteur.';
  }
  if (!r.studentSessionConfirm && r.tutorSessionConfirm) {
    if (isSt) return 'Confirmez la fin de séance : votre balance sera débitée une fois les deux confirmations reçues.';
    if (isTu) return "En attente de la confirmation de l'étudiant.";
    return "En attente de l'étudiant.";
  }
  return 'Après la séance, étudiant et tuteur doivent chacun confirmer pour transférer les heures.';
}

const tabs = ['Toutes', 'En attente', 'Confirmées', 'Terminées', 'Annulées'];

function initials(name) {
  return (name || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function ReceivedRequests() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Toutes');
  const [search, setSearch] = useState('');
  const {
    reservations,
    currentUser,
    updateReservationStatus,
    confirmSessionCompletion,
    upsertReservationFromApiDetail,
    bulkUpsertReservationsFromApiDetails,
    setCurrentUser,
  } = useApp();

  const loadServerReservations = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    if (currentUser?.role !== 'tutor' && currentUser?.role !== 'both') return;
    try {
      const rows = await fetchTutorIncomingReservations(token);
      if (Array.isArray(rows) && rows.length > 0) bulkUpsertReservationsFromApiDetails(rows);
    } catch {
      /* hors ligne ou serveur arrêté */
    }
  }, [bulkUpsertReservationsFromApiDetails, currentUser?.role]);

  useEffect(() => {
    void loadServerReservations();
  }, [loadServerReservations]);

  const handleAccept = async (req) => {
    const token = getAccessToken();
    if (req.fromServer && token) {
      try {
        const data = await acceptReservationAsTutor(req.id, token);
        upsertReservationFromApiDetail(data);
        return;
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Erreur');
        return;
      }
    }
    updateReservationStatus(req.id, 'confirmed');
  };

  const handleConfirmEnd = async (req) => {
    const token = getAccessToken();
    const rid = Number(req.id);
    if (token) {
      try {
        const data = await confirmSeanceEndOnServer(rid, token);
        upsertReservationFromApiDetail(data);
        let me = null;
        try {
          me = await fetchAuthenticatedProfile(token);
          setCurrentUser(mapApiUserToAppUser(me));
        } catch {
          /* ignore */
        }
        if (data.status === 'completed' && me != null && Number(me.id) === Number(data.tutorId)) {
          alert('Séance clôturée. Vos heures ont été créditées sur le serveur. L’étudiant peut maintenant vous évaluer.');
        } else if (data.status !== 'completed') {
          alert(
            'Votre confirmation est enregistrée sur le serveur. Le transfert d’heures aura lieu lorsque l’étudiant confirmera aussi.',
          );
        }
        return;
      } catch (e) {
        const st = e?.status;
        if (st === 404 && !req.fromServer) {
          /* réservation locale */
        } else {
          alert(e instanceof Error ? e.message : 'Erreur');
          return;
        }
      }
    }
    const res = confirmSessionCompletion(rid);
    if (!res.ok) {
      alert(
        res.reason === 'forbidden'
          ? 'Vous ne participez pas à cette réservation.'
          : res.reason === 'bad_status'
            ? 'Cette séance n’est plus au statut « confirmée ».'
            : 'Action impossible pour cette réservation.',
      );
      return;
    }
    if (res.pendingOther) {
      alert('Confirmation enregistrée. Le transfert d’heures aura lieu lorsque l’étudiant confirmera aussi.');
    }
    if (res.completed) {
      alert('Séance clôturée. Les heures ont été mises à jour (mode local).');
    }
  };

  const incoming = useMemo(
    () => reservations.filter((r) => Number(r.tutorId) === Number(currentUser?.id)),
    [reservations, currentUser?.id],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return incoming.filter((r) => {
      if (activeTab === 'En attente') return r.status === 'pending';
      if (activeTab === 'Confirmées') return r.status === 'confirmed';
      if (activeTab === 'Terminées') return r.status === 'completed';
      if (activeTab === 'Annulées') return r.status === 'cancelled';
      return true;
    }).filter((r) => !q || r.studentName.toLowerCase().includes(q) || r.module.toLowerCase().includes(q));
  }, [incoming, activeTab, search]);

  const statusBadge = (status) => {
    if (status === 'pending') return <span className="badge-orange">En attente</span>;
    if (status === 'confirmed') return <span className="badge-green">Confirmée</span>;
    if (status === 'completed') return <span className="badge-blue">Terminée</span>;
    if (status === 'cancelled') return <span className="badge-red">Annulée</span>;
    return null;
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Réservations reçues</h1>
          <p className="text-gray-500 text-sm">
            Acceptez ou refusez les demandes sur vos créneaux. Les demandes créées sur le serveur sont chargées
            automatiquement (Django doit tourner).
          </p>
          <button
            type="button"
            onClick={() => void loadServerReservations()}
            className="text-xs text-primary-600 border border-primary-200 rounded-lg px-2.5 py-1 mt-2 hover:bg-primary-50"
          >
            Synchroniser avec le serveur
          </button>
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Étudiant, module…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-full sm:w-48"
          />
        </div>
      </div>

      <div className="flex gap-1 mb-5 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${
              activeTab === tab ? 'bg-primary-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((req) => (
          <div key={req.id} className="card flex flex-col sm:flex-row sm:items-center gap-4">
            <Avatar initials={initials(req.studentName)} size="md" />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-semibold text-sm text-gray-900">{req.studentName}</span>
                {statusBadge(req.status)}
                <div className="flex items-center gap-1">
                  <StarRating rating={req.studentScore || 0} size={11} />
                  <span className="text-xs text-gray-500">{req.studentScore}</span>
                </div>
              </div>
              <p className="text-sm text-primary-600 font-medium">{req.module}</p>
              <p className="text-xs text-gray-500">
                {req.date} • {req.creneauLabel} • {req.duration}h
              </p>
              {req.message ? <p className="text-xs text-gray-400 mt-1 italic">&laquo; {req.message} &raquo;</p> : null}
              {req.status === 'confirmed' ? (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-2 py-1 mt-2">
                  {sessionEndHint(req, currentUser?.id)}
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
              {req.status === 'pending' ? (
                <>
                  <button
                    type="button"
                    onClick={() => void handleAccept(req)}
                    className="flex items-center gap-1.5 bg-primary-600 text-white text-xs px-4 py-2 rounded-lg hover:bg-primary-700 font-medium"
                  >
                    <Check size={13} /> Accepter
                  </button>
                  <button
                    type="button"
                    onClick={() => updateReservationStatus(req.id, 'cancelled')}
                    className="flex items-center gap-1.5 bg-red-100 text-red-600 text-xs px-4 py-2 rounded-lg hover:bg-red-200 font-medium"
                  >
                    <X size={13} /> Refuser
                  </button>
                </>
              ) : null}
              {req.status === 'confirmed' ? (
                <button
                  type="button"
                  onClick={() => void handleConfirmEnd(req)}
                  className="flex items-center gap-1.5 bg-emerald-600 text-white text-xs px-4 py-2 rounded-lg hover:bg-emerald-700 font-medium"
                >
                  <Check size={13} /> Confirmer la fin de séance
                </button>
              ) : null}
              {(req.status === 'confirmed' || req.status === 'in_progress') ? (
                <button
                  type="button"
                  onClick={() =>
                    navigate('/report-absence', {
                      state: {
                        reservationId: req.id,
                        tutorName: currentUser?.name || '—',
                        studentName: req.studentName,
                        module: req.module,
                        date: req.date,
                        creneauLabel: req.creneauLabel,
                        reporterRole: 'tutor',
                      },
                    })
                  }
                  className="flex items-center gap-1.5 border border-amber-200 bg-amber-50 text-amber-900 text-xs px-3 py-2 rounded-lg hover:bg-amber-100 font-medium"
                >
                  <AlertTriangle size={13} /> Signaler
                </button>
              ) : null}
              <button
                type="button"
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                aria-label="Messages"
              >
                <MessageCircle size={15} className="text-gray-500" />
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p>Aucune réservation dans cette catégorie.</p>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center mt-6 bg-yellow-50 border border-yellow-100 rounded-lg px-4 py-3">
        Répondre rapidement améliore votre visibilité auprès des étudiants.
      </p>
    </DashboardLayout>
  );
}
