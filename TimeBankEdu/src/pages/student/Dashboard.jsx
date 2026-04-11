import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Star, BookOpen, Search, Plus, ChevronRight, CheckCircle2, PlayCircle, Calendar } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Avatar from '../../components/common/Avatar';
import StarRating from '../../components/common/StarRating';
import { useApp } from '../../context/AppContext';

const statusConfig = {
  completed: { label: 'Complétée', cls: 'badge-green' },
  in_progress: { label: 'En cours', cls: 'badge-orange' },
  confirmed: { label: 'En cours', cls: 'badge-orange' },
  pending: { label: 'En attente', cls: 'badge-gray' },
};

function sameUserId(a, b) {
  return Number(a) === Number(b);
}

export default function StudentDashboard() {
  const { currentUser, reservations, displayBalance } = useApp();
  const navigate = useNavigate();

  const recentActivities = useMemo(() => {
    const uid = currentUser?.id;
    if (uid == null) return [];
    return [...reservations]
      .filter((r) => sameUserId(r.studentId, uid))
      .filter((r) => ['confirmed', 'completed', 'pending'].includes(r.status))
      .sort((a, b) => b.id - a.id)
      .slice(0, 6);
  }, [reservations, currentUser?.id]);

  const upcomingSessions = useMemo(() => {
    const uid = currentUser?.id;
    if (uid == null) return [];
    return [...reservations]
      .filter((r) => sameUserId(r.studentId, uid) && r.status === 'confirmed')
      .sort((a, b) => b.id - a.id)
      .slice(0, 4);
  }, [reservations, currentUser?.id]);

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Bonjour {currentUser?.name?.split(' ')[0]} ! 👋</h1>
          <p className="text-gray-500 text-sm">Prête à apprendre aujourd'hui ?</p>
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

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button onClick={() => navigate('/student/modules')} className="btn-primary py-3 text-sm">
          <Search size={16} /> Trouver un Module
        </button>
        <button onClick={() => navigate('/tutor/modules/new')} className="btn-secondary py-3 text-sm">
          <Plus size={16} /> Proposer un Tutorat
        </button>
      </div>

      {/* Recent Activities */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Mes Activités Récentes</h2>
          <button onClick={() => navigate('/student/historique')} className="text-xs text-primary-600 flex items-center gap-1 hover:underline">
            Voir tout <ChevronRight size={14} />
          </button>
        </div>
        <div className="space-y-3">
          {recentActivities.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Aucune activité pour le moment.</p>
          ) : (
            recentActivities.map((s) => {
              const cfg = statusConfig[s.status] || statusConfig.pending;
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => s.status === 'confirmed' && navigate(`/student/demandes`)}
                  onKeyDown={(e) => e.key === 'Enter' && s.status === 'confirmed' && navigate(`/student/demandes`)}
                  role={s.status === 'confirmed' ? 'button' : undefined}
                >
                  <div className="w-9 h-9 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    {s.status === 'completed' ? (
                      <CheckCircle2 size={18} className="text-primary-600" />
                    ) : s.status === 'confirmed' ? (
                      <PlayCircle size={18} className="text-orange-500" />
                    ) : (
                      <Calendar size={18} className="text-blue-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{s.module}</p>
                    <p className="text-xs text-gray-500">Avec {s.tutorName}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-500">{s.duration}h</p>
                    <span className={`${cfg.cls} mt-0.5 inline-block`}>{cfg.label}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Upcoming Sessions */}
      <div className="card mt-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Prochaines Séances</h2>
        </div>
        <div className="space-y-3">
          {upcomingSessions.length === 0 ? (
            <p className="text-sm text-gray-400 py-2 text-center">Aucune séance confirmée à venir.</p>
          ) : (
            upcomingSessions.map((s) => (
              <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Calendar size={16} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{s.module}</p>
                  <p className="text-xs text-gray-500">
                    Avec {s.tutorName} • {s.date} {s.creneauLabel}
                  </p>
                </div>
                <span className="badge-blue">Confirmée</span>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
