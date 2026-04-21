import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, Heart, Monitor, Check, AlertCircle } from 'lucide-react';
import PublicNavbar from '../../components/layout/PublicNavbar';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Avatar from '../../components/common/Avatar';
import StarRating from '../../components/common/StarRating';
import { useApp } from '../../context/AppContext';
import { fetchModuleById } from '../../lib/modulesApi';
import { fetchTutorPublicAvis } from '../../lib/evaluationsApi';
import { getAccessToken } from '../../lib/authStorage';
import { createStudentReservation } from '../../lib/seancesApi';
import { buildReservationBodyFromModule, validateReservationPrerequisites } from '../../lib/reservationHelpers';

function buildTutorFromApiMod(mod) {
  const tp = mod.tutorProfile || {};
  const name = tp.name || mod.tutor;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials =
    parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() : (name || 'T').slice(0, 2).toUpperCase();
  return {
    id: tp.id ?? mod.tutorId,
    name,
    filiere: tp.filiere || '—',
    score: tp.score != null ? Number(tp.score) : Number(mod.score),
    reviews: mod.reviews,
    tutorReviewCount: Number(mod.tutorReviewCount ?? tp.reviewCount ?? 0),
    bio: tp.description || 'Aucune présentation pour le moment.',
    initials,
    avatarUrl: tp.avatarUrl || '',
    avatar: initials,
  };
}

function avisInitials(displayName) {
  const p = (displayName || '').trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2) return `${p[0][0]}${p[1].replace(/\./g, '')[0] || 'É'}`.toUpperCase();
  return (p[0]?.[0] || 'É').toUpperCase();
}

function formatAvisDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

function TutorDetailContent({ moduleId: moduleIdParam }) {
  const navigate = useNavigate();
  const { currentUser, upsertReservationFromApiDetail } = useApp();
  const moduleId = parseInt(moduleIdParam, 10);
  const [mod, setMod] = useState(null);
  const [tutor, setTutor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCreneauId, setSelectedCreneauId] = useState(null);
  const [publicAvis, setPublicAvis] = useState([]);
  const [avisLoading, setAvisLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [moduleFetchStatus, setModuleFetchStatus] = useState('loading');
  const [toasts, setToasts] = useState([]);
  const toastSeq = useRef(0);

  const pushToast = useCallback((message, type = 'info') => {
    const id = ++toastSeq.current;
    setToasts((t) => [...t, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4200);
  }, []);

  useEffect(() => {
    let alive = true;
    if (Number.isNaN(moduleId)) {
      setMod(null);
      setTutor(null);
      setModuleFetchStatus('not_found');
      setLoading(false);
      return () => {
        alive = false;
      };
    }
    (async () => {
      setLoading(true);
      setModuleFetchStatus('loading');
      try {
        const data = await fetchModuleById(moduleId);
        if (!alive) return;
        setMod(data);
        setTutor(buildTutorFromApiMod(data));
        setModuleFetchStatus('ok');
      } catch (e) {
        if (!alive) return;
        setMod(null);
        setTutor(null);
        const status = typeof e?.status === 'number' ? e.status : null;
        setModuleFetchStatus(status === 404 ? 'not_found' : 'offline');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [moduleId]);

  useEffect(() => {
    setSelectedCreneauId(null);
  }, [mod?.id]);

  useEffect(() => {
    const tid = tutor?.id;
    if (tid == null) return undefined;
    let alive = true;
    setAvisLoading(true);
    fetchTutorPublicAvis(tid)
      .then((rows) => {
        if (alive) setPublicAvis(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (alive) setPublicAvis([]);
      })
      .finally(() => {
        if (alive) setAvisLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [tutor?.id]);

  const creneaux = mod?.creneaux ?? [];
  const creneauxDisponibles = creneaux.filter((c) => c.disponible);
  const selectedCreneau = creneaux.find((c) => c.id === selectedCreneauId);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft size={18} /> Retour
        </button>
        <p className="text-gray-500 text-sm py-12 text-center">Chargement du module…</p>
      </div>
    );
  }

  if (!mod || !tutor || moduleFetchStatus !== 'ok') {
    const isOffline = moduleFetchStatus === 'offline';
    return (
      <div className="max-w-5xl mx-auto">
        <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft size={18} /> Retour
        </button>
        <div className="card text-center py-12 text-gray-600">
          {isOffline ? (
            <>
              <p className="font-medium text-gray-800">Module not available (API offline)</p>
              <p className="text-sm mt-2">Le catalogue ne peut pas être chargé. Vérifiez que l’API Django est accessible.</p>
            </>
          ) : (
            <>
              <p className="font-medium text-gray-800">Module introuvable</p>
              <p className="text-sm mt-2">Ce cours n’existe pas ou n’est plus proposé.</p>
            </>
          )}
        </div>
      </div>
    );
  }

  const handleDemander = async () => {
    if (moduleFetchStatus !== 'ok' || !mod) return;
    const liveCreneaux = mod.creneaux ?? [];
    const creneauLive =
      selectedCreneauId != null ? liveCreneaux.find((c) => c.id === selectedCreneauId) : null;
    const pre = validateReservationPrerequisites(mod, creneauLive, {
      studentId: currentUser?.id,
      selectedCreneauId,
    });
    if (!pre.ok) {
      pushToast(pre.reason, 'error');
      return;
    }
    const token = getAccessToken();
    if (!currentUser || !token) {
      pushToast('Session expirée', 'error');
      navigate('/login', { state: { from: `/modules/${moduleId}` } });
      return;
    }
    if (!currentUser.is_student) {
      pushToast('Seuls les étudiants peuvent réserver', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const body = buildReservationBodyFromModule(mod, { selectedCreneau: creneauLive, message: '' });
      const data = await createStudentReservation(token, body);
      upsertReservationFromApiDetail(data, { message: '', studentScore: Number(currentUser.score) || 0 });
      pushToast('Demande enregistrée. Le tuteur la verra dans ses demandes.', 'success');
    } catch (e) {
      pushToast(e instanceof Error ? e.message : 'Impossible d’envoyer la demande.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
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

      <div className="flex items-center justify-between mb-5">
        <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700">
          <ArrowLeft size={18} /> Retour
        </button>
        <div className="flex gap-2">
          <button type="button" className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50">
            <Share2 size={16} className="text-gray-500" />
          </button>
          <button type="button" className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50">
            <Heart size={16} className="text-gray-500" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="card">
            <div className="flex items-start gap-4 mb-4">
              <Avatar
                initials={tutor.initials || tutor.avatar}
                src={tutor.avatarUrl || undefined}
                size="xl"
                altText={tutor.name || 'Tuteur'}
              />
              <div className="flex-1">
                <p className="text-xs font-semibold text-primary-600 uppercase tracking-wide mb-1">Cours sélectionné</p>
                <h2 className="text-lg font-bold text-gray-900">
                  {mod.title} <span className="text-gray-500 font-normal">· {mod.level}</span>
                </h2>
                <div className="flex items-center gap-2 mb-1 mt-2">
                  <h1 className="text-xl font-bold text-gray-900">{tutor.name}</h1>
                  <span className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <Check size={11} className="text-white" />
                  </span>
                </div>
                <p className="text-gray-500 text-sm">Tuteur en {tutor.filiere}</p>
                <div className="flex items-center gap-2 mt-2">
                  <StarRating rating={tutor.score} size={14} />
                  <span className="font-semibold text-gray-800">{tutor.score}</span>
                  <span className="text-gray-400 text-sm">({tutor.tutorReviewCount ?? tutor.reviews ?? 0} avis)</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Monitor size={15} className="text-primary-500" />
                <span>
                  Format: <strong>{mod.format === 'Online' ? 'En ligne' : mod.format}</strong>
                </span>
              </div>
            </div>

            {mod.description ? (
              <div className="mb-4">
                <h3 className="font-semibold text-gray-800 mb-2">Contenu du cours</h3>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{mod.description}</p>
              </div>
            ) : null}
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">À propos du tuteur</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{tutor.bio}</p>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Avis des étudiants</h3>
              {avisLoading ? <span className="text-xs text-gray-400">Chargement…</span> : null}
            </div>
            <div className="space-y-3">
              {!avisLoading && publicAvis.length === 0 ? (
                <p className="text-sm text-gray-500 py-2">Aucun avis publié pour ce tuteur pour le moment.</p>
              ) : null}
              {publicAvis.map((r) => (
                <div key={r.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <Avatar initials={avisInitials(r.student)} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-800">{r.student}</span>
                      <StarRating rating={Number(r.note)} size={12} />
                      {r.module ? <span className="text-[11px] text-gray-400 truncate max-w-[12rem]">{r.module}</span> : null}
                    </div>
                    {r.commentaire ? <p className="text-xs text-gray-600 whitespace-pre-wrap">{r.commentaire}</p> : null}
                    <p className="text-[11px] text-gray-400 mt-1">{formatAvisDate(r.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="card sticky top-6">
            <h3 className="font-semibold text-gray-900 mb-1">Choisir un créneau</h3>
            <p className="text-xs text-gray-500 mb-4">Sélectionnez un horaire parmi les créneaux disponibles pour ce module.</p>

            <div className="space-y-2 mb-5" role="radiogroup" aria-label="Créneaux disponibles">
              {creneaux.map((c) => {
                const isSelected = selectedCreneauId === c.id;
                if (!c.disponible) {
                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm bg-gray-100 text-gray-400 border border-transparent gap-2"
                    >
                      <div>
                        <span className="line-through">{c.libelle}</span>
                        {c.date ? <p className="text-[11px] text-gray-400 mt-0.5">{c.date}</p> : null}
                      </div>
                      <span className="text-[10px] uppercase tracking-wide flex-shrink-0">Réservé</span>
                    </div>
                  );
                }
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setSelectedCreneauId(c.id)}
                    className={`w-full text-left flex items-center justify-between px-3 py-2.5 rounded-lg text-sm border transition-colors gap-2 ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50 text-primary-900 ring-1 ring-primary-500'
                        : 'border-gray-200 bg-white hover:border-primary-300 text-gray-800'
                    }`}
                  >
                    <div className="min-w-0">
                      <span className="font-medium">{c.libelle}</span>
                      {c.date ? <p className="text-[11px] text-gray-500 mt-0.5">{c.date}</p> : null}
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${isSelected ? 'bg-primary-600 text-white' : 'bg-green-100 text-green-700'}`}
                    >
                      {isSelected ? 'Choisi' : 'Libre'}
                    </span>
                  </button>
                );
              })}
            </div>

            {creneauxDisponibles.length === 0 && (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-4">
                Aucun créneau libre pour l’instant. Revenez plus tard ou contactez le tuteur.
              </p>
            )}

            <div className="bg-primary-50 rounded-xl p-3 mb-4 text-center">
              <p className="text-xs text-primary-700 font-medium">Prêt à réserver ?</p>
              <p className="text-xs text-primary-500 mt-1">Le tuteur confirmera votre demande pour le créneau choisi.</p>
            </div>
            <button
              type="button"
              onClick={handleDemander}
              disabled={!selectedCreneau || creneauxDisponibles.length === 0 || submitting}
              className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Envoi…' : 'Demander ce tutorat'}
            </button>
            {!selectedCreneau && creneauxDisponibles.length > 0 && (
              <p className="text-[11px] text-center text-gray-400 mt-2">Sélectionnez d’abord un créneau ci-dessus.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TutorDetail() {
  const { id } = useParams();
  const { currentUser } = useApp();
  const moduleId = id || '1';

  if (currentUser) {
    return (
      <DashboardLayout>
        <TutorDetailContent moduleId={moduleId} />
      </DashboardLayout>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNavbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <TutorDetailContent moduleId={moduleId} />
      </div>
    </div>
  );
}
