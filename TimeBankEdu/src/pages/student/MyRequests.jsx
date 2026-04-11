import { useMemo, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Check, X, Clock, Video, MapPin, Monitor, AlertTriangle } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Avatar from '../../components/common/Avatar';
import { mapApiUserToAppUser, mockTutors, useApp } from '../../context/AppContext';
import { fetchAuthenticatedProfile } from '../../lib/api';
import { getAccessToken } from '../../lib/authStorage';
import { confirmSeanceEndOnServer, fetchStudentReservationsFromServer } from '../../lib/seancesApi';

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

/** En ligne vs présentiel (rétrocompat : sinon format du tuteur mock). */
function isReservationOnline(r) {
  if (r.format === 'Présentiel') return false;
  if (r.format === 'Online') return true;
  const t = mockTutors.find((x) => x.id === r.tutorId);
  return t?.format !== 'Présentiel';
}

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

export default function MyRequests() {
  const navigate = useNavigate();
  const {
    reservations,
    currentUser,
    updateReservationStatus,
    confirmSessionCompletion,
    upsertReservationFromApiDetail,
    bulkUpsertReservationsFromApiDetails,
    setCurrentUser,
  } = useApp();
  const [activeTab, setActiveTab] = useState('Toutes');

  const loadServerReservations = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    if (currentUser?.role !== 'student' && currentUser?.role !== 'both') return;
    try {
      const rows = await fetchStudentReservationsFromServer(token);
      if (Array.isArray(rows) && rows.length > 0) bulkUpsertReservationsFromApiDetails(rows);
    } catch {
      /* ignore */
    }
  }, [bulkUpsertReservationsFromApiDetails, currentUser?.role]);

  useEffect(() => {
    void loadServerReservations();
  }, [loadServerReservations]);

  const mine = useMemo(
    () => reservations.filter((r) => Number(r.studentId) === Number(currentUser?.id)),
    [reservations, currentUser?.id],
  );

  const handleConfirmEnd = useCallback(
    async (req) => {
      const token = getAccessToken();
      const rid = Number(req.id);
      if (token) {
        try {
          const data = await confirmSeanceEndOnServer(rid, token);
          upsertReservationFromApiDetail(data);
          try {
            const me = await fetchAuthenticatedProfile(token);
            setCurrentUser(mapApiUserToAppUser(me));
          } catch {
            /* ignore */
          }
          if (data.status === 'completed' && Number(currentUser?.id) === Number(data.studentId)) {
            navigate(`/evaluation/${rid}`, {
              state: {
                reservationId: rid,
                tutorName: data.tutor,
                tutorId: data.tutorId,
                filiere: '—',
                score: 5,
                module: data.module,
                duration: data.duration,
                date: data.date,
                time: data.time || '',
              },
            });
          }
          return;
        } catch (e) {
          const st = e?.status;
          if (st === 404 && !req.fromServer) {
            /* réservation locale : confirmer dans le navigateur */
          } else {
            alert(e instanceof Error ? e.message : 'Erreur');
            return;
          }
        }
      }
      const res = confirmSessionCompletion(rid);
      if (res.completed) {
        navigate(`/evaluation/${rid}`, {
          state: {
            reservationId: rid,
            tutorName: req.tutorName,
            tutorId: req.tutorId,
            filiere: '—',
            score: 5,
            module: req.module,
            duration: req.duration,
            date: req.date,
            time: req.creneauLabel || '',
          },
        });
        return;
      }
      if (!res.ok) {
        alert('Action impossible pour cette réservation.');
        return;
      }
      if (res.pendingOther) {
        alert('Confirmation enregistrée. Le transfert d’heures aura lieu lorsque l’autre partie confirmera aussi.');
      }
    },
    [confirmSessionCompletion, currentUser?.id, navigate, setCurrentUser, upsertReservationFromApiDetail],
  );

  const filtered = mine.filter((r) => {
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

  const formatBadge = (r) =>
    isReservationOnline(r) ? (
      <span className="inline-flex items-center gap-0.5 text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">
        <Monitor size={10} /> En ligne
      </span>
    ) : (
      <span className="inline-flex items-center gap-0.5 text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded-md">
        <MapPin size={10} /> Présentiel
      </span>
    );

  const goReportProblem = (req) => {
    navigate('/report-absence', {
      state: {
        reservationId: req.id,
        tutorName: req.tutorName,
        module: req.module,
        date: req.date,
        creneauLabel: req.creneauLabel,
        flow: 'presentiel_student_issue',
      },
    });
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">Mes réservations</h1>
          <p className="text-gray-500 text-sm">
            Suivez vos demandes. Les réservations enregistrées sur Django sont chargées automatiquement.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadServerReservations()}
          className="text-xs text-primary-600 border border-primary-200 rounded-lg px-3 py-1.5 hover:bg-primary-50 self-start"
        >
          Synchroniser avec le serveur
        </button>
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
        {filtered.map((req) => {
          const online = isReservationOnline(req);
          return (
            <div key={req.id} className="card flex flex-col sm:flex-row sm:items-center gap-4">
              <Avatar initials={initials(req.tutorName)} size="md" />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-sm text-gray-900">{req.tutorName}</span>
                  {statusBadge(req.status)}
                  {formatBadge(req)}
                </div>
                <p className="text-sm text-gray-600 mt-0.5">{req.module}</p>
                <p className="text-xs text-gray-400">
                  {req.date} • {req.creneauLabel} • {req.duration}h
                </p>
                {req.message ? <p className="text-xs text-gray-500 mt-1 italic">&laquo; {req.message} &raquo;</p> : null}
                {req.status === 'confirmed' ? (
                  <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-2 py-1 mt-2">
                    {sessionEndHint(req, currentUser?.id)}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                {req.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => updateReservationStatus(req.id, 'cancelled')}
                    className="flex items-center gap-1 bg-red-100 text-red-600 text-xs px-3 py-1.5 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    <X size={13} /> Annuler la demande
                  </button>
                )}
                {req.status === 'confirmed' && online && (
                  <>
                    <button
                      type="button"
                      onClick={() => navigate(`/session/${req.id}`)}
                      className="flex items-center gap-1 bg-primary-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      <Video size={13} /> Accéder à la séance
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleConfirmEnd(req)}
                      className="flex items-center gap-1 bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      <Check size={13} /> Confirmer la fin de séance
                    </button>
                    <button
                      type="button"
                      onClick={() => updateReservationStatus(req.id, 'cancelled')}
                      className="flex items-center gap-1 bg-gray-100 text-gray-600 text-xs px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <X size={13} /> Annuler
                    </button>
                  </>
                )}
                {req.status === 'confirmed' && !online && (
                  <>
                    <button
                      type="button"
                      onClick={() => void handleConfirmEnd(req)}
                      className="flex items-center gap-1 bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      <Check size={13} /> Confirmer la fin de séance
                    </button>
                    <button
                      type="button"
                      onClick={() => goReportProblem(req)}
                      className="flex items-center gap-1 bg-red-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <AlertTriangle size={13} /> Problème / pas pu me rendre
                    </button>
                  </>
                )}
                {req.status === 'completed' && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Check size={14} className="text-green-600" /> Séance effectuée
                  </span>
                )}
                <button
                  type="button"
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                  aria-label="Messages"
                >
                  <MessageCircle size={14} className="text-gray-500" />
                </button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Clock size={40} className="mx-auto mb-3 opacity-30" />
            <p>Aucune réservation dans cette catégorie.</p>
            <p className="text-sm mt-2">Explorez les modules et envoyez une demande avec un créneau choisi.</p>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center mt-6">
        La balance est mise à jour lorsque l’étudiant et le tuteur ont tous les deux confirmé la fin de séance (durée de la réservation). En cas d’empêchement, utilisez le signalement rouge.
      </p>
    </DashboardLayout>
  );
}
