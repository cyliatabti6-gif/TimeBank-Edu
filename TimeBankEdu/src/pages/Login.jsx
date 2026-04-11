import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, GraduationCap, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getApiBase } from '../lib/api';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useApp();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/api/connexion/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof data.detail === 'string'
            ? data.detail
            : typeof data.non_field_errors?.[0] === 'string'
              ? data.non_field_errors[0]
              : 'E-mail ou mot de passe incorrect.';
        setError(msg);
        return;
      }
      login(data);
      const u = data.user;
      const effectiveRole = u?.is_staff ? 'admin' : u?.role;
      if (effectiveRole === 'admin') navigate('/admin/dashboard');
      else if (effectiveRole === 'both') navigate('/student/dashboard');
      else if (effectiveRole === 'tutor') navigate('/tutor/dashboard');
      else navigate('/student/dashboard');
    } catch {
      setError('Impossible de joindre le serveur. Vérifiez que Django tourne (port 8000).');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className="flex-1 flex flex-col justify-center items-center px-8 py-12 max-w-md mx-auto w-full">
        <Link to="/" className="flex items-center gap-2 mb-10">
          <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center">
            <GraduationCap size={20} className="text-white" />
          </div>
          <span className="font-bold text-xl text-gray-900">TimeBank <span className="text-primary-600">Edu</span></span>
        </Link>

        <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="text-center mb-8">
            <span className="text-xs font-semibold text-primary-600 bg-primary-50 px-3 py-1 rounded-full">Connexion</span>
            <h1 className="text-2xl font-bold text-gray-900 mt-3">Bon retour !</h1>
            <p className="text-gray-500 text-sm mt-1">Connectez-vous avec l&apos;e-mail et le mot de passe de votre compte.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail universitaire</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  placeholder="exemple@univ.dz"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input-field pl-9"
                  required
                  autoComplete="email"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Mot de passe</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Votre mot de passe"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input-field pl-9 pr-10"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs text-primary-600 hover:underline">
                Mot de passe oublié ?
              </Link>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2" role="alert">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base disabled:opacity-60">
              {loading ? 'Connexion…' : <>Se connecter <ArrowRight size={18} /></>}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Pas encore de compte ?{' '}
            <Link to="/register" className="text-primary-600 font-semibold hover:underline">
              S&apos;inscrire
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary-600 to-primary-800 items-center justify-center p-12">
        <div className="text-white text-center max-w-sm">
          <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <GraduationCap size={40} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold mb-4">Échangez vos connaissances</h2>
          <p className="text-primary-100 text-lg">1h enseignée = 1h gagnée. Un système équitable pour tous les étudiants.</p>
          <div className="mt-8 grid grid-cols-2 gap-4">
            {[
              { val: '500+', label: 'Étudiants' },
              { val: '1200+', label: 'Tutorats' },
              { val: '4.8/5', label: 'Note moy.' },
              { val: '45+', label: 'Modules' },
            ].map((s) => (
              <div key={s.label} className="bg-white/10 rounded-xl p-4">
                <div className="text-2xl font-bold">{s.val}</div>
                <div className="text-primary-200 text-sm">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
