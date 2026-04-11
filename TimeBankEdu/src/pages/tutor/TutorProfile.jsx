import { useState, useEffect, useCallback } from 'react';
import { Edit2, Mail, BookOpen, Calendar, Star, Plus } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Avatar from '../../components/common/Avatar';
import StarRating from '../../components/common/StarRating';
import EditProfileModal from '../../components/profile/EditProfileModal';
import { useApp } from '../../context/AppContext';
import { getAccessToken } from '../../lib/authStorage';
import { fetchTutorEvaluationsRecues } from '../../lib/evaluationsApi';

export default function TutorProfile() {
  const { currentUser, setCurrentUser, displayBalance } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [receivedEvals, setReceivedEvals] = useState([]);
  const [evalsLoading, setEvalsLoading] = useState(false);
  const [evalsError, setEvalsError] = useState('');

  const modules = ['Algorithme', 'Python'];

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
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700">Modules Enseignés</h3>
                <button type="button" className="text-xs text-primary-600 flex items-center gap-0.5">
                  <Plus size={12} /> Ajouter
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {modules.map((m) => (
                  <span key={m} className="bg-primary-50 text-primary-700 text-xs px-2.5 py-1 rounded-full">
                    {m}
                  </span>
                ))}
              </div>
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
