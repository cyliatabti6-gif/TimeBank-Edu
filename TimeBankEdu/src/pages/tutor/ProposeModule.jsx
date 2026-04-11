import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, ArrowLeft, Calendar } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useApp } from '../../context/AppContext';
import { getAccessToken } from '../../lib/authStorage';
import { createTutorModule } from '../../lib/modulesApi';

const niveaux = ['L1', 'L2', 'L3', 'M1', 'M2', 'Doctorat'];
const modules = ['Algorithme', 'Analyse 1', 'Algèbre', 'Base de Données', 'Python', 'Java', 'Programmation Web', 'Structures de Données'];
const formats = ['En ligne', 'Présentiel', 'Les deux'];
const durations = ['1h', '1.5h', '2h', '3h'];
const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function mapFormatToApi(label) {
  if (label === 'Présentiel') return 'Présentiel';
  return 'Online';
}

function formatApiError(data) {
  if (!data || typeof data !== 'object') return 'Une erreur est survenue.';
  if (data.detail) return String(data.detail);
  return Object.entries(data)
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : v}`)
    .join(' · ');
}

export default function ProposeModule() {
  const navigate = useNavigate();
  const { currentUser } = useApp();
  const [form, setForm] = useState({ module: '', niveau: '', format: '', duration: '', description: '' });
  const [selectedDays, setSelectedDays] = useState([]);
  const [creneaux, setCreneaux] = useState([{ libelle: '', date: '', disponible: true }]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const toggleDay = (d) => setSelectedDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const addCreneauRow = () => setCreneaux((prev) => [...prev, { libelle: '', date: '', disponible: true }]);
  const removeCreneauRow = (index) => setCreneaux((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  const updateCreneau = (index, field, value) => {
    setCreneaux((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    const token = getAccessToken();
    if (!token) {
      setSubmitError('Vous devez être connecté en tant que tuteur.');
      navigate('/login');
      return;
    }
    if (currentUser && currentUser.role !== 'tutor' && currentUser.role !== 'both') {
      setSubmitError('Seuls les tuteurs peuvent publier un module.');
      return;
    }
    const filled = creneaux.filter((c) => c.libelle.trim());
    if (filled.length === 0) {
      setSubmitError('Ajoutez au moins un créneau avec un libellé (ex. Mercredi 14h – 16h).');
      return;
    }
    setSubmitting(true);
    try {
      await createTutorModule(
        {
          titre: form.module.trim(),
          niveau: form.niveau,
          format_seance: mapFormatToApi(form.format),
          planning: selectedDays.length ? selectedDays.join(', ') : '',
          description: form.description.trim(),
          duree_label: form.duration || '',
          tags: [],
          creneaux: filled.map((c) => ({
            libelle: c.libelle.trim(),
            date: (c.date || '').trim(),
            disponible: c.disponible !== false,
          })),
        },
        token,
      );
      navigate('/tutor/modules');
    } catch (err) {
      setSubmitError(formatApiError(err.data) || err.message || 'Échec de la publication.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center gap-3">
        <button type="button" onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Proposer un Nouveau Tutorat</h1>
          <p className="text-gray-500 text-sm">Définissez les créneaux : ils seront visibles par les étudiants sur la fiche du module.</p>
        </div>
      </div>

      {submitError ? (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{submitError}</div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="card space-y-4">
              <h3 className="font-semibold text-gray-900">Informations du Module</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Module</label>
                  <select
                    value={form.module}
                    onChange={(e) => setForm({ ...form, module: e.target.value })}
                    className="input-field"
                    required
                  >
                    <option value="">Sélectionner un module</option>
                    {modules.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Niveau</label>
                  <select
                    value={form.niveau}
                    onChange={(e) => setForm({ ...form, niveau: e.target.value })}
                    className="input-field"
                    required
                  >
                    <option value="">Choisir le niveau</option>
                    {niveaux.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Format</label>
                  <select
                    value={form.format}
                    onChange={(e) => setForm({ ...form, format: e.target.value })}
                    className="input-field"
                    required
                  >
                    <option value="">Sélectionner le format</option>
                    {formats.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Durée</label>
                  <select
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    className="input-field"
                    required
                  >
                    <option value="">Durée type</option>
                    {durations.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea
                  rows={3}
                  placeholder="Ex. chapitres couverts, prérequis…"
                  className="input-field resize-none"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  maxLength={200}
                />
                <p className="text-xs text-gray-400 text-right mt-1">{form.description.length}/200</p>
              </div>
            </div>

            <div className="card space-y-4">
              <h3 className="font-semibold text-gray-900">Créneaux proposés</h3>
              <p className="text-xs text-gray-500">
                Pour chaque séance possible, indiquez le jour / horaire et la date prévue (comme pour les étudiants). Au moins un créneau est obligatoire.
              </p>
              <div className="space-y-3">
                {creneaux.map((c, index) => (
                  <div key={index} className="flex flex-col sm:flex-row gap-2 p-3 rounded-xl border border-gray-200 bg-gray-50/80">
                    <div className="flex-1">
                      <label className="block text-[11px] font-medium text-gray-500 mb-1">Libellé (jour · horaire)</label>
                      <input
                        type="text"
                        className="input-field text-sm py-2"
                        placeholder="ex. Mercredi 14h – 16h"
                        value={c.libelle}
                        onChange={(e) => updateCreneau(index, 'libelle', e.target.value)}
                      />
                    </div>
                    <div className="sm:w-36">
                      <label className="block text-[11px] font-medium text-gray-500 mb-1">Date (JJ/MM/AAAA)</label>
                      <input
                        type="text"
                        className="input-field text-sm py-2"
                        placeholder="15/04/2026"
                        value={c.date}
                        onChange={(e) => updateCreneau(index, 'date', e.target.value)}
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <label className="flex items-center gap-1.5 text-xs text-gray-600 pb-2">
                        <input
                          type="checkbox"
                          checked={c.disponible}
                          onChange={(e) => updateCreneau(index, 'disponible', e.target.checked)}
                        />
                        Libre
                      </label>
                      {creneaux.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => removeCreneauRow(index)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg mb-0.5"
                          aria-label="Supprimer ce créneau"
                        >
                          <X size={16} />
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
                <button type="button" onClick={addCreneauRow} className="text-sm text-primary-600 flex items-center gap-1 hover:underline">
                  <Plus size={16} /> Ajouter un créneau
                </button>
              </div>
            </div>

            <div className="card space-y-4">
              <h3 className="font-semibold text-gray-900">Disponibilités (résumé)</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Jours habituellement disponibles</label>
                <div className="flex gap-2 flex-wrap">
                  {days.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDay(d)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        selectedDays.includes(d) ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400 mt-2">Sert à remplir le planning affiché sur la carte du module (en complément des créneaux).</p>
              </div>
            </div>

            <button type="submit" disabled={submitting} className="btn-primary w-full py-3 disabled:opacity-60">
              {submitting ? 'Publication…' : 'Publier le module'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-1">
          <div className="card sticky top-6">
            <h3 className="font-semibold text-gray-900 mb-4">Aperçu</h3>
            <div className="p-4 bg-gray-50 rounded-xl space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">{form.module || 'Module'}</span>
                <span className="badge-blue">{form.niveau || 'Niv.'}</span>
              </div>
              <p className="text-xs text-gray-500">
                {form.format || 'Format'} • {form.duration || 'Durée'}
              </p>
              <p className="text-xs text-gray-400">{form.description || 'Description…'}</p>
              {selectedDays.length > 0 && <p className="text-xs text-gray-500">Jours : {selectedDays.join(', ')}</p>}
              <div className="pt-2 border-t border-gray-200">
                <p className="text-[11px] font-semibold text-gray-600 flex items-center gap-1 mb-1">
                  <Calendar size={12} /> Créneaux
                </p>
                <ul className="text-xs text-gray-500 space-y-1">
                  {creneaux
                    .filter((c) => c.libelle.trim())
                    .map((c, i) => (
                      <li key={i}>
                        {c.libelle}
                        {c.date ? ` · ${c.date}` : ''}
                        {!c.disponible ? ' (réservé)' : ''}
                      </li>
                    ))}
                  {!creneaux.some((c) => c.libelle.trim()) ? <li className="text-gray-400">Aucun pour l’instant</li> : null}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
