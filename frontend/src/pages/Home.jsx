import { createElement, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Mail, Lock, Eye, EyeOff, User, Shield, CheckCircle2, GraduationCap, Star, Gift, TrendingUp, Calendar, Clock, Users } from 'lucide-react';
import PublicNavbar from '../components/layout/PublicNavbar';
import Footer from '../components/layout/Footer';
import { getApiBase } from '../lib/api';

const FILIERE_INSCRIPTION = 'Informatique';
const niveaux = ['L1', 'L2', 'L3', 'M1', 'M2', 'Doctorat'];

function formatApiErrors(data) {
  if (!data || typeof data !== 'object') return 'Une erreur est survenue.';
  if (typeof data.detail === 'string') return data.detail;
  const parts = [];
  for (const [key, val] of Object.entries(data)) {
    if (Array.isArray(val)) parts.push(`${key}: ${val.join(' ')}`);
    else if (typeof val === 'string') parts.push(`${key}: ${val}`);
  }
  return parts.length ? parts.join(' ') : 'Vérifiez les champs du formulaire.';
}

export default function Home() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nom: '',
    prenom: '',
    email: '',
    filiere: FILIERE_INSCRIPTION,
    niveau: '',
    password: '',
    confirm: '',
    bio: '',
  });
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const sectionId = (typeof window !== 'undefined' ? window.location.hash.replace('#', '') : '').trim();
    if (!sectionId) return;
    const el = document.getElementById(sectionId);
    if (!el) return;
    const t = setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!accepted) {
      setApiError("Veuillez accepter les conditions d'utilisation.");
      return;
    }
    setApiError('');
    setLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/api/inscription/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: form.nom.trim(),
          prenom: form.prenom.trim(),
          email: form.email.trim(),
          filiere: form.filiere,
          niveau: form.niveau,
          password: form.password,
          confirm: form.confirm,
          bio: form.bio || '',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setApiError(formatApiErrors(data));
        return;
      }
      const registeredEmail = data.user?.email || form.email.trim();
      navigate('/email-confirmation', { state: { email: registeredEmail } });
    } catch {
      setApiError('Le serveur est indisponible. Vérifiez que le backend Django est démarré.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNavbar />
      <section id="accueil-form" className="px-4 py-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="pt-4">
            <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-700 rounded-full px-4 py-1.5 text-sm font-semibold mb-5">
              <User size={16} />
              Rejoignez-nous
            </div>
            <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-4">
              Rejoignez la communauté de
              <span className="text-primary-600"> tutorat universitaire</span>
            </h1>
            <p className="text-gray-600 text-xl max-w-xl">
              Apprenez, enseignez et progressez ensemble grâce à un système équitable, sécurisé et bienveillant.
            </p>
            <div className="mt-10 hidden md:block">
              <img
                src="/home-illustration.png"
                alt="Illustration tutorat universitaire"
                className="w-full max-w-[540px] rounded-2xl border border-primary-100 bg-white"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="text-center mb-6">
              <h2 className="text-4xl font-bold text-gray-900">Créer un compte</h2>
              <p className="text-gray-500 mt-2">Inscrivez-vous avec votre email universitaire.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Prénom</label>
                  <div className="relative">
                    <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Votre prénom" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} className="input-field pl-9" required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom</label>
                  <div className="relative">
                    <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Votre nom" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className="input-field pl-9" required />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email universitaire</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" placeholder="prenom.nom@universite.fr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field pl-9" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Mot de passe</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type={showPwd ? 'text' : 'password'} placeholder="Minimum 8 caractères" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input-field pl-9 pr-10" required minLength={8} />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showPwd ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmer le mot de passe</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type={showConfirm ? 'text' : 'password'} placeholder="Confirmez votre mot de passe" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} className="input-field pl-9 pr-10" required minLength={8} />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Filière</label>
                  <input value={FILIERE_INSCRIPTION} readOnly className="input-field bg-gray-50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Niveau</label>
                  <select value={form.niveau} onChange={(e) => setForm({ ...form, niveau: e.target.value })} className="input-field" required>
                    <option value="">Sélectionnez votre niveau</option>
                    {niveaux.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
                J'accepte les conditions d'utilisation
              </label>
              {apiError && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{apiError}</p>}
              <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base disabled:opacity-60">
                {loading ? 'Inscription…' : <>S'inscrire <ArrowRight size={18} /></>}
              </button>
              <p className="text-center text-sm text-gray-500 mt-1">
                Vous avez déjà un compte ?{' '}
                <Link to="/login" className="text-primary-600 font-semibold hover:underline">Se connecter</Link>
              </p>
            </form>
          </div>
        </div>
      </section>

      <section id="comment-ca-marche" className="px-4 pb-10">
        <div className="max-w-7xl mx-auto bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { icon: Users, value: '500+', label: 'Étudiants' },
              { icon: TrendingUp, value: '1200+', label: 'Séances réalisées' },
              { icon: Star, value: '4.8/5', label: 'Satisfaction' },
              { icon: Gift, value: '100%', label: 'Gratuit' },
            ].map((s) => (
              <div key={s.label} className="bg-gray-50 rounded-xl border border-gray-100 px-4 py-4 flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center">
                  {createElement(s.icon, { size: 22, className: 'text-primary-600' })}
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary-700 leading-none">{s.value}</p>
                  <p className="text-sm text-gray-600 mt-1">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          <h2 className="text-4xl font-bold text-center text-gray-900 mb-6">Comment ça marche ?</h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center mb-6">
            {[
              { icon: User, title: '1. Inscrivez-vous', desc: 'Créez votre compte gratuitement en quelques minutes.' },
              { icon: Calendar, title: '2. Réservez un créneau', desc: 'Trouvez un tuteur ou devenez tuteur et choisissez un horaire.' },
              { icon: GraduationCap, title: '3. Apprenez & gagnez du temps', desc: 'Partagez vos connaissances, apprenez et progressez ensemble.' },
            ].map((item, index) => (
              <div key={item.title} className="relative bg-gray-50 rounded-xl border border-gray-100 p-5 flex items-start gap-3 min-h-[130px]">
                <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                  {createElement(item.icon, { size: 22, className: 'text-primary-600' })}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{item.title}</p>
                  <p className="text-sm text-gray-600 mt-1">{item.desc}</p>
                </div>
                {index < 2 && (
                  <span className="hidden lg:flex absolute -right-6 top-1/2 -translate-y-1/2 text-primary-600 text-2xl font-bold z-10">→</span>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Shield, title: 'Sécurisé', desc: 'Vos données sont protégées et confidentielles.' },
              { icon: Clock, title: 'Flexible', desc: 'Réservez selon vos disponibilités, à tout moment.' },
              { icon: Users, title: 'Communauté bienveillante', desc: 'Une communauté étudiante solidaire et respectueuse.' },
            ].map((item) => (
              <div key={item.title} className="bg-gray-50 rounded-xl border border-gray-100 px-4 py-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                  {createElement(item.icon, { size: 20, className: 'text-primary-600' })}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{item.title}</p>
                  <p className="text-sm text-gray-600 mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div id="a-propos-footer">
        <Footer />
      </div>
    </div>
  );
}
