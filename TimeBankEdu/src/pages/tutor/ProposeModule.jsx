import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, ArrowLeft } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';

const niveaux = ['L1', 'L2', 'L3', 'M1', 'M2'];
const modules = ['Algorithme', 'Analyse 1', 'Algèbre', 'Base de Données', 'Python', 'Java', 'Comptabilité', 'Physique', 'Chimie'];
const formats = ['En ligne', 'Présentiel', 'Les deux'];
const durations = ['1h', '1.5h', '2h', '3h'];
const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const complementaire = ['Structures de Données', 'Programmation', 'Mathématiques', 'Algorithmique avancée'];

export default function ProposeModule() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ module: '', niveau: '', format: '', duration: '', description: '', scoreMin: 2.0 });
  const [selectedDays, setSelectedDays] = useState([]);
  const [tags, setTags] = useState(['Structures de Données', 'Programmation']);

  const toggleDay = (d) => setSelectedDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate('/tutor/modules');
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Proposer un Nouveau Tutorat</h1>
          <p className="text-gray-500 text-sm">Partagez vos connaissances et gagnez des heures.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="card space-y-4">
              <h3 className="font-semibold text-gray-900">Informations du Module</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Module</label>
                  <select value={form.module} onChange={e => setForm({...form, module: e.target.value})} className="input-field" required>
                    <option value="">Sélectionner un module</option>
                    {modules.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Niveau</label>
                  <select value={form.niveau} onChange={e => setForm({...form, niveau: e.target.value})} className="input-field" required>
                    <option value="">L2 - Informatique</option>
                    {niveaux.map(n => <option key={n}>{n}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Format</label>
                  <select value={form.format} onChange={e => setForm({...form, format: e.target.value})} className="input-field">
                    <option value="">Sélectionner le format</option>
                    {formats.map(f => <option key={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Durée</label>
                  <select value={form.duration} onChange={e => setForm({...form, duration: e.target.value})} className="input-field">
                    <option value="">Taille type</option>
                    {durations.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea rows={3} placeholder="Je propose des séances pour comprendre les algorithmes de tri, recherche et complexité. Avec des exemples pratiques et des exercices guidés."
                  className="input-field resize-none" value={form.description} onChange={e => setForm({...form, description: e.target.value})} maxLength={200} />
                <p className="text-xs text-gray-400 text-right mt-1">{form.description.length}/200</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Matières complémentaires (optionnel)</label>
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <span key={tag} className="bg-primary-50 text-primary-700 text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                      {tag} <button type="button" onClick={() => setTags(prev => prev.filter(t => t !== tag))}><X size={11}/></button>
                    </span>
                  ))}
                  <button type="button" className="text-xs text-primary-600 border border-primary-200 px-2.5 py-1 rounded-full hover:bg-primary-50 flex items-center gap-1">
                    <Plus size={11} /> Ajouter
                  </button>
                </div>
              </div>
            </div>

            <div className="card space-y-4">
              <h3 className="font-semibold text-gray-900">Disponibilités</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Jours disponibles</label>
                <div className="flex gap-2 flex-wrap">
                  {days.map(d => (
                    <button key={d} type="button" onClick={() => toggleDay(d)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${selectedDays.includes(d) ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Score requis pour réserver</label>
                <div className="flex items-center gap-3">
                  <input type="range" min="0" max="5" step="0.5" value={form.scoreMin}
                    onChange={e => setForm({...form, scoreMin: parseFloat(e.target.value)})}
                    className="flex-1 accent-primary-600" />
                  <span className="font-semibold text-primary-600">{form.scoreMin}</span>
                </div>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full py-3">
              Publier le module
            </button>
          </form>
        </div>

        {/* Preview */}
        <div className="lg:col-span-1">
          <div className="card sticky top-6">
            <h3 className="font-semibold text-gray-900 mb-4">Aperçu</h3>
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold">{form.module || 'Algorithme'}</span>
                <span className="badge-blue">{form.niveau || 'L2'}</span>
              </div>
              <p className="text-xs text-gray-500 mb-2">{form.format || 'Online'} • {form.duration || '2h'}</p>
              <p className="text-xs text-gray-400 mb-3">{form.description || 'Description de votre module...'}</p>
              {selectedDays.length > 0 && (
                <p className="text-xs text-gray-500">Jours : {selectedDays.join(', ')}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
