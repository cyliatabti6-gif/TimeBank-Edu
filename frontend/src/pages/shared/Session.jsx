import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Avatar from '../../components/common/Avatar';
import { mapApiUserToAppUser, useApp } from '../../context/AppContext';
import { getAccessToken } from '../../lib/authStorage';
import { fetchAuthenticatedProfile } from '../../lib/api';
import { confirmSeanceEndOnServer, fetchSeanceById } from '../../lib/seancesApi';
import { resolveAvatarSrc } from '../../lib/avatarUrl';
import {
  canStudentJoinOnlineMeeting,
  isReservationOnline,
  viewerIsReservationTutor,
} from '../../lib/reservationFormat';

function initials(name) {
  const p = (name || '').trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2) return `${p[0][0]}${p[p.length - 1][0]}`.toUpperCase();
  return (p[0] || 'U').slice(0, 2).toUpperCase();
}

/** GET /api/seances/:id/ → affichage (source de vérité : API). */
function toSessionShape(r) {
  if (!r) return null;
  if (r.fromServer) {
    return { ...r, status: r.status, meet_url: r.meet_url ?? null, _fromApi: true };
  }
  if (r.student != null && r.tutor != null) {
    return {
      ...r,
      studentId: r.studentId,
      studentName: r.studentName ?? r.student,
      tutorName: r.tutorName ?? r.tutor,
      status: r.status,
      format: r.format,
      meet_url: r.meet_url ?? null,
      _fromApi: true,
    };
  }
  if (r.studentName != null && r.tutorName != null) {
    return { ...r, status: r.status, meet_url: r.meet_url ?? null, _fromApi: false };
  }
  return {
    id: r.id,
    studentId: r.studentId,
    studentName: r.student,
    tutorName: r.tutor,
    tutorId: r.tutorId,
    module: r.module,
    date: r.date,
    creneauLabel: r.time,
    duration: r.duration,
    status: r.status,
    format: r.format,
    meet_url: r.meet_url ?? null,
    _fromApi: true,
  };
}

export default function Session() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { reservations, currentUser, setCurrentUser, upsertReservationFromApiDetail } = useApp();
  const reservationId = parseInt(id, 10);

  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!Number.isFinite(reservationId)) {
      setLoading(false);
      setActive(null);
      return;
    }
    const token = getAccessToken();
    if (token) {
      const ac = new AbortController();
      setLoading(true);
      setLoadError('');
      fetchSeanceById(reservationId, token, { signal: ac.signal })
        .then((d) => {
          setActive(toSessionShape(d));
        })
        .catch((err) => {
          if (err?.name === 'AbortError') return;
          const local = reservations.find((r) => Number(r.id) === reservationId);
          if (local) {
            setActive(toSessionShape(local));
            setLoadError('');
          } else {
            setActive(null);
            setLoadError('fetch');
          }
        })
        .finally(() => {
          if (!ac.signal.aborted) setLoading(false);
        });
      return () => ac.abort();
    }
    const local = reservations.find((r) => Number(r.id) === reservationId);
    if (local) {
      setActive(toSessionShape(local));
      setLoadError('');
      setLoading(false);
      return;
    }
    setActive(null);
    setLoadError('login');
    setLoading(false);
    return undefined;
  }, [reservationId, reservations]);

  const [ended, setEnded] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState('');
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);

  const reservation = active;

  const handleConfirmPresence = async () => {
    if (!Number.isFinite(reservationId)) {
      navigate('/evaluation/1');
      return;
    }
    if (confirmSubmitting) return;

    const token = getAccessToken();
    if (!token) {
      setConfirmMsg('Connectez-vous pour confirmer la fin de séance (transfert d’heures sur le serveur).');
      return;
    }

    setConfirmSubmitting(true);
    try {
      const data = await confirmSeanceEndOnServer(reservationId, token);
      upsertReservationFromApiDetail(data);
      setActive(toSessionShape({ ...data, fromServer: true }));
      if (data.status === 'completed') {
        try {
          const me = await fetchAuthenticatedProfile(token);
          setCurrentUser(mapApiUserToAppUser(me));
        } catch {
          /* balance inchangée si /me échoue */
        }
        if (Number(data.studentId) === Number(reservation?.studentId)) {
          navigate(`/evaluation/${reservationId}`, {
            state: {
              reservationId,
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
          return;
        }
        setConfirmMsg('Séance clôturée. Vos heures ont été mises à jour sur le serveur.');
        return;
      }
      setConfirmMsg(
        'Votre confirmation est enregistrée. Les heures seront transférées lorsque l’autre partie confirmera aussi.',
      );
    } catch (e) {
      setConfirmMsg(e instanceof Error ? e.message : 'Erreur serveur.');
    } finally {
      setConfirmSubmitting(false);
    }
  };

  if (!Number.isFinite(reservationId)) {
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto py-12 text-center text-gray-600 text-sm">
          <p>Lien de séance invalide.</p>
          <button type="button" className="btn-primary mt-4" onClick={() => navigate(-1)}>
            Retour
          </button>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <p className="text-sm text-gray-500 py-12 text-center">Chargement de la séance…</p>
      </DashboardLayout>
    );
  }

  if (loadError === 'login') {
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto py-12 text-center text-sm text-gray-600">
          <p>Connectez-vous pour accéder à cette séance.</p>
          <button type="button" className="btn-primary mt-4" onClick={() => navigate('/login')}>
            Connexion
          </button>
        </div>
      </DashboardLayout>
    );
  }

  if (!reservation || loadError === 'fetch') {
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto py-12 text-center text-gray-600 text-sm">
          <p>Réservation introuvable ou inaccessible.</p>
          <button type="button" className="btn-primary mt-4" onClick={() => navigate(-1)}>
            Retour
          </button>
        </div>
      </DashboardLayout>
    );
  }

  if (reservation.status !== 'confirmed') {
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto py-12 text-center text-gray-600 text-sm">
          <p>Cette séance n’est pas disponible (statut : {reservation.status}).</p>
          <button type="button" className="btn-primary mt-4" onClick={() => navigate('/student/demandes')}>
            Mes réservations
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const stInit = initials(reservation.studentName);
  const tuInit = initials(reservation.tutorName);
  const sessionAv = {
    student: resolveAvatarSrc(reservation.student_avatar ?? reservation.studentAvatar ?? ''),
    tutor: resolveAvatarSrc(reservation.tutor_avatar ?? reservation.tutorAvatar ?? ''),
  };

  const meetUrl =
    typeof reservation?.meet_url === 'string' && reservation.meet_url.trim()
      ? reservation.meet_url.trim()
      : '';

  const online = isReservationOnline(reservation);
  const showStudentJoinButton = canStudentJoinOnlineMeeting(reservation, currentUser);
  const isTutorViewer = viewerIsReservationTutor(currentUser, reservation);

  if (ended) {
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto text-center py-12">
          <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} className="text-primary-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Session terminée</h2>
          <p className="text-gray-500 mb-8">Merci de confirmer pour finaliser le transfert d&apos;heures.</p>

          <div className="card mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <Avatar initials={stInit} src={sessionAv.student || undefined} size="md" />
                <p className="font-semibold text-sm mt-2">{reservation.studentName}</p>
                <p className="text-xs text-gray-500">Étudiant</p>
                <p className="text-xs text-primary-600 font-medium mt-1">Durée : {reservation.duration} h</p>
                <p className="text-xs text-gray-400">Module : {reservation.module}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <Avatar initials={tuInit} src={sessionAv.tutor || undefined} size="md" color="blue" />
                <p className="font-semibold text-sm mt-2">{reservation.tutorName}</p>
                <p className="text-xs text-gray-500">Tuteur</p>
                <p className="text-xs text-primary-600 font-medium mt-1">Durée : {reservation.duration} h</p>
                <p className="text-xs text-gray-400">Module : {reservation.module}</p>
              </div>
            </div>
          </div>

          {confirmMsg ? (
            <p className="text-sm text-primary-700 bg-primary-50 border border-primary-100 rounded-lg px-3 py-2 mb-4">
              {confirmMsg}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={confirmSubmitting}
              onClick={() => void handleConfirmPresence()}
              className="btn-primary py-3 disabled:opacity-60 disabled:pointer-events-none"
            >
              <CheckCircle2 size={16} /> {confirmSubmitting ? 'Envoi…' : 'Confirmer ma présence'}
            </button>
            <button
              type="button"
              className="btn-secondary py-3 text-red-500 border-red-200 hover:bg-red-50"
              onClick={() => navigate('/report-absence', { state: { reservationId: reservation.id } })}
            >
              Signaler un problème
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            Le transfert d&apos;heures ({reservation.duration} h) s&apos;applique lorsque l&apos;étudiant et le tuteur ont
            tous les deux confirmé sur le serveur.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const sessionTitle = online ? 'Séance en ligne' : 'Séance en présentiel';

  let meetingBlock = null;
  if (!online) {
    meetingBlock = (
      <p className="text-sm text-gray-600">
        Cette séance est prévue en <strong>présentiel</strong>. Aucun lien de visioconférence n’est utilisé.
      </p>
    );
  } else if (showStudentJoinButton) {
    meetingBlock = (
      <>
        <p className="text-sm text-gray-500">
          Le tuteur a partagé un lien de visioconférence (Google Meet, Zoom, Teams…). Ouvrez-le dans un nouvel onglet.
        </p>
        <button
          type="button"
          className="btn-primary w-full sm:w-auto px-8 py-3"
          onClick={() => window.open(meetUrl, '_blank', 'noopener,noreferrer')}
        >
          Rejoindre la réunion
        </button>
      </>
    );
  } else if (isTutorViewer) {
    meetingBlock = meetUrl ? (
      <p className="text-xs text-gray-500">
        Lien de visio enregistré : l’étudiant peut le rejoindre depuis son espace. Vous pouvez modifier le lien dans «
        Réservations reçues ».
      </p>
    ) : (
      <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
        Enregistrez un lien https (Meet, Zoom, Teams…) dans « Réservations reçues » pour que l’étudiant puisse se connecter
        et pour permettre la clôture de la séance.
      </p>
    );
  } else {
    meetingBlock = meetUrl ? null : (
      <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
        Le tuteur n’a pas encore enregistré de lien de réunion. Vérifiez « Mes demandes » ou contactez votre tuteur.
      </p>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-4">
        <h1 className="font-bold text-gray-900">{sessionTitle}</h1>
        <p className="text-xs text-gray-500">
          {reservation.module} • {reservation.studentName} ↔ {reservation.tutorName}
        </p>
      </div>

      <div className="max-w-lg mx-auto card p-8 text-center space-y-6">
        {meetingBlock}
        <button
          type="button"
          className="w-full sm:w-auto px-6 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
          onClick={() => setEnded(true)}
        >
          Terminer la séance
        </button>
        <p className="text-xs text-gray-400">Ensuite, confirmez la fin de séance pour le transfert d&apos;heures.</p>
      </div>
    </DashboardLayout>
  );
}
