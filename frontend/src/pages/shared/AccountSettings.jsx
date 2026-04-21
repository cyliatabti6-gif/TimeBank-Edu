import { createElement, useState } from 'react';
import { User, Shield, Bell, Eye, Settings, Save } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Avatar from '../../components/common/Avatar';
import { resolveAvatarSrc } from '../../lib/avatarUrl';
import { useApp } from '../../context/AppContext';

const tabs = [
  { id: 'compte', label: 'Compte', icon: User },
  { id: 'securite', label: 'Sécurité', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'confidentialite', label: 'Confidentialité', icon: Eye },
  { id: 'preferences', label: 'Préférences', icon: Settings },
];

export default function AccountSettings() {
  const { currentUser, darkMode, setDarkMode } = useApp();
  const [activeTab, setActiveTab] = useState('compte');
  const [form, setForm] = useState({
    nom: currentUser?.name?.split(' ')[0] || 'Sara',
    prenom: currentUser?.name?.split(' ')[1] || 'Benali',
    email: currentUser?.email || 'sara.benali@univ.dz',
    phone: '+213 555 12 34 56',
    filiere: currentUser?.filiere || 'Informatique',
    niveau: currentUser?.level || 'L2',
    bio: "Étudiante passionnée par les algorithmes et l'intelligence artificielle. J'aime résoudre des problèmes complexes.",
  });

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Paramètres du Compte</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-primary-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200'}`}>
            {createElement(tab.icon, { size: 14 })} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'compte' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 max-w-4xl">
          <div className="lg:col-span-2 card space-y-4">
            <h3 className="font-semibold text-gray-900">Informations Personnelles</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nom</label>
                <input type="text" value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Prénom</label>
                <input type="text" value={form.prenom} onChange={e => setForm({...form, prenom: e.target.value})} className="input-field" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Téléphone</label>
              <input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="input-field" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Filière</label>
                <input type="text" value={form.filiere} className="input-field" readOnly />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Niveau</label>
                <input type="text" value={form.niveau} className="input-field" readOnly />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Bio</label>
              <textarea rows={3} value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} maxLength={200} className="input-field resize-none" />
              <p className="text-xs text-gray-400 text-right">{form.bio.length}/200</p>
            </div>
            <button className="btn-primary py-2.5">
              <Save size={15} /> Enregistrer les modifications
            </button>
          </div>
          <div className="card h-fit text-center">
            <h3 className="font-semibold text-gray-900 mb-4">Photo de profil</h3>
            <Avatar
              initials={currentUser?.initials || 'U'}
              src={resolveAvatarSrc(currentUser) || undefined}
              size="xl"
              altText={currentUser?.name || 'Profil'}
            />
            <button className="mt-4 text-sm text-primary-600 border border-primary-200 px-4 py-2 rounded-lg hover:bg-primary-50 block mx-auto">
              Changer la photo
            </button>
            <p className="text-xs text-gray-400 mt-2">JPG, PNG, max 2 Mo</p>
          </div>
        </div>
      )}

      {activeTab === 'preferences' && (
        <div className="max-w-lg card space-y-4">
          <h3 className="font-semibold text-gray-900">Préférences</h3>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div>
              <p className="font-medium text-sm text-gray-800">Thème sombre</p>
              <p className="text-xs text-gray-500">Activer le mode nuit</p>
            </div>
            <button onClick={() => setDarkMode(!darkMode)}
              className={`w-12 h-6 rounded-full transition-all relative ${darkMode ? 'bg-primary-600' : 'bg-gray-200'}`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-all ${darkMode ? 'right-0.5' : 'left-0.5'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div>
              <p className="font-medium text-sm text-gray-800">Langue</p>
              <p className="text-xs text-gray-500">Français</p>
            </div>
            <select className="border border-gray-200 rounded-lg px-2 py-1 text-sm">
              <option>Français</option>
              <option>العربية</option>
              <option>English</option>
            </select>
          </div>
        </div>
      )}

      {(activeTab === 'securite' || activeTab === 'notifications' || activeTab === 'confidentialite') && (
        <div className="max-w-lg card text-center py-12">
          <Settings size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-400">Section {tabs.find(t => t.id === activeTab)?.label} - Bientôt disponible</p>
        </div>
      )}
    </DashboardLayout>
  );
}
