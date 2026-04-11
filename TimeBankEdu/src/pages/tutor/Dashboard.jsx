import { useNavigate } from 'react-router-dom';
import { Clock, Star, BookOpen, ChevronRight, Check, X, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Avatar from '../../components/common/Avatar';
import StarRating from '../../components/common/StarRating';
import { useApp } from '../../context/AppContext';

const chartData = [
  { month: 'Fév', tutorats: 3, heures: 5 }, { month: 'Mar', tutorats: 5, heures: 8 },
  { month: 'Avr', tutorats: 4, heures: 7 }, { month: 'Mai', tutorats: 7, heures: 12 }, { month: 'Juin', tutorats: 6, heures: 10 },
];

const planningItems = [
  { day: 'Lun 13/05', time: '10h - 12h', module: 'Algorithme L2', student: 'Sara B.', status: 'Réservé' },
  { day: 'Mer 15/05', time: '14h - 16h', module: 'Analyse 1', status: 'Disponible' },
  { day: 'Jeu 16/05', time: '16h - 18h', module: 'Base de Données', status: 'Disponible' },
];

export default function TutorDashboard() {
  const { currentUser, reservations, updateReservationStatus, displayBalance } = useApp();
  const navigate = useNavigate();

  const recentIncoming = [...reservations]
    .filter((r) => r.tutorId === currentUser?.id)
    .sort((a, b) => {
      const w = (s) => (s === 'pending' ? 0 : s === 'confirmed' ? 1 : 2);
      if (w(a.status) !== w(b.status)) return w(a.status) - w(b.status);
      return b.id - a.id;
    })
    .slice(0, 4);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Bonjour {currentUser?.name?.split(' ')[0] || 'Ahmed'} ! 👋</h1>
        <p className="text-gray-500 text-sm">Voici un résumé de ton activité.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={16} className="text-primary-600" />
            <span className="text-xs text-gray-500">Heures gagnées</span>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Recent Requests */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Réservations récentes</h2>
            <button onClick={() => navigate('/tutor/demandes')} className="text-xs text-primary-600 hover:underline flex items-center gap-1">Voir tout <ChevronRight size={14} /></button>
          </div>
          <div className="space-y-3">
            {recentIncoming.length === 0 && (
              <p className="text-sm text-gray-400 py-4 text-center">Aucune demande pour le moment.</p>
            )}
            {recentIncoming.map((req) => (
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
                    {req.module} • {req.creneauLabel} • {req.duration}h
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

        {/* Planning */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Mon Planning</h2>
            <button onClick={() => navigate('/tutor/planning')} className="text-xs text-primary-600 hover:underline flex items-center gap-1">Voir tout <ChevronRight size={14} /></button>
          </div>
          <div className="space-y-3">
            {planningItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100">
                <div>
                  <p className="text-xs font-semibold text-gray-700">{item.day}</p>
                  <p className="text-xs text-gray-500">{item.time}</p>
                  {item.module && <p className="text-xs text-gray-400">{item.module}</p>}
                </div>
                <span className={item.status === 'Réservé' ? 'badge-orange' : 'badge-green'}>{item.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Statistiques</h2>
          <div className="flex items-center gap-2 text-xs text-green-600">
            <TrendingUp size={14} /> Taux de présence 92%
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-4">
          {[{ label: 'Taux de présence', val: '92%', cls: 'text-green-600' }, { label: 'Étudiants aidés', val: '18', cls: 'text-blue-600' }, { label: 'Note moyenne', val: '4.8/5', cls: 'text-yellow-600' }].map(s => (
            <div key={s.label} className="text-center p-2 bg-gray-50 rounded-lg">
              <p className={`text-lg font-bold ${s.cls}`}>{s.val}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={150}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Area type="monotone" dataKey="tutorats" name="Tutorats" stroke="#0d9488" fill="#ccfbf1" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </DashboardLayout>
  );
}
