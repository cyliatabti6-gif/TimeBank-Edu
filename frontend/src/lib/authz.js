/**
 * Administrateur plateforme : staff Django OU champ compte role === "admin".
 * Les flags is_student / is_tutor ne s'appliquent pas à cet accès (voir backend accounts/utils.py).
 */
export function isPlatformAdmin(user) {
  return Boolean(user?.is_staff) || user?.role === 'admin';
}

/**
 * Rôle compte API strict (lecture seule à l'écran) : uniquement `user` ou `admin`.
 * Ne pas confondre avec les types d'activité métier (is_student / is_tutor).
 */
export function platformRoleBadgeText(user) {
  if (!user) return 'user';
  return user.role === 'admin' ? 'admin' : 'user';
}

/** Première route dashboard autorisée après connexion ou refus d'accès. */
export function defaultDashboardPath(user) {
  if (!user) return '/';
  if (isPlatformAdmin(user)) return '/admin/dashboard';
  if (user.is_student) return '/student/dashboard';
  if (user.is_tutor) return '/tutor/dashboard';
  return '/';
}

/** Libellé profil (hors rôle plateforme user/admin affiché tel quel si besoin). */
export function accountPermissionLabel(user) {
  if (!user) return 'Étudiant';
  if (isPlatformAdmin(user)) return 'Administrateur';
  if (user.is_student && user.is_tutor) return 'Étudiant & tuteur';
  if (user.is_tutor) return 'Tuteur';
  if (user.is_student) return 'Étudiant';
  return 'Utilisateur';
}
