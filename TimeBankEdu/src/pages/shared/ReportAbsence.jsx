import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Check } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';

const steps = ['Séance', 'Détails', 'Confirmation'];

const issueTypes = [
  { id: 'no_show', label: 'Absence non justifiée (tuteur)', desc: "Le tuteur ne s'est pas présenté et n'a pas prévenu." },
  { id: 'late', label: 'Retard important', desc: 'Le tuteur est arrivé avec plus de 30 minutes de retard.' },
  { id: 'behavior', label: 'Comportement inapproprié', desc: 'Le tuteur a eu un comportement inapproprié.' },
  {
    id: 'student_no_show',
    label: "Je n'ai pas pu me rendre (présentiel)",
    desc: "Empêchement, problème d'accès au lieu, ou autre empêchement de votre côté.",
  },
  { id: 'other', label: 'Autre problème', desc: 'Décrivez brièvement le problème.' },
];

const defaultSession = {
  tutorName: 'Ahmed Moussa',
  module: 'Algorithme - L2',
  date: '15/05/2024',
  creneauLabel: '10h - 12h',
};

export default function ReportAbsence() {
  const navigate = useNavigate();
  const location = useLocation();
  const sessionInfo = useMemo(() => {
    const s = location.state;
    if (s?.tutorName && s?.module) {
      return {
        tutorName: s.tutorName,
        module: s.module,
        date: s.date || '—',
        creneauLabel: s.creneauLabel || '—',
        reservationId: s.reservationId,
        flow: s.flow,
      };
    }
    return { ...defaultSession, reservationId: null, flow: null };
  }, [location.state]);

  const [step, setStep] = useState(1);
  const [selectedIssue, setSelectedIssue] = useState(
    sessionInfo.flow === 'presentiel_student_issue' ? 'student_no_show' : 'no_show',
  );
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const sessionLine = `${sessionInfo.date} • ${sessionInfo.creneauLabel}`;

  if (submitted) {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto text-center py-16">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <Check size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Signalement envoyé !</h2>
          <p className="text-gray-500 text-sm mb-6">
            Votre signalement a été transmis. L&apos;administration reviendra vers vous si nécessaire.
          </p>
          <button type="button" onClick={() => navigate('/student/demandes')} className="btn-primary px-8 py-2.5">
            Retour aux réservations
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex items-center gap-3 mb-6">
        <button type="button" onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Signaler un problème</h1>
      </div>

      <div className="flex items-center gap-2 mb-8 max-w-md">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                i + 1 <= step ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-400'
              }`}
            >
              {i + 1 < step ? <Check size={14} /> : i + 1}
            </div>
            <span className={`text-xs ${i + 1 === step ? 'font-semibold text-gray-900' : 'text-gray-400'}`}>{s}</span>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 ${i + 1 < step ? 'bg-primary-600' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      <div className="max-w-lg space-y-4">
        {step === 1 && (
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Séance concernée</h3>
            <div className="p-3 bg-gray-50 rounded-xl flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-sm text-gray-800">{sessionInfo.tutorName}</p>
                <p className="text-xs text-gray-500">{sessionInfo.module}</p>
                <p className="text-xs text-gray-400">{sessionLine}</p>
                {sessionInfo.reservationId ? (
                  <p className="text-[10px] text-gray-400 mt-1">Réf. réservation #{sessionInfo.reservationId}</p>
                ) : null}
              </div>
              <span className="badge-blue flex-shrink-0">Confirmée</span>
            </div>
            <button type="button" onClick={() => setStep(2)} className="btn-primary w-full mt-4 py-2.5">
              Continuer
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="card space-y-3">
            <h3 className="font-semibold text-gray-900 mb-3">Type de problème</h3>
            {issueTypes.map((issue) => (
              <label
                key={issue.id}
                className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer border-2 transition-all ${
                  selectedIssue === issue.id ? 'border-primary-500 bg-primary-50' : 'border-gray-100 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="issue"
                  value={issue.id}
                  checked={selectedIssue === issue.id}
                  onChange={() => setSelectedIssue(issue.id)}
                  className="mt-1 accent-primary-600"
                />
                <div>
                  <p className="font-semibold text-sm text-gray-800">{issue.label}</p>
                  <p className="text-xs text-gray-500">{issue.desc}</p>
                </div>
              </label>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description (optionnel)</label>
              <textarea
                rows={3}
                placeholder="Précisez les circonstances pour faciliter le traitement."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={200}
                className="input-field resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1 py-2.5">
                Retour
              </button>
              <button type="button" onClick={() => setStep(3)} className="btn-primary flex-1 py-2.5">
                Continuer
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="card space-y-4">
            <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-xl">
              <AlertTriangle size={20} className="text-yellow-600 flex-shrink-0" />
              <p className="text-sm text-yellow-700">
                Votre signalement sera examiné. Les abus peuvent entraîner des sanctions.
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl text-sm">
              <p className="font-medium text-gray-800">Récapitulatif :</p>
              <p className="text-gray-600 mt-1">
                {sessionInfo.tutorName} — {sessionInfo.module} ({sessionLine})
              </p>
              <p className="text-gray-600">Type : {issueTypes.find((i) => i.id === selectedIssue)?.label}</p>
              {description ? <p className="text-gray-500 mt-1 italic">&quot;{description}&quot;</p> : null}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(2)} className="btn-secondary flex-1 py-2.5">
                Retour
              </button>
              <button type="button" onClick={() => setSubmitted(true)} className="btn-primary flex-1 py-2.5">
                Envoyer le signalement
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
