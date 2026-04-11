import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Eye, Trash2, BookOpen } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StarRating from '../../components/common/StarRating';
import { getAccessToken } from '../../lib/authStorage';
import { fetchMyTutorModules } from '../../lib/modulesApi';

const accentClasses = [
  'bg-blue-100 text-blue-600',
  'bg-cyan-100 text-cyan-600',
  'bg-amber-100 text-amber-700',
  'bg-purple-100 text-purple-600',
  'bg-emerald-100 text-emerald-700',
];

function pickAccent(title) {
  const i = (title || '').length % accentClasses.length;
  return accentClasses[i];
}

export default function MyModules() {
  const navigate = useNavigate();
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setError('Connectez-vous pour voir vos modules.');
      setModules([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await fetchMyTutorModules(token);
      setModules(Array.isArray(data) ? data : []);
    } catch {
      setError('Impossible de charger vos modules. Vérifiez que le backend tourne et que vous êtes bien tuteur.');
      setModules([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mes Modules</h1>
          <p className="text-gray-500 text-sm">Modules enregistrés sur le serveur pour votre compte tuteur.</p>
        </div>
        <button type="button" onClick={() => navigate('/tutor/modules/new')} className="btn-primary text-sm py-2">
          <Plus size={16} /> Nouveau Module
        </button>
      </div>

      {error ? (
        <div className="mb-4 text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">{error}</div>
      ) : null}

      {loading ? (
        <p className="text-sm text-gray-500 py-8">Chargement…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((mod) => (
            <div key={mod.id} className="card hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${pickAccent(mod.title)}`}
                >
                  <BookOpen size={18} />
                </div>
                <span className={mod.status === 'published' ? 'badge-green' : 'badge-orange'}>
                  {mod.status === 'published' ? 'Publié' : 'En attente'}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{mod.title}</h3>
              <p className="text-xs text-gray-500 mb-2">
                {mod.level} • {mod.category}
              </p>
              <p className="text-xs text-gray-400 mb-3">
                {mod.format} • {mod.schedule}
                {mod.dureeLabel ? ` • ${mod.dureeLabel}` : ''}
              </p>
              <div className="flex items-center gap-1 mb-4">
                <StarRating rating={mod.score} size={12} />
                <span className="text-xs text-gray-600">
                  {mod.score} ({mod.reviews} avis)
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex-1 text-xs border border-gray-200 text-gray-600 py-1.5 rounded-lg flex items-center justify-center gap-1 hover:bg-gray-50 opacity-60 cursor-not-allowed"
                  title="Bientôt disponible"
                >
                  <Edit2 size={12} /> Modifier
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/modules/${mod.id}`)}
                  className="flex-1 text-xs bg-primary-50 text-primary-600 py-1.5 rounded-lg flex items-center justify-center gap-1 hover:bg-primary-100"
                >
                  <Eye size={12} /> Voir
                </button>
                <button
                  type="button"
                  className="w-8 text-xs bg-red-50 text-red-500 py-1.5 rounded-lg flex items-center justify-center opacity-50 cursor-not-allowed"
                  title="Bientôt disponible"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => navigate('/tutor/modules/new')}
            className="card border-2 border-dashed border-gray-200 hover:border-primary-400 hover:bg-primary-50 transition-all flex flex-col items-center justify-center gap-3 min-h-48 text-gray-400 hover:text-primary-600"
          >
            <Plus size={28} />
            <span className="text-sm font-medium">Proposer un nouveau module</span>
          </button>
        </div>
      )}

      {!loading && modules.length === 0 && !error && (
        <p className="text-sm text-gray-500 py-6 text-center">
          Aucun module pour l’instant. Publiez-en un avec « Nouveau module » — il apparaîtra aussi dans « Trouver un module » pour les étudiants.
        </p>
      )}
    </DashboardLayout>
  );
}
