import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Star, BookOpen, ChevronRight, AlertTriangle, Ban, UserRound } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Avatar from '../../components/common/Avatar';
import StarRating from '../../components/common/StarRating';
import { useApp } from '../../context/AppContext';
import { getAccessToken } from '../../lib/authStorage';
import { fetchTutorIncomingReservations, fetchTutorSignalementsRecus } from '../../lib/seancesApi';

/** Libellé lisible pour le tuteur (signalement envoyé par l’étudiant ou le tuteur). */
function signalementIssueLabel(sig) {
  const code = sig.issue_type;
  const byStudent = sig.reporter_role === 'student';
  if (code === 'student_sick') return 'Maladie ou indisposition';
  if (code === 'student_emergency') return 'Urgence';
  if (code === 'student_forgot') return 'Oubli de la séance';
  if (code === 'student_transport') return 'Transport ou accès au lieu';
  if (code === 'student_no_show')
    return byStudent ? 'Empêchement / présentiel (ancien motif)' : 'Étudiant absent ou en retard important';
  if (code === 'no_show') return 'Absence du tuteur signalée par l’étudiant';
  if (code === 'late') return 'Retard important du tuteur signalé par l’étudiant';
  if (code === 'behavior') return 'Comportement (signalé par l’étudiant)';
  if (code === 'student_late') return 'Retard important (étudiant)';
  if (code === 'student_behavior') return 'Comportement (étudiant)';
  if (code === 'tutor_impediment') return 'Empêchement signalé par le tuteur';
  if (code === 'other') return 'Autre (voir description)';
  return code;
}

export default function TutorDashboard() {
  const { currentUser, reservations, displayBalance, bulkUpsertReservationsFromApiDetails } =
    useApp();
  const navigate = useNavigate();
  const [signalements, setSignalements] = useState([]);
  const [signalementsError, setSignalementsError] = useState('');

  useEffect(() => {
    const token = getAccessToken();
    if (!token || (currentUser?.role !== 'tutor' && currentUser?.role !== 'both')) return;
    let cancelled = false;
    fetchTutorIncomingReservations(token)
      .then((rows) => {
        if (!cancelled && Array.isArray(rows) && rows.length > 0) bulkUpsertReservationsFromApiDetails(rows);
      })
      .catch(() => {});
    fetchTutorSignalementsRecus(token)
      .then((rows) => {
        if (!cancelled && Array.isArray(rows)) setSignalements(rows.slice(0, 24));
      })
      .catch(() => {
        if (!cancelled) setSignalementsError('Impossible de charger les signalements.');
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser?.role, bulkUpsertReservationsFromApiDetails]);

  const studentSignalements = useMemo(
    () => signalements.filter((s) => s.reporter_role === 'student'),
    [signalements],
  );
  const tutorOwnSignalements = useMemo(
    () => signalements.filter((s) => s.reporter_role === 'tutor'),
    [signalements],
  );
  const cancelledAsTutor = useMemo(
    () =>
      [...reservations]
        .filter((r) => Number(r.tutorId) === Number(currentUser?.id) && r.status === 'cancelled')
        .sort((a, b) => Number(b.id) - Number(a.id))
        .slice(0, 10),
    [reservations, currentUser?.id],
  );

  const isTutorAccount = currentUser?.role === 'tutor' || currentUser?.role === 'both';

  const upcomingSessions = useMemo(
    () =>
      [...reservations]
        .filter(
          (r) =>
            Number(r.tutorId) === Number(currentUser?.id) &&
            (r.status === 'confirmed' || r.status === 'in_progress'),
        )
        .sort((a, b) => Number(b.id) - Number(a.id))
        .slice(0, 8),
    [reservations, currentUser?.id],
  );

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Bonjour {currentUser?.name?.split(' ')[0] || 'Ahmed'} ! 👋</h1>
        <p className="text-gray-500 text-sm">Voici un résumé de ton activité.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={16} className="text-primary-600" />
            <span className="text-xs text-gray-500">Heures gagnées (Balance)</span>
          </div>
          <div className="text-2xl font-bold text-primary-700">
            {displayBalance != null ? displayBalance : currentUser?.balance ?? 0}h
          </div>
          <p className="text-xs text-green-600 mt-1">+2h cette semaine</p>
        </div>
        <div className="card bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <div className="flex items-center gap-2 mb-1">
            <Star size={16} className="text-yellow-500 fill-yellow-500" />
            <span className="text-xs text-gray-500">Score</span>
          </div>
          <div className="text-2xl font-bold text-yellow-700">{currentUser?.score || 4.8}</div>
          <div className="flex mt-1"><StarRating rating={currentUser?.score || 4.8} size={10} /></div>
        </div>
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen size={16} className="text-blue-600" />
            <span className="text-xs text-gray-500">Tutorats donnés</span>
          </div>
          <div className="text-2xl font-bold text-blue-700">{currentUser?.hoursGiven || 24}</div>
          <p className="text-xs text-gray-500 mt-1">Total</p>
        </div>
      </div>

      {isTutorAccount && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          <div className="card border-amber-200 bg-amber-50/60">
            <div className="flex items-start gap-2 mb-2">
              <UserRound size={18} className="text-amber-800 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="font-semibold text-gray-900 text-sm">Empêchements & retards (étudiants)</h2>
                <p className="text-[11px] text-amber-900/80 mt-0.5">
                  Vos étudiants signalent ici qu’ils ne peuvent pas venir, un retard ou un autre problème lié à la séance.
                </p>
              </div>
            </div>
            {signalementsError ? (
              <p className="text-xs text-red-600">{signalementsError}</p>
            ) : studentSignalements.length === 0 ? (
              <p className="text-xs text-gray-500 py-2">Aucun signalement d’étudiant pour le moment.</p>
            ) : (
              <ul className="space-y-2">
                {studentSignalements.map((s) => (
                  <li
                    key={s.id}
                    className="text-xs sm:text-sm text-gray-800 bg-white border border-amber-100 rounded-lg px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium text-gray-900">{s.student_name}</span>
                      <span className="text-gray-500">· {s.module}</span>
                      {s.reservation_status === 'cancelled' ? (
                        <span className="text-[10px] font-medium text-red-700 bg-red-50 border border-red-100 rounded px-1.5 py-0.5">
                          Séance annulée
                        </span>
                      ) : null}
                    </div>
                    <span className="block text-amber-900 mt-1">{signalementIssueLabel(s)}</span>
                    {s.description ? (
                      <p className="text-[11px] text-gray-600 mt-1 italic">&laquo; {s.description} &raquo;</p>
                    ) : null}
                    <span className="text-[10px] text-gray-400">
                      Réf. #{s.reservation_id}
                      {s.created_at
                        ? ` · ${new Date(s.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}`
                        : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {!signalementsError && tutorOwnSignalements.length > 0 ? (
              <div className="mt-4 pt-3 border-t border-amber-200/80">
                <p className="text-[11px] font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-gray-600" /> Vos signalements (tuteur)
                </p>
                <ul className="space-y-2">
                  {tutorOwnSignalements.map((s) => (
                    <li
                      key={s.id}
                      className="text-xs text-gray-700 bg-white/90 border border-gray-200 rounded-lg px-3 py-2"
                    >
                      <span className="font-medium">{s.student_name}</span> · {s.module}
                      <span className="block text-gray-600 mt-0.5">{signalementIssueLabel(s)}</span>
                      <span className="text-[10px] text-gray-400">#{s.reservation_id}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="card border-red-100 bg-red-50/40">
            <div className="flex items-start gap-2 mb-2">
              <Ban size={18} className="text-red-700 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="font-semibold text-gray-900 text-sm">Séances annulées</h2>
                <p className="text-[11px] text-red-900/80 mt-0.5">
                  Réservations annulées (y compris après signalement d’empêchement par l’étudiant).
                </p>
              </div>
            </div>
            {cancelledAsTutor.length === 0 ? (
              <p className="text-xs text-gray-500 py-2">Aucune séance annulée récente.</p>
            ) : (
              <ul className="space-y-2">
                {cancelledAsTutor.map((r) => (
                  <li
                    key={r.id}
                    className="text-xs sm:text-sm bg-white border border-red-100 rounded-lg px-3 py-2 flex flex-wrap items-baseline justify-between gap-2"
                  >
                    <div>
                      <span className="font-medium text-gray-900">{r.studentName}</span>
                      <span className="text-gray-500"> · {r.module}</span>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {r.date} · {r.creneauLabel}
                      </p>
                    </div>
                    <span className="badge-red text-[10px]">Annulée</span>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={() => navigate('/tutor/demandes')}
              className="text-xs text-primary-600 hover:underline mt-3 inline-flex items-center gap-1"
            >
              Voir toutes les réservations <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="card mb-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Séances prochaines</h2>
          <button
            onClick={() => navigate('/tutor/planning')}
            className="text-xs text-primary-600 hover:underline flex items-center gap-1"
          >
            Voir tout <ChevronRight size={14} />
          </button>
        </div>
        <div className="space-y-3">
          {upcomingSessions.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">
              Aucune séance confirmée ou en cours pour le moment.
            </p>
          ) : (
            upcomingSessions.map((s) => (
              <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100">
                <Avatar
                  initials={(s.studentName || 'Étudiant')
                    .split(/\s+/)
                    .map((w) => w[0])
                    .join('')
                    .slice(0, 2)}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{s.studentName}</p>
                  <p className="text-xs text-gray-500">
                    {s.module} • {s.date || '—'}
                    {s.creneauLabel ? ` · ${s.creneauLabel}` : ''} • {s.duration}h
                  </p>
                </div>
                <span className={s.status === 'in_progress' ? 'badge-orange text-xs' : 'badge-green text-xs'}>
                  {s.status === 'in_progress' ? 'En cours' : 'Confirmée'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

    </DashboardLayout>
  );
}
