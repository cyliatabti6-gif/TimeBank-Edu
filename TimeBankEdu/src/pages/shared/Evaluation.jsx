import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Shield } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Avatar from '../../components/common/Avatar';
import StarRating from '../../components/common/StarRating';
import { mapApiUserToAppUser, useApp } from '../../context/AppContext';
import { getAccessToken } from '../../lib/authStorage';
import { getApiBase } from '../../lib/api';
import { humanizeEvaluationError, submitSessionEvaluation } from '../../lib/evaluationsApi';

function initialsFromName(name) {
  const p = (name || '').trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2) return `${p[0][0]}${p[p.length - 1][0]}`.toUpperCase();
  return (p[0] || 'T').slice(0, 2).toUpperCase();
}

export default function Evaluation() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { state } = useLocation();
  const { setCurrentUser } = useApp();
  const [rating, setRating] = useState(4);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [gate, setGate] = useState({
    loading: true,
    canSubmit: false,
    banner: '',
    alreadyEvaluated: false,
  });

  const ctx = useMemo(() => {
    const tutorName = state?.tutorName || 'Tuteur';
    const filiere = state?.filiere || '—';
    const score = state?.score != null ? Number(state.score) : 4.8;
    const moduleLabel = state?.module || 'Module';
    const duration = state?.duration != null ? state.duration : 2;
    const date = state?.date || '—';
    const time = state?.time || '';
    const reservationId = state?.reservationId ?? id;
    return {
      tutorName,
      filiere,
      score,
      moduleLabel,
      duration,
      date,
      time,
      reservationId,
      initials: initialsFromName(tutorName),
    };
  }, [state, id]);

  useEffect(() => {
    const ridNum = Number(state?.reservationId ?? id);
    let cancelled = false;
    if (!Number.isFinite(ridNum) || ridNum <= 0) {
      setGate({
        loading: false,
        canSubmit: false,
        banner: 'Identifiant de séance invalide. Ouvrez cette page depuis « Mes tutorats » ou la fin de séance.',
        alreadyEvaluated: false,
      });
      return undefined;
    }
    const token = getAccessToken();
    if (!token) {
      setGate({
        loading: false,
        canSubmit: false,
        banner: 'Vous devez être connecté pour enregistrer une évaluation.',
        alreadyEvaluated: false,
      });
      return undefined;
    }
    setGate((g) => ({ ...g, loading: true, banner: '' }));
    const base = getApiBase();
    fetch(`${base}/api/seances/${ridNum}/`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (cancelled) return;
        if (r.status === 403) {
          setGate({
            loading: false,
            canSubmit: false,
            banner: 'Vous n’avez pas accès à cette réservation.',
            alreadyEvaluated: false,
          });
          return;
        }
        if (r.status === 404) {
          setGate({
            loading: false,
            canSubmit: true,
            banner:
              'Cette réservation est introuvable sur le serveur (souvent : séance seulement dans le navigateur). Vous pouvez quand même tenter « Valider » : ' +
              'cela réussira uniquement si la même réservation existe dans Django. Sinon, démarrez Django, complétez une séance côté API, puis revenez depuis « Mes tutorats » (Actualiser).',
            alreadyEvaluated: false,
          });
          return;
        }
        if (!r.ok) {
          setGate({
            loading: false,
            canSubmit: true,
            banner: 'Vérification serveur impossible. Vous pouvez tout de même tenter d’envoyer l’évaluation.',
            alreadyEvaluated: false,
          });
          return;
        }
        if (body.status !== 'completed') {
          setGate({
            loading: false,
            canSubmit: false,
            banner: `Seules les séances terminées peuvent être notées. Statut actuel : ${body.status || '—'}.`,
            alreadyEvaluated: false,
          });
          return;
        }
        if (body.evaluated) {
          setGate({
            loading: false,
            canSubmit: false,
            banner: 'Cette séance a déjà été évaluée.',
            alreadyEvaluated: true,
          });
          return;
        }
        setGate({ loading: false, canSubmit: true, banner: '', alreadyEvaluated: false });
      })
      .catch(() => {
        if (cancelled) return;
        setGate({
          loading: false,
          canSubmit: true,
          banner: 'Impossible de joindre le serveur pour vérifier la séance. Vous pouvez réessayer ou tenter d’envoyer l’évaluation.',
          alreadyEvaluated: false,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [state?.reservationId, id]);

  const handleSubmit = async () => {
    setSubmitError('');
    const rid = ctx.reservationId != null ? Number(ctx.reservationId) : NaN;
    if (!Number.isFinite(rid) || rid <= 0) {
      setSubmitError('Identifiant de séance manquant. Revenez depuis « Mes tutorats ».');
      return;
    }
    const token = getAccessToken();
    if (!token) {
      setSubmitError('Session expirée. Reconnectez-vous.');
      return;
    }
    setSubmitting(true);
    try {
      await submitSessionEvaluation(token, {
        reservation: rid,
        note: rating,
        commentaire: comment,
      });
      const base = getApiBase();
      const me = await fetch(`${base}/api/auth/me/`, { headers: { Authorization: `Bearer ${token}` } });
      if (me.ok) {
        const u = await me.json();
        setCurrentUser(mapApiUserToAppUser(u));
      }
      navigate('/student/tutorats');
    } catch (e) {
      setSubmitError(humanizeEvaluationError(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Évaluer ce tutorat</h1>
          <p className="text-gray-500 text-sm">
            Votre avis aide la communauté à grandir et permet aux tuteurs de s&apos;améliorer.
          </p>
          {ctx.reservationId ? (
            <p className="text-[11px] text-gray-400 mt-1">
              Séance (réservation) n°{ctx.reservationId}
              {ctx.time ? ` • ${ctx.time}` : ''}
            </p>
          ) : null}
          {gate.loading ? <p className="text-[11px] text-primary-600 mt-2">Vérification de la séance sur le serveur…</p> : null}
          {!gate.loading && gate.banner ? (
            <p
              className={`text-xs mt-2 rounded-lg px-3 py-2 ${
                gate.alreadyEvaluated
                  ? 'bg-green-50 text-green-800 border border-green-100'
                  : gate.canSubmit
                    ? 'bg-amber-50 text-amber-900 border border-amber-100'
                    : 'bg-red-50 text-red-800 border border-red-100'
              }`}
            >
              {gate.banner}
            </p>
          ) : null}
        </div>

        <div className="card mb-4">
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl mb-5">
            <Avatar initials={ctx.initials} size="lg" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900 truncate">{ctx.tutorName}</h3>
              </div>
              <p className="text-xs text-gray-500">Tuteur — {ctx.filiere}</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-5 h-5 bg-blue-100 rounded text-[10px] flex items-center justify-center text-blue-600">
                  📚
                </div>
                <span className="text-xs text-gray-500 truncate">{ctx.moduleLabel}</span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="flex items-center gap-1 justify-end">
                <span className="text-lg font-bold text-gray-900">{ctx.score.toFixed(1)}</span>
                <span className="text-yellow-400 text-lg">★</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {ctx.duration} h • {ctx.date}
                {ctx.time ? ` • ${ctx.time}` : ''}
              </p>
              <div className="flex justify-end mt-1">
                <StarRating rating={ctx.score} size={10} />
              </div>
            </div>
          </div>

          <div className="text-center mb-5">
            <h4 className="font-semibold text-gray-800 mb-3">Votre note</h4>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRating(i)}
                  className={`text-4xl transition-transform hover:scale-110 ${i <= rating ? 'text-yellow-400' : 'text-gray-200'}`}
                >
                  ★
                </button>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {rating === 1
                ? 'Très mauvais'
                : rating === 2
                  ? 'Mauvais'
                  : rating === 3
                    ? 'Correct'
                    : rating === 4
                      ? 'Bien'
                      : 'Excellent !'}
            </p>
          </div>

          <div className="mb-5">
            <label htmlFor="eval-comment" className="block text-sm font-medium text-gray-700 mb-2">
              Commentaire (optionnel)
            </label>
            <textarea
              id="eval-comment"
              rows={4}
              placeholder={`Partagez votre expérience avec ${ctx.tutorName}…`}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
              className="input-field resize-none"
            />
            <p className="text-xs text-gray-400 text-right mt-1">{comment.length}/500</p>
          </div>

          {submitError ? (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">{submitError}</p>
          ) : null}

          <div className="flex items-center gap-2 p-3 bg-primary-50 rounded-xl mb-5">
            <Shield size={16} className="text-primary-600 flex-shrink-0" />
            <p className="text-xs text-primary-700">
              Votre note met à jour la moyenne du tuteur et est visible sur son profil et la fiche module (avis anonymisés
              pour les autres étudiants).
            </p>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || gate.loading || !gate.canSubmit}
            className="btn-primary w-full py-3 disabled:opacity-60"
          >
            {submitting ? 'Enregistrement…' : "Valider l'évaluation"}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
