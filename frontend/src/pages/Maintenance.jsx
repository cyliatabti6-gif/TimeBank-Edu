import { GraduationCap, Wrench, CheckCircle2 } from 'lucide-react';

export default function Maintenance() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
      <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <GraduationCap size={32} className="text-primary-600" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">TimeBank Edu</h1>

      <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto my-6">
        <Wrench size={40} className="text-orange-500" />
      </div>

      <h2 className="text-xl font-bold text-gray-800 mb-3">Nous améliorons votre expérience</h2>
      <p className="text-gray-500 max-w-md mb-6">La plateforme est temporairement en maintenance pour vous offrir un meilleur service.</p>

      <div className="flex items-center gap-2 bg-primary-50 border border-primary-200 text-primary-700 px-4 py-2.5 rounded-full text-sm font-medium">
        <CheckCircle2 size={16} />
        Nous serons de retour bientôt ! Merci pour votre patience.
      </div>
    </div>
  );
}
