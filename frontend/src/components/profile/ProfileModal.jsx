import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X, Loader2, ImagePlus } from 'lucide-react';
import { mapApiUserToAppUser } from '../../context/AppContext';
import { getApiBase } from '../../lib/api';
import { getAccessToken } from '../../lib/authStorage';
import Avatar from '../common/Avatar';
import { userInitialsFromName } from '../../lib/userDisplay';

const filieres = [
  'Informatique',
  'Mathématiques',
  'Physique',
  'Chimie',
  'Biologie',
  'Médecine',
  'Droit',
  'Économie',
  'Gestion',
  'Lettres',
  'Langues',
];
const niveaux = ['L1', 'L2', 'L3', 'M1', 'M2', 'Doctorat'];

export default function ProfileModal({ open, onClose, currentUser, setCurrentUser }) {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    name: '',
    filiere: '',
    niveau: '',
    description: '',
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!open || !currentUser) return;
    setForm({
      name: currentUser.name || '',
      filiere: currentUser.filiere || '',
      niveau: currentUser.level || '',
      description: currentUser.description || '',
    });
    setFormError('');
    setAvatarFile(null);
    setAvatarPreview(null);
  }, [open, currentUser]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(null);
      return;
    }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

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
      const headers = { Authorization: `Bearer ${token}` };
      let res;
      if (avatarFile) {
        const fd = new FormData();
        fd.append('name', form.name.trim());
        fd.append('filiere', form.filiere);
        fd.append('niveau', form.niveau);
        fd.append('description', form.description.trim());
        fd.append('avatar', avatarFile);
        res = await fetch(`${getApiBase()}/api/auth/me/`, {
          method: 'PATCH',
          headers,
          body: fd,
        });
      } else {
        const body = {
          name: form.name.trim(),
          filiere: form.filiere,
          niveau: form.niveau,
          description: form.description.trim(),
        };
        res = await fetch(`${getApiBase()}/api/auth/me/`, {
          method: 'PATCH',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }
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
      const onTutorPath = location.pathname.startsWith('/tutor');
      const onStudentPath = location.pathname.startsWith('/student');
      if (onTutorPath && !next.is_tutor && next.is_student) navigate('/student/dashboard');
      else if (onStudentPath && !next.is_student && next.is_tutor) navigate('/tutor/dashboard');
      setAvatarFile(null);
      onClose();
    } catch {
      setFormError('Impossible de contacter le serveur.');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  const previewSrc = avatarPreview || currentUser?.avatarUrl || undefined;
  const previewInitials = userInitialsFromName(form.name || currentUser?.name);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 id="profile-modal-title" className="text-lg font-bold text-gray-900">
            Modifier le profil
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-xs text-gray-500">
            L&apos;e-mail ne peut pas être modifié. Le rôle compte (<span className="font-mono">user</span> /{' '}
            <span className="font-mono">admin</span>) et les accès métier (étudiant / tuteur) ne sont pas modifiables
            depuis cet écran.
          </p>

          <div className="flex flex-col items-center gap-3 p-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/80">
            <Avatar initials={previewInitials} src={previewSrc} size="lg" altText="Aperçu photo de profil" />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(ev) => {
                const f = ev.target.files?.[0];
                setFormError('');
                if (!f) {
                  setAvatarFile(null);
                  return;
                }
                if (f.size > 2 * 1024 * 1024) {
                  setFormError('Image trop volumineuse (maximum 2 Mo).');
                  setAvatarFile(null);
                  return;
                }
                setAvatarFile(f);
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 text-sm font-medium text-primary-700 bg-white border border-primary-200 rounded-lg px-3 py-2 hover:bg-primary-50"
            >
              <ImagePlus size={16} />
              {avatarFile ? 'Changer l’image' : 'Ajouter une photo'}
            </button>
            {avatarFile ? (
              <button type="button" className="text-xs text-gray-500 hover:text-gray-800 underline" onClick={() => setAvatarFile(null)}>
                Retirer la sélection (garder l’image actuelle)
              </button>
            ) : null}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input
              type="email"
              value={currentUser?.email || ''}
              disabled
              className="input-field bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>

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
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio personnelle</label>
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
