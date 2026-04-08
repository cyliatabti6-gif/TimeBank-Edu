import { useState } from 'react';
import { Save, Settings, Shield, Bell, Globe, Wrench } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';

const settingsTabs = [
  { id: 'general', label: 'Général', icon: Globe },
  { id: 'rules', label: 'Règles', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Sécurité', icon: Shield },
  { id: 'integrations', label: 'Intégrations', icon: Settings },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench },
];

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState('general');
  const [form, setForm] = useState({
    platformName: 'TimeBank Edu',
    email: 'contact@timebankEdu.dz',
    timezone: 'UTC+01:00 Alger',
    hoursGiven: '1h',
    hoursReceived: '1h',
    initialStudentBalance: '2',
    initialTutorScore: '5',
    minSessionDuration: '1 heure',
  });

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Paramètres de la Plateforme</h1>
        <p className="text-gray-500 text-sm">Configurez les paramètres généraux du système.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Sidebar Tabs */}
        <div className="card p-3 h-fit">
          <nav className="space-y-1">
            {settingsTabs.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === id ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                <Icon size={16} /> {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Settings Panel */}
        <div className="lg:col-span-3 space-y-5">
          {activeTab === 'general' && (
            <>
              <div className="card">
                <h3 className="font-semibold text-gray-900 mb-4">Informations Générales</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom de la plateforme</label>
                    <input type="text" value={form.platformName} onChange={e => setForm({...form, platformName: e.target.value})} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email de contact</label>
                    <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Fuseau horaire</label>
                    <select value={form.timezone} onChange={e => setForm({...form, timezone: e.target.value})} className="input-field">
                      <option>UTC+01:00 Alger</option>
                      <option>UTC+00:00 UTC</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="card">
                <h3 className="font-semibold text-gray-900 mb-4">Règles de Base</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">1h donnée</label>
                    <input type="text" value={form.hoursGiven} className="input-field" readOnly />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">1h reçue</label>
                    <input type="text" value={form.hoursReceived} className="input-field" readOnly />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Score initial étudiant</label>
                    <input type="number" value={form.initialStudentBalance} onChange={e => setForm({...form, initialStudentBalance: e.target.value})} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Score initial tuteur</label>
                    <input type="number" value={form.initialTutorScore} onChange={e => setForm({...form, initialTutorScore: e.target.value})} className="input-field" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Durée minimale d'une séance</label>
                    <select value={form.minSessionDuration} onChange={e => setForm({...form, minSessionDuration: e.target.value})} className="input-field">
                      <option>1 heure</option>
                      <option>30 minutes</option>
                      <option>1.5 heures</option>
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab !== 'general' && (
            <div className="card text-center py-12">
              <Settings size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-400">Paramètres {settingsTabs.find(t => t.id === activeTab)?.label} - Bientôt disponible</p>
            </div>
          )}

          <button className="btn-primary py-3 px-6">
            <Save size={16} /> Enregistrer les modifications
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
