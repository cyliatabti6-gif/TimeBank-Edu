import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, Calendar, Clock, Star, BookOpen } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Avatar from '../../components/common/Avatar';
import { mockTutors, useApp } from '../../context/AppContext';
import { getAccessToken } from '../../lib/authStorage';
import { fetchMyTutors } from '../../lib/seancesApi';

function tutorInitials(name) {
  return (name || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function statusLabel(status) {
  if (status === 'completed') return 'Complétée';
  if (status === 'in_progress') return 'En cours';
  if (status === 'confirmed') return 'Confirmée';
  if (status === 'pending') return 'En attente';
  return status;
}

function statusBadgeClass(status) {
  if (status === 'completed') return 'badge-green';
  if (status === 'in_progress') return 'badge-orange';
  if (status === 'confirmed') return 'badge-blue';
  return 'badge-gray';
}

/**
 * Réservations locales (AppContext) : même structure que l’API quand la base est vide ou hors ligne.
 * Uniquement les tuteurs avec au moins une séance complétée avec cet étudiant.
 */
export function buildTutorsFromLocalReservations(reservations, studentId) {
  if (studentId == null) return [];
  const sid = Number(studentId);
  const completed = reservations.filter((r) => Number(r.studentId) === sid && r.status === 'completed');
  if (completed.length === 0) return [];

  const byTutor = {};
  for (const r of completed) {
    const tid = Number(r.tutorId);
    if (!byTutor[tid]) {
      const mt = mockTutors.find((t) => Number(t.id) === tid);
      byTutor[tid] = {
        tutorId: tid,
        tutorName: r.tutorName || mt?.name || 'Tuteur',
        filiere: mt?.filiere || '—',
        score: mt?.score != null ? Number(mt.score) : 5,
        pastSessions: [],
        upcomingSessions: [],
      };
    }
    byTutor[tid].pastSessions.push({
      id: r.id,
      module: r.module,
      date: r.date || '',
      time: r.creneauLabel || '',
      duration: Number(r.duration) || 2,
      status: 'completed',
      evaluated: false,
      serverBacked: false,
    });
  }

  const tutorIds = new Set(Object.keys(byTutor).map(Number));
  const upcoming = reservations.filter(
    (r) =>
      Number(r.studentId) === sid &&
      r.status !== 'cancelled' &&
      r.status !== 'completed' &&
      tutorIds.has(Number(r.tutorId)),
  );
  for (const r of upcoming) {
    const tid = Number(r.tutorId);
    if (!byTutor[tid]) continue;
    byTutor[tid].upcomingSessions.push({
      id: r.id,
      module: r.module,
      date: r.date || '',
      time: r.creneauLabel || '',
      duration: Number(r.duration) || 2,
      status: r.status,
    });
  }

  return Object.values(byTutor)
    .map((t) => ({
      ...t,
      pastSessions: [...t.pastSessions].sort((a, b) => b.id - a.id),
      upcomingSessions: [...t.upcomingSessions].sort((a, b) => b.id - a.id),
    }))
    .sort((a, b) => {
      const d = b.upcomingSessions.length - a.upcomingSessions.length;
      if (d !== 0) return d;
      return (a.tutorName || '').localeCompare(b.tutorName || '', 'fr');
    });
}

export default function MyTutorials() {
  const navigate = useNavigate();
  const { currentUser, reservations, clearBrowserReservationsBackup } = useApp();
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [usedLocalFallback, setUsedLocalFallback] = useState(false);

  const applyTutors = useCallback(
    (apiRows, { fromSuccessfulApi = false } = {}) => {
      const fromApi = Array.isArray(apiRows) ? apiRows : [];
      if (fromApi.length > 0) {
        setTutors(fromApi);
        setUsedLocalFallback(false);
        return;
      }
      if (currentUser?.id != null) {
        const local = buildTutorsFromLocalReservations(reservations, currentUser.id);
        setTutors(local);
        setUsedLocalFallback(local.length > 0);
        if (fromSuccessfulApi && local.length > 0) {
          setInfoMessage(
            'Le serveur ne signale aucune séance complétée pour votre compte, mais des séances terminées existent dans ce navigateur. ' +
              'Pour enregistrer une note, la réservation doit exister dans Django (même numéro). Complétez une séance via l’application avec l’API active, puis cliquez Actualiser.',
          );
        }
        return;
      }
      setTutors([]);
      setUsedLocalFallback(false);
    },
    [currentUser?.id, reservations],
  );

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setError('Connectez-vous pour voir vos tutorats.');
      setInfoMessage('');
      setTutors([]);
      setUsedLocalFallback(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    setInfoMessage('');
    try {
      const data = await fetchMyTutors(token);
      applyTutors(data, { fromSuccessfulApi: true });
    } catch (e) {
      applyTutors([]);
      const msg = e instanceof Error ? e.message : 'Erreur réseau.';
      if (!currentUser?.id || buildTutorsFromLocalReservations(reservations, currentUser.id).length === 0) {
        setError(msg);
      } else {
        setError(`${msg} Affichage des séances enregistrées dans ce navigateur en secours.`);
      }
    } finally {
      setLoading(false);
    }
  }, [applyTutors, currentUser?.id, reservations]);

  useEffect(() => {
    load();
  }, [load]);

  const goEvaluateSession = (row, session) => {
    navigate(`/evaluation/${session.id}`, {
      state: {
        reservationId: session.id,
        tutorId: row.tutorId,
        tutorName: row.tutorName,
        filiere: row.filiere,
        score: row.score,
        module: session.module,
        duration: session.duration,
        date: session.date,
        time: session.time,
      },
    });
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mes Tutorats</h1>
          <p className="text-gray-500 text-sm">
            Tuteurs avec lesquels vous avez <strong>terminé au moins une séance</strong> (confirmée puis complétée). Pour
            chaque séance passée, vous pouvez laisser une évaluation.
          </p>
          {usedLocalFallback ? (
            <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-100 rounded-md px-2 py-1.5 mt-2 max-w-2xl">
              <strong>Données navigateur (secours).</strong> L’évaluation n’est enregistrée sur le serveur que si la
              réservation existe dans Django (même numéro). Démarrez Django, ouvrez cette app en dev (proxy{' '}
              <code className="text-[10px] bg-white/80 px-1 rounded">/api</code>), complétez une séance jusqu’au statut
              « complétée » puis cliquez <strong>Actualiser</strong> pour voir la liste serveur.
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2 self-start">
          <button
            type="button"
            onClick={load}
            className="text-xs text-primary-600 border border-primary-200 rounded-lg px-3 py-1.5 hover:bg-primary-50"
          >
            Actualiser
          </button>
          {usedLocalFallback ? (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Supprimer les réservations sauvegardées dans ce navigateur et recharger la page ?')) {
                  clearBrowserReservationsBackup();
                }
              }}
              className="text-xs text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50"
            >
              Effacer le stockage local
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="mb-4 text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">{error}</div>
      ) : null}

      {infoMessage ? (
        <div className="mb-4 text-sm text-sky-900 bg-sky-50 border border-sky-100 rounded-lg px-3 py-2">{infoMessage}</div>
      ) : null}

      {loading ? (
        <p className="text-sm text-gray-500 py-8">Chargement…</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {tutors.map((row) => (
            <div key={row.tutorId} className="card hover:shadow-md transition-all">
              <div className="flex items-center gap-3 mb-4">
                <Avatar initials={tutorInitials(row.tutorName)} size="lg" />
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{row.tutorName}</p>
                  <p className="text-xs text-gray-500 truncate">{row.filiere || '—'}</p>
                  <p className="text-xs text-amber-700 mt-0.5">Note : {Number(row.score).toFixed(1)} / 5</p>
                </div>
              </div>

              {row.upcomingSessions?.length > 0 ? (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-primary-700 mb-2 flex items-center gap-1">
                    <Calendar size={12} /> Prochaines séances avec ce tuteur
                  </p>
                  <ul className="space-y-2">
                    {row.upcomingSessions.map((s) => (
                      <li
                        key={s.id}
                        className="flex flex-wrap items-center justify-between gap-2 text-xs bg-primary-50/80 border border-primary-100 rounded-lg px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 truncate">{s.module}</p>
                          <p className="text-gray-500 flex items-center gap-1 mt-0.5">
                            <Clock size={11} />
                            {s.date || '—'} • {s.time || '—'} • {s.duration}h
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={statusBadgeClass(s.status)}>{statusLabel(s.status)}</span>
                          {(s.status === 'confirmed' || s.status === 'in_progress') && (
                            <button
                              type="button"
                              onClick={() => navigate(`/session/${s.id}`)}
                              className="text-xs bg-primary-600 text-white px-2.5 py-1 rounded-md flex items-center gap-1 hover:bg-primary-700"
                            >
                              <PlayCircle size={12} /> Rejoindre
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {row.pastSessions?.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
                    <BookOpen size={12} /> Séances complétées — évaluez chaque séance
                  </p>
                  <ul className="space-y-3">
                    {row.pastSessions.map((s) => (
                      <li
                        key={s.id}
                        className="rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-3 text-xs space-y-2"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-gray-800">{s.module}</p>
                            <p className="text-gray-500 mt-0.5 flex items-center gap-1">
                              <Clock size={11} />
                              {s.date || '—'} • {s.time || '—'} • {s.duration}h
                            </p>
                          </div>
                          <span className="badge-green flex-shrink-0">{statusLabel(s.status)}</span>
                        </div>
                        <div className="flex flex-col gap-1.5 pt-1 border-t border-gray-100">
                          <label className="text-[11px] font-medium text-gray-600" htmlFor={`eval-hint-${s.id}`}>
                            Votre avis sur cette séance
                          </label>
                          <p id={`eval-hint-${s.id}`} className="text-[10px] text-gray-400">
                            Le formulaire détaillé (note + commentaire) s’ouvre sur la page suivante.
                          </p>
                          {s.evaluated ? (
                            <span className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2 inline-flex items-center gap-1.5 w-fit">
                              <Star size={14} className="fill-green-600 text-green-600" /> Évaluation enregistrée
                            </span>
                          ) : (
                            <>
                              {(s.serverBacked === false || usedLocalFallback) && (
                                <p className="text-[10px] text-amber-800 bg-amber-50/90 border border-amber-100 rounded-lg px-2.5 py-1.5">
                                  Si cette liste vient du navigateur, l’envoi ne réussira que si la réservation n°{s.id}{' '}
                                  existe aussi dans Django. Sinon, complétez une séance côté serveur puis Actualiser.
                                </p>
                              )}
                              <button
                                type="button"
                                onClick={() => goEvaluateSession(row, s)}
                                className="w-full sm:w-auto text-xs font-medium text-primary-700 bg-white border border-primary-200 px-3 py-2 rounded-lg hover:bg-primary-50 flex items-center justify-center gap-1.5"
                              >
                                <Star size={14} className="fill-amber-400 text-amber-500" /> Évaluer cette séance
                              </button>
                            </>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {!loading && tutors.length === 0 && !error && (
        <div className="card text-center py-10 text-gray-500 text-sm">
          <p className="mb-2">Aucun tuteur à afficher pour le moment.</p>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            Cette page liste les tuteurs avec lesquels vous avez au moins une séance <strong>complétée</strong> (après
            double confirmation de fin). Complétez une séance depuis « Mes réservations », ou créez une réservation
            complétée dans l’admin Django.
          </p>
        </div>
      )}
    </DashboardLayout>
  );
}
