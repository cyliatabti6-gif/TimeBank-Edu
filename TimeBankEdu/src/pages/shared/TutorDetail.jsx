import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, Heart, MapPin, Monitor, Clock, Award, Check, Star } from 'lucide-react';
import PublicNavbar from '../../components/layout/PublicNavbar';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Avatar from '../../components/common/Avatar';
import StarRating from '../../components/common/StarRating';
import { mockTutors, mockModules } from '../../context/AppContext';
import { useApp } from '../../context/AppContext';

const slots = [
  { day: 'Lun 13/05', times: [{ t: '18h - 19h', avail: true }, { t: '19h - 20h', avail: true }, { t: '20h - 21h', avail: true }] },
  { day: 'Mer 15/05', times: [{ t: '18h - 19h', avail: false }, { t: '19h - 20h', avail: true }, { t: '20h - 21h', avail: true }] },
  { day: 'Ven 17/05', times: [{ t: '18h - 19h', avail: true }, { t: '19h - 20h', avail: true }, { t: '20h - 21h', avail: true }] },
];

function TutorDetailContent({ tutorId }) {
  const navigate = useNavigate();
  const tutor = mockTutors.find(t => t.id === parseInt(tutorId)) || mockTutors[0];
  const modules = mockModules.filter(m => m.tutorId === tutor.id);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Back */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700">
          <ArrowLeft size={18} /> Retour
        </button>
        <div className="flex gap-2">
          <button className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50">
            <Share2 size={16} className="text-gray-500" />
          </button>
          <button className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50">
            <Heart size={16} className="text-gray-500" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-5">
          <div className="card">
            <div className="flex items-start gap-4 mb-4">
              <Avatar initials={tutor.avatar} size="xl" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl font-bold text-gray-900">{tutor.name}</h1>
                  <span className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center"><Check size={11} className="text-white" /></span>
                </div>
                <p className="text-gray-500 text-sm">Tuteur en {tutor.filiere}</p>
                <div className="flex items-center gap-2 mt-2">
                  <StarRating rating={tutor.score} size={14} />
                  <span className="font-semibold text-gray-800">{tutor.score}</span>
                  <span className="text-gray-400 text-sm">({tutor.reviews} avis)</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Monitor size={15} className="text-primary-500" />
                <span>Format: <strong>{tutor.format}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Clock size={15} className="text-primary-500" />
                <span>Disponibilités: <strong>Lun, Mer, Ven 18h-20h</strong></span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Award size={15} className="text-primary-500" />
                <span>Expérience: <strong>{tutor.experience}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Star size={15} className="text-primary-500" />
                <span>Réussite: <strong>{tutor.successRate}</strong></span>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-800 mb-2">À propos</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{tutor.bio}</p>
            </div>
          </div>

          {/* Reviews */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Avis des étudiants</h3>
              <button className="text-xs text-primary-600 hover:underline">Voir tous</button>
            </div>
            <div className="space-y-3">
              {[
                { name: 'Sara Benali', avatar: 'SB', score: 5, text: 'Excellent tuteur, très pédagogue et patient !', time: 'Il y a 2 semaines' },
                { name: 'Ali Karim', avatar: 'AK', score: 4, text: 'Très bonne explication, je recommande.', time: 'Il y a 1 mois' },
              ].map((r, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <Avatar initials={r.avatar} size="sm" />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-800">{r.name}</span>
                      <StarRating rating={r.score} size={12} />
                    </div>
                    <p className="text-xs text-gray-600">{r.text}</p>
                    <p className="text-[11px] text-gray-400 mt-1">{r.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Booking Panel */}
        <div className="lg:col-span-1">
          <div className="card sticky top-6">
            <h3 className="font-semibold text-gray-900 mb-4">Créneaux Disponibles</h3>
            <div className="space-y-4 mb-5">
              {slots.map(slot => (
                <div key={slot.day}>
                  <p className="text-xs font-semibold text-gray-500 mb-2">{slot.day}</p>
                  <div className="space-y-2">
                    {slot.times.map(t => (
                      <div key={t.t} className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${t.avail ? 'border border-primary-200 bg-primary-50' : 'bg-gray-100'}`}>
                        <span className={t.avail ? 'text-gray-700' : 'text-gray-400 line-through'}>{t.t}</span>
                        {t.avail ? <span className="badge-green text-[10px]">Disponible</span> : <span className="text-xs text-gray-400">Réservé</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-primary-50 rounded-xl p-3 mb-4 text-center">
              <p className="text-xs text-primary-700 font-medium">Prêt à réserver ?</p>
              <p className="text-xs text-primary-500 mt-1">Demandez ce tutorat et le tuteur devra confirmer votre demande.</p>
            </div>
            <button onClick={() => navigate('/booking/new')} className="btn-primary w-full py-3">
              Demander ce Tutorat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TutorDetail() {
  const { id } = useParams();
  const { currentUser } = useApp();

  if (currentUser) {
    return <DashboardLayout><TutorDetailContent tutorId={id || '3'} /></DashboardLayout>;
  }
  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNavbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <TutorDetailContent tutorId={id || '3'} />
      </div>
    </div>
  );
}
