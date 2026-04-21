import { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useApp } from '../../context/AppContext';
import { getAccessToken } from '../../lib/authStorage';
import { fetchTutorIncomingReservations } from '../../lib/seancesApi';
import {
  addDays,
  isDateInWeek,
  isSameCalendarDay,
  mapApiRowToPlanningEvent,
  parseDateLabelToLocalDate,
  startOfWeekMonday,
  statusPlanningBorderClass,
  statusPlanningClasses,
  statusPlanningLabel,
} from '../../lib/planningUtils';

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

/** Visible window [startHour, endHour) for the grid */
const GRID_START_HOUR = 7;
const GRID_END_HOUR = 22;
const HOUR_HEIGHT_PX = 44;

function formatWeekRangeTitle(weekStart) {
  const end = addDays(weekStart, 6);
  const monthYear = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });
  if (weekStart.getMonth() === end.getMonth() && weekStart.getFullYear() === end.getFullYear()) {
    return `${weekStart.getDate()}–${end.getDate()} ${monthYear.format(weekStart)}`;
  }
  const short = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
  return `${short.format(weekStart)} – ${short.format(end)} ${end.getFullYear()}`;
}

function formatMonthTitle(d) {
  return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(d);
}

function formatDayHeader(d) {
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(d);
}

function minutesToHHmm(totalMin) {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * @param {Array<ReturnType<typeof mapApiRowToPlanningEvent>>} dayEvents
 */
function assignLanes(dayEvents) {
  const sorted = [...dayEvents].sort((a, b) => a.startMin - b.startMin);
  const laneEndMinutes = [];
  const out = [];
  for (const ev of sorted) {
    let lane = 0;
    while (lane < laneEndMinutes.length && laneEndMinutes[lane] > ev.startMin) {
      lane += 1;
    }
    if (lane === laneEndMinutes.length) laneEndMinutes.push(ev.endMin);
    else laneEndMinutes[lane] = ev.endMin;
    out.push({ ...ev, lane });
  }
  const laneCount = Math.max(1, laneEndMinutes.length);
  return out.map((e) => ({ ...e, laneCount }));
}

export default function Planning() {
  const navigate = useNavigate();
  const { currentUser } = useApp();
  const [view, setView] = useState('week');
  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(new Date()));
  const [monthCursor, setMonthCursor] = useState(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });
  const [apiRows, setApiRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const loadReservations = useCallback(async () => {
    const token = getAccessToken();
    if (!token || !currentUser?.is_tutor) {
      setApiRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await fetchTutorIncomingReservations(token);
      setApiRows(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Erreur réseau');
      setApiRows([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.is_tutor]);

  useEffect(() => {
    void loadReservations();
  }, [loadReservations]);

  useEffect(() => {
    const onFocus = () => {
      void loadReservations();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [loadReservations]);

  const planningEvents = useMemo(() => {
    const out = [];
    for (const row of apiRows) {
      const ev = mapApiRowToPlanningEvent(row);
      if (ev) out.push(ev);
    }
    return out;
  }, [apiRows]);

  const unscheduledCount = useMemo(() => {
    let n = 0;
    for (const row of apiRows) {
      if (!parseDateLabelToLocalDate(row.date)) n += 1;
    }
    return n;
  }, [apiRows]);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const eventsByWeekDayIndex = useMemo(() => {
    const buckets = Array.from({ length: 7 }, () => []);
    for (const ev of planningEvents) {
      if (!isDateInWeek(ev.dayDate, weekStart)) continue;
      for (let i = 0; i < 7; i += 1) {
        if (isSameCalendarDay(ev.dayDate, weekDays[i])) {
          buckets[i].push(ev);
          break;
        }
      }
    }
    return buckets.map(assignLanes);
  }, [planningEvents, weekStart, weekDays]);

  const hours = useMemo(() => {
    const list = [];
    for (let h = GRID_START_HOUR; h < GRID_END_HOUR; h += 1) list.push(h);
    return list;
  }, []);

  const gridTotalMinutes = (GRID_END_HOUR - GRID_START_HOUR) * 60;
  const gridHeightPx = (GRID_END_HOUR - GRID_START_HOUR) * HOUR_HEIGHT_PX;

  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const sessionsInMonth = useMemo(() => {
    const y = monthCursor.getFullYear();
    const m = monthCursor.getMonth();
    return planningEvents
      .filter((ev) => ev.dayDate.getFullYear() === y && ev.dayDate.getMonth() === m)
      .sort((a, b) => {
        const da = a.dayDate.getTime() - b.dayDate.getTime();
        if (da !== 0) return da;
        return a.startMin - b.startMin;
      });
  }, [planningEvents, monthCursor]);

  const goPrev = () => {
    if (view === 'week') setWeekStart((ws) => addDays(ws, -7));
    else {
      setMonthCursor((mc) => new Date(mc.getFullYear(), mc.getMonth() - 1, 1));
    }
  };

  const goNext = () => {
    if (view === 'week') setWeekStart((ws) => addDays(ws, 7));
    else {
      setMonthCursor((mc) => new Date(mc.getFullYear(), mc.getMonth() + 1, 1));
    }
  };

  const goToday = () => {
    const now = new Date();
    setWeekStart(startOfWeekMonday(now));
    setMonthCursor(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  const weekHasAnySession = eventsByWeekDayIndex.some((b) => b.length > 0);

  const navTitle = view === 'week' ? formatWeekRangeTitle(weekStart) : formatMonthTitle(monthCursor);

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mon Planning</h1>
          <p className="text-gray-500 text-sm">Séances issues de vos réservations (serveur).</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-gray-100 rounded-lg p-1">
            {['Semaine', 'Mois'].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v.toLowerCase())}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                  view === v.toLowerCase() ? 'bg-white shadow text-primary-600' : 'text-gray-500'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => navigate('/tutor/modules/new')}
            className="btn-primary text-sm py-2 px-4 inline-flex items-center gap-1.5"
          >
            <Plus size={15} /> Proposer un module
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <button
          type="button"
          onClick={goPrev}
          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
          aria-label="Période précédente"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="font-semibold text-gray-800 min-w-[10rem] capitalize">{navTitle}</span>
        <button
          type="button"
          onClick={goNext}
          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
          aria-label="Période suivante"
        >
          <ChevronRight size={16} />
        </button>
        <button
          type="button"
          onClick={goToday}
          className="ml-0 sm:ml-2 text-xs text-primary-600 border border-primary-200 px-2 py-1 rounded-lg hover:bg-primary-50"
        >
          Aujourd&apos;hui
        </button>
      </div>

      {loadError ? (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {loadError}
        </div>
      ) : null}

      {loading ? (
        <div className="card py-16 text-center text-gray-500 text-sm">Loading planning...</div>
      ) : view === 'week' ? (
        <>
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <div className="min-w-[640px]">
                <div
                  className="grid border-b border-gray-100 bg-gray-50/80"
                  style={{ gridTemplateColumns: `52px repeat(7, minmax(0, 1fr))` }}
                >
                  <div className="p-2 text-xs text-gray-400 font-medium border-r border-gray-100" />
                  {weekDays.map((d, i) => {
                    const isToday = isSameCalendarDay(d, today);
                    return (
                      <div
                        key={DAY_LABELS[i]}
                        className={`p-2 text-center border-l border-gray-100 ${isToday ? 'bg-primary-50' : ''}`}
                      >
                        <p className="text-[11px] font-semibold text-gray-500 uppercase">{formatDayHeader(d)}</p>
                        <p className={`text-lg font-bold ${isToday ? 'text-primary-600' : 'text-gray-800'}`}>
                          {d.getDate()}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="flex">
                  <div
                    className="w-[52px] flex-shrink-0 border-r border-gray-100 text-xs text-gray-400"
                    style={{ paddingTop: 0 }}
                  >
                    {hours.map((h) => (
                      <div
                        key={h}
                        className="flex items-start justify-end pr-2 text-[11px] text-gray-400"
                        style={{ height: HOUR_HEIGHT_PX }}
                      >
                        {h}h
                      </div>
                    ))}
                  </div>

                  <div
                    className="grid flex-1 gap-0"
                    style={{
                      gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                      minHeight: gridHeightPx,
                    }}
                  >
                    {weekDays.map((d, di) => (
                      <div
                        key={di}
                        className="relative border-l border-gray-100 bg-white"
                        style={{ minHeight: gridHeightPx }}
                      >
                        {hours.map((h) => (
                          <div
                            key={h}
                            className="border-b border-gray-100 box-border"
                            style={{ height: HOUR_HEIGHT_PX }}
                          />
                        ))}

                        {eventsByWeekDayIndex[di].map((ev) => {
                          const gridStartMin = GRID_START_HOUR * 60;
                          const gridEndMin = GRID_END_HOUR * 60;
                          const startClamped = Math.max(ev.startMin, gridStartMin);
                          const endClamped = Math.min(ev.endMin, gridEndMin);
                          if (endClamped <= startClamped) return null;

                          const topPct = ((startClamped - gridStartMin) / gridTotalMinutes) * 100;
                          const heightPct = ((endClamped - startClamped) / gridTotalMinutes) * 100;
                          const w = 100 / ev.laneCount;
                          const leftPct = ev.lane * w;
                          const { raw } = ev;
                          const timeStr = `${minutesToHHmm(ev.startMin)} – ${minutesToHHmm(ev.endMin)}`;
                          const title = [
                            ev.module,
                            ev.student,
                            timeStr,
                            statusPlanningLabel(ev.status),
                            raw?.format,
                          ]
                            .filter(Boolean)
                            .join(' · ');

                          return (
                            <div
                              key={`${ev.id}-${ev.lane}`}
                              className={`absolute rounded-md border px-1 py-0.5 text-[10px] font-medium leading-tight overflow-hidden shadow-sm ${statusPlanningClasses(ev.status)}`}
                              style={{
                                top: `${topPct}%`,
                                height: `${heightPct}%`,
                                left: `calc(${leftPct}% + 2px)`,
                                width: `calc(${w}% - 4px)`,
                                minHeight: 22,
                                zIndex: 2 + ev.lane,
                              }}
                              title={title}
                            >
                              <div className="font-semibold truncate">{ev.module}</div>
                              <div className="truncate opacity-90">{ev.student}</div>
                              <div className="text-[9px] opacity-80 tabular-nums">{timeStr}</div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {!weekHasAnySession && planningEvents.length === 0 ? (
            <div className="mt-6 text-center text-gray-500 text-sm py-8 border border-dashed border-gray-200 rounded-xl">
              No sessions scheduled
            </div>
          ) : null}
          {!weekHasAnySession && planningEvents.length > 0 ? (
            <div className="mt-6 text-center text-gray-500 text-sm py-6 border border-dashed border-gray-200 rounded-xl">
              No sessions scheduled this week
            </div>
          ) : null}
        </>
      ) : (
        <div className="card p-0 overflow-hidden">
          {sessionsInMonth.length === 0 ? (
            <div className="py-16 text-center text-gray-500 text-sm">No sessions scheduled</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {sessionsInMonth.map((ev) => {
                const dateStr = new Intl.DateTimeFormat('fr-FR', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                }).format(ev.dayDate);
                const { startMin, endMin } = ev;
                const timeStr = `${minutesToHHmm(startMin)} – ${minutesToHHmm(endMin)}`;
                const title = [
                  ev.module,
                  ev.student,
                  timeStr,
                  statusPlanningLabel(ev.status),
                ]
                  .filter(Boolean)
                  .join(' · ');
                return (
                  <li
                    key={ev.id}
                    className={`px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-white border-l-4 ${statusPlanningBorderClass(ev.status)} hover:bg-gray-50/80`}
                    title={title}
                  >
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{ev.module}</p>
                      <p className="text-xs text-gray-600">{ev.student}</p>
                    </div>
                    <div className="text-xs text-gray-600 tabular-nums sm:text-right">
                      <div className="capitalize">{dateStr}</div>
                      <div>{timeStr}</div>
                      <div className="text-[10px] mt-0.5 font-medium">{statusPlanningLabel(ev.status)}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {unscheduledCount > 0 ? (
        <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          {unscheduledCount} séance(s) sans date reconnue dans le calendrier (vérifiez le format date côté
          réservation).
        </p>
      ) : null}

      <div className="flex flex-wrap gap-4 mt-4 text-xs text-gray-500">
        {[
          { cls: 'bg-emerald-200', label: 'Confirmée' },
          { cls: 'bg-orange-200', label: 'En attente' },
          { cls: 'bg-slate-300', label: 'Terminée' },
          { cls: 'bg-sky-200', label: 'En cours' },
          { cls: 'bg-gray-200', label: 'Annulée' },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded ${l.cls}`} />
            {l.label}
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
