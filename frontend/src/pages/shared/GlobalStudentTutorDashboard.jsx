import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  Star,
  BookOpen,
  Search,
  Plus,
  ChevronRight,
  Calendar,
  Check,
  X,
  TrendingUp,
  Inbox,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Avatar from '../../components/common/Avatar';
import StarRating from '../../components/common/StarRating';
import { useApp } from '../../context/AppContext';
import { stripCreneauLabelForDisplay } from '../../lib/reservationHelpers';
import { parseDateLabelToLocalDate, statusPlanningLabel } from '../../lib/planningUtils';

const MONTH_FR_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

function startOfWeekMonday(d) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function reservationCompletedAtMs(r) {
  if (r?.completedAt) {
    const t = new Date(r.completedAt).getTime();
    if (!Number.isNaN(t)) return t;
  }
  const d = parseDateLabelToLocalDate(r?.date);
  return d ? d.getTime() : null;
}

/** Heures complétées cette semaine (lundi → aujourd’hui) pour le tuteur. */
function tutorHoursCompletedThisWeek(reservations, tutorId) {
  const uid = Number(tutorId);
  if (!Number.isFinite(uid)) return 0;
  const start = startOfWeekMonday(new Date());
  const end = new Date();
  let sum = 0;
  for (const r of reservations) {
    if (Number(r?.tutorId) !== uid || r?.status !== 'completed') continue;
    const ms = reservationCompletedAtMs(r);
    if (ms == null || ms < start.getTime() || ms > end.getTime()) continue;
    sum += Number(r.duration) > 0 ? Number(r.duration) : 0;
  }
  return Math.round(sum * 100) / 100;
}

function buildTutorMonthlyChartSeries(reservations, tutorId) {
  const uid = Number(tutorId);
  if (!Number.isFinite(uid)) {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return { month: MONTH_FR_SHORT[d.getMonth()], tutorats: 0 };
    });
  }
  const mine = reservations.filter((r) => Number(r?.tutorId) === uid && r?.status !== 'cancelled');
  const byMonth = new Map();
  for (const r of mine) {
    const d = parseDateLabelToLocalDate(r.date);
    if (!d) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const cur = byMonth.get(key) || 0;
    byMonth.set(key, cur + 1);
  }
  const rows = [];
  const now = new Date();
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    rows.push({
      month: MONTH_FR_SHORT[d.getMonth()],
      tutorats: byMonth.get(key) || 0,
    });
  }
  return rows;
}

function sameUserId(a, b) {
  return Number(a) === Number(b);
}

function reservationSortWeight(status) {
  if (status === 'pending') return 0;
  if (status === 'confirmed') return 1;
  return 2;
}

export default function GlobalStudentTutorDashboard() {
  const { currentUser, reservations, displayBalance, updateReservationStatus } = useApp();
  const navigate = useNavigate();

  const isStudent = Boolean(currentUser?.is_student);
  const isTutor = Boolean(currentUser?.is_tutor);

  const rating = useMemo(() => {
    const raw = Number(currentUser?.rating ?? currentUser?.score);
    return Number.isFinite(raw) && raw > 0 ? raw : 4.7;
  }, [currentUser?.rating, currentUser?.score]);

  const tutorTid = currentUser?.id;

  const tutorReservationsMine = useMemo(() => {
    if (!isTutor || tutorTid == null) return [];
    return reservations.filter((r) => Number(r.tutorId) === Number(tutorTid));
  }, [reservations, tutorTid, isTutor]);

  const tutorHoursGivenTotal = useMemo(() => {
    return tutorReservationsMine
      .filter((r) => r.status === 'completed')
      .reduce((sum, r) => sum + (Number(r.duration) > 0 ? Number(r.duration) : 0), 0);
  }, [tutorReservationsMine]);

  const tutorHoursThisWeek = useMemo(
    () => tutorHoursCompletedThisWeek(reservations, tutorTid),
    [reservations, tutorTid],
  );

  const tutorChartData = useMemo(() => buildTutorMonthlyChartSeries(reservations, tutorTid), [reservations, tutorTid]);

  const tutorPresencePct = useMemo(() => {
    const completed = tutorReservationsMine.filter((r) => r.status === 'completed').length;
    const cancelled = tutorReservationsMine.filter((r) => r.status === 'cancelled').length;
    const denom = completed + cancelled;
    if (denom === 0) return null;
    return Math.round((completed / denom) * 100);
  }, [tutorReservationsMine]);

  const studentsHelpedCount = useMemo(() => {
    const ids = new Set(
      tutorReservationsMine.filter((r) => r.status === 'completed').map((r) => Number(r.studentId)),
    );
    return ids.size;
  }, [tutorReservationsMine]);

  const studentUpcomingSessions = useMemo(() => {
    const uid = currentUser?.id;
    if (uid == null || !isStudent) return [];
    return [...reservations]
      .filter((r) => sameUserId(r.studentId, uid) && r.status === 'confirmed')
      .sort((a, b) => b.id - a.id)
      .slice(0, 4);
  }, [reservations, currentUser?.id, isStudent]);

  const tutorRecentIncoming = useMemo(() => {
    const uid = currentUser?.id;
    if (uid == null || !isTutor) return [];
    return [...reservations]
      .filter((r) => Number(r.tutorId) === Number(uid))
      .sort((a, b) => {
        if (reservationSortWeight(a.status) !== reservationSortWeight(b.status)) {
          return reservationSortWeight(a.status) - reservationSortWeight(b.status);
        }
        return b.id - a.id;
      })
      .slice(0, 4);
  }, [reservations, currentUser?.id, isTutor]);

  const tutorPlanningPreview = useMemo(() => {
    const uid = currentUser?.id;
    if (uid == null || !isTutor) return [];
    const mine = reservations.filter((r) => Number(r.tutorId) === Number(uid));
    const scored = mine
      .filter((r) => r.status !== 'cancelled')
      .map((r) => {
        const d = parseDateLabelToLocalDate(r.date);
        return { r, t: d ? d.getTime() : null };
      })
      .filter((x) => x.t != null)
      .sort((a, b) => a.t - b.t)
      .slice(0, 3);
    return scored.map((x) => x.r);
  }, [reservations, currentUser?.id, isTutor]);

  const firstName = currentUser?.name?.split(' ')[0] || '';

  const subtitle = (() => {
    if (isStudent && !isTutor) return "Prête à apprendre aujourd'hui ?";
    if (isTutor && !isStudent) return 'Voici un résumé de ton activité.';
    if (isStudent && isTutor) return 'Voici un aperçu de ton activité.';
    return '';
  })();

  const statsGridClass =
    isStudent && isTutor ? 'grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6' : 'grid grid-cols-3 gap-4 mb-6';

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Bonjour {firstName} ! 👋</h1>
          {subtitle ? <p className="text-gray-500 text-sm">{subtitle}</p> : null}
        </div>
      </div>

      <div className={statsGridClass}>
        <div className="card bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={16} className="text-primary-600" />
            <span className="text-xs text-gray-500">{isTutor && !isStudent ? 'Heures gagnées' : 'Balance'}</span>
          </div>
          <div className="text-2xl font-bold text-primary-700">
            {displayBalance != null ? displayBalance : currentUser?.balance ?? 0}h
          </div>
          {isTutor ? (
            <p className="text-xs text-green-600 mt-1">
              +{tutorHoursThisWeek}h cette semaine
            </p>
          ) : null}
          {isStudent ? (
            <button type="button" className="text-xs text-primary-600 font-medium flex items-center gap-0.5 mt-1 hover:underline">
              <Plus size={12} /> Ajouter
            </button>
          ) : null}
        </div>

        <div
          className={`card bg-gradient-to-br border ${
            isTutor ? 'from-yellow-50 to-yellow-100 border-yellow-200' : 'from-blue-50 to-blue-100 border-blue-200'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Star size={16} className={isTutor ? 'text-yellow-500 fill-yellow-500' : 'text-blue-500 fill-blue-500'} />
            <span className="text-xs text-gray-500">Score</span>
          </div>
          <div className={`text-2xl font-bold ${isTutor ? 'text-yellow-700' : 'text-blue-700'}`}>{rating}</div>
          <div className="flex mt-1">
            <StarRating rating={rating} size={10} />
          </div>
        </div>

        {isStudent ? (
          <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen size={16} className="text-purple-600" />
              <span className="text-xs text-gray-500">Niveau</span>
            </div>
            <div className="text-2xl font-bold text-purple-700">{currentUser?.level || '—'}</div>
            <div className="text-xs text-gray-500 mt-1">{currentUser?.filiere || '—'}</div>
          </div>
        ) : null}

        {isTutor ? (
          <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen size={16} className="text-blue-600" />
              <span className="text-xs text-gray-500">Tutorats donnés</span>
            </div>
            <div className="text-2xl font-bold text-blue-700">{tutorHoursGivenTotal}</div>
            <p className="text-xs text-gray-500 mt-1">Total</p>
          </div>
        ) : null}
      </div>

      {isStudent ? (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button type="button" onClick={() => navigate('/student/modules')} className="btn-primary py-3 text-sm">
            <Search size={16} /> Trouver un Module
          </button>
          <button type="button" onClick={() => navigate('/tutor/modules/new')} className="btn-secondary py-3 text-sm">
            <Plus size={16} /> Proposer un Tutorat
          </button>
        </div>
      ) : null}

      {isTutor ? (
        <div className="mb-6">
          <button type="button" onClick={() => navigate('/tutor/demandes')} className="btn-primary py-3 text-sm w-full sm:w-auto">
            <Inbox size={16} /> Gérer mes demandes
          </button>
        </div>
      ) : null}

      {isStudent ? (
        <>
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Prochaines Séances</h2>
            </div>
            <div className="space-y-3">
              {studentUpcomingSessions.length === 0 ? (
                <p className="text-sm text-gray-400 py-2 text-center">Aucune séance confirmée à venir.</p>
              ) : (
                studentUpcomingSessions.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                    <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Calendar size={16} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{s.module}</p>
                      <p className="text-xs text-gray-500">
                        Avec {s.tutorName} • {s.date} {stripCreneauLabelForDisplay(s.creneauLabel)}
                      </p>
                    </div>
                    <span className="badge-blue">Confirmée</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      ) : null}

      {isTutor ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5 mt-4">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Réservations récentes</h2>
                <button
                  type="button"
                  onClick={() => navigate('/tutor/demandes')}
                  className="text-xs text-primary-600 hover:underline flex items-center gap-1"
                >
                  Voir tout <ChevronRight size={14} />
                </button>
              </div>
              <div className="space-y-3">
                {tutorRecentIncoming.length === 0 && (
                  <p className="text-sm text-gray-400 py-4 text-center">Aucune demande pour le moment.</p>
                )}
                {tutorRecentIncoming.map((req) => (
                  <div key={req.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                    <Avatar
                      initials={req.studentName
                        .split(/\s+/)
                        .map((w) => w[0])
                        .join('')}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{req.studentName}</p>
                      <p className="text-xs text-gray-500">
                        {req.module} • {stripCreneauLabelForDisplay(req.creneauLabel)} • {req.duration}h
                      </p>
                    </div>
                    {req.status === 'pending' ? (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          title="Accepter"
                          onClick={() => updateReservationStatus(req.id, 'confirmed')}
                          className="w-7 h-7 bg-primary-600 text-white rounded-full flex items-center justify-center hover:bg-primary-700"
                        >
                          <Check size={13} />
                        </button>
                        <button
                          type="button"
                          title="Refuser"
                          onClick={() => updateReservationStatus(req.id, 'cancelled')}
                          className="w-7 h-7 bg-red-100 text-red-500 rounded-full flex items-center justify-center hover:bg-red-200"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ) : req.status === 'confirmed' ? (
                      <span className="badge-green text-xs">Confirmée</span>
                    ) : (
                      <span className="text-[10px] text-gray-400 capitalize">{req.status}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Mon Planning</h2>
                <button
                  type="button"
                  onClick={() => navigate('/tutor/planning')}
                  className="text-xs text-primary-600 hover:underline flex items-center gap-1"
                >
                  Voir tout <ChevronRight size={14} />
                </button>
              </div>
              <div className="space-y-3">
                {tutorPlanningPreview.length === 0 && (
                  <p className="text-sm text-gray-400 py-4 text-center">Aucune séance à venir.</p>
                )}
                {tutorPlanningPreview.map((req) => (
                  <div key={req.id} className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-700 truncate">{req.date}</p>
                      <p className="text-xs text-gray-500 truncate">{stripCreneauLabelForDisplay(req.creneauLabel)}</p>
                      {req.module ? <p className="text-xs text-gray-400 truncate">{req.module}</p> : null}
                    </div>
                    <span
                      className={
                        req.status === 'pending'
                          ? 'badge-orange'
                          : req.status === 'confirmed'
                            ? 'badge-green'
                            : req.status === 'completed'
                              ? 'badge-blue'
                              : 'text-[10px] text-gray-500 capitalize'
                      }
                    >
                      {statusPlanningLabel(String(req.status || '').toLowerCase())}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Statistiques</h2>
              <div className="flex items-center gap-2 text-xs text-green-600">
                <TrendingUp size={14} />
                Taux de présence {tutorPresencePct != null ? `${tutorPresencePct}%` : '—'}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              {[
                {
                  label: 'Taux de présence',
                  val: tutorPresencePct != null ? `${tutorPresencePct}%` : '—',
                  cls: 'text-green-600',
                },
                { label: 'Étudiants aidés', val: String(studentsHelpedCount), cls: 'text-blue-600' },
                { label: 'Note moyenne', val: `${rating.toFixed(1)}/5`, cls: 'text-yellow-600' },
              ].map((s) => (
                <div key={s.label} className="text-center p-2 bg-gray-50 rounded-lg">
                  <p className={`text-lg font-bold ${s.cls}`}>{s.val}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={tutorChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="tutorats" name="Tutorats" stroke="#0d9488" fill="#ccfbf1" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : null}
    </DashboardLayout>
  );
}
