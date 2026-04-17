import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, Heart, Monitor, Clock, Award, Check, Star } from 'lucide-react';
import PublicNavbar from '../../components/layout/PublicNavbar';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Avatar from '../../components/common/Avatar';
import StarRating from '../../components/common/StarRating';
import { mockTutors, mockModules, useApp } from '../../context/AppContext';
import { fetchModuleById } from '../../lib/modulesApi';
import { fetchTutorPublicAvis } from '../../lib/evaluationsApi';

function buildTutorFromApiMod(mod) {
  const tp = mod.tutorProfile || {};
  const name = tp.name || mod.tutor;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const avatar =
    parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() : (name || 'T').slice(0, 2).toUpperCase();
  return {
    id: tp.id ?? mod.tutorId,
    name,
    filiere: tp.filiere || '—',
    score: tp.score != null ? Number(tp.score) : Number(mod.score),
    reviews: mod.reviews,
    tutorReviewCount: Number(mod.tutorReviewCount ?? tp.reviewCount ?? 0),
    bio: tp.description || 'Aucune présentation pour le moment.',
    experience: '—',
    successRate: '—',
    avatar,
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
  const { currentUser } = useApp();
  const moduleId = parseInt(moduleIdParam, 10);
  const [mod, setMod] = useState(null);
  const [tutor, setTutor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCreneauId, setSelectedCreneauId] = useState(null);
  const [publicAvis, setPublicAvis] = useState([]);
  const [avisLoading, setAvisLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    if (Number.isNaN(moduleId)) {
      setMod(null);
      setTutor(null);
      setLoading(false);
      return () => {
        alive = false;
      };
    }
    (async () => {
      setLoading(true);
      try {
        const data = await fetchModuleById(moduleId);
        if (!alive) return;
        setMod(data);
        setTutor(buildTutorFromApiMod(data));
      } catch {
        const localMod = mockModules.find((m) => m.id === moduleId);
        if (!alive) return;
        if (localMod) {
          setMod(localMod);
          const mt = mockTutors.find((t) => t.id === localMod.tutorId);
          if (mt) {
            setTutor({
              id: mt.id,
              name: mt.name,
              filiere: mt.filiere,
              score: mt.score,
              reviews: mt.reviews,
              tutorReviewCount: mt.reviews,
              bio: mt.bio,
              experience: mt.experience,
              successRate: mt.successRate,
              avatar: mt.avatar,
            });
          } else {
            setTutor(buildTutorFromApiMod({ ...localMod, tutorProfile: { name: localMod.tutor, id: localMod.tutorId } }));
          }
        } else {
          setMod(null);
          setTutor(null);
        }
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

  if (!mod || !tutor) {
    return (
      <div className="max-w-5xl mx-auto">
        <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft size={18} /> Retour
        </button>
        <div className="card text-center py-12 text-gray-600">
          <p className="font-medium text-gray-800">Module introuvable</p>
          <p className="text-sm mt-2">Ce cours n’existe pas ou n’est plus proposé.</p>
        </div>
      </div>
    );
  }

  const handleDemander = () => {
    if (!selectedCreneau) return;
    const tid = Number(mod.tutorId);
    const uid = currentUser?.id != null ? Number(currentUser.id) : null;
    if (uid != null && Number.isFinite(tid) && tid === uid) {
      alert(
        "Vous ne pouvez pas demander une séance auprès de vous-même. Avec un compte « étudiant et tuteur », réservez depuis un autre compte étudiant ou faites tester par un camarade.",
      );
      return;
    }
    navigate('/booking/new', {
      state: {
        moduleId: mod.id,
        tutorId: mod.tutorId,
        tutorName: tutor.name,
        moduleTitle: mod.title,
        moduleLevel: mod.level,
        creneauId: selectedCreneau.id,
        creneauLabel: selectedCreneau.libelle,
        creneauDate: selectedCreneau.date || '',
        format: mod.format,
      },
    });
  };

  return (
    <div className="max-w-5xl mx-auto">
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
              <Avatar initials={tutor.avatar} size="xl" />
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
              <div className="flex items-center gap-2 text-gray-600">
                <Clock size={15} className="text-primary-500" />
                <span>
                  Planning: <strong>{mod.schedule}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Award size={15} className="text-primary-500" />
                <span>
                  Expérience: <strong>{tutor.experience}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Star size={15} className="text-primary-500" />
                <span>
                  Réussite: <strong>{tutor.successRate}</strong>
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
              disabled={!selectedCreneau || creneauxDisponibles.length === 0}
              className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Demander ce tutorat
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
