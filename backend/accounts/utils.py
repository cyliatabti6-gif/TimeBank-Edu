"""
Règles transverses d’autorisation pour les comptes.

is_platform_admin : accès « administrateur produit » (back-office, routes /admin/* côté front).
On combine le flag Django is_staff et le champ User.role == "admin".
Les booléens is_student / is_tutor ne sont pas pris en compte pour cet accès.

Politique d’isolement (alignée sur le front) : un utilisateur is_platform_admin
n’utilise que l’espace admin pour les dashboards ; l’API ne lui expose pas les
parcours étudiant/tuteur comme s’il était un utilisateur classique (listes publiques
étudiants/tuteurs excluent les admins).
"""

from django.db.models import Q

from .models import PlatformRole


def platform_admin_on_tuteur_fk_q() -> Q:
    """Pour exclure les offres dont le tuteur lié est admin plateforme (catalogue public)."""
    return Q(tuteur__is_staff=True) | Q(tuteur__role=PlatformRole.ADMIN)


def is_platform_admin(user) -> bool:
    """True si staff Django ou compte produit role=admin (indépendant de is_student / is_tutor)."""
    if user is None or not getattr(user, "is_authenticated", False):
        return False
    return bool(getattr(user, "is_staff", False)) or getattr(user, "role", None) == PlatformRole.ADMIN


def platform_admin_q() -> Q:
    """Q() sur ``User`` : exclure les comptes admin plateforme des listes publiques (étudiants / tuteurs)."""
    return Q(is_staff=True) | Q(role=PlatformRole.ADMIN)
