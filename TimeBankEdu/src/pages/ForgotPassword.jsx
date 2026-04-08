import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, GraduationCap, ArrowRight, Shield } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('sara.benali@univ.dz');
  const [sent, setSent] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center">
              <GraduationCap size={20} className="text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900">TimeBank <span className="text-primary-600">Edu</span></span>
          </Link>
        </div>

        <div className="card text-center">
          {!sent ? (
            <>
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Shield size={32} className="text-primary-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Récupérer votre compte</h1>
              <p className="text-gray-500 text-sm mb-6">Pas de souci ! Entrez votre email universitaire et nous vous enverrons un lien pour réinitialiser votre mot de passe.</p>

              <div className="text-left mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Universitaire</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="sara.benali@univ.dz" className="input-field pl-9" />
                </div>
              </div>

              <button onClick={() => setSent(true)} className="btn-primary w-full py-3">
                Envoyer le lien de réinitialisation
              </button>
              <Link to="/login" className="block text-sm text-primary-600 mt-4 hover:underline">Retour à la connexion</Link>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-yellow-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Mail size={32} className="text-yellow-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Vérifiez votre boîte mail !</h1>
              <p className="text-gray-500 text-sm mb-2">Nous avons envoyé un lien de confirmation à</p>
              <p className="font-semibold text-primary-600 mb-4">{email}</p>
              <p className="text-gray-500 text-sm mb-6">Cliquez sur le lien dans l'email pour réinitialiser votre mot de passe.</p>
              <p className="text-sm text-gray-500">
                Vous n'avez pas reçu l'email ?{' '}
                <button className="text-primary-600 font-semibold hover:underline">Renvoyer l'email</button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
