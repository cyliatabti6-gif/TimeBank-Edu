import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, Clock } from 'lucide-react';

export default function PublicNavbar() {
  const navigate = useNavigate();
  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <GraduationCap size={18} className="text-white" />
            </div>
            <span className="font-bold text-gray-900">TimeBank <span className="text-primary-600">Edu</span></span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            {['Accueil', 'Modules', 'Tuteurs', 'À propos', 'Comment ça marche ?'].map((item, i) => (
              <Link key={i} to={i === 0 ? '/' : i === 1 ? '/modules' : i === 2 ? '/tuteurs' : '#'} className="text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors">
                {item}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/login')} className="btn-secondary text-sm py-2 px-4">Se connecter</button>
            <button onClick={() => navigate('/register')} className="btn-primary text-sm py-2 px-4">S'inscrire</button>
          </div>
        </div>
      </div>
    </nav>
  );
}
