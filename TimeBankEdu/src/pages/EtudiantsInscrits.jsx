import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, ArrowLeft, RefreshCw, Users } from 'lucide-react';
import PublicNavbar from '../components/layout/PublicNavbar';
import Footer from '../components/layout/Footer';
import { getApiBase } from '../lib/api';

export default function EtudiantsInscrits() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/api/etudiants/`);
      const data = await res.json().catch(() => []);
      if (!res.ok) {
        setError(typeof data.detail === 'string' ? data.detail : 'Impossible de charger la liste.');
        setList([]);
        return;
      }
      setList(Array.isArray(data) ? data : []);
    } catch {
      setError('Serveur injoignable. Lancez Django (python manage.py runserver 8000) et npm run dev.');
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PublicNavbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-primary-600 font-medium mb-6 hover:underline">
          <ArrowLeft size={16} /> Retour à l&apos;accueil
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
              <Users className="text-primary-600" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Étudiants inscrits</h1>
              <p className="text-gray-500 text-sm">Comptes créés via la page d&apos;inscription (données réelles du backend).</p>
            </div>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Actualiser
          </button>
        </div>

        {error && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{error}</p>
        )}

        {loading && !list.length && !error ? (
          <p className="text-gray-500">Chargement…</p>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-left text-gray-600">
                    <th className="px-4 py-3 font-semibold">Nom</th>
                    <th className="px-4 py-3 font-semibold">E-mail</th>
                    <th className="px-4 py-3 font-semibold">Filière</th>
                    <th className="px-4 py-3 font-semibold">Niveau</th>
                    <th className="px-4 py-3 font-semibold">Balance (h)</th>
                    <th className="px-4 py-3 font-semibold">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {list.length === 0 && !loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                        Aucun étudiant pour le moment.{' '}
                        <Link to="/register" className="text-primary-600 font-medium hover:underline">S&apos;inscrire</Link>
                      </td>
                    </tr>
                  ) : (
                    list.map((u) => (
                      <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/80">
                        <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                        <td className="px-4 py-3 text-gray-600">{u.email}</td>
                        <td className="px-4 py-3 text-gray-600">{u.filiere}</td>
                        <td className="px-4 py-3 text-gray-600">{u.niveau}</td>
                        <td className="px-4 py-3 text-gray-600">{u.balance_hours}</td>
                        <td className="px-4 py-3 text-gray-600">{u.score}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p className="mt-6 text-xs text-gray-400 flex items-center gap-2">
          <GraduationCap size={14} />
          API : <code className="bg-gray-100 px-1.5 py-0.5 rounded">GET /api/etudiants/</code> (liste JSON)
        </p>
      </main>
      <Footer />
    </div>
  );
}
