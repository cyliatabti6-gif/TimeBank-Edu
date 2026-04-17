import { useState, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Check } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useApp } from '../../context/AppContext';
import { getAccessToken } from '../../lib/authStorage';
import { postSeanceSignalement } from '../../lib/seancesApi';

const steps = ['Séance', 'Détails', 'Confirmation'];

/** Motifs lorsque l’étudiant ne peut pas venir (justification côté étudiant). */
const studentAbsenceMotifs = [
  {
    id: 'student_sick',
    label: 'Maladie ou indisposition',
    desc: 'Vous ne vous sentez pas en état d’assister à la séance.',
  },
  {
    id: 'student_emergency',
    label: 'Urgence',
    desc: 'Urgence familiale, personnelle ou santé imprévue.',
  },
  {
    id: 'student_forgot',
    label: 'Oubli de la séance',
    desc: 'Vous aviez oublié le créneau ou le rendez-vous.',
  },
  {
    id: 'student_transport',
    label: 'Transport ou accès au lieu',
    desc: 'Retard, panne, moyen de transport ou difficulté pour rejoindre le lieu.',
  },
];

/** Motifs lorsque l’étudiant signale un problème lié au tuteur. */
const studentTutorMotifs = [
  {
    id: 'no_show',
    label: 'Le tuteur ne s’est pas présenté',
    desc: 'Sans prévenir ou absence non justifiée de sa part.',
  },
  { id: 'late', label: 'Retard important du tuteur', desc: 'Plus d’environ 30 minutes de retard.' },
  {
    id: 'behavior',
    label: 'Comportement inapproprié du tuteur',
    desc: 'Comportement problématique pendant la séance.',
  },
];

const studentOtherMotif = {
  id: 'other',
  label: 'Autre',
  desc: 'Expliquez votre situation dans le champ texte ci-dessous.',
};

/** Ancien code encore possible en base — pour libellés récap / tuteur. */
const legacyStudentMotifs = [{ id: 'student_no_show', label: 'Empêchement / présentiel', desc: '' }];

/** Liste plate pour récapitulatif (recherche par id). */
const issueTypesStudent = [...studentAbsenceMotifs, ...studentTutorMotifs, studentOtherMotif, ...legacyStudentMotifs];

const issueTypesTutor = [
  {
    id: 'tutor_impediment',
    label: 'Je ne pourrai pas venir — excuse à l’étudiant',
    desc: 'Votre texte sera affiché sur le tableau de bord de l’étudiant. La séance sera annulée.',
  },
  { id: 'other', label: 'Autre message à l’étudiant', desc: 'Précisez dans le champ texte ci-dessous.' },
  {
    id: 'student_no_show',
    label: "L'étudiant ne s'est pas présenté",
    desc: "Absence ou retard prolongé sans prévenir.",
  },
  { id: 'student_late', label: 'Retard important (étudiant)', desc: "Plus de 30 minutes d'attente." },
  { id: 'student_behavior', label: 'Comportement inapproprié (étudiant)', desc: 'Comportement problématique pendant la séance.' },
];

const defaultSession = {
  tutorName: '—',
  studentName: '—',
  module: '—',
  date: '—',
  creneauLabel: '—',
};

export default function ReportAbsence() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, updateReservationStatus } = useApp();

  const sessionInfo = useMemo(() => {
    const s = location.state;
    let reporterRole = 'student';
    if (s?.reporterRole === 'tutor' || s?.reporterRole === 'student') {
      reporterRole = s.reporterRole;
    } else if (s?.reservationId != null && currentUser?.id != null) {
      /* pas de rôle explicite : déduit si besoin plus tard côté API */
      reporterRole = 'student';
    }
    if (s?.tutorName && s?.module) {
      return {
        tutorName: s.tutorName,
        studentName: s.studentName || defaultSession.studentName,
        module: s.module,
        date: s.date || '—',
        creneauLabel: s.creneauLabel || '—',
        reservationId: s.reservationId,
        flow: s.flow,
        reporterRole,
      };
    }
    return { ...defaultSession, reservationId: null, flow: null, reporterRole };
  }, [location.state, currentUser?.id]);

  const issueTypes = sessionInfo.reporterRole === 'tutor' ? issueTypesTutor : issueTypesStudent;

  const defaultIssue = useMemo(() => {
    if (sessionInfo.reporterRole === 'tutor') return 'tutor_impediment';
    if (sessionInfo.flow === 'presentiel_student_issue') return 'student_sick';
    return 'student_sick';
  }, [sessionInfo.flow, sessionInfo.reporterRole]);

  const [step, setStep] = useState(1);
  const [selectedIssue, setSelectedIssue] = useState(defaultIssue);
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const sessionLine = `${sessionInfo.date} • ${sessionInfo.creneauLabel}`;
  const backAfterSuccess = sessionInfo.reporterRole === 'tutor' ? '/tutor/demandes' : '/student/demandes';

  const handleFinalSubmit = useCallback(async () => {
    setSubmitError('');
    const rid = sessionInfo.reservationId;
    if (rid == null) {
      setSubmitError('Référence de réservation manquante. Ouvrez cette page depuis une réservation confirmée.');
      return;
    }
    if (sessionInfo.reporterRole === 'student' && selectedIssue === 'other' && !description.trim()) {
      setSubmitError('Pour le motif « Autre », veuillez décrire brièvement votre situation dans le champ texte.');
      return;
    }
    if (
      sessionInfo.reporterRole === 'tutor' &&
      (selectedIssue === 'tutor_impediment' || selectedIssue === 'other') &&
      !description.trim()
    ) {
      setSubmitError('Écrivez un message à votre étudiant (excuse ou explication).');
      return;
    }
    const token = getAccessToken();
    if (!token) {
      setSubmitError('Vous devez être connecté pour envoyer un signalement.');
      return;
    }
    setSubmitting(true);
    try {
      const data = await postSeanceSignalement(Number(rid), token, {
        issue_type: selectedIssue,
        description: description.trim(),
      });
      if (data?.reservation_cancelled || data?.reservation_status === 'cancelled') {
        updateReservationStatus(Number(rid), 'cancelled');
      }
      setSubmitted(true);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Erreur lors de l’envoi.');
    } finally {
      setSubmitting(false);
    }
  }, [sessionInfo.reservationId, selectedIssue, description, updateReservationStatus, sessionInfo.reporterRole]);

  if (submitted) {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto text-center py-16">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <Check size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Signalement enregistré</h2>
          <p className="text-gray-500 text-sm mb-6">
            Votre signalement a été enregistré sur le serveur.
            {sessionInfo.reporterRole === 'student' ? (
              <>
                {' '}
                La réservation concernée a été <strong>annulée</strong> automatiquement. Le tuteur en sera informé sur
                son tableau de bord.
              </>
            ) : sessionInfo.reporterRole === 'tutor' ? (
              <>
                {' '}
                La séance est <strong>annulée</strong>. Votre message est visible sur le <strong>tableau de bord de
                l’étudiant</strong>. Vous pouvez suivre les détails dans « Signalements » sur votre espace tuteur.
              </>
            ) : (
              ' Vous pouvez le consulter dans l’encadré « Signalements » sur votre tableau de bord.'
            )}
          </p>
          <button type="button" onClick={() => navigate(backAfterSuccess)} className="btn-primary px-8 py-2.5">
            Retour
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
        {submitError ? (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{submitError}</p>
        ) : null}

        {step === 1 && (
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Séance concernée</h3>
            <div className="p-3 bg-gray-50 rounded-xl flex items-center justify-between gap-3">
              <div>
                {sessionInfo.reporterRole === 'tutor' ? (
                  <>
                    <p className="font-semibold text-sm text-gray-800">Étudiant : {sessionInfo.studentName}</p>
                    <p className="text-xs text-gray-500">Tuteur : vous ({sessionInfo.tutorName})</p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-sm text-gray-800">Tuteur : {sessionInfo.tutorName}</p>
                    <p className="text-xs text-gray-500">Étudiant : vous</p>
                  </>
                )}
                <p className="text-xs text-gray-500 mt-1">{sessionInfo.module}</p>
                <p className="text-xs text-gray-400">{sessionLine}</p>
                {sessionInfo.reservationId ? (
                  <p className="text-[10px] text-gray-400 mt-1">Réf. réservation #{sessionInfo.reservationId}</p>
                ) : (
                  <p className="text-[10px] text-amber-700 mt-1">Ouvrez cette page depuis une réservation pour enregistrer le signalement.</p>
                )}
              </div>
              <span className="badge-blue flex-shrink-0">Confirmée</span>
            </div>
            <button type="button" onClick={() => setStep(2)} className="btn-primary w-full mt-4 py-2.5">
              Continuer
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="card space-y-4">
            <h3 className="font-semibold text-gray-900">Type de problème</h3>

            {sessionInfo.reporterRole === 'student' ? (
              <>
                <p className="text-xs text-gray-600 -mt-1">
                  Choisissez le motif principal, puis décrivez votre situation dans le champ texte (recommandé pour le tuteur).
                </p>

                <div>
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Je ne peux pas venir</p>
                  <div className="space-y-2">
                    {studentAbsenceMotifs.map((issue) => (
                      <label
                        key={issue.id}
                        className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer border-2 transition-all ${
                          selectedIssue === issue.id
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-100 hover:border-gray-300'
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
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Problème lié au tuteur</p>
                  <div className="space-y-2">
                    {studentTutorMotifs.map((issue) => (
                      <label
                        key={issue.id}
                        className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer border-2 transition-all ${
                          selectedIssue === issue.id
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-100 hover:border-gray-300'
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
                  </div>
                </div>

                <label
                  className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer border-2 transition-all ${
                    selectedIssue === studentOtherMotif.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-100 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="issue"
                    value={studentOtherMotif.id}
                    checked={selectedIssue === studentOtherMotif.id}
                    onChange={() => setSelectedIssue(studentOtherMotif.id)}
                    className="mt-1 accent-primary-600"
                  />
                  <div>
                    <p className="font-semibold text-sm text-gray-800">{studentOtherMotif.label}</p>
                    <p className="text-xs text-gray-500">{studentOtherMotif.desc}</p>
                  </div>
                </label>

                <div className="pt-1 border-t border-gray-100">
                  <label className="block text-sm font-medium text-gray-800 mb-1.5">
                    Décrivez votre situation
                    <span className="font-normal text-gray-500"> (recommandé)</span>
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Ex. : consultation médicale, urgence familiale, précision sur l’oubli ou le transport…"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={500}
                    className="input-field resize-none text-sm"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">{description.length} / 500 caractères</p>
                </div>
              </>
            ) : (
              <>
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
                <div className="pt-1 border-t border-gray-100">
                  <label className="block text-sm font-medium text-gray-800 mb-1.5">
                    Message à l’étudiant
                    <span className="font-normal text-gray-500">
                      {' '}
                      (obligatoire si vous ne pouvez pas venir ou pour « Autre »)
                    </span>
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Ex. : excuse pour empêchement de dernière minute, proposition de reporter la séance…"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={500}
                    className="input-field resize-none text-sm"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">{description.length} / 500 caractères</p>
                </div>
              </>
            )}

            <div className="flex gap-3 pt-2">
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
                {sessionInfo.reporterRole === 'tutor'
                  ? 'La séance sera annulée après envoi. Votre message sera visible par l’étudiant sur son tableau de bord.'
                  : 'Votre signalement sera examiné. Les abus peuvent entraîner des sanctions.'}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl text-sm">
              <p className="font-medium text-gray-800">Récapitulatif :</p>
              <p className="text-gray-600 mt-1">
                {sessionInfo.module} ({sessionLine})
              </p>
              <p className="text-gray-600">Type : {issueTypes.find((i) => i.id === selectedIssue)?.label}</p>
              {description ? <p className="text-gray-500 mt-1 italic">&quot;{description}&quot;</p> : null}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(2)} className="btn-secondary flex-1 py-2.5">
                Retour
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleFinalSubmit()}
                className="btn-primary flex-1 py-2.5 disabled:opacity-60"
              >
                {submitting ? 'Envoi…' : 'Envoyer le signalement'}
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
