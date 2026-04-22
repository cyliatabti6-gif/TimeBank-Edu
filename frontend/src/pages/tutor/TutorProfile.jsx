import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Layers } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StarRating from '../../components/common/StarRating';
import ProfileCard from '../../components/profile/ProfileCard';
import ProfileInfo from '../../components/profile/ProfileInfo';
import ProfileModal from '../../components/profile/ProfileModal';
import { useApp } from '../../context/AppContext';
import { getAccessToken } from '../../lib/authStorage';
import { getApiBase } from '../../lib/api';
import { fetchTutorEvaluationsRecues } from '../../lib/evaluationsApi';

export default function TutorProfile() {
  const { currentUser, setCurrentUser, displayBalance } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [receivedEvals, setReceivedEvals] = useState([]);
  const [evalsLoading, setEvalsLoading] = useState(false);
  const [evalsError, setEvalsError] = useState('');
  const [moduleTitles, setModuleTitles] = useState([]);
  const [modulesLoading, setModulesLoading] = useState(false);

  const loadEvaluations = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    if (!currentUser?.is_tutor) return;
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
  }, [currentUser?.is_tutor]);

  useEffect(() => {
    loadEvaluations();
  }, [loadEvaluations]);

  useEffect(() => {
    let alive = true;
    const id = currentUser?.id;
    if (!id || !currentUser?.is_tutor) {
      setModuleTitles([]);
      return () => {
        alive = false;
      };
    }
    (async () => {
      setModulesLoading(true);
      try {
        const res = await fetch(`${getApiBase()}/api/tuteurs/${id}/modules/`);
        const data = await res.json().catch(() => []);
        if (!alive) return;
        const list = Array.isArray(data) ? data.map((m) => m.title).filter(Boolean) : [];
        setModuleTitles(list);
      } catch {
        if (alive) setModuleTitles([]);
      } finally {
        if (alive) setModulesLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [currentUser?.id, currentUser?.is_tutor]);

  const bal =
    displayBalance != null && Number.isFinite(Number(displayBalance))
      ? Number(displayBalance)
      : Number(currentUser?.balance);
  const balanceStr = Number.isFinite(bal) ? `${bal}h` : '—';

  const tutorStats = [
    {
      label: 'Balance',
      value: balanceStr,
      sub: 'Heures disponibles',
      colorClass: 'text-primary-600',
    },
    {
      label: 'Score',
      value: `${currentUser?.score ?? '—'} ★`,
      sub: 'Moyenne des avis',
      colorClass: 'text-yellow-600',
    },
    {
      label: 'Avis séances',
      value: String(currentUser?.tutorReviewCount ?? '—'),
      sub: 'Depuis le profil',
      colorClass: 'text-blue-600',
    },
    {
      label: 'Évaluations reçues',
      value: String(currentUser?.evaluationsRecues ?? '—'),
      sub: 'Depuis le profil',
      colorClass: 'text-indigo-600',
    },
  ];

  return (
    <DashboardLayout>
      <ProfileModal open={modalOpen} onClose={() => setModalOpen(false)} currentUser={currentUser} setCurrentUser={setCurrentUser} />

      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Mon profil tuteur</h1>
        <p className="text-sm text-gray-500 mt-1">Indicateurs issus du serveur (score, avis, évaluations).</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1 space-y-4">
          <ProfileCard user={currentUser} displayBalance={displayBalance} stats={tutorStats} onEdit={() => setModalOpen(true)} avatarColor="blue">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700">Modules publiés</h3>
                <Link
                  to="/tutor/modules"
                  className="text-xs text-primary-600 inline-flex items-center gap-0.5 font-medium hover:underline"
                >
                  <Layers size={12} /> Gérer
                </Link>
              </div>
              {modulesLoading ? (
                <p className="text-xs text-gray-500">Chargement…</p>
              ) : moduleTitles.length === 0 ? (
                <p className="text-xs text-gray-500">Aucun module publié pour le moment.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {moduleTitles.map((m) => (
                    <span key={m} className="bg-primary-50 text-primary-700 text-xs px-2.5 py-1 rounded-full">
                      {m}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </ProfileCard>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <ProfileInfo user={currentUser} bioTitle="Bio personnelle" />

          <div className="card border border-gray-100/80 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Avis reçus (séances)</h3>
              <button type="button" onClick={loadEvaluations} className="text-xs text-primary-600 hover:underline font-medium">
                Actualiser
              </button>
            </div>
            {evalsError ? <p className="text-sm text-amber-700 mb-2">{evalsError}</p> : null}
            {evalsLoading ? (
              <p className="text-sm text-gray-500">Chargement…</p>
            ) : receivedEvals.length === 0 ? (
              <p className="text-sm text-gray-500">
                Aucun avis pour le moment. Les évaluations apparaissent ici après qu&apos;un étudiant a noté une séance complétée.
              </p>
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
