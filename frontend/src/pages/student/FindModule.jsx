import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, MapPin, Monitor } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StarRating from '../../components/common/StarRating';
import Avatar from '../../components/common/Avatar';
import { mockModules } from '../../context/AppContext';
import { fetchModules } from '../../lib/modulesApi';

function formatFilterMatches(moduleFormat, filterValue) {
  if (!filterValue) return true;
  if (filterValue === 'Online') return moduleFormat === 'Online';
  if (filterValue === 'Présentiel') return moduleFormat === 'Présentiel';
  return true;
}

function nameInitials(name) {
  const p = (name || '').trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2) return `${p[0][0]}${p[p.length - 1][0]}`.toUpperCase();
  return (p[0] || 'T').slice(0, 2).toUpperCase();
}

/** Nom affiché du tuteur (API : chaîne ; compat objet éventuel). */
function tutorDisplayName(mod) {
  const t = mod?.tutor;
  if (typeof t === 'string') return t;
  if (t && typeof t === 'object') return t.name || '';
  return '';
}

/** URL avatar tuteur depuis GET /api/modules/ (tutorProfile.avatarUrl ; compat tutor.avatar si objet). */
function tutorAvatarUrl(mod) {
  const fromProfile = mod?.tutorProfile?.avatarUrl;
  if (fromProfile) return fromProfile;
  const t = mod?.tutor;
  if (t && typeof t === 'object' && t.avatar) return t.avatar;
  return undefined;
}

export default function FindModule() {
  const navigate = useNavigate();
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiFallback, setApiFallback] = useState(false);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ niveau: '', module: '', disponibilite: '', format: '' });
  const [sortBy, setSortBy] = useState('Meilleur tuteur (note)');

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setApiFallback(false);
      try {
        const data = await fetchModules();
        if (!alive) return;
        setModules(Array.isArray(data) ? data : []);
      } catch {
        if (!alive) return;
        setApiFallback(true);
        setModules(mockModules);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const moduleTitleOptions = useMemo(() => {
    const titles = [...new Set(modules.map((m) => m.title).filter(Boolean))];
    return titles.sort((a, b) => a.localeCompare(b, 'fr'));
  }, [modules]);

  const tutorById = useMemo(() => {
    const m = {};
    for (const mod of modules) {
      if (!m[mod.tutorId]) {
        const tp = mod.tutorProfile;
        m[mod.tutorId] = {
          score: tp != null ? Number(tp.score) : Number(mod.score),
          tutorReviewCount: Number(mod.tutorReviewCount ?? tp?.reviewCount ?? 0),
          hoursGiven: 0,
          disponible: true,
        };
      }
    }
    return m;
  }, [modules]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    let list = modules.filter((m) => {
      if (filters.niveau && m.level !== filters.niveau) return false;
      if (filters.module && m.title !== filters.module) return false;
      if (!formatFilterMatches(m.format, filters.format)) return false;
      if (filters.disponibilite && m.schedule && !m.schedule.toLowerCase().includes(filters.disponibilite.toLowerCase().slice(0, 3))) {
        return false;
      }

      if (q) {
        const inTitle = m.title.toLowerCase().includes(q);
        const inTutor = tutorDisplayName(m).toLowerCase().includes(q);
        if (!inTitle && !inTutor) return false;
      }

      return true;
    });

    const sorted = [...list].sort((a, b) => {
      const ta = tutorById[a.tutorId];
      const tb = tutorById[b.tutorId];

      switch (sortBy) {
        case 'Module (A → Z)':
          return a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' });
        case 'Module (Z → A)':
          return b.title.localeCompare(a.title, 'fr', { sensitivity: 'base' });
        case 'Meilleur tuteur (note)':
        case 'Mieux notés': {
          if (b.score !== a.score) return b.score - a.score;
          const sa = ta?.score ?? 0;
          const sb = tb?.score ?? 0;
          if (sb !== sa) return sb - sa;
          const ra = a.tutorReviewCount ?? ta?.tutorReviewCount ?? 0;
          const rb = b.tutorReviewCount ?? tb?.tutorReviewCount ?? 0;
          if (rb !== ra) return rb - ra;
          return b.reviews - a.reviews;
        }
        case "Plus d'heures": {
          const ha = ta?.hoursGiven ?? 0;
          const hb = tb?.hoursGiven ?? 0;
          return hb - ha;
        }
        case 'Disponible maintenant': {
          const da = ta?.disponible ? 1 : 0;
          const db = tb?.disponible ? 1 : 0;
          if (db !== da) return db - da;
          return b.score - a.score;
        }
        case 'Plus récents':
        default:
          return b.id - a.id;
      }
    });

    return sorted;
  }, [search, filters, sortBy, tutorById, modules]);

  const filterConfig = [
    { key: 'niveau', opts: ['L1', 'L2', 'L3', 'M1', 'M2', 'Doctorat'], placeholder: 'Niveau' },
    { key: 'module', opts: moduleTitleOptions, placeholder: 'Module' },
    { key: 'disponibilite', opts: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'], placeholder: 'Disponibilité' },
    {
      key: 'format',
      opts: [
        { label: 'En ligne', value: 'Online' },
        { label: 'Présentiel', value: 'Présentiel' },
      ],
      placeholder: 'Format',
    },
  ];

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Trouver un Module</h1>
        <p className="text-gray-500 text-sm">Trouvez le tuteur parfait selon vos critères.</p>
        {apiFallback && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-3">
            API catalogue indisponible : affichage des données de démonstration locales.
          </p>
        )}
      </div>

      <div className="card mb-5">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom de module ou de tuteur…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9"
              aria-label="Recherche module ou tuteur"
              disabled={loading}
            />
          </div>
          <button type="button" className="btn-secondary text-sm py-2 px-4">
            <Filter size={15} /> Filtres
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {filterConfig.map((f) => (
            <select
              key={f.key}
              value={filters[f.key]}
              onChange={(e) => setFilters({ ...filters, [f.key]: e.target.value })}
              disabled={loading}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">{f.placeholder}</option>
              {(f.key === 'format' ? f.opts : f.opts.map((o) => ({ label: o, value: o }))).map((o) => (
                <option key={o.value ?? o} value={o.value ?? o}>
                  {o.label ?? o}
                </option>
              ))}
            </select>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600">
          {loading ? (
            <span className="text-gray-400">Chargement du catalogue…</span>
          ) : (
            <>
              <span className="font-semibold">{filtered.length}</span> résultats trouvés
            </>
          )}
        </p>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Trier par :</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            disabled={loading}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Trier les résultats"
          >
            {[
              'Meilleur tuteur (note)',
              'Module (A → Z)',
              'Module (Z → A)',
              'Mieux notés',
              'Plus récents',
              "Plus d'heures",
              'Disponible maintenant',
            ].map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {!loading &&
          filtered.map((mod) => (
            <div key={mod.id} className="card hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{mod.title}</h3>
                  <span className="badge-blue mt-1 inline-block">{mod.level}</span>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${mod.format === 'Online' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}
                >
                  {mod.format === 'Online' ? (
                    <Monitor size={12} className="inline mr-1" />
                  ) : (
                    <MapPin size={12} className="inline mr-1" />
                  )}
                  {mod.format}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-3 min-w-0">
                <Avatar
                  initials={nameInitials(tutorDisplayName(mod))}
                  size="sm"
                  color="gray"
                  src={tutorAvatarUrl(mod)}
                  altText={tutorDisplayName(mod) || 'Tuteur'}
                />
                <span className="text-sm text-gray-600 truncate">{tutorDisplayName(mod)}</span>
              </div>
              <div className="flex items-center gap-1 mb-1">
                <StarRating rating={mod.score} size={13} />
                <span className="text-sm font-semibold">{mod.score}</span>
                <span className="text-xs text-gray-400">
                  ({mod.tutorReviewCount ?? mod.tutorProfile?.reviewCount ?? 0} avis séances)
                </span>
              </div>
              <p className="text-xs text-gray-400 mb-3">
                {mod.schedule}
                {mod.dureeLabel ? ` · ${mod.dureeLabel}` : ''}
              </p>
              {Array.isArray(mod.recentComments) && mod.recentComments.length > 0 ? (
                <div className="mb-3 p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                  <p className="text-[11px] font-semibold text-gray-700 mb-1">Avis étudiants</p>
                  <p className="text-xs text-gray-600 line-clamp-2">&quot;{mod.recentComments[0].comment}&quot;</p>
                </div>
              ) : null}
              <button type="button" onClick={() => navigate(`/modules/${mod.id}`)} className="btn-primary w-full text-sm py-2">
                Demander
              </button>
            </div>
          ))}
      </div>
    </DashboardLayout>
  );
}
