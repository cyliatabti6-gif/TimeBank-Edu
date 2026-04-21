import { useMemo, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Check, X, Clock, Video, MapPin, Monitor, AlertTriangle } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Avatar from '../../components/common/Avatar';
import { mapApiUserToAppUser, useApp } from '../../context/AppContext';
import { fetchAuthenticatedProfile } from '../../lib/api';
import { resolveAvatarSrc } from '../../lib/avatarUrl';
import { getAccessToken } from '../../lib/authStorage';
import { cancelReservationAsStudent, confirmSeanceEndOnServer } from '../../lib/seancesApi';
import { stripCreneauLabelForDisplay } from '../../lib/reservationHelpers';
import {
  canStudentJoinOnlineMeeting,
  isReservationOnline,
  FORMAT_PRESENTIEL,
} from '../../lib/reservationFormat';

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
    upsertReservationFromApiDetail,
    syncReservationsWithServer,
    setCurrentUser,
  } = useApp();
  const [activeTab, setActiveTab] = useState('Toutes');

  useEffect(() => {
    const onFocus = () => {
      void syncReservationsWithServer();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [syncReservationsWithServer]);

  const handleStudentCancel = useCallback(
    async (req) => {
      if (req.status === 'confirmed') {
        alert('Reservation cannot be cancelled after tutor acceptance.');
        return;
      }
      if (req.status !== 'pending') {
        return;
      }
      const token = getAccessToken();
      if (req.fromServer && token) {
        try {
          const data = await cancelReservationAsStudent(req.id, token);
          upsertReservationFromApiDetail(data);
        } catch (e) {
          alert(e instanceof Error ? e.message : 'Impossible d’annuler.');
        }
        return;
      }
      updateReservationStatus(req.id, 'cancelled');
    },
    [updateReservationStatus, upsertReservationFromApiDetail],
  );

  const mine = useMemo(
    () => reservations.filter((r) => Number(r.studentId) === Number(currentUser?.id)),
    [reservations, currentUser?.id],
  );

  const handleConfirmEnd = useCallback(
    async (req) => {
      const token = getAccessToken();
      const rid = Number(req.id);
      if (!token) {
        alert('Connectez-vous pour confirmer la fin de séance.');
        return;
      }
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
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Erreur');
      }
    },
    [currentUser?.id, navigate, setCurrentUser, upsertReservationFromApiDetail],
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

  const formatBadge = (r) => {
    if (isReservationOnline(r)) {
      return (
        <span className="inline-flex items-center gap-0.5 text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">
          <Monitor size={10} /> En ligne
        </span>
      );
    }
    if (r.format === FORMAT_PRESENTIEL) {
      return (
        <span className="inline-flex items-center gap-0.5 text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded-md">
          <MapPin size={10} /> Présentiel
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md">
        Format
      </span>
    );
  };

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
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Mes réservations</h1>
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
          const avatarSrc = resolveAvatarSrc(req.tutor_avatar ?? req.tutorAvatar) || undefined;
          if (import.meta.env.DEV) {
            console.log('MYREQUESTS AVATAR DEBUG:', {
              reservationId: req.id,
              tutorName: req.tutorName,
              tutor_avatar: req.tutor_avatar,
              tutorAvatar: req.tutorAvatar,
              avatarSrc,
            });
          }
          return (
            <div key={req.id} className="card flex flex-col sm:flex-row sm:items-center gap-4">
              <Avatar
                initials={initials(req.tutorName)}
                src={avatarSrc}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-sm text-gray-900">{req.tutorName}</span>
                  {statusBadge(req.status)}
                  {formatBadge(req)}
                </div>
                <p className="text-sm text-gray-600 mt-0.5">{req.module}</p>
                <p className="text-xs text-gray-400">
                  {req.date} • {stripCreneauLabelForDisplay(req.creneauLabel)} • {req.duration}h
                </p>
                {req.message ? <p className="text-xs text-gray-500 mt-1 italic">&laquo; {req.message} &raquo;</p> : null}
                {req.status === 'confirmed' ? (
                  <>
                    <p className="text-[11px] text-gray-600 mt-2">
                      This reservation has been confirmed and cannot be cancelled.
                    </p>
                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-2 py-1 mt-2">
                      {sessionEndHint(req, currentUser?.id)}
                    </p>
                  </>
                ) : null}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                {req.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => void handleStudentCancel(req)}
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
                      <Video size={13} />{' '}
                      {canStudentJoinOnlineMeeting(req, currentUser)
                        ? 'Rejoindre la visio'
                        : 'Accéder à la séance'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleConfirmEnd(req)}
                      className="flex items-center gap-1 bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      <Check size={13} /> Confirmer la fin de séance
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
                  onClick={() => navigate('/student/messenger', { state: { openUserId: req.tutorId } })}
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
            {mine.length === 0 ? (
              <>
                <p className="text-gray-600 font-medium">No reservations found.</p>
                <p className="text-sm mt-2">Explorez les modules et envoyez une demande avec un créneau choisi.</p>
              </>
            ) : (
              <>
                <p>Aucune réservation dans cette catégorie.</p>
                <p className="text-sm mt-2">Explorez les modules et envoyez une demande avec un créneau choisi.</p>
              </>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
