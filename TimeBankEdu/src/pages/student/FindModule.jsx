import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Star, MapPin, Monitor, ChevronDown } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StarRating from '../../components/common/StarRating';
import Avatar from '../../components/common/Avatar';
import { mockModules, mockTutors } from '../../context/AppContext';

export default function FindModule() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ niveau: '', module: '', disponibilite: '', format: '' });
  const [sortBy, setSortBy] = useState('Mieux notés');

  const filtered = mockModules.filter(m => {
    if (filters.niveau && m.level !== filters.niveau) return false;
    if (filters.module && m.title !== filters.module) return false;
    if (filters.format && m.format !== filters.format) return false;
    if (search && !m.title.toLowerCase().includes(search.toLowerCase()) && !m.tutor.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Trouver un Module</h1>
        <p className="text-gray-500 text-sm">Trouvez le tuteur parfait selon vos critères.</p>
      </div>

      {/* Search & Filters */}
      <div className="card mb-5">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Rechercher un module, un tuteur..." value={search}
              onChange={e => setSearch(e.target.value)} className="input-field pl-9" />
          </div>
          <button className="btn-secondary text-sm py-2 px-4">
            <Filter size={15} /> Filtres
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'niveau', opts: ['L1', 'L2', 'L3', 'M1', 'M2'], placeholder: 'Niveau' },
            { key: 'module', opts: ['Algorithme', 'Analyse 1', 'Base de Données', 'Python', 'Comptabilité'], placeholder: 'Module' },
            { key: 'disponibilite', opts: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'], placeholder: 'Disponibilité' },
            { key: 'format', opts: ['En ligne', 'Présentiel'], placeholder: 'Format' },
          ].map(f => (
            <select key={f.key} value={filters[f.key]}
              onChange={e => setFilters({ ...filters, [f.key]: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">{f.placeholder}</option>
              {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ))}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600"><span className="font-semibold">{filtered.length}</span> résultats trouvés</p>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Trier par :</span>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            {['Mieux notés', 'Plus récents', 'Plus d\'heures', 'Disponible maintenant'].map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
      </div>

      {/* Module Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(mod => {
          const tutor = mockTutors.find(t => t.id === mod.tutorId);
          return (
            <div key={mod.id} className="card hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{mod.title}</h3>
                  <span className="badge-blue mt-1 inline-block">{mod.level}</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${mod.format === 'Online' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                  {mod.format === 'Online' ? <Monitor size={12} className="inline mr-1" /> : <MapPin size={12} className="inline mr-1" />}
                  {mod.format}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <Avatar initials={tutor?.avatar || 'TU'} size="sm" />
                <span className="text-sm text-gray-600">{mod.tutor}</span>
              </div>
              <div className="flex items-center gap-1 mb-1">
                <StarRating rating={mod.score} size={13} />
                <span className="text-sm font-semibold">{mod.score}</span>
                <span className="text-xs text-gray-400">({mod.reviews} avis)</span>
              </div>
              <p className="text-xs text-gray-400 mb-3">{mod.schedule}</p>
              <button onClick={() => navigate(`/modules/${mod.id}`)} className="btn-primary w-full text-sm py-2">
                Demander
              </button>
            </div>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
