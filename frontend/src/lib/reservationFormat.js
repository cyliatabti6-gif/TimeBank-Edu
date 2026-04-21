/** Valeurs d’API alignées sur Django FormatSeance / SeanceDetailSerializer. */

export const FORMAT_ONLINE = 'Online';
export const FORMAT_PRESENTIEL = 'Présentiel';

export function isApiFormat(value) {
  return value === FORMAT_ONLINE || value === FORMAT_PRESENTIEL;
}

/** Séance en ligne — uniquement si le serveur a envoyé explicitement "Online". */
export function isReservationOnline(reservation) {
  return reservation?.format === FORMAT_ONLINE;
}

export function viewerIsReservationStudent(currentUser, reservation) {
  if (!currentUser || reservation == null) return false;
  return Number(currentUser.id) === Number(reservation.studentId);
}

export function viewerIsReservationTutor(currentUser, reservation) {
  if (!currentUser || reservation == null) return false;
  return Number(currentUser.id) === Number(reservation.tutorId);
}

/**
 * Étudiant : bouton « Rejoindre la réunion » uniquement si la séance est confirmée, en ligne,
 * avec lien enregistré par le tuteur.
 */
export function canStudentJoinOnlineMeeting(reservation, currentUser) {
  return (
    reservation?.status === 'confirmed' &&
    isReservationOnline(reservation) &&
    Boolean(String(reservation?.meet_url || '').trim()) &&
    viewerIsReservationStudent(currentUser, reservation) &&
    currentUser?.is_student !== false
  );
}
