import { useState, useEffect, useCallback, useMemo } from 'react';
import { Edit2, Mail, BookOpen, Calendar, Star, X } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Avatar from '../../components/common/Avatar';
import StarRating from '../../components/common/StarRating';
import EditProfileModal from '../../components/profile/EditProfileModal';
import { useApp, mapApiUserToAppUser } from '../../context/AppContext';
import { getApiBase } from '../../lib/api';
import { getAccessToken } from '../../lib/authStorage';
import { fetchTutorEvaluationsRecues } from '../../lib/evaluationsApi';

const MODULE_LABEL_MAX = 120;

export default function TutorProfile() {
  const { currentUser, setCurrentUser, displayBalance } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [receivedEvals, setReceivedEvals] = useState([]);
  const [evalsLoading, setEvalsLoading] = useState(false);
  const [evalsError, setEvalsError] = useState('');
  const [moduleDraft, setModuleDraft] = useState('');
  const [moduleSaving, setModuleSaving] = useState(false);
  const [moduleError, setModuleError] = useState('');
  const [modulesRefreshing, setModulesRefreshing] = useState(false);

  const masteredModules = useMemo(
    () => (Array.isArray(currentUser?.modulesMaitrises) ? currentUser.modulesMaitrises : []),
    [currentUser?.modulesMaitrises],
  );

  const loadEvaluations = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    if (currentUser?.role !== 'tutor' && currentUser?.role !== 'both') return;
    setEvalsLoading(true);
    setEvalsError('');
    try {
      const rows = await fetchTutorEvaluationsRecues(token);
      setReceivedEvals(Array.isArray(rows) ? rows : []);
    } catch {
      setEvalsError('Impossible de charger les avis.');
      setReceivedEvals([]);
    } finally {
      setEvalsLoading(false);
    }
  }, [currentUser?.role]);

  useEffect(() => {
    loadEvaluations();
  }, [loadEvaluations]);

  const refreshModulesFromServer = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    setModulesRefreshing(true);
    setModuleError('');
    try {
      const res = await fetch(`${getApiBase()}/api/auth/me/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setModuleError('Impossible de rafraîchir la liste.');
        return;
      }
      const u = await res.json();
      setCurrentUser(mapApiUserToAppUser(u));
    } catch {
      setModuleError('Impossible de rafraîchir la liste.');
    } finally {
      setModulesRefreshing(false);
    }
  }, [setCurrentUser]);

  const saveModulesMaitrises = useCallback(
    async (nextList) => {
      const token = getAccessToken();
      if (!token) {
        setModuleError('Session expirée. Reconnectez-vous.');
        return;
      }
      setModuleSaving(true);
      setModuleError('');
      try {
        const res = await fetch(`${getApiBase()}/api/auth/me/`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ modules_maitrises: nextList }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg =
            typeof data.detail === 'string'
              ? data.detail
              : Object.entries(data)
                  .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : v}`)
                  .join(' ') || 'Enregistrement impossible.';
          setModuleError(msg);
          return;
        }
        setCurrentUser(mapApiUserToAppUser(data));
        setModuleDraft('');
      } catch {
        setModuleError('Enregistrement impossible.');
      } finally {
        setModuleSaving(false);
      }
    },
    [setCurrentUser],
  );

  const handleAddModule = () => {
    const name = moduleDraft.trim();
    if (!name) {
      setModuleError('Saisissez un nom de module.');
      return;
    }
    if (name.length > MODULE_LABEL_MAX) {
      setModuleError(`Maximum ${MODULE_LABEL_MAX} caractères.`);
      return;
    }
    if (masteredModules.some((m) => m.toLowerCase() === name.toLowerCase())) {
      setModuleError('Ce module est déjà dans votre liste.');
      return;
    }
    if (masteredModules.length >= 30) {
      setModuleError('Vous pouvez enregistrer au plus 30 modules maîtrisés.');
      return;
    }
    saveModulesMaitrises([...masteredModules, name]);
  };

  const handleRemoveModule = (label) => {
    saveModulesMaitrises(masteredModules.filter((m) => m !== label));
  };

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
        <h1 className="text-xl font-bold text-gray-900">Mon Profil Tuteur</h1>
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
            <div className="flex flex-col items-center pt-4 mb-4">
              <div className="relative mb-3">
                <Avatar initials={currentUser?.avatar || 'U'} size="xl" color="blue" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full" />
              </div>
              <h2 className="font-bold text-lg text-gray-900">{currentUser?.name || '—'}</h2>
              <p className="text-sm text-gray-500">
                {currentUser?.level || '—'} • {currentUser?.filiere || '—'}
              </p>
              <p className="text-xs text-primary-600 font-medium mt-1">{roleLabel}</p>
            </div>

            <div className="grid grid-cols-3 gap-2 py-4 border-t border-b border-gray-100">
              {[
                { label: 'Heures gagnées', val: `${displayBalance != null ? displayBalance : currentUser?.balance ?? '—'}h`, color: 'text-primary-600' },
                { label: 'Score', val: `${currentUser?.score ?? '—'} ★`, color: 'text-yellow-600' },
                {
                  label: 'Avis séances',
                  val: currentUser?.tutorReviewCount != null ? String(currentUser.tutorReviewCount) : '—',
                  color: 'text-blue-600',
                },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className={`font-bold text-lg ${s.color}`}>{s.val}</p>
                  <p className="text-[10px] text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 text-left">
              <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="text-sm font-semibold text-gray-700">Modules maîtrisés</h3>
                <button
                  type="button"
                  onClick={refreshModulesFromServer}
                  disabled={modulesRefreshing}
                  className="text-xs text-primary-600 hover:underline disabled:opacity-50"
                >
                  {modulesRefreshing ? '…' : 'Actualiser'}
                </button>
              </div>
              <p className="text-[11px] text-gray-500 mb-2">
                Indiquez les matières que vous maîtrisez (texte libre, sans publier une offre de cours).
              </p>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={moduleDraft}
                  onChange={(e) => {
                    setModuleDraft(e.target.value);
                    if (moduleError) setModuleError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddModule();
                    }
                  }}
                  maxLength={MODULE_LABEL_MAX}
                  placeholder="Ex. Analyse, Algèbre…"
                  className="flex-1 min-w-0 text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  disabled={moduleSaving}
                />
                <button
                  type="button"
                  onClick={handleAddModule}
                  disabled={moduleSaving}
                  className="text-xs shrink-0 text-primary-600 border border-primary-200 rounded-lg px-2.5 py-1.5 hover:bg-primary-50 disabled:opacity-50"
                >
                  {moduleSaving ? '…' : 'Ajouter'}
                </button>
              </div>
              {moduleError ? <p className="text-xs text-amber-700 mb-2">{moduleError}</p> : null}
              {masteredModules.length === 0 ? (
                <p className="text-xs text-gray-400">Aucun module indiqué pour le moment.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {masteredModules.map((m) => (
                    <span
                      key={m}
                      className="inline-flex items-center gap-1 bg-primary-50 text-primary-700 text-xs pl-2.5 pr-1 py-1 rounded-full max-w-full"
                    >
                      <span className="truncate">{m}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveModule(m)}
                        disabled={moduleSaving}
                        className="p-0.5 rounded-full hover:bg-primary-100 text-primary-600 disabled:opacity-50"
                        aria-label={`Retirer ${m}`}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Informations Personnelles</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
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
                <Star size={16} className="text-gray-400 mt-0.5 fill-gray-400" />
                <div>
                  <p className="text-xs text-gray-400">Score tuteur (moyenne avis)</p>
                  <div className="flex items-center gap-1 flex-wrap">
                    <StarRating rating={Number(currentUser?.score) || 0} size={12} />
                    <span className="text-gray-700 font-semibold">{currentUser?.score ?? '—'}</span>
                    <span className="text-gray-400 text-xs">
                      ({currentUser?.tutorReviewCount ?? 0} avis)
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar size={16} className="text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400">Membre depuis</p>
                  <p className="text-gray-700">{currentUser?.joinedDate || '—'}</p>
                </div>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-400">Rôle</p>
                <p className="text-gray-700 font-medium">{roleLabel}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-gray-400 mb-1">Bio</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {currentUser?.description?.trim() || 'Aucune description.'}
              </p>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Avis reçus (séances)</h3>
              <button type="button" onClick={loadEvaluations} className="text-xs text-primary-600 hover:underline">
                Actualiser
              </button>
            </div>
            {evalsError ? <p className="text-sm text-amber-700 mb-2">{evalsError}</p> : null}
            {evalsLoading ? (
              <p className="text-sm text-gray-500">Chargement…</p>
            ) : receivedEvals.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun avis pour le moment. Les évaluations apparaissent ici après qu’un étudiant a noté une séance complétée.</p>
            ) : (
              <div className="space-y-3">
                {receivedEvals.map((ev) => (
                  <div key={ev.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-9 h-9 bg-primary-100 rounded-xl flex items-center justify-center text-sm font-semibold text-primary-700 flex-shrink-0">
                      {(ev.student || '?').slice(0, 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-gray-800">{ev.student}</p>
                        <StarRating rating={Number(ev.note)} size={12} />
                        <span className="text-[11px] text-gray-400">{ev.module}</span>
                      </div>
                      {ev.commentaire ? (
                        <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{ev.commentaire}</p>
                      ) : null}
                      <p className="text-[11px] text-gray-400 mt-1">
                        {ev.date || '—'} {ev.time ? `• ${ev.time}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
