import { useState } from 'react';
import { Edit2, Mail, BookOpen, Calendar, Star, Plus, Save } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Avatar from '../../components/common/Avatar';
import StarRating from '../../components/common/StarRating';
import { useApp } from '../../context/AppContext';

export default function TutorProfile() {
  const { currentUser } = useApp();
  const [editing, setEditing] = useState(false);

  const modules = ['Algorithme', 'Python'];
  const recentActivity = [
    { text: 'Séance avec Sara Benali', sub: 'Algorithme - L2', date: '15/05/2024', icon: '📚' },
    { text: 'Séance avec Ali Karim', sub: 'Base de Données - L3', date: '12/05/2024', icon: '🗄️' },
    { text: 'Nouveau module ajouté', sub: 'Python L2', date: '10/05/2024', icon: '🐍' },
  ];

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Mon Profil Tuteur</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1">
          <div className="card text-center relative">
            <button onClick={() => setEditing(!editing)} className="absolute top-4 right-4 text-xs text-primary-600 border border-primary-200 rounded-lg px-3 py-1 hover:bg-primary-50">
              <Edit2 size={12} className="inline mr-1" /> Modifier
            </button>
            <div className="flex flex-col items-center pt-4 mb-4">
              <div className="relative mb-3">
                <Avatar initials={currentUser?.avatar || 'AM'} size="xl" color="blue" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full" />
              </div>
              <h2 className="font-bold text-lg text-gray-900">{currentUser?.name || 'Ahmed Moussa'}</h2>
              <p className="text-sm text-gray-500">{currentUser?.level || 'L2'} • {currentUser?.filiere || 'Informatique'}</p>
              <p className="text-xs text-primary-600 font-medium mt-1">Tuteur Vérifié ✓</p>
            </div>

            <div className="grid grid-cols-3 gap-2 py-4 border-t border-b border-gray-100">
              {[
                { label: 'Heures gagnées', val: `${currentUser?.balance || 8}h`, color: 'text-primary-600' },
                { label: 'Score', val: `${currentUser?.score || 4.8} ★`, color: 'text-yellow-600' },
                { label: 'Tutorats', val: currentUser?.hoursGiven || 24, color: 'text-blue-600' },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className={`font-bold text-lg ${s.color}`}>{s.val}</p>
                  <p className="text-[10px] text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 text-left">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700">Modules Enseignés</h3>
                <button className="text-xs text-primary-600 flex items-center gap-0.5"><Plus size={12} /> Ajouter</button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {modules.map(m => (
                  <span key={m} className="bg-primary-50 text-primary-700 text-xs px-2.5 py-1 rounded-full">{m}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Informations Personnelles</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-start gap-3">
                <Mail size={16} className="text-gray-400 mt-0.5" />
                <div><p className="text-xs text-gray-400">Email</p><p className="text-gray-700">{currentUser?.email || 'ahmed.moussa@univ.dz'}</p></div>
              </div>
              <div className="flex items-start gap-3">
                <BookOpen size={16} className="text-gray-400 mt-0.5" />
                <div><p className="text-xs text-gray-400">Filière</p><p className="text-gray-700">Informatique</p></div>
              </div>
              <div className="flex items-start gap-3">
                <Star size={16} className="text-gray-400 mt-0.5 fill-gray-400" />
                <div><p className="text-xs text-gray-400">Score tuteur</p><div className="flex items-center gap-1"><StarRating rating={4.8} size={12} /><span className="text-gray-700 font-semibold">4.8</span></div></div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar size={16} className="text-gray-400 mt-0.5" />
                <div><p className="text-xs text-gray-400">Membre depuis</p><p className="text-gray-700">Janvier 2024</p></div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-gray-400 mb-1">Bio</p>
              <p className="text-sm text-gray-700">Passionné par l'enseignement et l'algorithmique, j'aide les étudiants à comprendre les concepts clés avec des exemples pratiques.</p>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Activité Récente</h3>
              <button className="text-xs text-primary-600 hover:underline">Voir tout</button>
            </div>
            <div className="space-y-3">
              {recentActivity.map((a, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center text-base flex-shrink-0">{a.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{a.text}</p>
                    <p className="text-xs text-gray-400">{a.sub}</p>
                  </div>
                  <span className="text-xs text-gray-400">{a.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
