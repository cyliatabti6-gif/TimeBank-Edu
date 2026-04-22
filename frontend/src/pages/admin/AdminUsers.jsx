import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Filter, MoreHorizontal } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Avatar from '../../components/common/Avatar';
import { createAdminUser, fetchAdminUsers, patchAdminUser } from '../../lib/adminApi';

export default function AdminUsers() {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const rows = await fetchAdminUsers();
      setUsers(Array.isArray(rows) ? rows : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await fetchAdminUsers();
        if (!cancelled) setUsers(Array.isArray(rows) ? rows : []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () => users.filter((u) => u.name.toLowerCase().includes(search.toLowerCase())),
    [users, search],
  );

  const stats = useMemo(() => {
    const total = users.length;
    const students = users.filter((u) => u.role === 'Étudiant').length;
    const tutors = users.filter((u) => u.role === 'Tuteur').length;
    const suspended = users.filter((u) => u.status !== 'Actif').length;
    return { total, students, tutors, suspended };
  }, [users]);

  const toggleStatus = async (u) => {
    const nextActive = u.status !== 'Actif';
    await patchAdminUser(u.id, { is_active: nextActive });
    setUsers((prev) =>
      prev.map((row) => (row.id === u.id ? { ...row, status: nextActive ? 'Actif' : 'Suspendu' } : row)),
    );
  };

  const addUser = async () => {
    const seed = Date.now().toString().slice(-6);
    await createAdminUser({
      name: `Utilisateur ${seed}`,
      email: `user${seed}@univ.dz`,
      filiere: 'Informatique',
      niveau: 'L1',
      is_student: true,
      is_tutor: false,
      password: 'ChangeMe123!',
    });
    await loadUsers();
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Gestion des Utilisateurs</h1>
          <p className="text-gray-500 text-sm">Gérez les comptes des étudiants et tuteurs.</p>
        </div>
        <button type="button" onClick={addUser} className="btn-primary text-sm py-2 px-4">
          <Plus size={15} /> Ajouter
        </button>
      </div>

      {/* Search + Filter */}
      <div className="card mb-5 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Rechercher un utilisateur..." value={search}
            onChange={e => setSearch(e.target.value)} className="input-field pl-9" />
        </div>
        <button className="btn-secondary text-sm py-2 px-4">
          <Filter size={14} /> Filtrer
        </button>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Utilisateur', 'Rôle', 'Statut', "Date d'inscription", 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && (
                <tr>
                  <td className="px-4 py-4 text-gray-500" colSpan={5}>Chargement...</td>
                </tr>
              )}
              {!loading && filtered.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar initials={u.avatar} size="sm" />
                      <span className="font-medium text-gray-800">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={u.role === 'Tuteur' ? 'badge-blue' : 'badge-green'}>{u.role}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={u.status === 'Actif' ? 'badge-green' : 'badge-red'}>{u.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.date}</td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => toggleStatus(u)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center" title="Basculer statut">
                      <MoreHorizontal size={16} className="text-gray-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 grid grid-cols-4 gap-4 text-center text-xs">
          {[{ val: String(stats.total), label: 'Utilisateurs', color: 'text-gray-800' }, { val: String(stats.students), label: 'Étudiants', color: 'text-primary-600' }, { val: String(stats.tutors), label: 'Tuteurs', color: 'text-blue-600' }, { val: String(stats.suspended), label: 'Suspendus', color: 'text-red-500' }].map(s => (
            <div key={s.label}>
              <p className={`text-lg font-bold ${s.color}`}>{s.val}</p>
              <p className="text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
