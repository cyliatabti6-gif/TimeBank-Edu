import { useMemo, useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Star, BookOpen, Search, Plus, Calendar, Video, MapPin, Mail } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StarRating from '../../components/common/StarRating';
import { useApp } from '../../context/AppContext';
import { getAccessToken } from '../../lib/authStorage';
import { fetchStudentReservationsFromServer, fetchStudentSignalementsRecus } from '../../lib/seancesApi';

function sameUserId(a, b) {
  return Number(a) === Number(b);
}

/** Libellé du motif quand le tuteur a signalé (visible par l’étudiant). */
function tutorSignalementMotifLabel(code) {
  if (code === 'tutor_impediment') return 'Le tuteur ne pourra pas venir (excuse)';
  if (code === 'student_no_show') return 'Signalement concernant votre présence';
  if (code === 'student_late') return 'Retard (signalé par le tuteur)';
  if (code === 'student_behavior') return 'Comportement (signalé par le tuteur)';
  if (code === 'other') return 'Autre message du tuteur';
  return code;
}

export default function StudentDashboard() {
  const { currentUser, reservations, displayBalance, bulkUpsertReservationsFromApiDetails, updateReservationStatus } =
    useApp();
  const navigate = useNavigate();
  const [tutorMessages, setTutorMessages] = useState([]);
  const [tutorMessagesError, setTutorMessagesError] = useState('');

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

  useEffect(() => {
    const token = getAccessToken();
    if (!token || (currentUser?.role !== 'student' && currentUser?.role !== 'both')) return;
    let cancelled = false;
    fetchStudentSignalementsRecus(token)
      .then((rows) => {
        if (cancelled || !Array.isArray(rows)) return;
        setTutorMessages(rows.slice(0, 15));
        rows.forEach((row) => {
          if (row?.reservation_id != null && row?.reservation_status === 'cancelled') {
            updateReservationStatus(Number(row.reservation_id), 'cancelled');
          }
        });
      })
      .catch(() => {
        if (!cancelled) setTutorMessagesError('Impossible de charger les messages des tuteurs.');
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser?.role, updateReservationStatus]);

  /** Séances à venir : confirmées (ou en cours) — pas les terminées ni les demandes seules en attente. */
  const upcomingSessions = useMemo(() => {
    const uid = currentUser?.id;
    if (uid == null) return [];
    return [...reservations]
      .filter(
        (r) =>
          sameUserId(r.studentId, uid) &&
          (r.status === 'confirmed' || r.status === 'in_progress'),
      )
      .sort((a, b) => Number(b.id) - Number(a.id))
      .slice(0, 8);
  }, [reservations, currentUser?.id]);

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Bonjour {currentUser?.name?.split(' ')[0]} ! 👋</h1>
          <p className="text-gray-500 text-sm">Vos séances confirmées à venir sont listées ci-dessous.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={16} className="text-primary-600" />
            <span className="text-xs text-gray-500">Balance</span>
          </div>
          <div className="text-2xl font-bold text-primary-700">
            {displayBalance != null ? displayBalance : currentUser?.balance ?? 0}h
          </div>
          <button className="text-xs text-primary-600 font-medium flex items-center gap-0.5 mt-1 hover:underline">
            <Plus size={12} /> Ajouter
          </button>
        </div>
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center gap-2 mb-1">
            <Star size={16} className="text-blue-500 fill-blue-500" />
            <span className="text-xs text-gray-500">Score</span>
          </div>
          <div className="text-2xl font-bold text-blue-700">{currentUser?.score || 4.7}</div>
          <div className="flex mt-1"><StarRating rating={currentUser?.score || 4.7} size={10} /></div>
        </div>
        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen size={16} className="text-purple-600" />
            <span className="text-xs text-gray-500">Niveau</span>
          </div>
          <div className="text-2xl font-bold text-purple-700">{currentUser?.level || 'L2'}</div>
          <div className="text-xs text-gray-500 mt-1">{currentUser?.filiere || 'Informatique'}</div>
        </div>
      </div>

      {/* Messages tuteurs (excuses / signalements) */}
      {(tutorMessages.length > 0 || tutorMessagesError) && (
        <div className="card border-indigo-200 bg-indigo-50/50 mb-6">
          <div className="flex items-start gap-2 mb-3">
            <Mail size={18} className="text-indigo-700 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="font-semibold text-gray-900 text-sm">Messages de vos tuteurs</h2>
              <p className="text-[11px] text-indigo-900/80 mt-0.5">
                Excuses ou signalements liés à une séance : la réservation concernée est considérée comme annulée.
              </p>
            </div>
          </div>
          {tutorMessagesError ? (
            <p className="text-xs text-red-600">{tutorMessagesError}</p>
          ) : (
            <ul className="space-y-3">
              {tutorMessages.map((m) => (
                <li
                  key={m.id}
                  className="text-xs sm:text-sm bg-white border border-indigo-100 rounded-lg px-3 py-2.5"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium text-gray-900">{m.tutor_name}</span>
                    <span className="text-gray-500">· {m.module}</span>
                    {m.reservation_status === 'cancelled' ? (
                      <span className="text-[10px] font-medium text-red-700 bg-red-50 border border-red-100 rounded px-1.5 py-0.5">
                        Séance annulée
                      </span>
                    ) : null}
                  </div>
                  <p className="text-indigo-900 mt-1">{tutorSignalementMotifLabel(m.issue_type)}</p>
                  {m.description ? (
                    <p className="text-gray-700 mt-2 text-sm leading-relaxed border-l-2 border-indigo-200 pl-2">
                      {m.description}
                    </p>
                  ) : null}
                  <p className="text-[10px] text-gray-400 mt-2">
                    {m.date_label || '—'}
                    {m.creneau_label ? ` · ${m.creneau_label}` : ''}
                    {m.created_at
                      ? ` · ${new Date(m.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}`
                      : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button onClick={() => navigate('/student/modules')} className="btn-primary py-3 text-sm">
          <Search size={16} /> Trouver un Module
        </button>
        <button onClick={() => navigate('/tutor/modules/new')} className="btn-secondary py-3 text-sm">
          <Plus size={16} /> Proposer un Tutorat
        </button>
      </div>

      {/* Prochaines séances à faire (confirmées / en cours uniquement) */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="font-semibold text-gray-900">Prochaines séances</h2>
            <p className="text-xs text-gray-500 mt-0.5">Uniquement les créneaux confirmés par le tuteur — à venir.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadServerReservations()}
              className="text-xs text-primary-600 border border-primary-200 rounded-lg px-2.5 py-1 hover:bg-primary-50"
            >
              Actualiser
            </button>
            <button
              type="button"
              onClick={() => navigate('/student/demandes')}
              className="text-xs text-gray-600 border border-gray-200 rounded-lg px-2.5 py-1 hover:bg-gray-50"
            >
              Toutes mes réservations
            </button>
          </div>
        </div>
        <div className="space-y-3">
          {upcomingSessions.length === 0 ? (
            <div className="text-center py-10 px-4">
              <Calendar size={40} className="mx-auto mb-3 text-gray-200" />
              <p className="text-sm text-gray-600 font-medium">Aucune séance à venir</p>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                Les demandes en attente ou terminées sont dans « Réservations » et « Historique ». Ici : seulement les séances
                déjà confirmées par le tuteur.
              </p>
              <button type="button" onClick={() => navigate('/student/modules')} className="btn-primary mt-4 text-sm py-2 px-4">
                Trouver un module
              </button>
            </div>
          ) : (
            upcomingSessions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => navigate(`/session/${s.id}`)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50/40 text-left transition-colors"
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    s.format === 'Présentiel' ? 'bg-purple-100' : 'bg-blue-100'
                  }`}
                >
                  {s.format === 'Présentiel' ? (
                    <MapPin size={16} className="text-purple-600" />
                  ) : (
                    <Video size={16} className="text-blue-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{s.module}</p>
                  <p className="text-xs text-gray-500">
                    Avec {s.tutorName} • {s.date}
                    {s.creneauLabel ? ` · ${s.creneauLabel}` : ''} • {s.duration}h
                  </p>
                </div>
                <span className={s.status === 'in_progress' ? 'badge-orange' : 'badge-blue'}>
                  {s.status === 'in_progress' ? 'En cours' : 'À venir'}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
