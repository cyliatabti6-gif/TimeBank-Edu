import { useNavigate } from 'react-router-dom';
import { GraduationCap, Home, Search } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
      <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <GraduationCap size={32} className="text-primary-600" />
      </div>
      <h1 className="text-8xl font-black text-gray-200 mb-2">404</h1>
      <h2 className="text-2xl font-bold text-gray-900 mb-3">Page introuvable</h2>
      <p className="text-gray-500 mb-8">Désolé, la page que vous recherchez n'existe pas ou a été déplacée.</p>
      <div className="flex gap-3">
        <button onClick={() => navigate('/')} className="btn-primary px-6 py-2.5">
          <Home size={16} /> Retour à l'accueil
        </button>
        <button onClick={() => navigate('/student/modules')} className="btn-secondary px-6 py-2.5">
          <Search size={16} /> Explorer les modules
        </button>
      </div>
      <div className="mt-10">
        <img src="/404-illustration.svg" alt="404" className="w-40 opacity-20 mx-auto" onError={e => e.target.style.display='none'} />
      </div>
    </div>
  );
}
