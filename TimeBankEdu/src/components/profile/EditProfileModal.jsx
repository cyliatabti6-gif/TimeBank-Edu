import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X, Loader2 } from 'lucide-react';
import { mapApiUserToAppUser } from '../../context/AppContext';
import { getApiBase } from '../../lib/api';
import { getAccessToken } from '../../lib/authStorage';

const filieres = ['Informatique', 'Mathématiques', 'Physique', 'Chimie', 'Biologie', 'Médecine', 'Droit', 'Économie', 'Gestion', 'Lettres', 'Langues'];
const niveaux = ['L1', 'L2', 'L3', 'M1', 'M2', 'Doctorat'];

const ROLE_OPTIONS = [
  { value: 'student', label: 'Étudiant (suivre des tutorats)' },
  { value: 'tutor', label: 'Tuteur (donner des cours)' },
  { value: 'both', label: 'Les deux (même compte, mêmes heures)' },
];

export default function EditProfileModal({ open, onClose, currentUser, setCurrentUser }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', filiere: '', niveau: '', description: '', role: 'student' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const isAdminUser = currentUser?.role === 'admin' || currentUser?.is_staff;

  useEffect(() => {
    if (!open || !currentUser) return;
    setForm({
      name: currentUser.name || '',
      filiere: currentUser.filiere || '',
      niveau: currentUser.level || '',
      description: currentUser.description || '',
      role: ['student', 'tutor', 'both'].includes(currentUser.role) ? currentUser.role : 'student',
    });
    setFormError('');
  }, [open, currentUser]);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    const token = getAccessToken();
    if (!token) {
      setFormError('Session expirée. Reconnectez-vous.');
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        filiere: form.filiere,
        niveau: form.niveau,
        description: form.description.trim(),
      };
      if (!isAdminUser) body.role = form.role;

      const res = await fetch(`${getApiBase()}/api/auth/me/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof data.detail === 'string'
            ? data.detail
            : Object.entries(data)
                .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : v}`)
                .join(' ') || 'Erreur lors de l’enregistrement.';
        setFormError(msg);
        return;
      }
      const next = mapApiUserToAppUser(data);
      setCurrentUser(next);
      const r = data.role;
      const onTutorPath = location.pathname.startsWith('/tutor');
      const onStudentPath = location.pathname.startsWith('/student');
      if (onTutorPath && r === 'student') navigate('/student/dashboard');
      else if (onStudentPath && r === 'tutor') navigate('/tutor/dashboard');
      onClose();
    } catch {
      setFormError('Impossible de contacter le serveur.');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-profile-title"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 id="edit-profile-title" className="text-lg font-bold text-gray-900">
            Modifier le profil
          </h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600" aria-label="Fermer">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-xs text-gray-500">
            L&apos;e-mail ne peut pas être modifié. Les changements sont enregistrés sur le serveur.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input type="email" value={currentUser?.email || ''} disabled className="input-field bg-gray-50 text-gray-500 cursor-not-allowed" />
          </div>

          {!isAdminUser && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mon profil sur la plateforme</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input-field">
                {ROLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Changez ici si vous voulez aussi donner des cours (tuteur) ou les deux, sans créer un second compte.
              </p>
            </div>
          )}

          {isAdminUser && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              Compte administrateur : le rôle « admin » est géré côté serveur.
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input-field"
              required
              maxLength={255}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filière</label>
              <select value={form.filiere} onChange={(e) => setForm({ ...form, filiere: e.target.value })} className="input-field" required>
                <option value="">—</option>
                {filieres.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Niveau</label>
              <select value={form.niveau} onChange={(e) => setForm({ ...form, niveau: e.target.value })} className="input-field" required>
                <option value="">—</option>
                {niveaux.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio / description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
              maxLength={2000}
              className="input-field resize-none"
              placeholder="Présentez-vous en quelques lignes…"
            />
          </div>
          {formError && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{formError}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2 disabled:opacity-60">
              {saving ? <Loader2 size={18} className="animate-spin" /> : null}
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
