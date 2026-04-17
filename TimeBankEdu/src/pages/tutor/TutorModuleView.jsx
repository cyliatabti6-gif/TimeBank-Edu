import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Calendar, Clock, Edit2, FileText } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StarRating from '../../components/common/StarRating';
import { getAccessToken } from '../../lib/authStorage';
import { fetchMyTutorModuleById } from '../../lib/modulesApi';

export default function TutorModuleView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const moduleId = Number(id);
  const [moduleData, setModuleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!Number.isFinite(moduleId)) {
      setError('Identifiant de module invalide.');
      setLoading(false);
      return;
    }
    const token = getAccessToken();
    if (!token) {
      setError('Connectez-vous pour voir ce module.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchMyTutorModuleById(moduleId, token)
      .then((data) => {
        if (!cancelled) setModuleData(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Impossible de charger ce module.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [moduleId]);

  const creneaux = useMemo(
    () => (Array.isArray(moduleData?.creneaux) ? moduleData.creneaux : []),
    [moduleData],
  );
  const sessionContent = useMemo(
    () => (moduleData?.description || '').trim(),
    [moduleData?.description],
  );

  return (
    <DashboardLayout>
      <div className="flex items-center gap-3 mb-6">
        <button type="button" onClick={() => navigate('/tutor/modules')} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900">Détail du module (espace tuteur)</h1>
          <p className="text-gray-500 text-sm">Vue interne tuteur — sans redirection vers l’espace étudiant.</p>
        </div>
        {Number.isFinite(moduleId) ? (
          <button
            type="button"
            onClick={() => navigate(`/tutor/modules/${moduleId}/edit`)}
            className="btn-primary text-sm py-2 px-4"
          >
            <Edit2 size={14} /> Modifier
          </button>
        ) : null}
      </div>

      {loading ? <p className="text-sm text-gray-500 py-8">Chargement…</p> : null}
      {!loading && error ? (
        <div className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">{error}</div>
      ) : null}

      {!loading && !error && moduleData ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <div className="card">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-start gap-2">
                  <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center">
                    <BookOpen size={18} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{moduleData.title}</h2>
                    <p className="text-xs text-gray-500">
                      {moduleData.level} • {moduleData.category}
                    </p>
                  </div>
                </div>
                <span className={moduleData.status === 'published' ? 'badge-green' : 'badge-orange'}>
                  {moduleData.status === 'published' ? 'Publié' : 'En attente'}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-3">{moduleData.description || 'Aucune description.'}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-xs">
                <div className="bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-gray-400">Format</p>
                  <p className="font-medium text-gray-800 mt-0.5">{moduleData.format || '—'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-gray-400">Planning</p>
                  <p className="font-medium text-gray-800 mt-0.5">{moduleData.schedule || '—'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-gray-400">Durée</p>
                  <p className="font-medium text-gray-800 mt-0.5">{moduleData.dureeLabel || '—'}</p>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                <Calendar size={16} /> Créneaux
              </h3>
              {creneaux.length === 0 ? (
                <p className="text-sm text-gray-400">Aucun créneau enregistré.</p>
              ) : (
                <ul className="space-y-2">
                  {creneaux.map((c, i) => (
                    <li key={c.id || i} className="text-sm border border-gray-100 rounded-lg px-3 py-2">
                      <p className="font-medium text-gray-800">{c.libelle || 'Créneau'}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {c.date || 'Date non précisée'} • {c.disponible === false ? 'Indisponible' : 'Disponible'}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="space-y-5">
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                <Clock size={16} /> Performance
              </h3>
              <div className="flex items-center gap-1">
                <StarRating rating={moduleData.score || 0} size={13} />
                <span className="text-xs text-gray-600">
                  {moduleData.score} ({moduleData.reviews} avis)
                </span>
              </div>
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                <FileText size={16} /> Contenu de la séance
              </h3>
              {sessionContent ? (
                <p className="text-sm text-gray-700 leading-relaxed">{sessionContent}</p>
              ) : (
                <p className="text-sm text-gray-500">
                  Ce créneau est dédié au module <strong>{moduleData?.title || 'sélectionné'}</strong>. Ajoutez une description
                  dans « Modifier » pour détailler les chapitres, exercices et objectifs de la séance.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}
