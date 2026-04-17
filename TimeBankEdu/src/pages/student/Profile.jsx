import { useState } from 'react';
import { Edit2, Mail, BookOpen, Calendar } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Avatar from '../../components/common/Avatar';
import EditProfileModal from '../../components/profile/EditProfileModal';
import { useApp } from '../../context/AppContext';

export default function Profile() {
  const { currentUser, setCurrentUser, displayBalance } = useApp();
  const [modalOpen, setModalOpen] = useState(false);

  const shortBio =
    (currentUser?.description || '').trim().slice(0, 120) ||
    'Ajoutez une courte présentation dans votre profil.';

  const roleLabel =
    currentUser?.role === 'tutor'
      ? 'Tuteur'
      : currentUser?.role === 'both'
        ? 'Étudiant & tuteur'
        : currentUser?.role === 'admin'
          ? 'Administrateur'
          : 'Étudiant';

  return (
    <DashboardLayout>
      <EditProfileModal open={modalOpen} onClose={() => setModalOpen(false)} currentUser={currentUser} setCurrentUser={setCurrentUser} />

      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Mon Profil</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1">
          <div className="card text-center relative">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="absolute top-4 right-4 text-xs text-primary-600 border border-primary-200 rounded-lg px-3 py-1 hover:bg-primary-50"
            >
              <Edit2 size={12} className="inline mr-1" /> Modifier
            </button>
            <div className="flex flex-col items-center mb-4 pt-4">
              <div className="relative mb-3">
                <Avatar initials={currentUser?.avatar || 'U'} size="xl" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full" />
              </div>
              <h2 className="font-bold text-lg text-gray-900">{currentUser?.name || '—'}</h2>
              <p className="text-sm text-gray-500">
                {currentUser?.level || '—'} • {currentUser?.filiere || '—'}
              </p>
              <p className="text-xs font-medium text-primary-600 mt-1">{roleLabel}</p>
              <p className="flex items-start gap-1 mt-2 text-xs text-gray-500 text-left px-2 max-w-[240px] mx-auto line-clamp-3">
                <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 mt-1" />
                {shortBio}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 py-4 border-t border-b border-gray-100">
              {[
                {
                  label: 'Balance',
                  val: `${displayBalance != null ? displayBalance : currentUser?.balance ?? '—'}h`,
                  sub: 'Heures disponibles',
                  color: 'text-primary-600',
                },
                { label: 'Score', val: `${currentUser?.score ?? '—'} ★`, sub: 'Moyenne générale', color: 'text-yellow-600' },
                { label: 'Tutorats reçus', val: currentUser?.tutorialsReceived ?? '—', sub: 'Séances complètes', color: 'text-blue-600' },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className={`font-bold text-lg ${s.color}`}>{s.val}</p>
                  <p className="text-[10px] text-gray-400">{s.sub}</p>
                </div>
              ))}
            </div>

          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Informations Personnelles</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-start gap-3">
                <Mail size={16} className="text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400">Email</p>
                  <p className="text-gray-700">{currentUser?.email || '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <BookOpen size={16} className="text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400">Filière</p>
                  <p className="text-gray-700">{currentUser?.filiere || '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-4 h-4 bg-primary-100 rounded text-[10px] flex items-center justify-center text-primary-700 font-bold">N</div>
                <div>
                  <p className="text-xs text-gray-400">Niveau</p>
                  <p className="text-gray-700">{currentUser?.level || '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar size={16} className="text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400">Membre depuis</p>
                  <p className="text-gray-700">{currentUser?.joinedDate || '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 sm:col-span-2">
                <div>
                  <p className="text-xs text-gray-400">Rôle sur la plateforme</p>
                  <p className="text-gray-700 font-medium">{roleLabel}</p>
                  <p className="text-xs text-gray-400 mt-1">Modifiable via « Modifier » (étudiant, tuteur ou les deux).</p>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-1">Bio</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{currentUser?.description?.trim() || 'Aucune description pour le moment.'}</p>
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
