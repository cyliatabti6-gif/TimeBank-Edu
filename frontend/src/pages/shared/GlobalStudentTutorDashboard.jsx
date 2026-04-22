import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  Inbox,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Avatar from '../../components/common/Avatar';
import StarRating from '../../components/common/StarRating';
import { useApp } from '../../context/AppContext';
import { getAccessToken } from '../../lib/authStorage';
import { fetchStudentDisputes, fetchTutorDisputes } from '../../lib/disputesApi';
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
  const location = useLocation();

  const isStudent = Boolean(currentUser?.is_student);
  const isTutor = Boolean(currentUser?.is_tutor);
  const inStudentArea = location.pathname.startsWith('/student');
  const inTutorArea = location.pathname.startsWith('/tutor');
  const showStudent = inStudentArea ? true : isStudent && !inTutorArea;
  const showTutor = inTutorArea ? true : isTutor && !inStudentArea;
  const [tutorDisputes, setTutorDisputes] = useState([]);
  const [disputesLoading, setDisputesLoading] = useState(false);
  const [studentDisputes, setStudentDisputes] = useState([]);
  const [studentDisputesLoading, setStudentDisputesLoading] = useState(false);

  const rating = useMemo(() => {
    const raw = Number(currentUser?.rating ?? currentUser?.score);
    return Number.isFinite(raw) && raw > 0 ? raw : 4.7;
  }, [currentUser?.rating, currentUser?.score]);

  const tutorTid = currentUser?.id;

  const tutorReservationsMine = useMemo(() => {
    if (!showTutor || tutorTid == null) return [];
    return reservations.filter((r) => Number(r.tutorId) === Number(tutorTid));
  }, [reservations, tutorTid, showTutor]);

  const tutorHoursGivenTotal = useMemo(() => {
    return tutorReservationsMine
      .filter((r) => r.status === 'completed')
      .reduce((sum, r) => sum + (Number(r.duration) > 0 ? Number(r.duration) : 0), 0);
  }, [tutorReservationsMine]);

  const tutorHoursThisWeek = useMemo(
    () => tutorHoursCompletedThisWeek(reservations, tutorTid),
    [reservations, tutorTid],
  );

  const studentUpcomingSessions = useMemo(() => {
    const uid = currentUser?.id;
    if (uid == null || !showStudent) return [];
    return [...reservations]
      .filter((r) => sameUserId(r.studentId, uid) && r.status === 'confirmed')
      .sort((a, b) => b.id - a.id)
      .slice(0, 4);
  }, [reservations, currentUser?.id, showStudent]);

  const tutorWeeklyUpcoming = useMemo(() => {
    const uid = currentUser?.id;
    if (uid == null || !showTutor) return [];
    const start = startOfWeekMonday(new Date());
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return reservations
      .filter((r) => Number(r.tutorId) === Number(uid) && r.status !== 'cancelled')
      .map((r) => {
        const d = parseDateLabelToLocalDate(r.date);
        return { r, t: d ? d.getTime() : null, statusWeight: reservationSortWeight(r.status) };
      })
      .filter((x) => x.t != null && x.t >= start.getTime() && x.t < end.getTime())
      .sort((a, b) => {
        if (a.statusWeight !== b.statusWeight) return a.statusWeight - b.statusWeight;
        return a.t - b.t;
      })
      .slice(0, 8)
      .map((x) => x.r);
  }, [reservations, currentUser?.id, showTutor]);

  useEffect(() => {
    if (!showTutor) {
      setTutorDisputes([]);
      return;
    }
    const token = getAccessToken();
    if (!token) {
      setTutorDisputes([]);
      return;
    }
    let alive = true;
    setDisputesLoading(true);
    fetchTutorDisputes(token)
      .then((rows) => {
        if (alive) setTutorDisputes(rows.slice(0, 4));
      })
      .catch(() => {
        if (alive) setTutorDisputes([]);
      })
      .finally(() => {
        if (alive) setDisputesLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [showTutor, currentUser?.id]);

  useEffect(() => {
    if (!showStudent) {
      setStudentDisputes([]);
      return;
    }
    const token = getAccessToken();
    if (!token) {
      setStudentDisputes([]);
      return;
    }
    let alive = true;
    setStudentDisputesLoading(true);
    fetchStudentDisputes(token)
      .then((rows) => {
        if (alive) setStudentDisputes(rows.slice(0, 4));
      })
      .catch(() => {
        if (alive) setStudentDisputes([]);
      })
      .finally(() => {
        if (alive) setStudentDisputesLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [showStudent, currentUser?.id]);

  const firstName = currentUser?.name?.split(' ')[0] || '';

  const subtitle = (() => {
    if (showStudent && !showTutor) return "Prête à apprendre aujourd'hui ?";
    if (showTutor && !showStudent) return 'Voici un résumé de ton activité.';
    if (showStudent && showTutor) return 'Voici un aperçu de ton activité.';
    return '';
  })();

  const statsGridClass =
    showStudent && showTutor ? 'grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6' : 'grid grid-cols-3 gap-4 mb-6';

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
          {showTutor ? (
            <p className="text-xs text-green-600 mt-1">
              +{tutorHoursThisWeek}h cette semaine
            </p>
          ) : null}
          {showStudent ? (
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

        {showStudent ? (
          <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen size={16} className="text-purple-600" />
              <span className="text-xs text-gray-500">Niveau</span>
            </div>
            <div className="text-2xl font-bold text-purple-700">{currentUser?.level || '—'}</div>
            <div className="text-xs text-gray-500 mt-1">{currentUser?.filiere || '—'}</div>
          </div>
        ) : null}

        {showTutor ? (
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

      {showStudent ? (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button type="button" onClick={() => navigate('/student/modules')} className="btn-primary py-3 text-sm">
            <Search size={16} /> Trouver un Module
          </button>
          <button type="button" onClick={() => navigate('/tutor/modules/new')} className="btn-secondary py-3 text-sm">
            <Plus size={16} /> Proposer un Tutorat
          </button>
        </div>
      ) : null}

      {showTutor ? (
        <div className="card mb-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Signalements étudiants</h2>
            <button type="button" onClick={() => navigate('/admin/litiges')} className="text-xs text-primary-600 hover:underline flex items-center gap-1">
              Voir tout <ChevronRight size={14} />
            </button>
          </div>
          <div className="space-y-3">
            {disputesLoading ? (
              <p className="text-sm text-gray-400 py-4 text-center">Chargement des signalements…</p>
            ) : null}
            {!disputesLoading && tutorDisputes.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Aucun signalement pour le moment.</p>
            ) : null}
            {!disputesLoading &&
              tutorDisputes.map((d) => (
                <div key={d.id} className="p-3 rounded-xl border border-gray-100">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-gray-800 truncate">{d.title}</p>
                    <span className={d.status_key === 'pending' ? 'badge-orange' : d.status_key === 'in_progress' ? 'badge-blue' : 'badge-green'}>{d.status}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Par {d.reporterName} • {d.module || 'Séance'} {d.date ? `• ${d.date}` : ''}
                  </p>
                  {d.cause ? <p className="text-xs text-gray-600 mt-1">Cause: {d.cause}</p> : null}
                  {d.description ? <p className="text-xs text-gray-500 mt-1 truncate">{d.description}</p> : null}
                </div>
              ))}
          </div>
        </div>
      ) : null}

      {showStudent ? (
        <>
          <div className="card mb-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Signalements tuteur</h2>
            </div>
            <div className="space-y-3">
              {studentDisputesLoading ? (
                <p className="text-sm text-gray-400 py-4 text-center">Chargement des signalements…</p>
              ) : null}
              {!studentDisputesLoading && studentDisputes.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">Aucun signalement pour le moment.</p>
              ) : null}
              {!studentDisputesLoading &&
                studentDisputes.map((d) => (
                  <div key={d.id} className="p-3 rounded-xl border border-gray-100">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-gray-800 truncate">{d.title}</p>
                      <span className={d.status_key === 'pending' ? 'badge-orange' : d.status_key === 'in_progress' ? 'badge-blue' : 'badge-green'}>{d.status}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Par {d.reporterName} • {d.module || 'Séance'} {d.date ? `• ${d.date}` : ''}
                    </p>
                    {d.cause ? <p className="text-xs text-gray-600 mt-1">Cause: {d.cause}</p> : null}
                    {d.description ? <p className="text-xs text-gray-500 mt-1 truncate">{d.description}</p> : null}
                  </div>
                ))}
            </div>
          </div>
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

      {showTutor ? (
        <>
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Prochaines séances de la semaine</h2>
              <button
                type="button"
                onClick={() => navigate('/tutor/planning')}
                className="text-xs text-primary-600 hover:underline"
              >
                Voir planning
              </button>
            </div>
            <div className="space-y-3">
              {tutorWeeklyUpcoming.length === 0 ? (
                <p className="text-sm text-gray-400 py-3 text-center">Aucune séance prévue cette semaine.</p>
              ) : (
                tutorWeeklyUpcoming.map((req) => (
                  <div key={req.id} className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{req.module}</p>
                      <p className="text-xs text-gray-500">
                        {req.studentName} • {req.date} {stripCreneauLabelForDisplay(req.creneauLabel)}
                      </p>
                    </div>
                    <span
                      className={
                        req.status === 'pending'
                          ? 'badge-orange'
                          : req.status === 'confirmed'
                            ? 'badge-green'
                            : 'badge-blue'
                      }
                    >
                      {statusPlanningLabel(String(req.status || '').toLowerCase())}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      ) : null}
    </DashboardLayout>
  );
}
