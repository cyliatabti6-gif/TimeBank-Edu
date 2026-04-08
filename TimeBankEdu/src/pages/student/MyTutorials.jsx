import { useNavigate } from 'react-router-dom';
import { PlayCircle, CheckCircle2, Calendar, Clock } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Avatar from '../../components/common/Avatar';
import StarRating from '../../components/common/StarRating';
import { mockSessions } from '../../context/AppContext';

export default function MyTutorials() {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Mes Tutorats</h1>
        <p className="text-gray-500 text-sm">Toutes vos séances de tutorat passées et à venir.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...mockSessions,
          { id: 4, tutor: 'Yassine K.', tutorId: 5, module: 'Comptabilité L1', date: '22/05/2024', time: '16h-18h', duration: 2, status: 'pending' },
          { id: 5, tutor: 'Ahmed Moussa', tutorId: 3, module: 'Python L2', date: '25/05/2024', time: '18h-20h', duration: 2, status: 'confirmed' },
        ].map(s => (
          <div key={s.id} className="card hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-3">
              <Avatar initials={s.tutor.split(' ').map(w=>w[0]).join('')} size="md" />
              <div>
                <p className="font-semibold text-sm text-gray-900">{s.tutor}</p>
                <p className="text-xs text-gray-500">{s.module}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
              <Calendar size={13} />
              <span>{s.date} • {s.time}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
              <Clock size={13} />
              <span>{s.duration}h de tutorat</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={
                s.status === 'completed' ? 'badge-green' :
                s.status === 'in_progress' ? 'badge-orange' :
                s.status === 'confirmed' ? 'badge-blue' : 'badge-gray'
              }>
                {s.status === 'completed' ? 'Complétée' : s.status === 'in_progress' ? 'En cours' : s.status === 'confirmed' ? 'Confirmée' : 'En attente'}
              </span>
              {(s.status === 'in_progress' || s.status === 'confirmed') && (
                <button onClick={() => navigate('/session/1')} className="text-xs bg-primary-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-primary-700">
                  <PlayCircle size={13} /> Rejoindre
                </button>
              )}
              {s.status === 'completed' && (
                <button onClick={() => navigate('/evaluation/1')} className="text-xs text-primary-600 border border-primary-200 px-3 py-1.5 rounded-lg hover:bg-primary-50">
                  Évaluer
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
