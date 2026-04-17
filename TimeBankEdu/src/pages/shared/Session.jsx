import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Users,
  FileText,
  CheckCircle2,
  Clock,
  MapPin,
  AlertTriangle,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Avatar from '../../components/common/Avatar';
import { mapApiUserToAppUser, useApp } from '../../context/AppContext';
import { fetchAuthenticatedProfile } from '../../lib/api';
import { getAccessToken } from '../../lib/authStorage';
import { confirmSeanceEndOnServer, fetchSeanceById } from '../../lib/seancesApi';

function reporterRoleForReservation(res, currentUser) {
  const uid = Number(currentUser?.id);
  if (!Number.isFinite(uid)) return 'student';
  if (Number(res.studentId) === uid) return 'student';
  if (Number(res.tutorId) === uid) return 'tutor';
  return 'student';
}

function initials(name) {
  const p = (name || '').trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2) return `${p[0][0]}${p[p.length - 1][0]}`.toUpperCase();
  return (p[0] || 'U').slice(0, 2).toUpperCase();
}

/** Format séance : API renvoie « Présentiel » ou « Online » (SeanceDetailSerializer.format). */
function normalizeFormat(f) {
  if (f === 'Présentiel') return 'Présentiel';
  if (f === 'Online') return 'Online';
  return 'Online';
}

/** Forme unique pour l’UI : localStorage (AppContext) ou réponse API. */
function toSessionShape(r) {
  if (!r) return null;
  let shaped;
  /** Réservation créée / sync via Django : il faut appeler l’API pour confirmer-fin (pas seulement le state local). */
  if (r.fromServer) {
    shaped = { ...r, status: r.status, _fromApi: true };
  } else if (r.student != null && r.tutor != null) {
    /** GET /api/seances/:id/ renvoie `student` / `tutor` (pas `fromServer`) : toujours traiter comme serveur. */
    shaped = {
      ...r,
      studentName: r.studentName ?? r.student,
      tutorName: r.tutorName ?? r.tutor,
      status: r.status,
      _fromApi: true,
    };
  } else if (r.studentName != null && r.tutorName != null) {
    shaped = { ...r, status: r.status, _fromApi: false };
  } else {
    shaped = {
      id: r.id,
      studentName: r.student,
      tutorName: r.tutor,
      tutorId: r.tutorId,
      module: r.module,
      date: r.date,
      creneauLabel: r.time,
      duration: r.duration,
      status: r.status,
      format: r.format,
      _fromApi: true,
    };
  }
  const creneauLabel = shaped.creneauLabel ?? shaped.time ?? '';
  const format = normalizeFormat(shaped.format);
  return { ...shaped, creneauLabel, format };
}

export default function Session() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { reservations, currentUser, confirmSessionCompletion, setCurrentUser, upsertReservationFromApiDetail } =
    useApp();
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

  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [ended, setEnded] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState('');
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);

  const reservation = active;

  const goReportAbsence = () => {
    if (!reservation) return;
    navigate('/report-absence', {
      state: {
        reservationId: reservation.id,
        tutorName: reservation.tutorName,
        studentName: reservation.studentName,
        module: reservation.module,
        date: reservation.date,
        creneauLabel: reservation.creneauLabel,
        reporterRole: reporterRoleForReservation(reservation, currentUser),
      },
    });
  };

  const handleConfirmPresence = async () => {
    if (!Number.isFinite(reservationId)) {
      navigate('/evaluation/1');
      return;
    }
    if (confirmSubmitting) return;

    const token = getAccessToken();
    if (token) {
      setConfirmSubmitting(true);
      try {
        const data = await confirmSeanceEndOnServer(reservationId, token);
        upsertReservationFromApiDetail(data);
        setActive(toSessionShape({ ...data, fromServer: true }));
        let me = null;
        try {
          me = await fetchAuthenticatedProfile(token);
          setCurrentUser(mapApiUserToAppUser(me));
        } catch {
          /* balance inchangée si /me échoue */
        }
        if (data.status === 'completed') {
          if (me != null && Number(me.id) === Number(data.studentId)) {
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
        return;
      } catch (e) {
        const st = e?.status;
        if (st === 404 && reservation?._fromApi) {
          setConfirmMsg(
            'Cette séance est introuvable sur le serveur. Reconnectez-vous ou ouvrez la réservation depuis « Mes demandes ».',
          );
          return;
        }
        if (st === 404) {
          /* réservation uniquement locale : poursuite vers confirmSessionCompletion */
        } else {
          setConfirmMsg(e instanceof Error ? e.message : 'Erreur serveur.');
          return;
        }
      } finally {
        setConfirmSubmitting(false);
      }
    } else if (reservation?._fromApi) {
      setConfirmMsg('Vous devez être connecté pour confirmer une séance enregistrée sur le serveur.');
      return;
    }

    const res = confirmSessionCompletion(reservationId);
    if (res.completed) {
      navigate(`/evaluation/${reservationId}`, {
        state: {
          reservationId,
          tutorName: reservation.tutorName,
          tutorId: reservation.tutorId,
          filiere: '—',
          score: 5,
          module: reservation.module,
          duration: reservation.duration,
          date: reservation.date,
          time: reservation.creneauLabel || '',
        },
      });
      return;
    }
    if (!res.ok) {
      setConfirmMsg(
        res.reason === 'login'
          ? 'Vous devez être connecté.'
          : res.reason === 'forbidden'
            ? 'Vous ne participez pas à cette réservation.'
            : 'Action impossible pour cette réservation.',
      );
      return;
    }
    if (res.pendingOther) {
      setConfirmMsg('Confirmation enregistrée. Le transfert d’heures aura lieu lorsque l’autre partie confirmera aussi.');
      return;
    }
    if (res.reason === 'bad_status') {
      setConfirmMsg('Cette réservation n’est plus au statut « confirmée ». Retournez à vos demandes.');
      return;
    }
    setConfirmMsg('Action impossible pour cette réservation.');
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

  const sessionActive = reservation.status === 'confirmed' || reservation.status === 'in_progress';
  if (!sessionActive) {
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
  const isPresentiel = reservation.format === 'Présentiel';

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
                <Avatar initials={stInit} size="md" />
                <p className="font-semibold text-sm mt-2">{reservation.studentName}</p>
                <p className="text-xs text-gray-500">Étudiant</p>
                <p className="text-xs text-primary-600 font-medium mt-1">Durée : {reservation.duration} h</p>
                <p className="text-xs text-gray-400">Module : {reservation.module}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <Avatar initials={tuInit} size="md" color="blue" />
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

          <div className="flex justify-center">
            <button
              type="button"
              disabled={confirmSubmitting}
              onClick={() => void handleConfirmPresence()}
              className="btn-primary py-3 px-8 disabled:opacity-60 disabled:pointer-events-none inline-flex items-center gap-2"
            >
              <CheckCircle2 size={16} /> {confirmSubmitting ? 'Envoi…' : 'Confirmer ma présence'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            Le transfert d&apos;heures ({reservation.duration} h) s&apos;applique lorsque l&apos;étudiant et le tuteur ont tous les deux confirmé
            {reservation._fromApi ? ' (enregistré sur le serveur).' : '.'}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-bold text-gray-900">{isPresentiel ? 'Séance en présentiel' : 'Session en cours'}</h1>
          <p className="text-xs text-gray-500">
            {reservation.module} • Avec {reservation.tutorName}
          </p>
          {isPresentiel ? (
            <p className="text-xs text-purple-800 mt-1.5 flex flex-wrap items-center gap-1.5">
              <MapPin size={14} className="text-purple-600 flex-shrink-0" />
              <span>
                {reservation.date || '—'}
                {reservation.creneauLabel ? ` · ${reservation.creneauLabel}` : ''} · {reservation.duration} h
              </span>
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {isPresentiel ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-800 bg-purple-100 border border-purple-200 rounded-full px-3 py-1">
              <MapPin size={14} /> Présentiel
            </span>
          ) : (
            <>
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-xs text-red-500 font-medium">En direct</span>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 max-w-4xl">
        <div className="flex flex-col gap-3">
          {isPresentiel ? (
            <>
              <div className="flex-1 min-h-64 rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white p-6 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center mb-4">
                  <MapPin size={32} className="text-purple-600" />
                </div>
                <p className="text-sm font-semibold text-gray-900">Rencontre physique</p>
                <p className="text-xs text-gray-600 mt-2 max-w-md">
                  Cette séance est prévue <strong>en présentiel</strong>. Le lieu se règle avec votre tuteur (messages, campus,
                  salle). Ce n’est pas une visioconférence intégrée ici.
                </p>
                <div className="mt-5 flex items-center gap-4">
                  <Avatar initials={tuInit} size="lg" color="blue" />
                  <span className="text-gray-400">↔</span>
                  <Avatar initials={stInit} size="lg" />
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Tuteur : {reservation.tutorName} • Vous : {reservation.studentName}
                </p>
                <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEnded(true)}
                    className="btn-primary py-2.5 px-6 text-sm inline-flex items-center gap-2"
                  >
                    <CheckCircle2 size={16} /> Terminer la séance
                  </button>
                  <button
                    type="button"
                    onClick={goReportAbsence}
                    className="text-xs text-amber-800 hover:text-amber-900 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50/80 hover:bg-amber-50"
                  >
                    <AlertTriangle size={14} /> Signaler un problème
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 bg-gray-900 rounded-2xl relative overflow-hidden min-h-64">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Avatar initials={tuInit} size="xl" color="blue" />
                  <p className="text-white font-medium mt-2">{reservation.tutorName}</p>
                  <p className="text-gray-400 text-sm">Tuteur • En ligne</p>
                </div>
              </div>
              <div className="absolute bottom-3 right-3 w-24 h-16 bg-gray-700 rounded-xl flex items-center justify-center">
                <Avatar initials={stInit} size="sm" />
              </div>
              <div className="absolute top-3 left-3 bg-black/50 rounded-lg px-3 py-1.5 flex items-center gap-2">
                <Clock size={13} className="text-white" />
                <span className="text-white text-xs font-mono">00:45:32</span>
              </div>
            </div>
          )}

          {!isPresentiel ? (
            <div className="bg-white rounded-2xl p-4 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setMicOn(!micOn)}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${micOn ? 'bg-gray-100 hover:bg-gray-200' : 'bg-red-500 text-white'}`}
              >
                {micOn ? <Mic size={18} className="text-gray-600" /> : <MicOff size={18} />}
              </button>
              <button
                type="button"
                onClick={() => setVideoOn(!videoOn)}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${videoOn ? 'bg-gray-100 hover:bg-gray-200' : 'bg-red-500 text-white'}`}
              >
                {videoOn ? <Video size={18} className="text-gray-600" /> : <VideoOff size={18} />}
              </button>
              <button
                type="button"
                onClick={() => setEnded(true)}
                className="w-12 h-12 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-all"
              >
                <PhoneOff size={18} className="text-white" />
              </button>
              <button
                type="button"
                className="w-11 h-11 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center"
              >
                <Users size={18} className="text-gray-600" />
              </button>
            </div>
          ) : null}

          {!isPresentiel ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={goReportAbsence}
                className="text-xs text-amber-800 hover:text-amber-900 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50/80 hover:bg-amber-50"
              >
                <AlertTriangle size={14} /> Signaler un problème
              </button>
            </div>
          ) : null}

          <div className="card">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Ressources partagées</h4>
            <div className="flex gap-2">
              {['tris.h1.pdf', 'diagrammes.png'].map((f) => (
                <div
                  key={f}
                  className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-2.5 py-1.5 text-xs text-gray-600 cursor-pointer hover:bg-gray-200"
                >
                  <FileText size={12} /> {f}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
