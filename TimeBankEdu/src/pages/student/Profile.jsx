import { useState, useCallback } from 'react';
import { Edit2, Mail, BookOpen, Calendar, Plus, X } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Avatar from '../../components/common/Avatar';
import EditProfileModal from '../../components/profile/EditProfileModal';
import { useApp } from '../../context/AppContext';

/** Suggestions (filière info) — l’étudiant peut aussi saisir un autre nom. */
const MODULE_SUGGESTIONS = [
  'Algorithme',
  'Python',
  'Base de Données',
  'Structure de Données',
  'IA',
  'Programmation Web',
  'Réseaux',
  'Systèmes d’exploitation',
  'Compilation',
  'Mathématiques discrètes',
];

const MODULE_NAME_MAX = 80;

export default function Profile() {
  const { currentUser, setCurrentUser, displayBalance } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [masteredModules, setMasteredModules] = useState(['Algorithme', 'Python', 'Base de Données', 'Structure de Données', 'IA']);
  const [showAddModule, setShowAddModule] = useState(false);
  const [moduleDraft, setModuleDraft] = useState('');
  const [moduleAddError, setModuleAddError] = useState('');

  const openAddModule = useCallback(() => {
    setModuleAddError('');
    setModuleDraft('');
    setShowAddModule(true);
  }, []);

  const closeAddModule = useCallback(() => {
    setShowAddModule(false);
    setModuleDraft('');
    setModuleAddError('');
  }, []);

  const submitAddModule = useCallback(() => {
    const name = moduleDraft.trim();
    if (!name) {
      setModuleAddError('Indiquez un nom de module.');
      return;
    }
    if (name.length > MODULE_NAME_MAX) {
      setModuleAddError(`Maximum ${MODULE_NAME_MAX} caractères.`);
      return;
    }
    const exists = masteredModules.some((m) => m.toLowerCase() === name.toLowerCase());
    if (exists) {
      setModuleAddError('Ce module est déjà dans votre liste.');
      return;
    }
    setMasteredModules((prev) => [...prev, name]);
    closeAddModule();
  }, [moduleDraft, masteredModules, closeAddModule]);

  const recentActivity = [
    { text: 'Séance avec Ahmed Moussa', sub: 'Algorithme - L2', date: '15/05/2024', icon: '📚' },
    { text: 'Séance avec Lina Farah', sub: 'Analyse 1 - L1', date: '08/05/2024', icon: '📐' },
    { text: 'Évaluation donnée', sub: 'Ahmed Moussa', date: '05/05/2024', icon: '⭐' },
  ];

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

            <div className="mt-4 text-left">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700">Modules Maîtrisés</h3>
                <button
                  type="button"
                  onClick={() => (showAddModule ? closeAddModule() : openAddModule())}
                  className="text-xs text-primary-600 flex items-center gap-0.5 hover:underline"
                  aria-expanded={showAddModule}
                >
                  <Plus size={12} /> {showAddModule ? 'Fermer' : 'Ajouter'}
                </button>
              </div>
              {showAddModule && (
                <div className="mb-3 p-3 rounded-xl border border-gray-200 bg-gray-50/80 space-y-2">
                  <label htmlFor="student-profile-module-input" className="sr-only">
                    Nom du module à ajouter
                  </label>
                  <input
                    id="student-profile-module-input"
                    type="text"
                    list="student-profile-modules-datalist"
                    value={moduleDraft}
                    onChange={(e) => {
                      setModuleDraft(e.target.value);
                      setModuleAddError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        submitAddModule();
                      }
                      if (e.key === 'Escape') closeAddModule();
                    }}
                    placeholder="Ex. Programmation Web"
                    maxLength={MODULE_NAME_MAX}
                    className="input-field text-sm py-2 w-full"
                    autoFocus
                  />
                  <datalist id="student-profile-modules-datalist">
                    {MODULE_SUGGESTIONS.filter((s) => !masteredModules.some((m) => m.toLowerCase() === s.toLowerCase())).map(
                      (s) => (
                        <option key={s} value={s} />
                      )
                    )}
                  </datalist>
                  {moduleAddError ? <p className="text-xs text-red-600">{moduleAddError}</p> : null}
                  <div className="flex gap-2 justify-end">
                    <button type="button" onClick={closeAddModule} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-white">
                      Annuler
                    </button>
                    <button type="button" onClick={submitAddModule} className="text-xs px-3 py-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700">
                      Ajouter ce module
                    </button>
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                {masteredModules.map((m) => (
                  <span key={m} className="bg-primary-50 text-primary-700 text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                    {m}
                    <button
                      type="button"
                      className="p-0.5 rounded hover:bg-primary-100 text-primary-700"
                      onClick={() => setMasteredModules((prev) => prev.filter((x) => x !== m))}
                      aria-label={`Retirer ${m}`}
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
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

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Activité Récente</h3>
              <button type="button" className="text-xs text-primary-600 hover:underline">
                Voir tout
              </button>
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
