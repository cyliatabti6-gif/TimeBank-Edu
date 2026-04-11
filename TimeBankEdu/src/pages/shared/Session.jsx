import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  MessageCircle,
  Users,
  FileText,
  Send,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Avatar from '../../components/common/Avatar';
import { mapApiUserToAppUser, useApp } from '../../context/AppContext';
import { getAccessToken } from '../../lib/authStorage';
import { confirmSeanceEndOnServer, fetchSeanceById } from '../../lib/seancesApi';

const messages = [
  { sender: 'Ahmed', mine: false, text: 'Bonjour ! On va commencer par la fusion des algorithmes de tri.', time: '10:00' },
  { sender: 'Sara', mine: true, text: 'Parfait ! J\'ai quelques questions sur le quicksort.', time: '10:01' },
  { sender: 'Ahmed', mine: false, text: 'Bien sûr, posez votre question !', time: '10:02' },
];

function initials(name) {
  const p = (name || '').trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2) return `${p[0][0]}${p[p.length - 1][0]}`.toUpperCase();
  return (p[0] || 'U').slice(0, 2).toUpperCase();
}

/** Forme unique pour l’UI : localStorage (AppContext) ou réponse API. */
function toSessionShape(r) {
  if (!r) return null;
  /** Réservation créée / sync via Django : il faut appeler l’API pour confirmer-fin (pas seulement le state local). */
  if (r.fromServer) {
    return { ...r, status: r.status, _fromApi: true };
  }
  /** GET /api/seances/:id/ renvoie `student` / `tutor` (pas `fromServer`) : toujours traiter comme serveur. */
  if (r.student != null && r.tutor != null) {
    return {
      ...r,
      studentName: r.studentName ?? r.student,
      tutorName: r.tutorName ?? r.tutor,
      status: r.status,
      _fromApi: true,
    };
  }
  if (r.studentName != null && r.tutorName != null) {
    return { ...r, status: r.status, _fromApi: false };
  }
  return {
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
  const [message, setMessage] = useState('');
  const [msgs, setMsgs] = useState(messages);
  const [ended, setEnded] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState('');
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);

  const reservation = active;

  const sendMsg = () => {
    if (!message.trim()) return;
    setMsgs((prev) => [
      ...prev,
      {
        sender: currentUser?.name?.split(' ')[0] || 'Moi',
        mine: true,
        text: message,
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setMessage('');
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
        if (data.status === 'completed') {
          try {
            const me = await fetchAuthenticatedProfile(token);
            setCurrentUser(mapApiUserToAppUser(me));
          } catch {
            /* balance locale inchangée si /me échoue */
          }
          if (Number(currentUser?.id) === Number(data.studentId)) {
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
            Le transfert d&apos;heures ({reservation.duration} h) s&apos;applique lorsque l&apos;étudiant et le tuteur ont tous les deux confirmé
            {reservation._fromApi ? ' (enregistré sur le serveur).' : '.'}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-gray-900">Session en cours</h1>
          <p className="text-xs text-gray-500">
            {reservation.module} • Avec {reservation.tutorName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-xs text-red-500 font-medium">En direct</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-200px)]">
        <div className="lg:col-span-2 flex flex-col gap-3">
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

        <div className="card flex flex-col p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <MessageCircle size={16} className="text-primary-600" />
            <h3 className="font-semibold text-sm">Chat</h3>
          </div>

          <div className="px-3 py-2 bg-primary-50 border-b border-primary-100">
            <p className="text-xs font-semibold text-primary-700 mb-1">Objectifs de la session :</p>
            {['Comprendre le tri fusion', 'Analyser la complexité', 'Faire des exercices'].map((o, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-primary-600">
                <CheckCircle2 size={11} /> {o}
              </div>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs ${m.mine ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-800'}`}
                >
                  <p>{m.text}</p>
                  <p className={`text-[10px] mt-1 ${m.mine ? 'text-primary-200' : 'text-gray-400'} text-right`}>{m.time}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-gray-100 flex gap-2">
            <input
              type="text"
              placeholder="Écrire un message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMsg()}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              type="button"
              onClick={sendMsg}
              className="w-8 h-8 bg-primary-600 rounded-xl flex items-center justify-center hover:bg-primary-700 flex-shrink-0"
            >
              <Send size={13} className="text-white" />
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
