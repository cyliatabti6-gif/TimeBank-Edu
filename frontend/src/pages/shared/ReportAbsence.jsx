import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Check } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useApp } from '../../context/AppContext';
import { getAccessToken } from '../../lib/authStorage';
import { reportSessionProblem } from '../../lib/disputesApi';

const steps = ['Séance', 'Détails', 'Confirmation'];

const studentAbsenceCauses = [
  { id: 'maladie', label: 'Maladie', desc: "Je n'ai pas pu assister à la séance pour raison de santé." },
  { id: 'urgence_familiale', label: 'Urgence familiale', desc: "Un imprévu familial m'a empêché d'être présent(e)." },
  { id: 'probleme_transport', label: 'Problème de transport', desc: 'Retard ou absence lié au déplacement.' },
  { id: 'conflit_horaire', label: "Conflit d'horaire", desc: 'Un chevauchement de planning a empêché ma présence.' },
  { id: 'autre', label: 'Autre cause', desc: 'Une autre raison a empêché ma présence.' },
];

const tutorAbsenceCauses = [
  { id: 'maladie', label: 'Maladie', desc: "Je n'ai pas pu assurer la séance pour raison de santé." },
  { id: 'urgence_familiale', label: 'Urgence familiale', desc: "Un imprévu familial m'a empêché d'assurer la séance." },
  { id: 'indisponibilite', label: 'Indisponibilité imprévue', desc: 'Un empêchement de dernière minute est survenu.' },
  { id: 'probleme_connexion', label: 'Problème technique / connexion', desc: "Je n'ai pas pu me connecter ou accéder au cours." },
  { id: 'autre', label: 'Autre cause', desc: "Une autre raison m'a empêché d'assurer la séance." },
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
  const { currentUser } = useApp();
  const isStudentReporter = Boolean(currentUser?.is_student);
  const causeOptions = isStudentReporter ? studentAbsenceCauses : tutorAbsenceCauses;
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
    causeOptions[0]?.id || 'autre',
  );
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!causeOptions.some((c) => c.id === selectedIssue)) {
      setSelectedIssue(causeOptions[0]?.id || 'autre');
    }
  }, [causeOptions, selectedIssue]);

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
            <h3 className="font-semibold text-gray-900 mb-3">Cause de l&apos;absence</h3>
            {causeOptions.map((issue) => (
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
              <p className="text-gray-600">Cause : {causeOptions.find((i) => i.id === selectedIssue)?.label}</p>
              {description ? <p className="text-gray-500 mt-1 italic">&quot;{description}&quot;</p> : null}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(2)} className="btn-secondary flex-1 py-2.5">
                Retour
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={async () => {
                  setError('');
                  const token = getAccessToken();
                  if (!token) {
                    setError('Session expirée. Veuillez vous reconnecter.');
                    return;
                  }
                  if (!sessionInfo.reservationId) {
                    setError('Aucune réservation associée à ce signalement.');
                    return;
                  }
                  setSubmitting(true);
                  try {
                    await reportSessionProblem(token, {
                      reservation_id: sessionInfo.reservationId,
                      issue_type: isStudentReporter ? 'student_absence' : 'tutor_absence',
                      cause_code: selectedIssue,
                      cause_label: causeOptions.find((i) => i.id === selectedIssue)?.label || '',
                      description,
                    });
                    setSubmitted(true);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Signalement impossible.');
                  } finally {
                    setSubmitting(false);
                  }
                }}
                className="btn-primary flex-1 py-2.5 disabled:opacity-60"
              >
                {submitting ? 'Envoi…' : 'Envoyer le signalement'}
              </button>
            </div>
            {error ? (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
