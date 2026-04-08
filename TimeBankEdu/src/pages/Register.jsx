import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, User, GraduationCap, ArrowRight, Shield, Star, CheckCircle2, TrendingUp } from 'lucide-react';

const filieres = ['Informatique', 'Mathématiques', 'Physique', 'Chimie', 'Biologie', 'Médecine', 'Droit', 'Économie', 'Gestion', 'Lettres', 'Langues'];
const niveaux = ['L1', 'L2', 'L3', 'M1', 'M2', 'Doctorat'];

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ nom: '', prenom: '', email: '', filiere: '', niveau: '', password: '', confirm: '', bio: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [charCount, setCharCount] = useState(0);

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate('/email-confirmation');
  };

  const benefits = [
    { icon: CheckCircle2, title: '1h enseignée = 1h gagnée', desc: 'Chaque heure de tutorat que vous donnez vous permet de gagner des heures.' },
    { icon: Star, title: 'Apprenez avec les meilleurs', desc: 'Trouvez des tuteurs qualifiés et bien notés par la communauté.' },
    { icon: Shield, title: 'Échangez en toute sécurité', desc: 'Notre système garantit des échanges équitables et sécurisés.' },
    { icon: TrendingUp, title: 'Progressez ensemble', desc: "Rejoignez une communauté d'étudiants motivés et solidaires." },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Form Panel */}
      <div className="flex-1 flex flex-col justify-start items-center px-6 py-10 overflow-y-auto">
        <Link to="/" className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center">
            <GraduationCap size={20} className="text-white" />
          </div>
          <span className="font-bold text-xl text-gray-900">TimeBank <span className="text-primary-600">Edu</span></span>
        </Link>

        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="text-center mb-7">
            <span className="text-xs font-semibold text-primary-600 bg-primary-50 px-3 py-1 rounded-full">Inscription</span>
            <h1 className="text-2xl font-bold text-gray-900 mt-3">Créer un <span className="text-primary-600">Compte Étudiant</span></h1>
            <p className="text-gray-500 text-sm mt-1">Rejoignez la communauté TimeBank Edu et commencez à échanger des heures de tutorat.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom</label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" placeholder="Entrez votre nom" value={form.nom}
                    onChange={e => setForm({ ...form, nom: e.target.value })}
                    className="input-field pl-9" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Prénom</label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" placeholder="Entrez votre prénom" value={form.prenom}
                    onChange={e => setForm({ ...form, prenom: e.target.value })}
                    className="input-field pl-9" required />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Universitaire</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="email" placeholder="exemple@univ.dz" value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="input-field pl-9" required />
              </div>
              <p className="text-xs text-gray-400 mt-1">Utilisez votre email universitaire (.dz)</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Filière</label>
                <select value={form.filiere} onChange={e => setForm({ ...form, filiere: e.target.value })}
                  className="input-field" required>
                  <option value="">Sélectionnez votre filière</option>
                  {filieres.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Niveau</label>
                <select value={form.niveau} onChange={e => setForm({ ...form, niveau: e.target.value })}
                  className="input-field" required>
                  <option value="">Sélectionnez votre niveau</option>
                  {niveaux.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Mot de passe</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type={showPwd ? 'text' : 'password'} placeholder="Créez un mot de passe" value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="input-field pl-9 pr-10" required />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Au moins 8 caractères avec lettres et chiffres</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmer le mot de passe</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type={showConfirm ? 'text' : 'password'} placeholder="Confirmez votre mot de passe" value={form.confirm}
                  onChange={e => setForm({ ...form, confirm: e.target.value })}
                  className="input-field pl-9 pr-10" required />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description (optionnel)</label>
              <textarea placeholder="Parlez un peu de vous, vos centres d'intérêt, ce que vous aimeriez apprendre ou enseigner..." rows={3}
                value={form.bio} onChange={e => { setForm({ ...form, bio: e.target.value }); setCharCount(e.target.value.length); }}
                maxLength={200}
                className="input-field resize-none" />
              <p className="text-xs text-gray-400 text-right mt-1">{charCount}/200</p>
            </div>

            <div className="bg-primary-50 border border-primary-100 rounded-xl p-3 flex items-start gap-3">
              <Shield size={18} className="text-primary-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-primary-700">Vos informations sont sécurisées</p>
                <p className="text-xs text-primary-500">Nous protégeons vos données et ne les partageons jamais avec des tiers.</p>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full py-3 text-base">
              S'inscrire <ArrowRight size={18} />
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Déjà inscrit ?{' '}
            <Link to="/login" className="text-primary-600 font-semibold hover:underline">Se connecter</Link>
          </p>
        </div>
      </div>

      {/* Right benefits panel */}
      <div className="hidden lg:flex flex-col flex-1 bg-gradient-to-br from-primary-600 to-primary-800 justify-center items-center p-12">
        <div className="w-32 h-32 bg-white/10 rounded-3xl flex items-center justify-center mb-8">
          <GraduationCap size={60} className="text-white" />
        </div>
        <div className="space-y-5 max-w-sm">
          {benefits.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-4">
              <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">{title}</h3>
                <p className="text-primary-100 text-xs mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
