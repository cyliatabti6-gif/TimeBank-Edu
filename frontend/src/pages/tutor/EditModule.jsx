import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ModuleProposeForm, { mapApiModuleToFormState } from '../../components/tutor/ModuleProposeForm';
import { getAccessToken } from '../../lib/authStorage';
import { fetchTutorModuleById } from '../../lib/modulesApi';

export default function EditModule() {
  const { id } = useParams();
  const navigate = useNavigate();
  const moduleId = Number(id);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [initialData, setInitialData] = useState(null);

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token || !Number.isFinite(moduleId)) {
      setLoadError('Session invalide ou identifiant incorrect.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError('');
    try {
      const m = await fetchTutorModuleById(moduleId, token);
      setInitialData(mapApiModuleToFormState(m));
    } catch (e) {
      setLoadError(e?.message || 'Impossible de charger le module.');
      setInitialData(null);
    } finally {
      setLoading(false);
    }
  }, [moduleId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="mb-6 flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Modifier le tutorat</h1>
            <p className="text-gray-500 text-sm">Chargement du module…</p>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 text-gray-500 py-24">
          <Loader2 className="animate-spin" size={22} />
          <span>Chargement…</span>
        </div>
      </DashboardLayout>
    );
  }

  if (loadError || !initialData) {
    return (
      <DashboardLayout>
        <div className="mb-6 flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Modifier le tutorat</h1>
            <p className="text-gray-500 text-sm">Impossible d’afficher le formulaire.</p>
          </div>
        </div>
        <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {loadError || 'Données manquantes.'}
          <button type="button" onClick={() => void load()} className="block mt-3 text-primary-600 font-medium hover:underline">
            Réessayer
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return <ModuleProposeForm mode="edit" moduleId={moduleId} initialData={initialData} />;
}
