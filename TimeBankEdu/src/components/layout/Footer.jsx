import { GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 pt-12 pb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <GraduationCap size={18} className="text-white" />
              </div>
              <span className="font-bold text-white">TimeBank <span className="text-primary-400">Edu</span></span>
            </div>
            <p className="text-sm text-gray-400">La plateforme de tutorat universitaire basée sur une banque de temps.</p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-3 text-sm">Liens rapides</h4>
            {['Modules', 'Tuteurs', 'À propos', 'Contact'].map((item) => (
              <Link key={item} to="#" className="block text-sm text-gray-400 hover:text-primary-400 mb-1.5">{item}</Link>
            ))}
          </div>
          <div>
            <h4 className="font-semibold text-white mb-3 text-sm">Ressources</h4>
            {['Comment ça marche ?', 'Règles', 'FAQ'].map((item) => (
              <Link key={item} to="#" className="block text-sm text-gray-400 hover:text-primary-400 mb-1.5">{item}</Link>
            ))}
          </div>
          <div>
            <h4 className="font-semibold text-white mb-3 text-sm">Légal</h4>
            {["Conditions d'utilisation", 'Politique de confidentialité'].map((item) => (
              <Link key={item} to="#" className="block text-sm text-gray-400 hover:text-primary-400 mb-1.5">{item}</Link>
            ))}
          </div>
        </div>
        <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-500">© 2025 TimeBank Edu. Tous droits réservés.</p>
          <div className="flex items-center gap-3">
            {['f', 't', 'in', 'yt'].map((s, i) => (
              <a key={i} href="#" className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center hover:bg-primary-600 transition-colors text-gray-400 text-xs font-bold hover:text-white">
                {s}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
