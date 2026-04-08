import { useState } from 'react';
import { Edit2, Mail, BookOpen, Calendar, Plus, X, Save } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Avatar from '../../components/common/Avatar';
import StarRating from '../../components/common/StarRating';
import { useApp } from '../../context/AppContext';

const allModules = ['Algorithme', 'Python', 'Base de Données', 'Structure de Données', 'IA', 'Analyse 1', 'Algèbre'];

export default function Profile() {
  const { currentUser } = useApp();
  const [editing, setEditing] = useState(false);
  const [masteredModules, setMasteredModules] = useState(['Algorithme', 'Python', 'Base de Données', 'Structure de Données', 'IA']);

  const recentActivity = [
    { text: 'Séance avec Ahmed Moussa', sub: 'Algorithme - L2', date: '15/05/2024', icon: '📚' },
    { text: 'Séance avec Lina Farah', sub: 'Analyse 1 - L1', date: '08/05/2024', icon: '📐' },
    { text: 'Évaluation donnée', sub: 'Ahmed Moussa', date: '05/05/2024', icon: '⭐' },
  ];

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Mon Profil</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="card text-center relative">
            <button onClick={() => setEditing(!editing)} className="absolute top-4 right-4 text-xs text-primary-600 border border-primary-200 rounded-lg px-3 py-1 hover:bg-primary-50">
              <Edit2 size={12} className="inline mr-1" /> Modifier
            </button>
            <div className="flex flex-col items-center mb-4 pt-4">
              <div className="relative mb-3">
                <Avatar initials={currentUser?.avatar || 'SB'} size="xl" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full" />
              </div>
              <h2 className="font-bold text-lg text-gray-900">{currentUser?.name || 'Sara Benali'}</h2>
              <p className="text-sm text-gray-500">{currentUser?.level || 'L2'} • {currentUser?.filiere || 'Informatique'}</p>
              <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                Étudiante passionnée par les algorithmes et l'intelligence artificielle.
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 py-4 border-t border-b border-gray-100">
              {[
                { label: 'Balance', val: `${currentUser?.balance || 3}h`, sub: 'Heures disponibles', color: 'text-primary-600' },
                { label: 'Score', val: `${currentUser?.score || 4.7} ★`, sub: 'Moyenne générale', color: 'text-yellow-600' },
                { label: 'Tutorats reçus', val: currentUser?.tutorialsReceived || 12, sub: 'Séances complètes', color: 'text-blue-600' },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className={`font-bold text-lg ${s.color}`}>{s.val}</p>
                  <p className="text-[10px] text-gray-400">{s.sub}</p>
                </div>
              ))}
            </div>

            {/* Modules Maîtrisés */}
            <div className="mt-4 text-left">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700">Modules Maîtrisés</h3>
                <button className="text-xs text-primary-600 flex items-center gap-0.5 hover:underline">
                  <Plus size={12} /> Ajouter
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {masteredModules.map(m => (
                  <span key={m} className="bg-primary-50 text-primary-700 text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                    {m}
                    <button onClick={() => setMasteredModules(prev => prev.filter(x => x !== m))}>
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Info + Activity */}
        <div className="lg:col-span-2 space-y-4">
          {/* Personal Info */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Informations Personnelles</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-start gap-3">
                <Mail size={16} className="text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400">Email</p>
                  <p className="text-gray-700">{currentUser?.email || 'sara.benali@univ.dz'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <BookOpen size={16} className="text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400">Filière</p>
                  <p className="text-gray-700">{currentUser?.filiere || 'Informatique'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-4 h-4 bg-primary-100 rounded text-[10px] flex items-center justify-center text-primary-700 font-bold">N</div>
                <div>
                  <p className="text-xs text-gray-400">Niveau</p>
                  <p className="text-gray-700">{currentUser?.level || 'L2'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar size={16} className="text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400">Membre depuis</p>
                  <p className="text-gray-700">{currentUser?.joinedDate || 'Mars 2024'}</p>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-1">Bio</p>
              <p className="text-sm text-gray-700">J'aime apprendre et aider les autres à comprendre des concepts complexes.</p>
            </div>
          </div>

          {/* Recent Activity */}
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
                  <span className="text-xs text-gray-400 flex-shrink-0">{a.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
