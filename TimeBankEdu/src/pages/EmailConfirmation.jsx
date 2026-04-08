import { Link } from 'react-router-dom';
import { GraduationCap, Mail, CheckCircle2 } from 'lucide-react';

export default function EmailConfirmation() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2 mb-8">
          <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center">
            <GraduationCap size={20} className="text-white" />
          </div>
          <span className="font-bold text-xl text-gray-900">TimeBank <span className="text-primary-600">Edu</span></span>
        </Link>

        <div className="card">
          <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <div className="relative">
              <Mail size={36} className="text-primary-600" />
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle2 size={12} className="text-white" />
              </div>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-3">Vérifiez votre boîte mail !</h1>
          <p className="text-gray-500 mb-3">Nous avons envoyé un lien de confirmation à</p>
          <p className="font-semibold text-primary-600 text-lg mb-6">sara.benali@univ.dz</p>
          <p className="text-gray-500 text-sm mb-8">Cliquez sur le lien dans l'email pour activer votre compte.</p>

          <p className="text-sm text-gray-500">
            Vous n'avez pas reçu l'email ?{' '}
            <button className="text-primary-600 font-semibold hover:underline">Renvoyer l'email</button>
          </p>

          <Link to="/login" className="block mt-4 text-sm text-gray-500 hover:text-primary-600">
            Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}
