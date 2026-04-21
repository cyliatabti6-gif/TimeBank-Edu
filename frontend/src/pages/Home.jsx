import { createElement } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Clock, Star, Users, BookOpen, ChevronRight, CheckCircle2, GraduationCap, MessageCircle, Calendar } from 'lucide-react';
import PublicNavbar from '../components/layout/PublicNavbar';
import Footer from '../components/layout/Footer';
import StarRating from '../components/common/StarRating';
import Avatar from '../components/common/Avatar';
import { mockModules, mockTutors } from '../context/AppContext';

const moduleIcons = { 'Algorithme': '⌨️', 'Analyse 1': '📐', 'Base de Données': '🗄️', 'Comptabilité': '💼', 'Python': '🐍', 'Structures de Données': '🔗' };
const moduleBg = ['from-blue-50 to-blue-100', 'from-purple-50 to-purple-100', 'from-cyan-50 to-cyan-100', 'from-green-50 to-green-100', 'from-yellow-50 to-yellow-100', 'from-red-50 to-red-100'];

export default function Home() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />

      {/* Hero */}
      <section className="bg-gradient-to-br from-white via-primary-50 to-white py-16 px-4">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-4">
              Échange de<br />
              <span className="text-primary-600">Tutorat Universitaire</span>
            </h1>
            <p className="text-gray-500 text-lg mb-6">Apprenez, enseignez, progressez ensemble grâce à un système équitable et sécurisé.</p>
            <div className="inline-flex items-center gap-2 bg-primary-50 border border-primary-200 text-primary-700 px-4 py-2 rounded-full text-sm font-semibold mb-8">
              <Clock size={16} />
              1h enseignée = 1h gagnée
            </div>
            <div className="flex flex-wrap gap-4">
              <button onClick={() => navigate('/register')} className="btn-primary text-base px-8 py-3">
                S'inscrire <ArrowRight size={18} />
              </button>
              <button onClick={() => navigate('/login')} className="btn-secondary text-base px-8 py-3">Se connecter</button>
            </div>
          </div>
          <div className="relative hidden md:flex justify-center">
            <div className="w-80 h-72 bg-gradient-to-br from-primary-100 to-primary-200 rounded-3xl flex items-center justify-center relative overflow-hidden">
              <div className="absolute top-4 right-4 w-16 h-16 bg-white rounded-2xl shadow-md flex items-center justify-center">
                <GraduationCap size={30} className="text-primary-600" />
              </div>
              <div className="absolute bottom-4 left-4 w-16 h-16 bg-white rounded-2xl shadow-md flex items-center justify-center">
                <Clock size={30} className="text-primary-600" />
              </div>
              <div className="absolute top-16 left-6 w-12 h-12 bg-white rounded-2xl shadow-md flex items-center justify-center">
                <MessageCircle size={22} className="text-primary-600" />
              </div>
              <div className="text-center">
                <div className="text-5xl font-bold text-primary-700">1h</div>
                <div className="text-primary-600 font-medium">=</div>
                <div className="text-5xl font-bold text-primary-700">1h</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Modules */}
      <section className="py-14 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Modules Populaires</h2>
            <Link to="/modules" className="text-primary-600 text-sm font-medium flex items-center gap-1 hover:underline">
              Voir tous les modules <ChevronRight size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {mockModules.slice(0, 3).map((mod, i) => (
              <div key={mod.id} className={`card hover:shadow-md transition-shadow cursor-pointer`} onClick={() => navigate(`/modules/${mod.id}`)}>
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-12 h-12 bg-gradient-to-br ${moduleBg[i]} rounded-xl flex items-center justify-center text-xl flex-shrink-0`}>
                    {moduleIcons[mod.title] || '📚'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">{mod.title}</h3>
                      <span className="badge-blue">{mod.level}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Par {mod.tutor}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <StarRating rating={mod.score} size={13} />
                  <span className="text-sm font-semibold text-gray-800">{mod.score}</span>
                  <span className="text-xs text-gray-400">({mod.reviews} avis)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Banner */}
      <section className="py-10 bg-primary-600">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-3 gap-8 text-center">
          {[{ val: '500+', label: 'Étudiants' }, { val: '1200+', label: 'Tutorats réalisés' }, { val: '4.8/5', label: 'Note moyenne' }].map((s) => (
            <div key={s.label}>
              <div className="text-3xl font-bold text-white">{s.val}</div>
              <div className="text-primary-100 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Top Tutors */}
      <section className="py-14 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Tuteurs les mieux notés</h2>
            <Link to="/tuteurs" className="text-primary-600 text-sm font-medium flex items-center gap-1 hover:underline">
              Voir tous les tuteurs <ChevronRight size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {mockTutors.map((t) => (
              <div key={t.id} className="card hover:shadow-md transition-all cursor-pointer" onClick={() => navigate(`/tuteurs/${t.id}`)}>
                <div className="flex items-center gap-3 mb-3">
                  <Avatar initials={t.avatar} size="md" />
                  <div>
                    <div className="font-semibold text-sm text-gray-900">{t.name}</div>
                    <div className="text-xs text-gray-500">{t.level} • {t.filiere}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 mb-3">
                  <StarRating rating={t.score} size={12} />
                  <span className="text-sm font-semibold">{t.score}</span>
                  <span className="text-xs text-gray-400">({t.reviews} avis)</span>
                </div>
                <span className="badge-green">Disponible</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-14 px-4 bg-white">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-10">Comment ça marche ?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {[
              { icon: Users, step: '1', title: 'Inscription', desc: 'Créez votre compte avec votre email universitaire' },
              { icon: BookOpen, step: '2', title: 'Trouvez un module', desc: 'Recherchez un tuteur selon vos besoins' },
              { icon: Calendar, step: '3', title: 'Réservez un créneau', desc: 'Choisissez un horaire et envoyez une demande' },
              { icon: CheckCircle2, step: '4', title: 'Apprenez et gagnez', desc: 'Validez la séance et gagnez des heures' },
            ].map((item) => (
              <div key={item.step} className="flex flex-col items-center text-center">
                <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center mb-4">
                  {createElement(item.icon, { size: 26, className: 'text-primary-600' })}
                </div>
                <div className="font-semibold text-gray-900 mb-2">{item.step}. {item.title}</div>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 px-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white text-center">
        <h2 className="text-3xl font-bold mb-4">Prêt à commencer ?</h2>
        <p className="text-primary-100 mb-8 text-lg">Rejoignez plus de 500 étudiants qui échangent leurs connaissances.</p>
        <button onClick={() => navigate('/register')} className="bg-white text-primary-700 font-semibold px-8 py-3 rounded-lg hover:bg-primary-50 transition-colors flex items-center gap-2 mx-auto">
          Créer un compte gratuit <ArrowRight size={18} />
        </button>
      </section>

      <Footer />
    </div>
  );
}
