import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Check } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';

const steps = ['Séance', 'Détails', 'Confirmation'];
const issueTypes = [
  { id: 'no_show', label: 'Absence non justifiée', desc: "Le tuteur ne s'est pas présenté et n'a pas prévenu." },
  { id: 'late', label: 'Retard important', desc: 'Le tuteur est arrivé avec plus de 30 minutes de retard.' },
  { id: 'behavior', label: 'Comportement inapproprié', desc: 'Le tuteur a eu un comportement inapproprié.' },
  { id: 'other', label: 'Autre problème', desc: 'Décrivez brièvement le problème.' },
];

export default function ReportAbsence() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedIssue, setSelectedIssue] = useState('no_show');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto text-center py-16">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <Check size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Signalement envoyé !</h2>
          <p className="text-gray-500 text-sm mb-6">Votre signalement a été examiné par l'administration. Vous serez notifié de la suite.</p>
          <button onClick={() => navigate(-1)} className="btn-primary px-8 py-2.5">Retour au dashboard</button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></button>
        <h1 className="text-xl font-bold text-gray-900">Signaler une Absence</h1>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-2 mb-8 max-w-md">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i + 1 <= step ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
              {i + 1 < step ? <Check size={14} /> : i + 1}
            </div>
            <span className={`text-xs ${i + 1 === step ? 'font-semibold text-gray-900' : 'text-gray-400'}`}>{s}</span>
            {i < steps.length - 1 && <div className={`flex-1 h-0.5 ${i + 1 < step ? 'bg-primary-600' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      <div className="max-w-lg space-y-4">
        {step === 1 && (
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Séance concernée</h3>
            <div className="p-3 bg-gray-50 rounded-xl flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm text-gray-800">Ahmed Moussa</p>
                <p className="text-xs text-gray-500">Algorithme - L2</p>
                <p className="text-xs text-gray-400">15/05/2024 • 10h - 12h</p>
              </div>
              <span className="badge-blue">Confirmée</span>
            </div>
            <button onClick={() => setStep(2)} className="btn-primary w-full mt-4 py-2.5">Continuer</button>
          </div>
        )}

        {step === 2 && (
          <div className="card space-y-3">
            <h3 className="font-semibold text-gray-900 mb-3">Type de problème</h3>
            {issueTypes.map(issue => (
              <label key={issue.id} className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer border-2 transition-all ${selectedIssue === issue.id ? 'border-primary-500 bg-primary-50' : 'border-gray-100 hover:border-gray-300'}`}>
                <input type="radio" name="issue" value={issue.id} checked={selectedIssue === issue.id}
                  onChange={() => setSelectedIssue(issue.id)} className="mt-1 accent-primary-600" />
                <div>
                  <p className="font-semibold text-sm text-gray-800">{issue.label}</p>
                  <p className="text-xs text-gray-500">{issue.desc}</p>
                </div>
              </label>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description (optionnel)</label>
              <textarea rows={3} placeholder="Ajoutez des détails pour aider l'administrateur..."
                value={description} onChange={e => setDescription(e.target.value)} maxLength={200}
                className="input-field resize-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="btn-secondary flex-1 py-2.5">Retour</button>
              <button onClick={() => setStep(3)} className="btn-primary flex-1 py-2.5">Continuer</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="card space-y-4">
            <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-xl">
              <AlertTriangle size={20} className="text-yellow-600 flex-shrink-0" />
              <p className="text-sm text-yellow-700">Votre signalement sera examiné par l'administration. Vous serez notifié de la suite.</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl text-sm">
              <p className="font-medium text-gray-800">Récapitulatif :</p>
              <p className="text-gray-600 mt-1">Séance avec Ahmed Moussa - Algorithme L2</p>
              <p className="text-gray-600">Type : {issueTypes.find(i => i.id === selectedIssue)?.label}</p>
              {description && <p className="text-gray-500 mt-1 italic">"{description}"</p>}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="btn-secondary flex-1 py-2.5">Retour</button>
              <button onClick={() => setSubmitted(true)} className="btn-primary flex-1 py-2.5">
                Envoyer le signalement
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
