/** Message affiché lorsqu’aucune donnée d’activité n’est détectée. */
export const PLATFORM_ACTIVITY_EMPTY_MESSAGE =
  'Aucune activité disponible pour le moment sur la plateforme.';

/**
 * Indique si l’utilisateur a au moins une réservation, une séance suivie (statut actif),
 * un historique de séance complétée, ou une évaluation (reçue ou donnée).
 */
export function hasPlatformActivity(user, reservations, sessionHistory) {
  const uid = user?.id;
  if (uid == null) return false;
  const n = Number(uid);
  const activeStatuses = new Set(['pending', 'confirmed', 'completed']);

  const hasReservation = (reservations || []).some(
    (r) => Number(r.studentId) === n || Number(r.tutorId) === n,
  );
  const hasActiveSeance = (reservations || []).some((r) => {
    if (Number(r.studentId) !== n && Number(r.tutorId) !== n) return false;
    return activeStatuses.has(r.status);
  });
  const hasHistory = (sessionHistory || []).some(
    (h) => Number(h.studentId) === n || Number(h.tutorId) === n,
  );
  const hasEval =
    Number(user?.tutorReviewCount || 0) > 0 ||
    Number(user?.evaluationsRecues || 0) > 0 ||
    Number(user?.evaluationsDonnees || 0) > 0;

  return hasReservation || hasActiveSeance || hasHistory || hasEval;
}
