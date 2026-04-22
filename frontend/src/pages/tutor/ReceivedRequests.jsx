import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, MessageCircle, Clock } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Avatar from '../../components/common/Avatar';
import StarRating from '../../components/common/StarRating';
import { mapApiUserToAppUser, useApp } from '../../context/AppContext';
import { fetchAuthenticatedProfile } from '../../lib/api';
import { resolveAvatarSrc } from '../../lib/avatarUrl';
import { getAccessToken } from '../../lib/authStorage';
import { acceptReservationAsTutor, confirmSeanceEndOnServer, patchSeanceMeetUrl } from '../../lib/seancesApi';
import { stripCreneauLabelForDisplay } from '../../lib/reservationHelpers';
import { isReservationOnline } from '../../lib/reservationFormat';

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

export default function ReceivedRequests({ meetOnly = false }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Toutes');
  const [meetDraftById, setMeetDraftById] = useState({});
  const [meetSavingId, setMeetSavingId] = useState(null);
  const [meetErrorById, setMeetErrorById] = useState({});
  const {
    reservations,
    currentUser,
    updateReservationStatus,
    upsertReservationFromApiDetail,
    syncReservationsWithServer,
    setCurrentUser,
  } = useApp();

  useEffect(() => {
    const onFocus = () => {
      void syncReservationsWithServer();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [syncReservationsWithServer]);

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

  const meetDraftFor = (req) =>
    meetDraftById[req.id] !== undefined ? meetDraftById[req.id] : (req.meet_url || '');

  const handleSaveMeetUrl = async (req) => {
    const token = getAccessToken();
    if (!req.fromServer || !token) {
      alert('Connectez-vous et assurez-vous que la demande est enregistrée sur le serveur pour ajouter un lien.');
      return;
    }
    setMeetSavingId(req.id);
    setMeetErrorById((m) => ({ ...m, [req.id]: '' }));
    try {
      const data = await patchSeanceMeetUrl(req.id, meetDraftFor(req).trim(), token);
      upsertReservationFromApiDetail(data);
      setMeetDraftById((d) => {
        const next = { ...d };
        delete next[req.id];
        return next;
      });
    } catch (e) {
      setMeetErrorById((m) => ({ ...m, [req.id]: e instanceof Error ? e.message : 'Erreur' }));
    } finally {
      setMeetSavingId(null);
    }
  };

  const handleConfirmEnd = async (req) => {
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
      if (data.status === 'completed' && Number(currentUser?.id) === Number(data.tutorId)) {
        alert('Séance clôturée. Vos heures ont été créditées sur le serveur. L’étudiant peut maintenant vous évaluer.');
      } else if (data.status !== 'completed') {
        alert(
          'Votre confirmation est enregistrée sur le serveur. Le transfert d’heures aura lieu lorsque l’étudiant confirmera aussi.',
        );
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const incoming = useMemo(() => {
    const mine = reservations.filter((r) => Number(r.tutorId) === Number(currentUser?.id));
    if (!meetOnly) return mine;
    return mine.filter((r) => isReservationOnline(r) && (r.status === 'pending' || r.status === 'confirmed'));
  }, [reservations, currentUser?.id, meetOnly]);

  const filtered = useMemo(() => {
    return incoming.filter((r) => {
      if (meetOnly) return true;
      if (activeTab === 'En attente') return r.status === 'pending';
      if (activeTab === 'Confirmées') return r.status === 'confirmed';
      if (activeTab === 'Terminées') return r.status === 'completed';
      if (activeTab === 'Annulées') return r.status === 'cancelled';
      return true;
    });
  }, [incoming, activeTab, meetOnly]);

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
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {meetOnly ? 'Meet tuteur' : 'Réservations reçues'}
          </h1>
          {meetOnly ? (
            <p className="text-sm text-gray-500 mt-1">Séances en ligne réservées (en attente et confirmées).</p>
          ) : null}
        </div>
      </div>

      {!meetOnly ? (
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
      ) : null}

      <div className="space-y-3">
        {filtered.map((req) => {
          const avatarSrc = resolveAvatarSrc(req.student_avatar ?? req.studentAvatar) || undefined;
          if (import.meta.env.DEV) {
            console.log('RECEIVEDREQUESTS AVATAR DEBUG:', {
              reservationId: req.id,
              studentName: req.studentName,
              student_avatar: req.student_avatar,
              studentAvatar: req.studentAvatar,
              avatarSrc,
            });
          }
          return (
          <div key={req.id} className="card flex flex-col sm:flex-row sm:items-center gap-4">
            <Avatar
              initials={initials(req.studentName)}
              src={avatarSrc}
              size="md"
            />
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
                {req.date} • {stripCreneauLabelForDisplay(req.creneauLabel)} • {req.duration}h
              </p>
              {req.message ? <p className="text-xs text-gray-400 mt-1 italic">&laquo; {req.message} &raquo;</p> : null}
              {req.status === 'confirmed' ? (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-2 py-1 mt-2">
                  {sessionEndHint(req, currentUser?.id)}
                </p>
              ) : null}
              {req.status === 'confirmed' && isReservationOnline(req) ? (
                <div className="mt-3 space-y-2 w-full max-w-md">
                  <input
                    id={`meet-url-${req.id}`}
                    type="url"
                    inputMode="url"
                    autoComplete="off"
                    aria-label="Lien de visioconférence"
                    placeholder="https://meet.google.com/…"
                    value={meetDraftFor(req)}
                    onChange={(e) =>
                      setMeetDraftById((d) => ({
                        ...d,
                        [req.id]: e.target.value,
                      }))
                    }
                    className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={meetSavingId === req.id}
                      onClick={() => void handleSaveMeetUrl(req)}
                      className="text-xs bg-slate-700 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 font-medium disabled:opacity-50"
                    >
                      {meetSavingId === req.id ? 'Enregistrement…' : 'Enregistrer le lien'}
                    </button>
                    {req.meet_url ? (
                      <span className="text-[10px] text-green-700">Lien enregistré</span>
                    ) : null}
                  </div>
                  {meetErrorById[req.id] ? (
                    <p className="text-[11px] text-red-600">{meetErrorById[req.id]}</p>
                  ) : null}
                </div>
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
              <button
                type="button"
                onClick={() => navigate('/tutor/messenger', { state: { openUserId: req.studentId } })}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                aria-label="Messages"
              >
                <MessageCircle size={15} className="text-gray-500" />
              </button>
            </div>
          </div>
        )})}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Clock size={40} className="mx-auto mb-3 opacity-30" />
            {incoming.length === 0 ? (
              <p className="text-gray-600 font-medium">
                {meetOnly ? 'Aucune séance en ligne réservée.' : 'No reservations found.'}
              </p>
            ) : (
              <p>Aucune réservation dans cette catégorie.</p>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
