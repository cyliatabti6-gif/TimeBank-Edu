import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, Calendar, Pencil, Trash2, Check, AlertCircle } from 'lucide-react';
import DashboardLayout from '../layout/DashboardLayout';
import { useApp } from '../../context/AppContext';
import { getAccessToken } from '../../lib/authStorage';
import { createTutorModule, patchTutorModule } from '../../lib/modulesApi';
import {
  augmentSlotsWithComputedEnd,
  buildLibelleFromParts,
  computeEndFromDuration,
  validateStructuredSlots,
} from '../../lib/creneauxScheduling';

export const MODULE_OPTIONS = ['Algorithme', 'Analyse 1', 'Algèbre', 'Base de Données', 'Python', 'Java', 'Programmation Web', 'Structures de Données'];
const niveaux = ['L1', 'L2', 'L3', 'M1', 'M2', 'Doctorat'];
const formats = ['En ligne', 'Présentiel'];
const durations = ['1h', '1.5h', '2h', '3h'];

function mapFormatToApi(label) {
  if (label === 'Présentiel') return 'Présentiel';
  return 'Online';
}

function formatApiError(data) {
  if (!data || typeof data !== 'object') return 'Une erreur est survenue.';
  if (data.detail) return String(data.detail);
  if (data.creneaux) {
    const c = data.creneaux;
    return Array.isArray(c) ? c.join(' ') : String(c);
  }
  return Object.entries(data)
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : v}`)
    .join(' · ');
}

function newSlot() {
  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `c-${Date.now()}-${Math.random()}`,
    date_iso: '',
    heure_debut: '',
    disponible: true,
  };
}

function isPastIsoDate(dateIso) {
  if (!dateIso) return false;
  const selected = new Date(`${dateIso}T00:00:00`);
  if (Number.isNaN(selected.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return selected < today;
}

/** Mappe la réponse API module (module_propose_to_frontend) vers l’état du formulaire création. */
export function mapApiModuleToFormState(m) {
  let formatUi = 'En ligne';
  if (m.format === 'Présentiel') formatUi = 'Présentiel';

  const creneauxRaw = Array.isArray(m.creneaux) ? m.creneaux : [];
  const creneaux =
    creneauxRaw.length > 0
      ? creneauxRaw.map((c) => ({
          id: c.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `c-${Date.now()}-${Math.random()}`),
          date_iso: (c.date_iso || '').trim(),
          heure_debut: (c.heure_debut || '').trim(),
          disponible: c.disponible !== false,
        }))
      : [newSlot()];

  return {
    form: {
      module: (m.title || '').trim(),
      niveau: m.level || '',
      format: formatUi,
      duration: (m.dureeLabel || '').trim() || '2h',
      description: (m.description || '').trim(),
      tags: Array.isArray(m.tags) ? m.tags : [],
    },
    creneaux,
  };
}

const defaultForm = { module: '', niveau: '', format: '', duration: '', description: '', tags: [] };

/**
 * Formulaire partagé création / édition de module (même mise en page que l’ancienne page Proposer).
 * En mode édition, le parent doit fournir initialData après chargement API.
 */
export default function ModuleProposeForm({ mode = 'create', moduleId, initialData = null }) {
  const navigate = useNavigate();
  const { currentUser } = useApp();
  const [form, setForm] = useState(() =>
    mode === 'edit' && initialData?.form ? initialData.form : { ...defaultForm },
  );
  const [creneaux, setCreneaux] = useState(() =>
    mode === 'edit' && initialData?.creneaux?.length ? initialData.creneaux : [newSlot()],
  );
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [toasts, setToasts] = useState([]);
  const toastSeq = useRef(0);

  const pushToast = useCallback((message, type = 'info') => {
    const id = ++toastSeq.current;
    setToasts((t) => [...t, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4200);
  }, []);

  const isSlotReady = useCallback(
    (c) => Boolean(c.date_iso && c.heure_debut?.trim() && form.duration && computeEndFromDuration(c.heure_debut, form.duration)),
    [form.duration],
  );

  const filledSlots = useMemo(() => augmentSlotsWithComputedEnd(creneaux, form.duration), [creneaux, form.duration]);

  const addRow = useCallback(() => {
    const s = newSlot();
    setCreneaux((prev) => [...prev, s]);
    setEditingId(s.id);
    pushToast('Nouveau créneau : indiquez la date et l’heure de début.', 'info');
  }, [pushToast]);

  const removeRow = useCallback(
    (id) => {
      setCreneaux((prev) => {
        if (prev.length <= 1) return prev;
        const next = prev.filter((c) => c.id !== id);
        return next.length ? next : [newSlot()];
      });
      setEditingId((e) => (e === id ? null : e));
      pushToast('Créneau supprimé.', 'success');
    },
    [pushToast],
  );

  const updateRow = useCallback((id, patch) => {
    setCreneaux((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  const finishEdit = useCallback(
    (id) => {
      const row = creneaux.find((c) => c.id === id);
      if (!row) return;
      if (!form.duration) {
        pushToast('Choisissez d’abord une durée indicative dans le bloc « Informations du module ».', 'error');
        return;
      }
      if (!isSlotReady(row)) {
        pushToast('Complétez la date et l’heure de début.', 'error');
        return;
      }
      const v = validateStructuredSlots(creneaux, form.duration);
      if (!v.ok) {
        pushToast(v.message, 'error');
        return;
      }
      setEditingId(null);
      pushToast('Créneau enregistré dans la liste.', 'success');
    },
    [creneaux, form.duration, isSlotReady, pushToast],
  );

  const buildPayload = useCallback(() => {
    const ready = augmentSlotsWithComputedEnd(creneaux, form.duration);
    return {
      titre: form.module.trim(),
      niveau: form.niveau,
      format_seance: mapFormatToApi(form.format),
      planning: '',
      description: form.description.trim(),
      duree_label: form.duration || '',
      tags: Array.isArray(form.tags) ? form.tags : [],
      creneaux: ready.map((c) => ({
        id: c.id,
        libelle: buildLibelleFromParts(c.date_iso, c.heure_debut, c.heure_fin),
        date: '',
        date_iso: c.date_iso,
        heure_debut: c.heure_debut,
        heure_fin: c.heure_fin,
        disponible: c.disponible !== false,
      })),
    };
  }, [creneaux, form]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    const token = getAccessToken();
    if (!token) {
      setSubmitError('Vous devez être connecté en tant que tuteur.');
      navigate('/login');
      return;
    }
    if (currentUser && !currentUser.is_tutor) {
      setSubmitError('Seuls les tuteurs peuvent publier un module.');
      return;
    }
    if (!form.duration) {
      setSubmitError('Choisissez une durée indicative pour calculer automatiquement la fin des créneaux.');
      pushToast('La durée indicative est obligatoire.', 'error');
      return;
    }
    const ready = augmentSlotsWithComputedEnd(creneaux, form.duration);
    if (ready.length === 0) {
      setSubmitError('Ajoutez au moins un créneau avec une date et une heure de début.');
      pushToast('Complétez au moins un créneau avant de publier.', 'error');
      return;
    }
    const hasPastDate = creneaux.some((c) => c.date_iso && isPastIsoDate(c.date_iso));
    if (hasPastDate) {
      const msg = 'Vous ne pouvez pas choisir une date dans le passé';
      setSubmitError(msg);
      pushToast(msg, 'error');
      return;
    }
    const local = validateStructuredSlots(creneaux, form.duration);
    if (!local.ok) {
      setSubmitError(local.message);
      pushToast(local.message, 'error');
      return;
    }
    if (mode === 'edit' && (!Number.isFinite(moduleId) || moduleId <= 0)) {
      setSubmitError('Identifiant de module invalide.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = buildPayload();
      if (mode === 'edit') {
        await patchTutorModule(moduleId, payload, token);
        pushToast('Module mis à jour.', 'success');
      } else {
        await createTutorModule(payload, token);
        pushToast('Module publié avec succès.', 'success');
      }
      navigate('/tutor/modules');
    } catch (err) {
      const msg = formatApiError(err.data) || err.message || (mode === 'edit' ? 'Échec de la mise à jour.' : 'Échec de la publication.');
      setSubmitError(msg);
      pushToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/tutor/modules');
  };

  const renderEditor = (c) => {
    const finCalc = form.duration && c.heure_debut ? computeEndFromDuration(c.heure_debut, form.duration) : '';
    return (
      <div className="space-y-3 p-4 rounded-xl border-2 border-primary-200 bg-white shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1">Date</label>
            <input
              type="date"
              className="input-field text-sm py-2"
              value={c.date_iso}
              onChange={(e) => {
                const nextDate = e.target.value;
                if (nextDate && isPastIsoDate(nextDate)) {
                  pushToast('Vous ne pouvez pas choisir une date dans le passé', 'error');
                  return;
                }
                updateRow(c.id, { date_iso: nextDate });
              }}
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1">Heure de début</label>
            <input
              type="time"
              className="input-field text-sm py-2"
              value={c.heure_debut}
              onChange={(e) => updateRow(c.id, { heure_debut: e.target.value })}
            />
          </div>
        </div>
        <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-sm text-gray-700">
          {form.duration ? (
            finCalc ? (
              <>
                <span className="font-medium text-gray-900">Fin automatique :</span> {finCalc}{' '}
                <span className="text-gray-500">(début + {form.duration})</span>
              </>
            ) : (
              <span className="text-amber-800">Avec {form.duration}, la fin dépasse minuit : avancez l’heure de début.</span>
            )
          ) : (
            <span className="text-gray-500">Choisissez une durée indicative ci-dessus pour calculer l’heure de fin.</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            onClick={() => {
              const v = validateStructuredSlots(creneaux, form.duration);
              if (!v.ok) {
                pushToast(v.message, 'error');
                return;
              }
              finishEdit(c.id);
            }}
            className="inline-flex items-center gap-1.5 text-sm font-medium bg-primary-600 text-white px-3 py-2 rounded-lg hover:bg-primary-700"
          >
            <Check size={16} /> Valider ce créneau
          </button>
        </div>
      </div>
    );
  };

  const renderCard = (c) => {
    const fin = computeEndFromDuration(c.heure_debut, form.duration);
    const lib = buildLibelleFromParts(c.date_iso, c.heure_debut, fin || '');
    const dispo = c.disponible !== false;
    return (
      <div
        className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-4 transition-shadow ${
          dispo ? 'border-emerald-100 bg-emerald-50/40' : 'border-amber-100 bg-amber-50/50'
        }`}
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`p-2 rounded-lg ${dispo ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
            <Calendar size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date</p>
            <p className="text-sm font-semibold text-gray-900">
              {c.date_iso
                ? new Date(`${c.date_iso}T12:00:00`).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                : '—'}
            </p>
            <p className="text-xs text-gray-500 mt-2 font-medium uppercase tracking-wide">Plage horaire</p>
            <p className="text-sm text-gray-800">
              {c.heure_debut}
              {fin ? ` – ${fin}` : ' —'}
              {form.duration ? <span className="text-gray-500 font-normal"> ({form.duration})</span> : null}
            </p>
            {lib ? (
              <p className="text-xs text-gray-400 mt-1 truncate" title={lib}>
                {lib}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col sm:items-end gap-2 shrink-0">
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
              dispo ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
            }`}
          >
            {dispo ? 'Disponible' : 'Réservé'}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditingId(c.id)}
              className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-white"
            >
              <Pencil size={14} /> Modifier
            </button>
            <button
              type="button"
              onClick={() => removeRow(c.id)}
              className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border border-red-100 text-red-600 hover:bg-red-50"
            >
              <Trash2 size={14} /> Supprimer
            </button>
          </div>
        </div>
      </div>
    );
  };

  const moduleSelectOptions = useMemo(() => {
    const m = form.module;
    if (m && !MODULE_OPTIONS.includes(m)) {
      return [...MODULE_OPTIONS, m];
    }
    return MODULE_OPTIONS;
  }, [form.module]);

  const durationSelectOptions = useMemo(() => {
    const d = form.duration;
    if (d && !durations.includes(d)) {
      return [...durations, d];
    }
    return durations;
  }, [form.duration]);

  const isEdit = mode === 'edit';

  return (
    <DashboardLayout>
      <div className="fixed bottom-4 right-4 z-[120] flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-xl shadow-lg border px-4 py-3 text-sm flex items-start gap-2 ${
              t.type === 'error'
                ? 'bg-red-50 border-red-100 text-red-800'
                : t.type === 'success'
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-900'
                  : 'bg-white border-gray-200 text-gray-800'
            }`}
            role="status"
          >
            {t.type === 'error' ? <AlertCircle size={18} className="flex-shrink-0 mt-0.5" /> : null}
            {t.type === 'success' ? <Check size={18} className="flex-shrink-0 mt-0.5 text-emerald-600" /> : null}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      <div className="mb-6 flex items-center gap-3">
        <button type="button" onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{isEdit ? 'Modifier le tutorat' : 'Proposer un Nouveau Tutorat'}</h1>
          <p className="text-gray-500 text-sm">
            Chaque créneau : date + heure de début ; la fin est calculée avec la durée indicative du module. Conflits détectés à la publication.
          </p>
        </div>
      </div>

      {submitError ? (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2 flex items-start gap-2">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <span>{submitError}</span>
        </div>
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
                      {moduleSelectOptions.map((mod) => (
                        <option key={mod} value={mod}>
                          {mod}
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
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Durée indicative</label>
                    <select
                      value={form.duration}
                      onChange={(e) => setForm({ ...form, duration: e.target.value })}
                      className="input-field"
                      required
                    >
                      <option value="">Durée type</option>
                      {durationSelectOptions.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-gray-500 mt-1">
                      Utilisée pour calculer automatiquement l’heure de fin de chaque créneau (début + durée).
                    </p>
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
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">Créneaux proposés</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Date et heure de début uniquement ; la fin suit la durée indicative.</p>
                  </div>
                  <button
                    type="button"
                    onClick={addRow}
                    className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-primary-700 bg-primary-50 border border-primary-100 rounded-lg px-3 py-2 hover:bg-primary-100"
                  >
                    <Plus size={16} /> Ajouter un créneau
                  </button>
                </div>

                <div className="space-y-4">
                  {creneaux.map((c) => (
                    <div key={c.id}>
                      {editingId === c.id || !isSlotReady(c) ? renderEditor(c) : renderCard(c)}
                    </div>
                  ))}
                </div>
              </div>

              {isEdit ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button type="button" onClick={handleCancel} className="py-3 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50">
                    Annuler
                  </button>
                  <button type="submit" disabled={submitting} className="btn-primary py-3 disabled:opacity-60">
                    {submitting ? 'Enregistrement…' : 'Enregistrer les modifications'}
                  </button>
                </div>
              ) : (
                <button type="submit" disabled={submitting} className="btn-primary w-full py-3 disabled:opacity-60">
                  {submitting ? 'Publication…' : 'Publier le module'}
                </button>
              )}
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
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-[11px] font-semibold text-gray-600 flex items-center gap-1 mb-2">
                    <Calendar size={12} /> Créneaux ({filledSlots.length})
                  </p>
                  <ul className="text-xs text-gray-600 space-y-2">
                    {filledSlots.length === 0 ? (
                      <li className="text-gray-400">Aucun créneau complet pour l’instant</li>
                    ) : (
                      filledSlots.map((c) => (
                        <li
                          key={c.id}
                          className={`p-2 rounded-lg border ${c.disponible !== false ? 'border-emerald-100 bg-white' : 'border-amber-100 bg-amber-50/80'}`}
                        >
                          <span className="font-medium text-gray-800">
                            {c.heure_debut} – {c.heure_fin}
                          </span>
                          <span className="text-gray-500">
                            {' '}
                            ·{' '}
                            {new Date(`${c.date_iso}T12:00:00`).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                          <span className={`ml-1.5 text-[10px] font-semibold ${c.disponible !== false ? 'text-emerald-600' : 'text-amber-700'}`}>
                            {c.disponible !== false ? 'Dispo' : 'Réservé'}
                          </span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
    </DashboardLayout>
  );
}
